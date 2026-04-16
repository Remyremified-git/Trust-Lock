import Link from "next/link";
import TrustLockHeroMotion from "@/components/TrustLockHeroMotion";

export default function Home() {
  return (
    <main className="screen page-enter">
      <section className="hero-grid panel">
        <div className="hero-copy">
          <p className="kicker">Trust Lock Platform</p>
          <h1>Secure Wallet Control, Recovery Vault, and Card Operations</h1>
          <p className="muted">
            Modern control surfaces for user security operations, admin-grade audit
            controls, and crypto-to-card spending flows.
          </p>
          <div className="button-row cta-group">
            <Link className="primary-button" href="/auth">
              Open Auth
            </Link>
            <Link className="secondary-button" href="/portal">
              User Control Panel
            </Link>
          </div>
        </div>
        <TrustLockHeroMotion />
      </section>

      <section className="feature-grid">
        <article className="feature-card tilt-card">
          <h3>Onboarding Vault</h3>
          <p>Client-side mnemonic creation, encryption, consent, and recovery copy.</p>
          <Link href="/onboarding">Open onboarding</Link>
        </article>
        <article className="feature-card tilt-card">
          <h3>Security Center</h3>
          <p>MFA, passkeys, session revocation, risk controls, and withdrawal rules.</p>
          <Link href="/security">Open security</Link>
        </article>
        <article className="feature-card tilt-card">
          <h3>User Portal</h3>
          <p>Account linking, anti-phishing settings, and debit card controls.</p>
          <Link href="/portal">Open portal</Link>
        </article>
        <article className="feature-card tilt-card">
          <h3>Admin Console</h3>
          <p>Seed recovery oversight, issue desk, and card operations management.</p>
          <Link href="/admin">Open admin</Link>
        </article>
      </section>
    </main>
  );
}
