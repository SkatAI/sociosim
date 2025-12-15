import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  console.log("[middleware] Running for:", request.nextUrl.pathname);
  console.log("[middleware] Incoming cookies:", request.cookies.getAll().map(c => c.name));

  // Simply pass the request through with cookies intact
  // Auth validation will happen in API routes when needed
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Check if we have auth cookies
  const hasAuthCookie = request.cookies.has('sb-localhost-auth-token');
  console.log("[middleware] Has auth cookie:", hasAuthCookie);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints don't need session refresh)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
