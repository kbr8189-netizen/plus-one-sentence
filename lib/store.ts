import { promises as fs } from "node:fs";
import path from "node:path";
import { del, get, head, list, put } from "@vercel/blob";

// 로컬 개발에서 Blob 토큰이 없으면 .data/ 폴더에 저장
const LOCAL = !process.env.BLOB_READ_WRITE_TOKEN && process.env.NODE_ENV !== "production";
const LOCAL_DIR = path.join(process.cwd(), ".data");
const localFile = (key: string) => path.join(LOCAL_DIR, key.replace(/\//g, "__"));

// 모든 데이터는 이 접두사 아래에 둡니다. version.json은 쓰기가 있을 때마다 갱신되어
// 읽는 쪽이 목록(list)을 다시 불러올지 판단하는 데 씁니다.
export const ROOT = "hp/";
const VERSION_KEY = `${ROOT}version.json`;

// Blob 스토어가 비공개(private)든 공개(public)든 동작하도록, 처음 실패하면 다른 방식으로 한 번 더 시도하고 기억합니다.
type Access = "private" | "public";
let access: Access | null = null;
const order = (): Access[] => (access ? [access] : ["private", "public"]);

export async function writeJson(key: string, value: unknown) {
  if (LOCAL) {
    await fs.mkdir(LOCAL_DIR, { recursive: true });
    await fs.writeFile(localFile(key), JSON.stringify(value));
    return;
  }
  let lastError: unknown;
  for (const a of order()) {
    try {
      await put(key, JSON.stringify(value), {
        access: a,
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      access = a;
      return;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

export async function readJson<T>(key: string): Promise<T | null> {
  if (LOCAL) {
    try {
      return JSON.parse(await fs.readFile(localFile(key), "utf8")) as T;
    } catch {
      return null;
    }
  }
  for (const a of order()) {
    try {
      const res = await get(key, { access: a, useCache: false });
      if (!res || res.statusCode !== 200 || !res.stream) continue;
      const data = JSON.parse(await new Response(res.stream).text()) as T;
      access = a;
      return data;
    } catch {
      // 다른 접근 방식으로 재시도
    }
  }
  return null;
}

export async function listKeys(prefix: string): Promise<string[]> {
  if (LOCAL) {
    const files = await fs.readdir(LOCAL_DIR).catch(() => [] as string[]);
    return files.map((f) => f.replace(/__/g, "/")).filter((k) => k.startsWith(prefix));
  }
  const keys: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    keys.push(...page.blobs.map((b) => b.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return keys;
}

export async function removeKeys(keys: string[]) {
  if (!keys.length) return;
  if (LOCAL) {
    await Promise.all(keys.map((k) => fs.rm(localFile(k), { force: true })));
    return;
  }
  for (let i = 0; i < keys.length; i += 500) await del(keys.slice(i, i + 500));
}

export async function bumpVersion() {
  await writeJson(VERSION_KEY, { at: Date.now() });
}

export async function currentVersion(): Promise<string> {
  if (LOCAL) {
    const st = await fs.stat(localFile(VERSION_KEY)).catch(() => null);
    return st ? String(st.mtimeMs) : "0";
  }
  try {
    const h = await head(VERSION_KEY);
    return h.uploadedAt.toISOString();
  } catch {
    return "0";
  }
}
