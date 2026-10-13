import { randomUUID } from "node:crypto";
import { STEALS, STORES, isId, oneOf } from "@/lib/practice";
import { bumpVersion, writeJson } from "@/lib/store";

// 훔쳐가기 1회 = 문서 1개 (카운터를 함께 고치지 않아 동시에 눌러도 안전)
export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!isId(b?.entryId)) return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  const doc = { entryId: b.entryId, store: oneOf(b?.store, STORES), createdAt: Date.now() };
  try {
    await writeJson(`${STEALS}${doc.entryId}/${randomUUID()}.json`, doc);
    await bumpVersion();
    return Response.json({ ok: true });
  } catch (e) {
    console.error("save steal failed", e);
    return Response.json({ error: "저장하지 못했습니다." }, { status: 500 });
  }
}
