"use client";

import Link from "next/link";
import type { CSSProperties, FormEvent } from "react";
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

type WalletLinkMode = "walletconnect" | "address_signature";

type WalletProvider = {
  id: string;
  name: string;
  logo: string;
  logoFallback?: string;
  logoFallbackAlt?: string;
  mode: WalletLinkMode;
  linkingHint: string;
  networkHint: string;
};

const walletProviders: WalletProvider[] = [
  {
    id: "trust-wallet",
    name: "Trust Wallet",
    logo: "https://logo.clearbit.com/trustwallet.com",
    logoFallback: "https://cdn.simpleicons.org/trustwallet/3375BB",
    logoFallbackAlt: "https://cryptologos.cc/logos/trust-wallet-token-twt-logo.png?v=040",
    mode: "walletconnect",
    linkingHint: "Pair your wallet session and confirm ownership in the app.",
    networkHint: "Ethereum / BNB / TRON / multi-chain",
  },
  {
    id: "metamask",
    name: "MetaMask",
    logo: "https://logo.clearbit.com/metamask.io",
    logoFallback: "https://cdn.simpleicons.org/metamask/E2761B",
    logoFallbackAlt: "https://cryptologos.cc/logos/metamask-logo.png?v=040",
    mode: "address_signature",
    linkingHint: "Connect and sign a one-time ownership proof.",
    networkHint: "Ethereum / EVM chains",
  },
  {
    id: "exodus",
    name: "Exodus",
    logo: "https://logo.clearbit.com/exodus.com",
    logoFallback: "https://cdn.simpleicons.org/exodus/5A4CFF",
    logoFallbackAlt: "https://logo.clearbit.com/exodus.io",
    mode: "address_signature",
    linkingHint: "Submit wallet address and ownership signature.",
    networkHint: "BTC / ETH / SOL / multi-chain",
  },
  {
    id: "phantom",
    name: "Phantom",
    logo: "https://logo.clearbit.com/phantom.app",
    logoFallback: "https://cdn.simpleicons.org/phantom/AB9FF2",
    logoFallbackAlt: "https://logo.clearbit.com/phantom.com",
    mode: "address_signature",
    linkingHint: "Connect and sign ownership proof from Phantom.",
    networkHint: "Solana / Ethereum / Bitcoin",
  },
  {
    id: "rabby",
    name: "Rabby Wallet",
    logo: "https://logo.clearbit.com/rabby.io",
    logoFallback: "https://cdn.simpleicons.org/rabby/7084FF",
    logoFallbackAlt: "https://logo.clearbit.com/rabbywallet.com",
    mode: "walletconnect",
    linkingHint: "Pair with WalletConnect and approve ownership.",
    networkHint: "Ethereum / EVM chains",
  },
  {
    id: "keplr",
    name: "Keplr",
    logo: "https://logo.clearbit.com/keplr.app",
    logoFallback: "https://cdn.simpleicons.org/keplr/5E4AE3",
    logoFallbackAlt: "https://logo.clearbit.com/keplrwallet.app",
    mode: "address_signature",
    linkingHint: "Connect your account and sign ownership challenge.",
    networkHint: "Cosmos ecosystem chains",
  },
];

