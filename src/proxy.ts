import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate: send visitors without a session cookie to /login. Every API
 * route still verifies the cookie and the Super Admin email server-side.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("__session")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except login, APIs (they return 401 themselves), tracked links and static assets.
  matcher: ["/((?!login|api|r/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|webp)$).*)"],
};
