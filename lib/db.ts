import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { ENTRIES, PLEDGES, STEALS, loadFeed as loadBlobFeed, type Entry, type Feed, type Pledge } from "@/lib/practice";
import { bumpVersion, listKeys, removeKeys, writeJson } from "@/lib/store";

// 저장소: Neon(Postgres) 연결 주소가 있으면 Postgres, 없으면 Vercel Blob(로컬에서는 .data/)
// (Vercel에서 연결할 때 접두사를 바꾸면 이름이 달라지므로 postgres:// 로 시작하는 값을 찾아 씁니다)
const DB_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.STORAGE_URL ||
  Object.entries(process.env).find(([k, v]) => k.endsWith("_URL") && /^postgres(ql)?:\/\//.test(v ?? ""))?.[1];
const sql = DB_URL
  ? postgres(DB_URL, { max: 1, prepare: false, idle_timeout: 20, ssl: /localhost|127\.0\.0\.1/.test(DB_URL) ? false : "require" })
  : null;

// 표는 처음 쓸 때 자동으로 만듭니다.
let ready: Promise<unknown> | null = null;
function db() {
  if (!sql) return null;
  ready ??= sql`
    CREATE TABLE IF NOT EXISTS hp_entries (id text PRIMARY KEY, data jsonb NOT NULL, created_at bigint NOT NULL);
    CREATE TABLE IF NOT EXISTS hp_pledges (id text PRIMARY KEY, data jsonb NOT NULL, created_at bigint NOT NULL);
    CREATE TABLE IF NOT EXISTS hp_steals (id bigserial PRIMARY KEY, entry_id text NOT NULL, store text NOT NULL DEFAULT '', created_at bigint NOT NULL);
  `.simple().catch((e) => {
    ready = null;
    throw e;
  });
  return ready.then(() => sql);
}

export async function addEntry(entry: Entry) {
  const q = await db();
  if (q) return void (await q`INSERT INTO hp_entries ${q({ id: entry.id, data: q.json(entry), created_at: entry.createdAt })}`);
  await writeJson(`${ENTRIES}${entry.id}.json`, entry);
  await bumpVersion();
}

// 훔쳐가기 1회 = 행(또는 문서) 1개 추가 (카운터를 고치지 않아 동시에 눌러도 안전)
export async function addSteal(entryId: string, store: string) {
  const q = await db();
  if (q) return void (await q`INSERT INTO hp_steals ${q({ entry_id: entryId, store, created_at: Date.now() })}`);
  await writeJson(`${STEALS}${entryId}/${randomUUID()}.json`, { entryId, store, createdAt: Date.now() });
  await bumpVersion();
}

export async function addPledge(pledge: Pledge) {
  const q = await db();
  if (q) return void (await q`INSERT INTO hp_pledges ${q({ id: pledge.id, data: q.json(pledge), created_at: pledge.createdAt })}`);
  await writeJson(`${PLEDGES}${pledge.id}.json`, pledge);
  await bumpVersion();
}

export async function loadFeed(): Promise<Feed> {
  const q = await db();
  if (!q) return loadBlobFeed();
  const [e, p, s] = await Promise.all([
    q<{ data: Entry }[]>`SELECT data FROM hp_entries ORDER BY created_at DESC LIMIT 500`,
    q<{ data: Pledge }[]>`SELECT data FROM hp_pledges ORDER BY created_at DESC LIMIT 300`,
    q<{ entry_id: string; n: number }[]>`SELECT entry_id, count(*)::int AS n FROM hp_steals GROUP BY entry_id`,
  ]);
  const steals: Record<string, number> = {};
  let totalSteals = 0;
  for (const r of s) {
    steals[r.entry_id] = r.n;
    totalSteals += r.n;
  }
  return { entries: e.map((r) => r.data), steals, totalSteals, pledges: p.map((r) => r.data) };
}

export async function resetAll() {
  const q = await db();
  if (q) return void (await q`TRUNCATE hp_entries, hp_pledges, hp_steals`);
  const keys = (await Promise.all([ENTRIES, STEALS, PLEDGES].map(listKeys))).flat();
  await removeKeys(keys);
  await bumpVersion();
}

// /api/health 에서 쓰는 점검 정보 (비밀 값은 내보내지 않음)
export async function health() {
  const names = Object.keys(process.env).filter((k) => /URL|DATABASE|POSTGRES|PG|BLOB|NEON/.test(k) && !/^VERCEL_/.test(k)).sort();
  const out: Record<string, unknown> = { mode: sql ? "postgres" : "blob", envNames: names };
  try {
    const f = await loadFeed();
    out.ok = true;
    out.entries = f.entries.length;
  } catch (e) {
    out.ok = false;
    out.error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }
  return out;
}
