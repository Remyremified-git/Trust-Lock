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

function HowStepIcon({ type }: { type: "connect" | "issue" | "control" }) {
  if (type === "connect") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8.7 7.2h5.2a4.3 4.3 0 0 1 0 8.6H8.7" />
        <path d="M15.3 16.8H10a4.3 4.3 0 0 1 0-8.6h5.3" />
      </svg>
    );
  }

  if (type === "issue") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.2" y="5.4" width="17.6" height="13.2" rx="2.8" />
        <path d="M3.2 10.2h17.6" />
        <path d="M7.2 14.6h4.4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8.2v4.3l2.8 2.2" />
      <path d="M12 4.2v1.6M12 18.2v1.6M19.8 12h-1.6M5.8 12H4.2" />
    </svg>
  );
}

export default function Home() {
  const mainRef = useRef<HTMLElement | null>(null);
  const transitionRef = useRef<HTMLElement | null>(null);
  const spotlightRef = useRef<HTMLElement | null>(null);
  const howSectionRef = useRef<HTMLElement | null>(null);
  const finalCtaRef = useRef<HTMLElement | null>(null);
  const heroSlotRef = useRef<HTMLDivElement | null>(null);
  const transitionSlotRef = useRef<HTMLDivElement | null>(null);
  const spotlightSlotRef = useRef<HTMLDivElement | null>(null);
  const [isHowInView, setIsHowInView] = useState(false);
  const [stackMotion, setStackMotion] = useState({
    x: 0,
    y: 0,
    progress: 0,
    mergeProgress: 0,
    themeProgress: 0,
    reverseProgress: 0,
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

      let reverseProgress = 0;
      if (finalCtaRef.current) {
        const sectionRect = finalCtaRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const startY = viewportHeight * 0.9;
        const endY = viewportHeight * 0.2;
        reverseProgress = clamp((startY - sectionRect.top) / (startY - endY));
      }

      const darkThemeProgress = mergeProgress * (1 - reverseProgress);

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
        themeProgress: darkThemeProgress,
        reverseProgress,
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

  useEffect(() => {
    if (!howSectionRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsHowInView(entry?.isIntersecting ?? false);
      },
      {
        threshold: 0.35,
      },
    );

    observer.observe(howSectionRef.current);
    return () => observer.disconnect();
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
          <p className="kicker">Virtual Cards for Crypto Platforms</p>
          <h1>Attach a virtual spending card to your crypto wallets and exchanges</h1>
          <p className="muted">
            Link Trust Wallet, MetaMask, Exodus, KuCoin, Gate.io, Kraken, and other major crypto accounts to secure
            virtual debit cards so you can spend globally with tighter control over assets that already move through
            Web3 rails.
          </p>
          <div className="button-row cta-group">
            <Link className="primary-button" href="/link-wallet">
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
          <p className="kicker">What We Do</p>
          <h2>We issue linkable virtual cards for wallets and exchange accounts</h2>
          <p className="muted">
            Trust Lock provisions attachable virtual debit cards designed for crypto users, with route-level card
            controls, asset-aware limits, and secure spend management in one place where Web3 account access can be
            routed into everyday payments.
          </p>
        </div>
      </section>

      <section ref={spotlightRef} className="spotlight-section">
        <div className="spotlight-copy">
          <p className="kicker">Who It Is For</p>
          <h2>Built for global crypto holders, traders, teams, and high-frequency spenders</h2>
          <p className="muted">
            From single-wallet users to multi-exchange operators, Trust Lock gives each profile a safer card layer for
            day-to-day spending while preserving control over how funds move between Web3 wallets, exchange balances,
            and live spending routes.
          </p>
          <div className="button-row cta-group">
            <Link className="primary-button spotlight-cta" href="/link-wallet">
              Link Wallet
            </Link>
          </div>
        </div>
        <div className="card-transition-stage">
          <div className="spotlight-stage">
            <div ref={spotlightSlotRef} className="stack-slot spotlight-stack-slot" aria-hidden="true" />
          </div>
        </div>
      </section>

      <section ref={howSectionRef} className={`how-section panel ${isHowInView ? "in-view" : ""}`}>
        <div className="how-layout">
          <div className="how-left-column">
            <div className="how-sticky-stage">
              <div className="how-heading-block">
                <p className="kicker">How It Works</p>
                <h2 className="how-hero-title">Link account. Issue card. Control spend.</h2>
              </div>

              <div className="how-visual-column">
                <div className="how-visual-stage">
                  <div className="spend-image-card" aria-hidden="true">
                    <div className="spend-image-top">
                      <span className="spend-channel-live">Live Spend Feed</span>
                      <span className="spend-platform-tag">Wallet + Exchange</span>
                    </div>
                    <div className="spend-profile-line">
                      <span className="spend-avatar-dot" />
                      <div>
                        <strong>Global card route active</strong>
                        <p>Trust Wallet, MetaMask, KuCoin and Kraken linked</p>
                      </div>
                    </div>
                    <div className="spend-flow-legend">
                      <span>Web3 card payments</span>
                      <span>Security checks</span>
                    </div>
                  </div>

                  <div className="spend-chart-card" aria-hidden="true">
                    <p className="spend-chart-title">Daily Card Spend</p>
                    <div className="spend-candle-strip">
                      <span style={{ "--bar-height": "30%" } as CSSProperties} />
                      <span style={{ "--bar-height": "38%" } as CSSProperties} />
                      <span style={{ "--bar-height": "34%" } as CSSProperties} />
                      <span style={{ "--bar-height": "47%" } as CSSProperties} />
                      <span style={{ "--bar-height": "42%" } as CSSProperties} />
                      <span style={{ "--bar-height": "58%" } as CSSProperties} />
                      <span style={{ "--bar-height": "53%" } as CSSProperties} />
                      <span style={{ "--bar-height": "66%" } as CSSProperties} />
                      <span style={{ "--bar-height": "62%" } as CSSProperties} />
                      <span style={{ "--bar-height": "70%" } as CSSProperties} />
                      <span style={{ "--bar-height": "64%" } as CSSProperties} />
                      <span style={{ "--bar-height": "76%" } as CSSProperties} />
                      <span style={{ "--bar-height": "69%" } as CSSProperties} />
                      <span style={{ "--bar-height": "81%" } as CSSProperties} />
                    </div>
                    <svg className="spend-line" viewBox="0 0 220 74" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="spendArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f8cff" stopOpacity="0.36" />
                          <stop offset="100%" stopColor="#4f8cff" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path className="spend-grid-line" d="M0 16 H220" />
                      <path className="spend-grid-line" d="M0 36 H220" />
                      <path className="spend-grid-line" d="M0 56 H220" />
                      <path className="spend-area" d="M6 63 L24 58 L42 60 L60 52 L82 54 L104 44 L126 46 L148 36 L170 38 L214 30 L214 70 L6 70 Z" />
                      <path className="spend-main-line" d="M6 63 L24 58 L42 60 L60 52 L82 54 L104 44 L126 46 L148 36 L170 38 L214 30" />
                      <path className="spend-alt-line" d="M6 66 L24 63 L42 64 L60 58 L82 59 L104 52 L126 54 L148 45 L170 47 L214 40" />
                    </svg>
                    <div className="spend-chart-foot">
                      <strong>$10,293.67</strong>
                      <span>24h settled volume</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="how-cards-column">
            <article className="how-step-card how-step-connect">
              <div className="how-step-icon" aria-hidden="true">
                <HowStepIcon type="connect" />
              </div>
              <div>
                <h3>1. Connect</h3>
                <p>Connect your wallet or exchange account and verify ownership through secure onboarding and standard Web3 account proofs.</p>
              </div>
            </article>

            <article className="how-step-card how-step-issue">
              <div className="how-step-icon" aria-hidden="true">
                <HowStepIcon type="issue" />
              </div>
              <div>
                <h3>2. Issue</h3>
                <p>Generate a virtual debit card that attaches to your selected crypto balance and payment routes powered by programmable Web3 account access.</p>
              </div>
            </article>

            <article className="how-step-card how-step-control">
              <div className="how-step-icon" aria-hidden="true">
                <HowStepIcon type="control" />
              </div>
              <div>
                <h3>3. Control</h3>
                <p>Apply risk rules, spend limits, freeze controls, and security policies before every transaction.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section
        ref={finalCtaRef}
        className={`final-cta-section panel ${stackMotion.reverseProgress > 0.06 ? "in-view" : ""}`}
      >
        <div className="final-cta-coin final-cta-coin-top">
          <div className="final-cta-coin-core coin-usdc" aria-hidden="true">
            <img
              className="coin-brand-logo"
              src="https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/btc.png"
              alt=""
              loading="lazy"
            />
          </div>
        </div>

        <div className="final-cta-coin final-cta-coin-bottom">
          <div className="final-cta-coin-core coin-btc" aria-hidden="true">
            <img
              className="coin-brand-logo"
              src="https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/eth.png"
              alt=""
              loading="lazy"
            />
          </div>
        </div>

        <div className="final-cta-coin final-cta-coin-left-mid">
          <div className="final-cta-coin-core coin-sol" aria-hidden="true">
            <img
              className="coin-brand-logo"
              src="https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/sol.png"
              alt=""
              loading="lazy"
            />
          </div>
        </div>

        <div className="final-cta-coin final-cta-coin-right-mid">
          <div className="final-cta-coin-core coin-eth" aria-hidden="true">
            <img
              className="coin-brand-logo"
              src="https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/usdt.png"
              alt=""
              loading="lazy"
            />
          </div>
        </div>

        <div className="final-cta-content">
          <h2>Ready for Your Virtual Crypto Card?</h2>
          <p className="muted">Take the first step. Link your wallet and start spending globally with confidence.</p>
          <div className="button-row final-cta-actions">
            <Link className="primary-button" href="/link-wallet">
              Link Wallet
            </Link>
          </div>
          <div className="final-cta-meta">
            <div className="final-store-badges">
              <a className="store-badge-image-link" href="#" aria-label="Download on the App Store">
                <img
                  className="store-badge-image"
                  src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                  alt="Download on the App Store"
                  loading="lazy"
                />
              </a>
              <a className="store-badge-image-link" href="#" aria-label="Get it on Google Play">
                <img
                  className="store-badge-image"
                  src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                  alt="Get it on Google Play"
                  loading="lazy"
                />
              </a>
            </div>
            <p className="final-store-coming-soon">Coming soon to App Store and Google Play</p>
            <div className="final-legal-links">
              <Link href="#">Privacy Policy</Link>
              <span aria-hidden="true">|</span>
              <Link href="#">Terms of Service</Link>
              <span aria-hidden="true">|</span>
              <Link href="#">Cardholder Agreement</Link>
            </div>
          </div>
        </div>
      </section>

      <div className="page-bottom-space" aria-hidden="true" />
    </main>
  );
}



