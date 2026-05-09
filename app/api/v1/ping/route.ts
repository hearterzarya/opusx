import { NextResponse } from "next/server";

/**
 * No auth — use to verify traffic hits this deployment (see `x-opusx-gateway` on /api/*).
 * `curl -sSI https://opusx.vercel.app/api/v1/ping | findstr /i opusx`
 */
export async function GET() {
  return NextResponse.json({
    gateway: "opusx",
    path: "/api/v1/ping",
    hint: "If Cursor shows msg_expired_* assistant JSON, that text is not from this server — curl this URL and /api/v1/messages to compare.",
  });
}
