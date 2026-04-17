"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import WalletDebitHeroStack from "@/components/WalletDebitHeroStack";

export default function Home() {
  const mainRef = useRef<HTMLElement | null>(null);
  const transitionRef = useRef<HTMLElement | null>(null);
  const heroSlotRef = useRef<HTMLDivElement | null>(null);
  const transitionSlotRef = useRef<HTMLDivElement | null>(null);
  const [stackMotion, setStackMotion] = useState({ x: 0, y: 0, progress: 0, ready: false });

  useEffect(() => {
    const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
    const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

    let raf = 0;

    const update = () => {
      raf = 0;

      if (!mainRef.current || !heroSlotRef.current || !transitionSlotRef.current) {
        return;
      }

      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      const mainRect = mainRef.current.getBoundingClientRect();
      const heroRect = heroSlotRef.current.getBoundingClientRect();
      const transitionRect = transitionSlotRef.current.getBoundingClientRect();

      const mainLeft = mainRect.left + scrollX;
      const mainTop = mainRect.top + scrollY;

      const heroCenterX = heroRect.left + scrollX + heroRect.width / 2 - mainLeft;
      const heroCenterY = heroRect.top + scrollY + heroRect.height / 2 - mainTop;
      const transitionCenterX = transitionRect.left + scrollX + transitionRect.width / 2 - mainLeft;
      const transitionCenterY = transitionRect.top + scrollY + transitionRect.height / 2 - mainTop;

      let progress = 0;
      if (transitionRef.current) {
        const sectionRect = transitionRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        progress = clamp((viewportHeight - sectionRect.top) / (viewportHeight + sectionRect.height * 0.35));
      }

      setStackMotion({
        x: lerp(heroCenterX, transitionCenterX, progress),
        y: lerp(heroCenterY, transitionCenterY, progress),
        progress,
        ready: true,
      });
    };

    const requestUpdate = () => {
      if (raf) {
        return;
      }
      raf = window.requestAnimationFrame(update);
    };

    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  const movingStackStyle = {
    transform: `translate3d(${stackMotion.x}px, ${stackMotion.y}px, 0)`,
    opacity: stackMotion.ready ? 1 : 0,
    "--stack-progress": stackMotion.progress,
  } as CSSProperties;

  return (
    <main ref={mainRef} className="screen page-enter">
      <div className="moving-stack-layer" style={movingStackStyle}>
        <WalletDebitHeroStack className="motion-linked-stack" />
      </div>

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
        <div ref={heroSlotRef} className="stack-slot hero-stack-slot" aria-hidden="true" />
      </section>

      <section ref={transitionRef} className="card-transition-section">
        <div className="card-transition-cards">
          <div ref={transitionSlotRef} className="stack-slot transition-stack-slot" aria-hidden="true" />
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
