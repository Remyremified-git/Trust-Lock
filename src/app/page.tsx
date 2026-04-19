"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import WalletDebitHeroStack from "@/components/WalletDebitHeroStack";

function mixChannel(from: number, to: number, amount: number) {
  return Math.round(from + (to - from) * amount);
}

function rgb(channels: [number, number, number]) {
  return `rgb(${channels[0]} ${channels[1]} ${channels[2]})`;
}

export default function Home() {
  const mainRef = useRef<HTMLElement | null>(null);
  const transitionRef = useRef<HTMLElement | null>(null);
  const spotlightRef = useRef<HTMLElement | null>(null);
  const heroSlotRef = useRef<HTMLDivElement | null>(null);
  const transitionSlotRef = useRef<HTMLDivElement | null>(null);
  const spotlightSlotRef = useRef<HTMLDivElement | null>(null);
  const [stackMotion, setStackMotion] = useState({
    x: 0,
    y: 0,
    progress: 0,
    mergeProgress: 0,
    themeProgress: 0,
    ready: false,
  });
  const baseBackgroundRef = useRef<string | null>(null);
  const baseAttachmentRef = useRef<string | null>(null);

  useEffect(() => {
    const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
    const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

    let raf = 0;

    const update = () => {
      raf = 0;

      if (
        !mainRef.current ||
        !heroSlotRef.current ||
        !transitionSlotRef.current ||
        !spotlightSlotRef.current
      ) {
        return;
      }

      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      const mainRect = mainRef.current.getBoundingClientRect();
      const heroRect = heroSlotRef.current.getBoundingClientRect();
      const transitionRect = transitionSlotRef.current.getBoundingClientRect();
      const spotlightRect = spotlightSlotRef.current.getBoundingClientRect();

      const mainLeft = mainRect.left + scrollX;
      const mainTop = mainRect.top + scrollY;

      const heroCenterX = heroRect.left + scrollX + heroRect.width / 2 - mainLeft;
      const heroCenterY = heroRect.top + scrollY + heroRect.height / 2 - mainTop;
      const transitionCenterX = transitionRect.left + scrollX + transitionRect.width / 2 - mainLeft;
      const transitionCenterY = transitionRect.top + scrollY + transitionRect.height / 2 - mainTop;
      const spotlightCenterX = spotlightRect.left + scrollX + spotlightRect.width / 2 - mainLeft;
      const spotlightCenterY = spotlightRect.top + scrollY + spotlightRect.height / 2 - mainTop;

      let progress = 0;
      if (transitionRef.current) {
        const sectionRect = transitionRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const startY = viewportHeight * 0.82;
        const endY = viewportHeight * 0.2;
        progress = clamp((startY - sectionRect.top) / (startY - endY));
      }

      let mergeProgress = 0;
      if (spotlightRef.current) {
        const sectionRect = spotlightRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const startY = viewportHeight * 0.82;
        const endY = viewportHeight * 0.2;
        mergeProgress = clamp((startY - sectionRect.top) / (startY - endY));
      }

      const x =
        progress < 1
          ? lerp(heroCenterX, transitionCenterX, progress)
          : lerp(transitionCenterX, spotlightCenterX, mergeProgress);
      const y =
        progress < 1
          ? lerp(heroCenterY, transitionCenterY, progress)
          : lerp(transitionCenterY, spotlightCenterY, mergeProgress);

      setStackMotion({
        x,
        y,
        progress,
        mergeProgress,
        themeProgress: mergeProgress,
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
    const settleTimer = window.setTimeout(requestUpdate, 180);
    window.addEventListener("load", requestUpdate);
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
      window.clearTimeout(settleTimer);
      window.removeEventListener("load", requestUpdate);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  useEffect(() => {
    if (!baseBackgroundRef.current) {
      baseBackgroundRef.current = document.body.style.background || "";
      baseAttachmentRef.current = document.body.style.backgroundAttachment || "";
    }

    const progress = stackMotion.themeProgress;
    const topLight: [number, number, number] = [253, 253, 255];
    const topDark: [number, number, number] = [7, 10, 20];
    const midLight: [number, number, number] = [248, 248, 252];
    const midDark: [number, number, number] = [10, 16, 30];
    const lowLight: [number, number, number] = [244, 246, 255];
    const lowDark: [number, number, number] = [6, 11, 22];

    const topMix: [number, number, number] = [
      mixChannel(topLight[0], topDark[0], progress),
      mixChannel(topLight[1], topDark[1], progress),
      mixChannel(topLight[2], topDark[2], progress),
    ];
    const midMix: [number, number, number] = [
      mixChannel(midLight[0], midDark[0], progress),
      mixChannel(midLight[1], midDark[1], progress),
      mixChannel(midLight[2], midDark[2], progress),
    ];
    const lowMix: [number, number, number] = [
      mixChannel(lowLight[0], lowDark[0], progress),
      mixChannel(lowLight[1], lowDark[1], progress),
      mixChannel(lowLight[2], lowDark[2], progress),
    ];

    const coldGlowAlpha = (0.16 * (1 - progress)).toFixed(3);
    const warmGlowAlpha = (0.12 * (1 - progress)).toFixed(3);
    const nightGlowAlpha = (0.24 * progress).toFixed(3);

    document.body.style.background = `
      radial-gradient(circle at 8% 6%, rgba(56, 130, 246, ${coldGlowAlpha}), transparent 34%),
      radial-gradient(circle at 92% 4%, rgba(99, 102, 241, ${warmGlowAlpha}), transparent 30%),
      radial-gradient(circle at 50% 82%, rgba(49, 84, 196, ${nightGlowAlpha}), transparent 48%),
      linear-gradient(180deg, ${rgb(topMix)} 0%, ${rgb(midMix)} 55%, ${rgb(lowMix)} 100%)
    `;
    document.body.style.backgroundAttachment = "fixed";
  }, [stackMotion.themeProgress]);

  useEffect(() => {
    return () => {
      if (baseBackgroundRef.current !== null) {
        document.body.style.background = baseBackgroundRef.current;
      }
      if (baseAttachmentRef.current !== null) {
        document.body.style.backgroundAttachment = baseAttachmentRef.current;
      }
    };
  }, []);

  const movingStackStyle = {
    transform: `translate3d(${stackMotion.x}px, ${stackMotion.y}px, 0)`,
    opacity: stackMotion.ready ? 1 : 0,
    "--stack-progress": Math.min(1, stackMotion.progress * 0.65 + stackMotion.mergeProgress * 0.35),
  } as CSSProperties;

  const themeBlendStyle = {
    "--theme-dark-pct": `${Math.round(stackMotion.themeProgress * 100)}%`,
    "--theme-light-pct": `${Math.round((1 - stackMotion.themeProgress) * 100)}%`,
  } as CSSProperties;

  return (
    <main ref={mainRef} className="screen page-enter" style={themeBlendStyle}>
      <div className="moving-stack-layer" style={movingStackStyle}>
        <WalletDebitHeroStack
          className="motion-linked-stack"
          progress={stackMotion.progress}
          mergeProgress={stackMotion.mergeProgress}
        />
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

      <section ref={spotlightRef} className="spotlight-section">
        <div className="spotlight-copy">
          <p className="kicker">Global Wallet Card Rail</p>
          <h2>Global payments, one spotlight-ready debit card experience</h2>
          <p className="muted">
            Spend seamlessly across global platforms with one linked card flow. Integrate major crypto wallet types in
            minutes, route payments securely, and manage your entire spend layer from one control plane.
          </p>
        </div>
        <div className="card-transition-stage">
          <div className="spotlight-stage">
            <div ref={spotlightSlotRef} className="stack-slot spotlight-stack-slot" aria-hidden="true" />
          </div>
        </div>
      </section>

      <div className="page-bottom-space" aria-hidden="true" />
    </main>
  );
}
