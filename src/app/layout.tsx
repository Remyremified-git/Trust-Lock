import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trust Lock",
  description:
    "Trust Lock secure wallet vault and control panels",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="top-nav">
          <div className="top-nav-inner">
            <Link className="brand" href="/">
              Trust Lock
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
