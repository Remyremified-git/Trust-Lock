"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type PortalUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  anti_phishing_code?: string | null;
  created_at: string;
  last_login_at: string | null;
  lead_profile?: { phone?: string | null; country?: string | null; preferredDesk?: string | null; notes?: string | null } | null;
};
type LinkedAccount = { id: string; providerType: string; providerName: string; status: string };
type ApiCredential = { id: string; venue: string; label: string; permissions: string[] };
type WithdrawalAddress = { id: string; assetSymbol: string; network: string; label: string; isVerified: boolean };
type DebitCard = {
  id: string; cardholder_name: string; masked_pan: string; network: "VISA" | "MASTERCARD";
  status: "PENDING_ISSUE" | "ACTIVE" | "FROZEN" | "BLOCKED" | "CLOSED";
  available_balance_usd: number; daily_spend_limit_usd: number; monthly_spend_limit_usd: number;
  spent_today_usd: number; spent_month_usd: number; freeze_reason: string | null;
};
type CardTxn = { id: string; type: string; status: string; amount_usd: number; merchant_name: string | null; reference: string; created_at: string };
type CardIssue = { id: string; issue_type: string; status: string; subject: string; updated_at: string; card: { network: string; last4: string } | null };

const money = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v);
const when = (v: string | null) => (v ? new Date(v).toLocaleString() : "n/a");

