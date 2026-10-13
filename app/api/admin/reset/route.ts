import { isAdmin } from "@/lib/auth";
import { resetAll } from "@/lib/db";

// 보드 비우기: 제출·훔쳐가기·약속을 모두 지웁니다 (강사만)
export async function POST() {
  if (!(await isAdmin())) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  try {
    await resetAll();
    return Response.json({ ok: true });
  } catch (e) {
    console.error("reset failed", e);
    return Response.json({ error: "비우지 못했습니다." }, { status: 500 });
  }
}
