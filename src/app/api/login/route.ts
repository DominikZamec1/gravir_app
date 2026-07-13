import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Ověří heslo a nastaví přihlašovací cookie. Plain POST z formuláře (bez JS).
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const pwd = String(form.get("password") ?? "");

  if (pwd && pwd === process.env.APP_PASSWORD) {
    const res = NextResponse.redirect(new URL("/", req.url), 303);
    res.cookies.set("gravir_auth", pwd, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 dní
      path: "/",
    });
    return res;
  }
  return NextResponse.redirect(new URL("/login?e=1", req.url), 303);
}
