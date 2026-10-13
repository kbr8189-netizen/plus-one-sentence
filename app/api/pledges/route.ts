import { PLEDGES, STORES, newId, oneOf, text, type Pledge } from "@/lib/practice";
import { bumpVersion, writeJson } from "@/lib/store";

export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const pledge: Pledge = {
    id: newId(),
    text: text(b?.text, 120),
    store: oneOf(b?.store, STORES),
    team: text(b?.team, 20),
    createdAt: Date.now(),
  };
  if (!pledge.text) return Response.json({ error: "내일 해볼 한 문장을 적어 주세요." }, { status: 400 });
  try {
    await writeJson(`${PLEDGES}${pledge.id}.json`, pledge);
    await bumpVersion();
    return Response.json({ pledge });
  } catch (e) {
    console.error("save pledge failed", e);
    return Response.json({ error: "올리지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
