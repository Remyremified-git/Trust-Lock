import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hybrid Vault Platform",
  description:
    "Secure crypto key storage starter with user controls and admin recovery vault",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <header className="top-nav">
          <div className="top-nav-inner">
            <Link className="brand" href="/">
              Hybrid Vault
            </Link>
            <nav className="nav-links">
              <Link href="/auth">Auth</Link>
              <Link href="/portal">Portal</Link>
              <Link href="/onboarding">Onboarding</Link>
              <Link href="/security">Security</Link>
              <Link href="/admin">Admin</Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
