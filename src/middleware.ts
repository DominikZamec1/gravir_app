import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Jednoduchá brána: celá appka za jedním sdíleným heslem (APP_PASSWORD).
// Přihlášení nastaví httpOnly cookie; middleware ji kontroluje na každém requestu.
export function middleware(req: NextRequest) {
  const expected = process.env.APP_PASSWORD;
  const authed = !!expected && req.cookies.get("gravir_auth")?.value === expected;
  const path = req.nextUrl.pathname;
  const isLogin = path === "/login";
  const isAuthEndpoint = path === "/api/login";

  if (!authed && !isLogin && !isAuthEndpoint) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (authed && isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // vše kromě statických assetů
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