export default function Home() {
  const mainRef = useRef<HTMLElement | null>(null);
  const transitionRef = useRef<HTMLElement | null>(null);
  const spotlightRef = useRef<HTMLElement | null>(null);
  const howSectionRef = useRef<HTMLElement | null>(null);
  const finalCtaRef = useRef<HTMLElement | null>(null);
  const heroSlotRef = useRef<HTMLDivElement | null>(null);
  const transitionSlotRef = useRef<HTMLDivElement | null>(null);
  const spotlightSlotRef = useRef<HTMLDivElement | null>(null);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletModalStep, setWalletModalStep] = useState<"select" | "connect">("select");
  const [selectedWallet, setSelectedWallet] = useState<WalletProvider | null>(null);
  const [sessionEmail, setSessionEmail] = useState("");
  const [walletAlias, setWalletAlias] = useState("");
  const [walletConnectUri, setWalletConnectUri] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletNetwork, setWalletNetwork] = useState("Ethereum");
  const [walletSignature, setWalletSignature] = useState("");
  const [linkingStatus, setLinkingStatus] = useState("");
  const [isLinking, setIsLinking] = useState(false);
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
    const params = new URLSearchParams(window.location.search);
    if (params.get("walletModal") === "1") {
      setWalletModalOpen(true);
      setWalletModalStep("select");
      params.delete("walletModal");
      const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", next);
    }
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const payload = (await response.json()) as {
          ok: boolean;
          user?: { email: string | null };
        };
        if (payload.ok && payload.user) {
          setSessionEmail(payload.user.email ?? "");
        } else {
          setSessionEmail("");
        }
      } catch {
        setSessionEmail("");
      }
    };
    void loadSession();
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

  useEffect(() => {
    const revealNodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!revealNodes.length) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (const node of revealNodes) {
        node.classList.add("is-visible");
      }
      return;
    }

    let raf = 0;
    const body = document.body;

    const applyVisibility = () => {
      raf = 0;
      const viewportHeight = window.innerHeight;
      for (const node of revealNodes) {
        const rect = node.getBoundingClientRect();
        const shouldShow = rect.top < viewportHeight * 0.9 && rect.bottom > viewportHeight * 0.1;
        node.classList.toggle("is-visible", shouldShow);
      }
    };

    const scheduleVisibility = () => {
      if (raf) {
        return;
      }
      raf = window.requestAnimationFrame(applyVisibility);
    };

    applyVisibility();
    body.classList.add("reveal-runtime");
    scheduleVisibility();
    window.addEventListener("load", scheduleVisibility);
    window.addEventListener("scroll", scheduleVisibility, { passive: true });
    window.addEventListener("resize", scheduleVisibility);
    window.addEventListener("orientationchange", scheduleVisibility);

    return () => {
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
      body.classList.remove("reveal-runtime");
      window.removeEventListener("load", scheduleVisibility);
      window.removeEventListener("scroll", scheduleVisibility);
      window.removeEventListener("resize", scheduleVisibility);
      window.removeEventListener("orientationchange", scheduleVisibility);
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

  const openWalletModal = () => {
    setWalletModalOpen(true);
    setWalletModalStep("select");
    setLinkingStatus("");
  };

  const closeWalletModal = () => {
    setWalletModalOpen(false);
    setWalletModalStep("select");
    setSelectedWallet(null);
    setWalletAlias("");
    setWalletConnectUri("");
    setWalletAddress("");
    setWalletNetwork("Ethereum");
    setWalletSignature("");
    setLinkingStatus("");
    setIsLinking(false);
  };

  const pickWallet = (wallet: WalletProvider) => {
    setSelectedWallet(wallet);
    setWalletAlias("");
    setWalletConnectUri("");
    setWalletAddress("");
    setWalletSignature("");
    setWalletNetwork("Ethereum");
    setWalletModalStep("connect");
  };

  const submitWalletLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedWallet) return;
    if (!sessionEmail) {
      setLinkingStatus("Session required. Sign in before linking a wallet.");
      return;
    }

    const accountReference =
      selectedWallet.mode === "walletconnect"
        ? walletConnectUri.trim()
        : `${walletNetwork.trim()}:${walletAddress.trim()}`;

    if (!accountReference) {
      setLinkingStatus("Add a valid wallet reference to continue.");
      return;
    }

    try {
      setIsLinking(true);
      setLinkingStatus("Linking wallet...");
      const response = await fetch("/api/linking/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_type: "WALLET",
          provider_name: selectedWallet.name,
          account_label: walletAlias.trim() || `${selectedWallet.name} wallet`,
          account_reference: accountReference,
          access_token: walletSignature.trim() || undefined,
        }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!payload.ok) {
        setLinkingStatus(payload.error ?? "Wallet linking failed.");
        return;
      }
      setLinkingStatus(`${selectedWallet.name} submitted for verification.`);
    } catch (error) {
      setLinkingStatus(error instanceof Error ? error.message : "Wallet link request failed.");
    } finally {
      setIsLinking(false);
    }
  };

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
          <h1 className="reveal-block reveal-rise" data-reveal>
            Attach a virtual spending card to your crypto wallets
          </h1>
          <p className="muted reveal-block reveal-soft-up" data-reveal>
            Link Trust Wallet, MetaMask, Exodus, Phantom, and other major wallets to secure virtual debit cards so you
            can spend globally with tighter control over assets that move through Web3 rails.
          </p>
          <div className="button-row cta-group reveal-block reveal-soft-up" data-reveal>
            <button className="primary-button" type="button" onClick={openWalletModal}>
              Link Wallet
            </button>
          </div>
        </div>
        <div ref={heroSlotRef} className="stack-slot hero-stack-slot" aria-hidden="true" />
      </section>

      <section ref={transitionRef} className="card-transition-section">
        <div className="card-transition-cards reveal-block reveal-rise" data-reveal>
          <div ref={transitionSlotRef} className="stack-slot transition-stack-slot" aria-hidden="true" />
        </div>
        <div className="card-transition-copy">
          <p className="kicker reveal-block reveal-fade-sweep" data-reveal>What We Do</p>
          <h2 className="reveal-block reveal-clip-left" data-reveal>
            We issue linkable virtual cards for wallet accounts
          </h2>
          <p className="muted reveal-block reveal-fade-sweep" data-reveal>
            Trust Lock provisions attachable virtual debit cards designed for crypto users, with route-level card
            controls, asset-aware limits, and secure spend management in one place where Web3 account access can be
            routed from wallets into everyday payments.
          </p>
        </div>
      </section>

      <section ref={spotlightRef} className="spotlight-section">
        <div className="spotlight-copy">
          <p className="kicker reveal-block reveal-fade-sweep" data-reveal>Who It Is For</p>
          <h2 className="reveal-block reveal-blur-right" data-reveal>
            Built for global crypto holders, traders, teams, and high-frequency spenders
          </h2>
          <p className="muted reveal-block reveal-soft-up" data-reveal>
            From single-wallet users to multi-wallet operators, Trust Lock gives each profile a safer card layer for
            day-to-day spending while preserving control over how funds move between Web3 wallets and live spending
            routes.
          </p>
          <div className="button-row cta-group reveal-block reveal-soft-up" data-reveal>
            <button className="primary-button spotlight-cta" type="button" onClick={openWalletModal}>
              Link Wallet
            </button>
          </div>
        </div>
        <div className="card-transition-stage">
          <div className="spotlight-stage">
            <div ref={spotlightSlotRef} className="stack-slot spotlight-stack-slot" aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className="web3-security-section panel">
        <div className="web3-security-top reveal-block reveal-rise" data-reveal>
          <p className="kicker">Web3 Security Core</p>
          <h2>
            Security is anchored in wallet-native proofs, signed ownership checks, and policy-driven spend controls.
          </h2>
        </div>
        <div className="web3-security-divider" aria-hidden="true" />
        <div className="web3-security-bottom">
          <div className="web3-security-bottom-spacer" aria-hidden="true" />
          <div className="web3-security-benefits reveal-block reveal-soft-up" data-reveal>
            <p>
              Trust Lock applies signature-based wallet verification, per-route transaction policy checks, spend-limit
              enforcement, freeze controls, and real-time anomaly screening before card authorization. Users get
              stronger fraud resistance, faster compromise containment, auditable account actions, and safer crypto-to-card
              spending without surrendering control of their Web3 account security posture.
            </p>
          </div>
        </div>
      </section>

      <section ref={howSectionRef} className={`how-section panel ${isHowInView ? "in-view" : ""}`}>
        <div className="how-layout">
          <div className="how-left-column">
            <div className="how-sticky-stage">
              <div className="how-heading-block">
                <p className="kicker reveal-block reveal-fade-sweep" data-reveal>How It Works</p>
                <h2 className="how-hero-title reveal-block reveal-mask-rise" data-reveal>
                  Link account. Issue card. Control spend.
                </h2>
              </div>

              <div className="how-visual-column">
                <div className="how-visual-stage">
                  <div className="spend-image-card reveal-block reveal-rise" data-reveal aria-hidden="true">
                    <div className="spend-image-top">
                      <span className="spend-channel-live">Live Spend Feed</span>
                      <span className="spend-platform-tag">Wallet-linked</span>
                    </div>
                    <div className="spend-profile-line">
                      <span className="spend-avatar-dot" />
                      <div>
                        <strong>Global card route active</strong>
                        <p>Trust Wallet, MetaMask, Exodus and Phantom linked</p>
                      </div>
                    </div>
                    <div className="spend-flow-legend">
                      <span>Web3 card payments</span>
                      <span>Security checks</span>
                    </div>
                  </div>

                  <div className="spend-chart-card reveal-block reveal-scale-glow" data-reveal aria-hidden="true">
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
            <article className="how-step-card how-step-connect reveal-block reveal-soft-up" data-reveal>
              <div className="how-step-icon" aria-hidden="true">
                <HowStepIcon type="connect" />
              </div>
              <div>
                <h3>1. Connect</h3>
                <p>Connect your wallet and verify ownership through secure onboarding and standard Web3 account proofs.</p>
              </div>
            </article>

            <article className="how-step-card how-step-issue reveal-block reveal-soft-up" data-reveal>
              <div className="how-step-icon" aria-hidden="true">
                <HowStepIcon type="issue" />
              </div>
              <div>
                <h3>2. Issue</h3>
                <p>Generate a virtual debit card that attaches to your selected crypto balance and payment routes powered by programmable Web3 account access.</p>
              </div>
            </article>

            <article className="how-step-card how-step-control reveal-block reveal-soft-up" data-reveal>
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
          <h2 className="reveal-block reveal-scale-glow" data-reveal>Ready for Your Virtual Crypto Card?</h2>
          <p className="muted reveal-block reveal-fade-sweep" data-reveal>
            Take the first step. Link your wallet and start spending globally with confidence.
          </p>
          <div className="button-row final-cta-actions reveal-block reveal-soft-up" data-reveal>
            <button className="primary-button" type="button" onClick={openWalletModal}>
              Link Wallet
            </button>
          </div>
          <div className="final-cta-meta reveal-block reveal-fade-sweep" data-reveal>
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

      {walletModalOpen ? (
        <div className="wallet-modal-overlay" role="dialog" aria-modal="true" aria-label="Wallet linking modal">
          <div className="wallet-modal-shell">
            <button
              type="button"
              className="wallet-modal-close"
              aria-label="Close wallet modal"
              onClick={closeWalletModal}
            >
              ×
            </button>

            {walletModalStep === "select" ? (
              <div className="wallet-modal-step">
                <p className="kicker">Wallet Linking</p>
                <h2>Select your wallet platform</h2>
                <p className="muted">
                  Choose your wallet to begin secure ownership verification and card linking.
                </p>
                <div className="wallet-modal-grid">
                  {walletProviders.map((wallet) => (
                    <button
                      type="button"
                      key={wallet.id}
                      className="wallet-logo-button"
                      onClick={() => pickWallet(wallet)}
                      title={wallet.name}
                      aria-label={`Link ${wallet.name}`}
                    >
                      <img
                        src={wallet.logo}
                        alt={`${wallet.name} logo`}
                        loading="lazy"
                        onError={(event) => {
                          const image = event.currentTarget;
                          if (wallet.logoFallback && image.src !== wallet.logoFallback) {
                            image.src = wallet.logoFallback;
                          } else if (wallet.logoFallbackAlt && image.src !== wallet.logoFallbackAlt) {
                            image.src = wallet.logoFallbackAlt;
                          }
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {walletModalStep === "connect" && selectedWallet ? (
              <form className="wallet-modal-step wallet-connect-form" onSubmit={submitWalletLink}>
                <div className="wallet-connect-head">
                  <button
                    type="button"
                    className="wallet-modal-back"
                    onClick={() => setWalletModalStep("select")}
                  >
                    ← Wallets
                  </button>
                  <h2>{selectedWallet.name} wallet linking</h2>
                  <p>{selectedWallet.linkingHint}</p>
                  <p className="wallet-connect-network">Supported networks: {selectedWallet.networkHint}</p>
                </div>

                <div className="wallet-connect-grid">
                  <label className="field">
                    <span>Wallet Label</span>
                    <input
                      value={walletAlias}
                      onChange={(event) => setWalletAlias(event.target.value)}
                      placeholder={`${selectedWallet.name} primary`}
                    />
                  </label>

                  {selectedWallet.mode === "walletconnect" ? (
                    <label className="field">
                      <span>WalletConnect URI</span>
                      <input
                        value={walletConnectUri}
                        onChange={(event) => setWalletConnectUri(event.target.value)}
                        placeholder="wc:xxxx@2?relay-protocol=irn..."
                        required
                      />
                    </label>
                  ) : (
                    <>
                      <label className="field">
                        <span>Network</span>
                        <input
                          value={walletNetwork}
                          onChange={(event) => setWalletNetwork(event.target.value)}
                          placeholder="Ethereum"
                          required
                        />
                      </label>
                      <label className="field">
                        <span>Wallet Address</span>
                        <input
                          value={walletAddress}
                          onChange={(event) => setWalletAddress(event.target.value)}
                          placeholder="0x... or network address"
                          required
                        />
                      </label>
                    </>
                  )}

                  <label className="field">
                    <span>Ownership Signature (optional)</span>
                    <input
                      value={walletSignature}
                      onChange={(event) => setWalletSignature(event.target.value)}
                      placeholder="Signed challenge proof"
                    />
                  </label>
                </div>

                <div className="wallet-connect-actions">
                  <button className="primary-button" type="submit" disabled={isLinking}>
                    {isLinking ? "Linking..." : "Link Wallet"}
                  </button>
                  {linkingStatus ? <p className="wallet-connect-status">{linkingStatus}</p> : null}
                  {!sessionEmail ? (
                    <p className="wallet-connect-auth-hint">
                      Session required. <Link href="/auth">Sign in here</Link>.
                    </p>
                  ) : null}
                  <p className="wallet-connect-safe-note">
                    For your safety, never share your recovery phrase with any app or support agent.
                  </p>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="page-bottom-space" aria-hidden="true" />
    </main>
  );
}



