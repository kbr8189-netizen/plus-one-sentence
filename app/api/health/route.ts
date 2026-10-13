import { health } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await health(), { headers: { "Cache-Control": "no-store" } });
}
