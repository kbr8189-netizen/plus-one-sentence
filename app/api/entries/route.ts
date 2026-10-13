import { addEntry } from "@/lib/db";
import { EXP_TYPES, EYE_TYPES, STORES, newId, oneOf, text, type Entry } from "@/lib/practice";

export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const entry: Entry = {
    id: newId(),
    team: text(b?.team, 20),
    store: oneOf(b?.store, STORES),
    base: text(b?.base, 60),
    exp: text(b?.exp, 140),
    eye: text(b?.eye, 140),
    expType: oneOf(b?.expType, EXP_TYPES),
    eyeType: oneOf(b?.eyeType, EYE_TYPES),
    createdAt: Date.now(),
  };
  if (!entry.team || !entry.store || !entry.base || (!entry.exp && !entry.eye)) {
    return Response.json({ error: "닉네임, 매장, 질문, 한 문장을 확인해 주세요." }, { status: 400 });
  }
  try {
    await addEntry(entry);
    return Response.json({ entry });
  } catch (e) {
    console.error("save entry failed", e);
    return Response.json({ error: "올리지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
