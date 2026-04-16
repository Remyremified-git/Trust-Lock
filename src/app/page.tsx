import Link from "next/link";

export default function Home() {
  return (
    <main className="screen">
      <section className="panel">
        <p className="kicker">Hybrid Key Vault Platform</p>
        <h1>Secure Wallet Keys + Admin Recovery Layer</h1>
        <p className="muted">
          Environment scaffold includes consent flows, encrypted seed transport,
          admin-only seed vault retrieval, and user security preference controls.
        </p>

        <div className="feature-grid">
          <div className="feature-card">
            <h3>Native Auth</h3>
            <p>Custom signup/login/logout/session cookies without Clerk.</p>
            <Link href="/auth">Open auth</Link>
          </div>
          <div className="feature-card">
            <h3>User Portal</h3>
            <p>Front control panel for user profile, security, linking, and debit cards.</p>
            <Link href="/portal">Open portal</Link>
          </div>
          <div className="feature-card">
            <h3>Onboarding + Seed Consent</h3>
            <p>Local mnemonic generation, encryption, checksum, admin vault copy.</p>
            <Link href="/onboarding">Open onboarding</Link>
          </div>
          <div className="feature-card">
            <h3>Security Dashboard</h3>
            <p>Risk threshold, firewall controls, delay policies, trusted contacts.</p>
            <Link href="/security">Open security controls</Link>
          </div>
          <div className="feature-card">
            <h3>Admin Operations Panel</h3>
            <p>Seed vault access plus debit-card controls and issue resolution desk.</p>
            <Link href="/admin">Open admin panel</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
