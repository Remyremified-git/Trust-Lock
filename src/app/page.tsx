import Link from "next/link";
import WalletDebitHeroStack from "@/components/WalletDebitHeroStack";

export default function Home() {
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
            <Link className="secondary-button" href="/portal">
              Open Security Center
            </Link>
          </div>
        </div>
        <WalletDebitHeroStack />
      </section>
    </main>
  );
}
