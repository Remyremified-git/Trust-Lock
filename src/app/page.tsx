import Link from "next/link";
import WalletDebitHeroStack from "@/components/WalletDebitHeroStack";

export default function Home() {
  return (
    <main className="screen page-enter">
      <section className="hero-grid panel">
        <div className="hero-copy">
          <p className="kicker">Wallet Linked Debit Cards</p>
          <h1>Connect your wallets to a debit card</h1>
          <p className="muted">Get access to unlimited spending.</p>
          <div className="button-row cta-group">
            <Link className="primary-button" href="/auth">
              Link Wallet
            </Link>
            <Link className="secondary-button" href="/portal">
              Open Card Center
            </Link>
          </div>
        </div>
        <WalletDebitHeroStack />
      </section>

      <section className="feature-grid">
        <article className="feature-card tilt-card">
          <h3>Wallet Linking</h3>
          <p>Connect multiple crypto wallets and map spend priorities for each card profile.</p>
          <Link href="/onboarding">Open wallet linking</Link>
        </article>
        <article className="feature-card tilt-card">
          <h3>Card Security</h3>
          <p>Supporting controls: MFA, limits, freeze/unfreeze, anti-phishing, and device trust rules.</p>
          <Link href="/security">Open card security</Link>
        </article>
        <article className="feature-card tilt-card">
          <h3>Spend Portal</h3>
          <p>Manage card spend, regional payment routing, conversion preferences, and statements.</p>
          <Link href="/portal">Open spend portal</Link>
        </article>
        <article className="feature-card tilt-card">
          <h3>Admin Operations</h3>
          <p>Support operations for card lifecycle, wallet-link audits, and issue resolution.</p>
          <Link href="/admin">Open admin operations</Link>
        </article>
      </section>
    </main>
  );
}
