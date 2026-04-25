import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trust Lock",
  description:
    "Attach virtual spending cards to crypto wallets with secure controls and asset management.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
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
    </ClerkProvider>
  );
}
