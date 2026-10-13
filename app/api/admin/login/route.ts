import { cookies } from "next/headers";
import { COOKIE_NAME, checkPassword, createSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  const { password } = (await request.json().catch(() => ({}))) as { password?: string };

  if (!process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "관리자 비밀번호가 설정되지 않았습니다." }, { status: 500 });
  }
  if (typeof password !== "string" || !checkPassword(password)) {
    // 무작위 대입을 늦추기 위한 짧은 지연
    await new Promise((r) => setTimeout(r, 800));
    return Response.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const { token, maxAge } = createSessionToken();
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge,
  });
  return Response.json({ ok: true });
}

export async function DELETE() {
  (await cookies()).delete(COOKIE_NAME);
  return Response.json({ ok: true });
}
