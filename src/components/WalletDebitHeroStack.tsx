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
};

export default function WalletDebitHeroStack({ className = "" }: WalletDebitHeroStackProps) {
  return (
    <div className={`debit-stack-shell ${className}`.trim()} aria-label="Floating stack of linked debit cards">
      <div className="debit-stack-aura" aria-hidden="true" />
      {debitCards.map((card, index) => (
        <article
          key={card.id}
          className={`debit-card debit-card--${card.theme}`}
          style={
            {
              "--index": index,
              "--delay": `${index * 0.15}s`,
              "--float-range": `${10 + index * 1.8}px`,
              "--drift-range": `${3 + index * 0.8}px`,
              "--reshuffle-delay": `${index * 0.32}s`,
              zIndex: debitCards.length - index,
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
      ))}
    </div>
  );
}
