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
              <Link href="/auth">Link Wallet</Link>
              <Link href="/portal">Card Center</Link>
              <Link href="/onboarding">Wallet Setup</Link>
              <Link href="/security">Card Security</Link>
              <Link href="/admin">Admin Ops</Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
