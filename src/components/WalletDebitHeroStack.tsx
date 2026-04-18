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
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

export default function WalletDebitHeroStack({ className = "", progress = 0 }: WalletDebitHeroStackProps) {
  const normalizedProgress = clamp(progress);
  const easedProgress =
    normalizedProgress * normalizedProgress * (3 - 2 * normalizedProgress);
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

        const translateX = lerp(heroX, fanX, easedProgress);
        const translateY = lerp(heroY, fanY, easedProgress);
        const rotateZ = lerp(heroRotate, fanRotate, easedProgress);
        const rotateX = lerp(7.4, 11.4, easedProgress);
        const rotateY = lerp(-3, t * 6.4, easedProgress);
        const depth = lerp(-Math.abs(offset) * 24, -Math.abs(offset) * 11, easedProgress);

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
                zIndex: debitCards.length - index,
                transform: `translate3d(calc(-50% + ${translateX.toFixed(2)}px), calc(-50% + ${translateY.toFixed(2)}px), ${depth.toFixed(2)}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) rotateZ(${rotateZ.toFixed(2)}deg)`,
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
