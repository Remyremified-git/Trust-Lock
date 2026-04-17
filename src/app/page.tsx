import Link from "next/link";
import WalletDebitHeroStack from "@/components/WalletDebitHeroStack";

export default function Home() {
  return (
    <main className="screen page-enter">
      <section className="hero-grid hero-focus panel">
        <WalletDebitHeroStack />
        <div className="hero-copy hero-copy-right">
          <p className="kicker">Secure Crypto Debit Cards</p>
          <h1>Connect your wallets to a debit card</h1>
          <p className="muted">
            Crypto spending has never been this easy. Support a range of different wallet types and give yourself
            easy access to global spending, backed by strong card security controls and safer wallet-linked payments.
          </p>
          <div className="button-row cta-group">
            <Link className="primary-button" href="/auth">
              Link Wallet
            </Link>
          </div>
        </div>
      </section>
      <div className="page-bottom-space" aria-hidden="true" />
    </main>
  );
}
