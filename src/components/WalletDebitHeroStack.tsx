import type { CSSProperties } from "react";

const debitCards = [
  { id: "atlas", theme: "atlas", tone: "Atlas Black", holder: "Core Wallet", network: "VISA", last4: "1391" },
  { id: "neo", theme: "neo", tone: "Neo Indigo", holder: "Travel Wallet", network: "Mastercard", last4: "6624" },
  { id: "nova", theme: "nova", tone: "Nova Cyan", holder: "Spend Wallet", network: "VISA", last4: "4483" },
  { id: "luna", theme: "luna", tone: "Luna Violet", holder: "Rewards Wallet", network: "Mastercard", last4: "5097" },
  { id: "ember", theme: "ember", tone: "Ember Rose", holder: "Family Wallet", network: "VISA", last4: "2756" },
  { id: "mint", theme: "mint", tone: "Mint Green", holder: "Business Wallet", network: "Mastercard", last4: "8142" },
] as const;

type WalletDebitHeroStackProps = {
  className?: string;
  progress?: number;
  mergeProgress?: number;
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export default function WalletDebitHeroStack({
  className = "",
  progress = 0,
  mergeProgress = 0,
}: WalletDebitHeroStackProps) {
  const normalizedProgress = clamp(progress);
  const easedProgress =
    normalizedProgress * normalizedProgress * (3 - 2 * normalizedProgress);
  const fanProgress = smoothstep(0.2, 0.68, easedProgress);
  const mergeAmount = smoothstep(0.08, 0.94, clamp(mergeProgress));
  const center = (debitCards.length - 1) / 2;

  return (
    <div className={`debit-stack-shell ${className}`.trim()} aria-label="Floating stack of linked debit cards">
      <div className="debit-stack-aura" aria-hidden="true" />
      {debitCards.map((card, index) => {
        const offset = index - center;
        const t = center === 0 ? 0 : offset / center;

        const heroX = offset * 12;
        const heroY = offset * 7 + Math.abs(offset) * 1.8 - 14;
        const heroRotate = offset * -4.4;

        const fanX = Math.sin(t * (Math.PI / 2)) * 92;
        const fanY = Math.pow(Math.abs(t), 1.18) * 62 - 34;
        const fanRotate = t * 42;

        const stagedX = lerp(heroX, fanX, fanProgress);
        const stagedY = lerp(heroY, fanY, fanProgress);
        const stagedRotate = lerp(heroRotate, fanRotate, fanProgress);

        const translateX = lerp(stagedX, 0, mergeAmount);
        const translateY = lerp(stagedY, 0, mergeAmount);
        const rotateZ = lerp(stagedRotate, 0, mergeAmount);
        const rotateX = lerp(7.4, 11.4, fanProgress);
        const rotateY = lerp(-3, t * 6.4, fanProgress);
        const depth = lerp(
          lerp(-Math.abs(offset) * 24, -Math.abs(offset) * 11, fanProgress),
          0,
          mergeAmount,
        );
        const isCenterCard = Math.abs(offset) < 0.01;
        const opacity = isCenterCard ? 1 : 1 - mergeAmount * 1.25;
        const scale = lerp(1, isCenterCard ? 1.04 : 0.91, mergeAmount);
        const visibility = opacity <= 0.01 ? "hidden" : "visible";

        return (
          <article
            key={card.id}
            className={`debit-card debit-card--${card.theme}`}
            style={
              {
                "--index": index,
                "--delay": `${index * 0.15}s`,
                "--float-range": `${10 + index * 1.6}px`,
                "--drift-range": `${2.4 + index * 0.52}px`,
                zIndex: isCenterCard ? debitCards.length + 6 : debitCards.length - index,
                opacity,
                visibility,
                transform: `translate3d(calc(-50% + ${translateX.toFixed(2)}px), calc(-50% + ${translateY.toFixed(2)}px), ${depth.toFixed(2)}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) rotateZ(${rotateZ.toFixed(2)}deg) scale(${scale.toFixed(3)})`,
              } as CSSProperties
            }
          >
            <header className="debit-card__top">
              <span className="debit-card__brand">TRUST LOCK</span>
              <span className="debit-card__network">{card.network}</span>
            </header>
            <p className="debit-card__number">**** **** **** {card.last4}</p>
            <footer className="debit-card__bottom">
              <span>{card.holder}</span>
              <span>{card.tone}</span>
            </footer>
          </article>
        );
      })}
    </div>
  );
}
