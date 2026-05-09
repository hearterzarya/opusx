import type { NextFetchEvent } from "next/server";
import { NextResponse, type NextRequest } from "next/server";
import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";

const authProxy = withAuth({
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

/**
 * Next.js 16+ uses `proxy.ts` (not `middleware.ts`). Marks API traffic for debugging;
 * protects /dashboard and /admin with NextAuth.
 */
export function proxy(request: NextRequest, event: NextFetchEvent) {
  if (request.nextUrl.pathname.startsWith("/api")) {
    const response = NextResponse.next();
    response.headers.set("x-opusx-gateway", "1");
    return response;
  }
  return authProxy(request as NextRequestWithAuth, event);
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/:path*"],
};
