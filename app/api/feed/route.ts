import { loadFeed } from "@/lib/practice";

export const dynamic = "force-dynamic";

// 참가자 화면과 강사 보드가 몇 초마다 불러가는 공용 목록
export async function GET() {
  try {
    const feed = await loadFeed();
    return Response.json(feed, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=3, stale-while-revalidate=5" },
    });
  } catch (e) {
    console.error("feed failed", e);
    return Response.json({ error: "불러오지 못했습니다." }, { status: 500 });
  }
}
