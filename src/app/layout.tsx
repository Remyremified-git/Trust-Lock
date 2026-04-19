import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trust Lock",
  description:
    "Attach virtual spending cards to crypto wallets and exchange accounts with secure controls and asset management.",
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
            <Link className="brand-logo" href="/" aria-label="Trust Lock home">
              <Image src="/trust-lock-logo.svg" alt="Trust Lock" width={44} height={44} priority />
            </Link>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
