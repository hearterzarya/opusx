import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Lets you confirm in DevTools / curl that the response went through this app (not a client stub). */
export function middleware(_request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("x-opusx-gateway", "1");
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
