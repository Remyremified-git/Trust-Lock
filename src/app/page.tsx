"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import WalletDebitHeroStack from "@/components/WalletDebitHeroStack";

export default function Home() {
  const transitionRef = useRef<HTMLElement | null>(null);
  const [transitionActive, setTransitionActive] = useState(false);

  useEffect(() => {
    if (!transitionRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setTransitionActive(entry.isIntersecting);
      },
      {
        threshold: 0.36,
      },
    );

    observer.observe(transitionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <main className="screen page-enter">
      <section className="hero-grid hero-focus panel">
        <div className="hero-copy">
          <p className="kicker">Secure Crypto Debit Cards</p>
          <h1>Connect your wallets to a debit card</h1>
          <p className="muted">
            Crypto spending has never been this easy. Link wallets to powerful debit cards, lock every spend flow
            with card security controls, and pay globally with confidence.
          </p>
          <div className="button-row cta-group">
            <Link className="primary-button" href="/auth">
              Link Wallet
            </Link>
          </div>
        </div>
        <WalletDebitHeroStack className="hero-stack" />
      </section>

      <section
        ref={transitionRef}
        className={`card-transition-section ${transitionActive ? "is-active" : ""}`}
      >
        <div className="card-transition-cards">
          <WalletDebitHeroStack className="shuffle-stack" />
        </div>
        <div className="card-transition-copy">
          <p className="kicker">Wallet Range + Card Security</p>
          <h2>Support different wallet types and spend globally with ease</h2>
          <p className="muted">
            Connect multiple wallet formats, route spend securely through your linked debit cards, and keep every
            transaction protected with layered security controls.
          </p>
        </div>
      </section>

      <div className="page-bottom-space" aria-hidden="true" />
    </main>
  );
}