export default function PortalPage() {
  const [status, setStatus] = useState("Loading control panel...");
  const [user, setUser] = useState<PortalUser | null>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [apiCredentials, setApiCredentials] = useState<ApiCredential[]>([]);
  const [withdrawalAddresses, setWithdrawalAddresses] = useState<WithdrawalAddress[]>([]);
  const [cards, setCards] = useState<DebitCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [txns, setTxns] = useState<CardTxn[]>([]);
  const [issues, setIssues] = useState<CardIssue[]>([]);

  const [antiPhishingCode, setAntiPhishingCode] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [desk, setDesk] = useState("");
  const [notes, setNotes] = useState("");

  const [cardholderName, setCardholderName] = useState("");
  const [cardNetwork, setCardNetwork] = useState<"VISA" | "MASTERCARD">("VISA");
  const [isVirtual, setIsVirtual] = useState(true);
  const [topupAmount, setTopupAmount] = useState("250");
  const [topupAsset, setTopupAsset] = useState("USDT");
  const [spendAmount, setSpendAmount] = useState("40");
  const [merchant, setMerchant] = useState("Online Purchase");
  const [freezeReason, setFreezeReason] = useState("Suspicious activity");
  const [issueType, setIssueType] = useState("OTHER");
  const [issueSubject, setIssueSubject] = useState("");
  const [issueDescription, setIssueDescription] = useState("");

  const selected = useMemo(() => cards.find((c) => c.id === selectedCardId) ?? null, [cards, selectedCardId]);
  const totalCardBalance = useMemo(() => cards.reduce((s, c) => s + c.available_balance_usd, 0), [cards]);

  async function loadMe() {
    const r = await fetch("/api/auth/me");
    const p = (await r.json()) as { ok: boolean; user?: PortalUser; error?: string };
    if (!p.ok || !p.user) throw new Error(p.error ?? "No active session");
    setUser(p.user);
    setAntiPhishingCode(p.user.anti_phishing_code ?? "");
    setPhone(p.user.lead_profile?.phone ?? "");
    setCountry(p.user.lead_profile?.country ?? "");
    setDesk(p.user.lead_profile?.preferredDesk ?? "");
    setNotes(p.user.lead_profile?.notes ?? "");
  }

  async function loadAux() {
    const [a, k, w, c, i] = await Promise.all([
      fetch("/api/linking/accounts"),
      fetch("/api/linking/api-credentials"),
      fetch("/api/security/withdrawal-addresses"),
      fetch("/api/cards"),
      fetch("/api/cards/issues"),
    ]);
    const ap = (await a.json()) as { ok: boolean; linked_accounts?: LinkedAccount[] };
    const kp = (await k.json()) as { ok: boolean; api_credentials?: ApiCredential[] };
    const wp = (await w.json()) as { ok: boolean; withdrawal_addresses?: WithdrawalAddress[] };
    const cp = (await c.json()) as { ok: boolean; cards?: DebitCard[] };
    const ip = (await i.json()) as { ok: boolean; tickets?: CardIssue[] };
    if (ap.ok) setLinkedAccounts(ap.linked_accounts ?? []);
    if (kp.ok) setApiCredentials(kp.api_credentials ?? []);
    if (wp.ok) setWithdrawalAddresses(wp.withdrawal_addresses ?? []);
    if (cp.ok) {
      const next = cp.cards ?? [];
      setCards(next);
      setSelectedCardId((cur) => (cur && next.some((x) => x.id === cur) ? cur : next[0]?.id ?? ""));
    }
    if (ip.ok) setIssues(ip.tickets ?? []);
  }

  async function loadTxns(cardId?: string) {
    const id = cardId ?? selectedCardId;
    if (!id) return setTxns([]);
    const r = await fetch(`/api/cards/${id}/transactions`);
    const p = (await r.json()) as { ok: boolean; transactions?: CardTxn[]; error?: string };
    if (!p.ok) throw new Error(p.error ?? "Could not load transactions");
    setTxns(p.transactions ?? []);
  }

  async function refreshAll() {
    try {
      setStatus("Syncing data...");
      await Promise.all([loadMe(), loadAux()]);
      setStatus("Control panel ready.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to load panel.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    void refreshAll();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    void loadTxns(selectedCardId);
  }, [selectedCardId]);

  async function saveAntiPhishing(e: FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/portal/anti-phishing-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ anti_phishing_code: antiPhishingCode }) });
    const p = (await r.json()) as { ok: boolean; error?: string };
    setStatus(p.ok ? "Anti-phishing code updated." : p.error ?? "Update failed.");
  }
  async function saveLeadProfile(e: FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/portal/lead-profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: phone || undefined, country: country || undefined, preferred_desk: desk || undefined, notes: notes || undefined }) });
    const p = (await r.json()) as { ok: boolean; error?: string };
    setStatus(p.ok ? "Lead profile updated." : p.error ?? "Update failed.");
  }
  async function issueCard(e: FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/cards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardholder_name: cardholderName, network: cardNetwork, is_virtual: isVirtual }) });
    const p = (await r.json()) as { ok: boolean; error?: string };
    setStatus(p.ok ? "Debit card issued." : p.error ?? "Card issue failed.");
    if (p.ok) { setCardholderName(""); await loadAux(); }
  }
  async function topUp(e: FormEvent) {
    e.preventDefault(); if (!selected) return setStatus("Select a card first.");
    const r = await fetch(`/api/cards/${selected.id}/top-up`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount_usd: Number(topupAmount), source_asset: topupAsset }) });
    const p = (await r.json()) as { ok: boolean; error?: string };
    setStatus(p.ok ? "Card funded." : p.error ?? "Top-up failed.");
    if (p.ok) { await loadAux(); await loadTxns(selected.id); }
  }
  async function spend(e: FormEvent) {
    e.preventDefault(); if (!selected) return setStatus("Select a card first.");
    const r = await fetch(`/api/cards/${selected.id}/spend`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount_usd: Number(spendAmount), merchant_name: merchant }) });
    const p = (await r.json()) as { ok: boolean; error?: string };
    setStatus(p.ok ? "Spend simulated and settled." : p.error ?? "Spend failed.");
    if (p.ok) { await loadAux(); await loadTxns(selected.id); }
  }
  async function toggleFreeze() {
    if (!selected) return setStatus("Select a card first.");
    const freeze = selected.status !== "FROZEN";
    const r = await fetch(`/api/cards/${selected.id}/freeze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ freeze, reason: freezeReason || undefined }) });
    const p = (await r.json()) as { ok: boolean; error?: string };
    setStatus(p.ok ? (freeze ? "Card frozen." : "Card unfrozen.") : p.error ?? "Card freeze update failed.");
    if (p.ok) await loadAux();
  }
  async function openIssue(e: FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/cards/issues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ card_id: selected?.id ?? undefined, issue_type: issueType, subject: issueSubject, description: issueDescription }) });
    const p = (await r.json()) as { ok: boolean; error?: string };
    setStatus(p.ok ? "Issue ticket submitted." : p.error ?? "Issue submission failed.");
    if (p.ok) { setIssueSubject(""); setIssueDescription(""); await loadAux(); }
  }

  return (
    <main className="screen">
      <section className="panel">
        <p className="kicker">User Control Panel</p>
        <h1>Linked wallet and virtual card operations center</h1>
        <div className="button-row"><button type="button" className="secondary-button" onClick={refreshAll}>Refresh all</button></div>
        <p className="muted">{status}</p>
        <div className="stat-grid">
          <article className="stat-card"><p>Total Cards</p><strong>{cards.length}</strong></article>
          <article className="stat-card"><p>Total Card Balance</p><strong>{money(totalCardBalance)}</strong></article>
          <article className="stat-card"><p>Linked Accounts</p><strong>{linkedAccounts.length}</strong></article>
          <article className="stat-card"><p>API Credentials</p><strong>{apiCredentials.length}</strong></article>
        </div>
        {user ? (
          <div className="output-box">
            <p><strong>{user.display_name ?? "User"}</strong> ({user.role})</p>
            <p>{user.email ?? "n/a"} | Created {when(user.created_at)} | Last login {when(user.last_login_at)}</p>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <p className="kicker">What You Control</p>
        <h2>Issue cards, fund balances, and execute controlled spend flows</h2>
        <div className="control-grid">
          <article className="feature-card">
            <h3>Issue Card</h3>
            <form className="stack" onSubmit={issueCard}>
              <label className="field"><span>Cardholder</span><input value={cardholderName} onChange={(e) => setCardholderName(e.target.value)} required /></label>
              <label className="field"><span>Network</span><select value={cardNetwork} onChange={(e) => setCardNetwork(e.target.value as "VISA" | "MASTERCARD")}><option value="VISA">VISA</option><option value="MASTERCARD">MASTERCARD</option></select></label>
              <label className="checkbox"><input type="checkbox" checked={isVirtual} onChange={(e) => setIsVirtual(e.target.checked)} /><span>Virtual card</span></label>
              <button className="primary-button" type="submit">Issue card</button>
            </form>
            <div className="list-stack">{cards.map((c) => <button key={c.id} type="button" onClick={() => setSelectedCardId(c.id)} className={`card-tile ${selectedCardId === c.id ? "active" : ""}`}><div className="card-tile-row"><strong>{c.network}</strong><span className={`status-chip status-${c.status.toLowerCase()}`}>{c.status}</span></div><span>{c.masked_pan}</span><span>{money(c.available_balance_usd)}</span></button>)}</div>
          </article>

          <article className="feature-card">
            <h3>Card Controls</h3>
            {selected ? (
              <>
                <div className="output-box"><p><strong>{selected.cardholder_name}</strong> {selected.masked_pan}</p><p>Balance {money(selected.available_balance_usd)}</p><p>Limits: {money(selected.daily_spend_limit_usd)} daily / {money(selected.monthly_spend_limit_usd)} monthly</p><p>Usage: {money(selected.spent_today_usd)} today / {money(selected.spent_month_usd)} month</p></div>
                <form className="stack" onSubmit={topUp}>
                  <label className="field"><span>Top-up USD</span><input type="number" min={1} step="0.01" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} /></label>
                  <label className="field"><span>Source Asset</span><input value={topupAsset} onChange={(e) => setTopupAsset(e.target.value)} /></label>
                  <button className="secondary-button" type="submit">Top up</button>
                </form>
                <form className="stack" onSubmit={spend}>
                  <label className="field"><span>Spend USD</span><input type="number" min={0.5} step="0.01" value={spendAmount} onChange={(e) => setSpendAmount(e.target.value)} /></label>
                  <label className="field"><span>Merchant</span><input value={merchant} onChange={(e) => setMerchant(e.target.value)} required /></label>
                  <button className="secondary-button" type="submit">Spend</button>
                </form>
                <label className="field"><span>Freeze reason</span><input value={freezeReason} onChange={(e) => setFreezeReason(e.target.value)} /></label>
                <button type="button" className="danger-button" onClick={toggleFreeze}>{selected.status === "FROZEN" ? "Unfreeze" : "Freeze"} card</button>
              </>
            ) : <p>Select a card.</p>}
          </article>
        </div>

        <div className="control-grid">
          <article className="feature-card">
            <h3>Recent Card Transactions</h3>
            <div className="table-shell"><table className="data-table"><thead><tr><th>Type</th><th>Status</th><th>Amount</th><th>Merchant</th><th>Ref</th><th>Time</th></tr></thead><tbody>{txns.length ? txns.map((t) => <tr key={t.id}><td>{t.type}</td><td><span className={`status-chip status-${t.status.toLowerCase()}`}>{t.status}</span></td><td>{money(t.amount_usd)}</td><td>{t.merchant_name ?? "-"}</td><td>{t.reference}</td><td>{when(t.created_at)}</td></tr>) : <tr><td colSpan={6} className="table-empty">No transactions yet.</td></tr>}</tbody></table></div>
          </article>
          <article className="feature-card">
            <h3>Card Issues</h3>
            <form className="stack" onSubmit={openIssue}>
              <label className="field"><span>Type</span><select value={issueType} onChange={(e) => setIssueType(e.target.value)}><option value="LOST_STOLEN">Lost/Stolen</option><option value="CARD_NOT_RECEIVED">Card Not Received</option><option value="CHARGEBACK">Chargeback</option><option value="FRAUD">Fraud</option><option value="LIMIT_CHANGE">Limit Change</option><option value="OTHER">Other</option></select></label>
              <label className="field"><span>Subject</span><input value={issueSubject} onChange={(e) => setIssueSubject(e.target.value)} required /></label>
              <label className="field"><span>Description</span><textarea rows={3} value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} required /></label>
              <button className="primary-button" type="submit">Submit issue</button>
            </form>
            <div className="table-shell"><table className="data-table"><thead><tr><th>Issue</th><th>Status</th><th>Card</th><th>Subject</th><th>Updated</th></tr></thead><tbody>{issues.length ? issues.map((i) => <tr key={i.id}><td>{i.issue_type}</td><td><span className={`status-chip status-${i.status.toLowerCase()}`}>{i.status}</span></td><td>{i.card ? `${i.card.network} •••• ${i.card.last4}` : "n/a"}</td><td>{i.subject}</td><td>{when(i.updated_at)}</td></tr>) : <tr><td colSpan={5} className="table-empty">No issues yet.</td></tr>}</tbody></table></div>
          </article>
        </div>
      </section>

      <section className="panel">
        <p className="kicker">How You Stay Protected</p>
        <div className="feature-grid">
          <article className="feature-card">
            <h3>Anti-Phishing Code</h3>
            <form className="stack" onSubmit={saveAntiPhishing}>
              <label className="field"><span>Code</span><input value={antiPhishingCode} onChange={(e) => setAntiPhishingCode(e.target.value)} /></label>
              <button className="primary-button" type="submit">Save</button>
            </form>
          </article>
          <article className="feature-card">
            <h3>Lead Profile</h3>
            <form className="stack" onSubmit={saveLeadProfile}>
              <label className="field"><span>Phone</span><input value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
              <label className="field"><span>Country</span><input value={country} onChange={(e) => setCountry(e.target.value)} /></label>
              <label className="field"><span>Preferred Desk</span><input value={desk} onChange={(e) => setDesk(e.target.value)} /></label>
              <label className="field"><span>Notes</span><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
              <button className="primary-button" type="submit">Save</button>
            </form>
          </article>
          <article className="feature-card"><h3>Linked Accounts</h3><p>{linkedAccounts.length} linked accounts active.</p><div className="output-box">{linkedAccounts.map((a) => <span key={a.id}>{a.providerName} ({a.providerType}) - {a.status}</span>)}</div></article>
          <article className="feature-card"><h3>API Credentials</h3><p>{apiCredentials.length} credentials vaulted.</p><div className="output-box">{apiCredentials.map((k) => <span key={k.id}>{k.venue} - {k.label} [{(k.permissions ?? []).join(", ")}]</span>)}</div></article>
          <article className="feature-card"><h3>Withdrawal Whitelist</h3><p>{withdrawalAddresses.length} addresses tracked.</p><div className="output-box">{withdrawalAddresses.map((w) => <span key={w.id}>{w.assetSymbol} {w.network} - {w.label} ({w.isVerified ? "Verified" : "Pending"})</span>)}</div></article>
        </div>
      </section>
    </main>
  );
}
