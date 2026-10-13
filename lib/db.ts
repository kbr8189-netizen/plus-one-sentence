import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import { ENTRIES, PLEDGES, STEALS, loadFeed as loadBlobFeed, type Entry, type Feed, type Pledge } from "@/lib/practice";
import { bumpVersion, listKeys, removeKeys, writeJson } from "@/lib/store";

// 저장소: Upstash Redis 환경 변수가 있으면 Redis, 없으면 Vercel Blob(로컬에서는 .data/)
const REDIS_ENV = !!(
  (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
  (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
);
const redis = REDIS_ENV ? Redis.fromEnv() : null;

const K = { entries: "hp:entries", steals: "hp:steals", pledges: "hp:pledges" };

export async function addEntry(entry: Entry) {
  if (redis) return void (await redis.hset(K.entries, { [entry.id]: JSON.stringify(entry) }));
  await writeJson(`${ENTRIES}${entry.id}.json`, entry);
  await bumpVersion();
}

// 훔쳐가기 1회 = Redis에서는 카운터 +1, Blob에서는 문서 1개 (동시에 눌러도 안전)
export async function addSteal(entryId: string, store: string) {
  if (redis) return void (await redis.hincrby(K.steals, entryId, 1));
  await writeJson(`${STEALS}${entryId}/${randomUUID()}.json`, { entryId, store, createdAt: Date.now() });
  await bumpVersion();
}

export async function addPledge(pledge: Pledge) {
  if (redis) return void (await redis.hset(K.pledges, { [pledge.id]: JSON.stringify(pledge) }));
  await writeJson(`${PLEDGES}${pledge.id}.json`, pledge);
  await bumpVersion();
}

const parse = <T,>(v: unknown): T => (typeof v === "string" ? JSON.parse(v) : v) as T;

export async function loadFeed(): Promise<Feed> {
  if (!redis) return loadBlobFeed();
  const [e, s, p] = await Promise.all([
    redis.hgetall<Record<string, unknown>>(K.entries),
    redis.hgetall<Record<string, unknown>>(K.steals),
    redis.hgetall<Record<string, unknown>>(K.pledges),
  ]);
  const entries = Object.values(e ?? {}).map((v) => parse<Entry>(v)).sort((a, b) => b.createdAt - a.createdAt);
  const pledges = Object.values(p ?? {}).map((v) => parse<Pledge>(v)).sort((a, b) => b.createdAt - a.createdAt);
  const steals: Record<string, number> = {};
  let totalSteals = 0;
  for (const [id, n] of Object.entries(s ?? {})) {
    steals[id] = Number(n) || 0;
    totalSteals += steals[id];
  }
  return { entries, steals, totalSteals, pledges };
}

export async function resetAll() {
  if (redis) return void (await redis.del(K.entries, K.steals, K.pledges));
  const keys = (await Promise.all([ENTRIES, STEALS, PLEDGES].map(listKeys))).flat();
  await removeKeys(keys);
  await bumpVersion();
}
