import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Nav from "@/components/Nav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gravír konzole",
  description: "Skenování QR a evidence gravírování – Authentica",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="cs" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-slate-900">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-[var(--bg)]/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
            <Link href="/" className="flex items-center gap-2.5 text-white">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--brand)] text-lg font-black">
                ⚙
              </span>
              <span className="text-lg font-semibold tracking-tight">Gravír konzole</span>
            </Link>
            <Nav />
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-6">{children}</main>
      </body>
    </html>
  );
}
