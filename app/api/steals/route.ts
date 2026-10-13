import { addSteal } from "@/lib/db";
import { STORES, isId, oneOf } from "@/lib/practice";

export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!isId(b?.entryId)) return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  try {
    await addSteal(b.entryId, oneOf(b?.store, STORES));
    return Response.json({ ok: true });
  } catch (e) {
    console.error("save steal failed", e);
    return Response.json({ error: "저장하지 못했습니다." }, { status: 500 });
  }
}
