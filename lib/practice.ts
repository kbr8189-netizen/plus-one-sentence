import { randomUUID } from "node:crypto";
import { ROOT, currentVersion, listKeys, readJson } from "@/lib/store";

export const STORES = ["패션·잡화", "뷰티", "식품", "식당", "기타"];
export const EXP_TYPES = ["초대", "감각", "장면", "확장"];
export const EYE_TYPES = ["기준", "비교", "발견", "인정"];

export const ENTRIES = `${ROOT}entries/`;
export const STEALS = `${ROOT}steals/`;
export const PLEDGES = `${ROOT}pledges/`;

export type Entry = {
  id: string;
  team: string;
  store: string;
  base: string;
  exp: string;
  eye: string;
  expType: string;
  eyeType: string;
  createdAt: number;
};
export type Pledge = { id: string; text: string; store: string; team: string; createdAt: number };

const ID = /^\d{13}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isId = (v: unknown): v is string => typeof v === "string" && ID.test(v);
export const newId = () => `${Date.now()}-${randomUUID()}`;

export const text = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
export const oneOf = (v: unknown, list: string[]) => (typeof v === "string" && list.includes(v) ? v : "");

// 문서는 한 번 쓰면 바뀌지 않으므로 서버 인스턴스 안에 내용을 기억해 두고,
// version.json이 바뀌었을 때만 목록을 다시 읽습니다.
const docCache = new Map<string, unknown>();
let feedCache: { version: string; feed: Feed } | null = null;

export type Feed = {
  entries: Entry[];
  steals: Record<string, number>;
  totalSteals: number;
  pledges: Pledge[];
};

async function readAll<T>(keys: string[]): Promise<T[]> {
  const out: T[] = [];
  const missing = keys.filter((k) => !docCache.has(k));
  for (let i = 0; i < missing.length; i += 20) {
    const chunk = missing.slice(i, i + 20);
    const docs = await Promise.all(chunk.map((k) => readJson<T>(k)));
    docs.forEach((d, j) => d && docCache.set(chunk[j], d));
  }
  for (const k of keys) if (docCache.has(k)) out.push(docCache.get(k) as T);
  return out;
}

export async function loadFeed(): Promise<Feed> {
  const version = await currentVersion();
  if (feedCache && feedCache.version === version) return feedCache.feed;

  const keys = await listKeys(ROOT);
  const entryKeys = keys.filter((k) => k.startsWith(ENTRIES));
  const pledgeKeys = keys.filter((k) => k.startsWith(PLEDGES));
  const steals: Record<string, number> = {};
  let totalSteals = 0;
  for (const k of keys) {
    if (!k.startsWith(STEALS)) continue;
    // steals/<entryId>/<uuid>.json — 경로만으로 집계
    const entryId = k.slice(STEALS.length).split("/")[0];
    steals[entryId] = (steals[entryId] || 0) + 1;
    totalSteals++;
  }

  const entries = (await readAll<Entry>(entryKeys)).sort((a, b) => b.createdAt - a.createdAt);
  const pledges = (await readAll<Pledge>(pledgeKeys)).sort((a, b) => b.createdAt - a.createdAt);
  // 지워진 문서는 캐시에서도 정리
  const live = new Set(keys);
  for (const k of docCache.keys()) if (!live.has(k)) docCache.delete(k);

  const feed = { entries, steals, totalSteals, pledges };
  feedCache = { version, feed };
  return feed;
}
