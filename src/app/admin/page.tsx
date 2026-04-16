"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type AdminSeedResponse = {
  ok: boolean;
  error?: string;
  user_id?: string;
  email?: string | null;
  seed_phrase?: string;
  consent_timestamp?: string;
  created_at?: string;
  last_accessed?: string | null;
};

type AdminCard = {
  id: string;
  user_id: string;
  user_email: string | null;
  cardholder_name: string;
  masked_pan: string;
  network: "VISA" | "MASTERCARD";
  status: "PENDING_ISSUE" | "ACTIVE" | "FROZEN" | "BLOCKED" | "CLOSED";
  available_balance_usd: number;
  spent_today_usd: number;
  spent_month_usd: number;
  freeze_reason: string | null;
  created_at: string;
};

type AdminIssue = {
  id: string;
  user_id: string;
  user_email: string | null;
  issue_type: string;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED";
  subject: string;
  updated_at: string;
  card: { network: string; last4: string } | null;
};

const money = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v);
const when = (v: string | null | undefined) => (v ? new Date(v).toLocaleString() : "n/a");

export default function AdminVaultPage() {
  const [adminToken, setAdminToken] = useState("");
  const [statusMessage, setStatusMessage] = useState("Enter admin token to operate.");

  const [userId, setUserId] = useState("");
  const [seedRecord, setSeedRecord] = useState<AdminSeedResponse | null>(null);

  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<AdminCard[]>([]);
  const [issues, setIssues] = useState<AdminIssue[]>([]);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [cardStatus, setCardStatus] = useState<AdminCard["status"]>("ACTIVE");
  const [freezeReason, setFreezeReason] = useState("Admin freeze");
  const [adjustAmount, setAdjustAmount] = useState("0");
  const [adjustNote, setAdjustNote] = useState("Manual balance correction");
  const [selectedIssueId, setSelectedIssueId] = useState("");
  const [issueStatus, setIssueStatus] = useState<AdminIssue["status"]>("IN_REVIEW");
  const [issueResolution, setIssueResolution] = useState("Under review by support.");
  const [issueAdminNote, setIssueAdminNote] = useState("Follow-up in progress");

  const selectedCard = useMemo(
    () => cards.find((card) => card.id === selectedCardId) ?? null,
    [cards, selectedCardId],
  );
  const selectedIssue = useMemo(
    () => issues.find((issue) => issue.id === selectedIssueId) ?? null,
    [issues, selectedIssueId],
  );

  async function loadCards() {
    if (!adminToken) return;
    const response = await fetch(`/api/admin/cards?query=${encodeURIComponent(query)}`, {
      headers: { "x-admin-token": adminToken },
    });
    const payload = (await response.json()) as { ok: boolean; cards?: AdminCard[]; error?: string };
    if (!payload.ok) throw new Error(payload.error ?? "Failed to load cards.");
    const nextCards = payload.cards ?? [];
    setCards(nextCards);
    setSelectedCardId((current) => (current && nextCards.some((x) => x.id === current) ? current : nextCards[0]?.id ?? ""));
  }

  async function loadIssues() {
    if (!adminToken) return;
    const response = await fetch("/api/admin/cards/issues", {
      headers: { "x-admin-token": adminToken },
    });
    const payload = (await response.json()) as { ok: boolean; issues?: AdminIssue[]; error?: string };
    if (!payload.ok) throw new Error(payload.error ?? "Failed to load issues.");
    const nextIssues = payload.issues ?? [];
    setIssues(nextIssues);
    setSelectedIssueId((current) => (current && nextIssues.some((x) => x.id === current) ? current : nextIssues[0]?.id ?? ""));
  }

  async function refreshOps() {
    if (!adminToken) return;
    setStatusMessage("Refreshing admin operations data...");
    try {
      await Promise.all([loadCards(), loadIssues()]);
      setStatusMessage("Admin operations data synced.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to refresh admin data.");
    }
  }

  useEffect(() => {
    if (adminToken) void refreshOps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken]);

  useEffect(() => {
    if (selectedCard) {
      setCardStatus(selectedCard.status);
    }
  }, [selectedCard]);

  useEffect(() => {
    if (selectedIssue) {
      setIssueStatus(selectedIssue.status);
    }
  }, [selectedIssue]);

  async function fetchSeed(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage("Fetching encrypted vault record...");
    setSeedRecord(null);
    const response = await fetch(`/api/admin/vault/seed/${userId}`, {
      headers: { "x-admin-token": adminToken },
    });
    const payload = (await response.json()) as AdminSeedResponse;
    setSeedRecord(payload);
    setStatusMessage(payload.ok ? "Admin seed copy loaded." : payload.error ?? "Failed.");
  }

  async function deleteSeedCopy() {
    if (!userId || !adminToken) return setStatusMessage("Enter token and user id first.");
    const response = await fetch(`/api/admin/vault/seed/${userId}`, {
      method: "DELETE",
      headers: { "x-admin-token": adminToken },
    });
    const payload = (await response.json()) as { ok: boolean; error?: string };
    setStatusMessage(payload.ok ? "Admin seed copy deleted." : payload.error ?? "Failed.");
    if (payload.ok) setSeedRecord(null);
  }

  async function updateCardStatus(event: FormEvent) {
    event.preventDefault();
    if (!selectedCard || !adminToken) return;
    const response = await fetch(`/api/admin/cards/${selectedCard.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
      body: JSON.stringify({ status: cardStatus, freeze_reason: freezeReason || undefined }),
    });
    const payload = (await response.json()) as { ok: boolean; error?: string };
    setStatusMessage(payload.ok ? "Card status updated." : payload.error ?? "Status update failed.");
    if (payload.ok) await loadCards();
  }

  async function adjustCardBalance(event: FormEvent) {
    event.preventDefault();
    if (!selectedCard || !adminToken) return;
    const response = await fetch(`/api/admin/cards/${selectedCard.id}/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
      body: JSON.stringify({ amount_usd: Number(adjustAmount), note: adjustNote }),
    });
    const payload = (await response.json()) as { ok: boolean; error?: string };
    setStatusMessage(payload.ok ? "Card balance adjusted." : payload.error ?? "Adjustment failed.");
    if (payload.ok) await loadCards();
  }

  async function updateIssue(event: FormEvent) {
    event.preventDefault();
    if (!selectedIssue || !adminToken) return;
    const response = await fetch(`/api/admin/cards/issues/${selectedIssue.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
      body: JSON.stringify({
        status: issueStatus,
        resolution_note: issueResolution || undefined,
        admin_note: issueAdminNote || undefined,
      }),
    });
    const payload = (await response.json()) as { ok: boolean; error?: string };
    setStatusMessage(payload.ok ? "Issue updated." : payload.error ?? "Issue update failed.");
    if (payload.ok) await loadIssues();
  }

  return (
    <main className="screen">
      <section className="panel">
        <p className="kicker">Admin Control Panel</p>
        <h1>Recovery Vault, Card Desk, and Issue Resolution</h1>
        <label className="field">
          <span>Admin Token</span>
          <input type="password" value={adminToken} onChange={(e) => setAdminToken(e.target.value)} />
        </label>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={refreshOps}>Refresh card desk</button>
        </div>
        <p className="muted">{statusMessage}</p>
      </section>

      <section className="panel">
        <p className="kicker">Seed Vault Controls</p>
        <form className="stack" onSubmit={fetchSeed}>
          <label className="field">
            <span>User ID</span>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} required />
          </label>
          <div className="button-row">
            <button type="submit" className="primary-button">View seed</button>
            <button type="button" className="danger-button" onClick={deleteSeedCopy}>Delete seed copy</button>
          </div>
        </form>
        {seedRecord?.ok ? (
          <div className="output-box">
            <p><strong>User:</strong> {seedRecord.user_id} ({seedRecord.email ?? "n/a"})</p>
            <p><strong>Consent:</strong> {when(seedRecord.consent_timestamp)}</p>
            <p><strong>Created:</strong> {when(seedRecord.created_at)} | <strong>Last accessed:</strong> {when(seedRecord.last_accessed)}</p>
            <p><strong>Seed phrase:</strong> {seedRecord.seed_phrase}</p>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <p className="kicker">Debit Card Admin Desk</p>
        <div className="control-grid">
          <article className="feature-card">
            <h3>Cards</h3>
            <label className="field">
              <span>Search by cardholder/email/pan</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <button type="button" className="secondary-button" onClick={loadCards}>Search cards</button>
            <div className="list-stack">
              {cards.map((card) => (
                <button key={card.id} type="button" className={`card-tile ${selectedCardId === card.id ? "active" : ""}`} onClick={() => setSelectedCardId(card.id)}>
                  <div className="card-tile-row"><strong>{card.network}</strong><span className={`status-chip status-${card.status.toLowerCase()}`}>{card.status}</span></div>
                  <span>{card.masked_pan} | {card.user_email ?? card.user_id}</span>
                  <span>{money(card.available_balance_usd)}</span>
                </button>
              ))}
            </div>
          </article>

          <article className="feature-card">
            <h3>Card Action Console</h3>
            {selectedCard ? (
              <>
                <div className="output-box">
                  <p><strong>{selectedCard.cardholder_name}</strong> ({selectedCard.user_email ?? selectedCard.user_id})</p>
                  <p>{selectedCard.masked_pan} | Created {when(selectedCard.created_at)}</p>
                  <p>Balance {money(selectedCard.available_balance_usd)} | Today {money(selectedCard.spent_today_usd)} | Month {money(selectedCard.spent_month_usd)}</p>
                  <p>Freeze reason: {selectedCard.freeze_reason ?? "n/a"}</p>
                </div>
                <form className="stack" onSubmit={updateCardStatus}>
                  <label className="field">
                    <span>Status</span>
                    <select value={cardStatus} onChange={(e) => setCardStatus(e.target.value as AdminCard["status"])}>
                      <option value="PENDING_ISSUE">PENDING_ISSUE</option><option value="ACTIVE">ACTIVE</option><option value="FROZEN">FROZEN</option><option value="BLOCKED">BLOCKED</option><option value="CLOSED">CLOSED</option>
                    </select>
                  </label>
                  <label className="field"><span>Freeze reason (when freezing/blocking)</span><input value={freezeReason} onChange={(e) => setFreezeReason(e.target.value)} /></label>
                  <button className="secondary-button" type="submit">Update card status</button>
                </form>
                <form className="stack" onSubmit={adjustCardBalance}>
                  <label className="field"><span>Balance Adjustment (USD, +/-)</span><input type="number" step="0.01" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} /></label>
                  <label className="field"><span>Adjustment note</span><input value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} /></label>
                  <button className="danger-button" type="submit">Apply balance adjustment</button>
                </form>
              </>
            ) : <p>Select a card to manage it.</p>}
          </article>
        </div>
      </section>

      <section className="panel">
        <p className="kicker">Issue Resolution Desk</p>
        <div className="control-grid">
          <article className="feature-card">
            <h3>Open Issues</h3>
            <button type="button" className="secondary-button" onClick={loadIssues}>Refresh issues</button>
            <div className="list-stack">
              {issues.map((issue) => (
                <button key={issue.id} type="button" className={`card-tile ${selectedIssueId === issue.id ? "active" : ""}`} onClick={() => setSelectedIssueId(issue.id)}>
                  <div className="card-tile-row"><strong>{issue.issue_type}</strong><span className={`status-chip status-${issue.status.toLowerCase()}`}>{issue.status}</span></div>
                  <span>{issue.subject}</span>
                  <span>{issue.user_email ?? issue.user_id}</span>
                </button>
              ))}
            </div>
          </article>
          <article className="feature-card">
            <h3>Issue Action Console</h3>
            {selectedIssue ? (
              <form className="stack" onSubmit={updateIssue}>
                <div className="output-box">
                  <p><strong>{selectedIssue.subject}</strong></p>
                  <p>{selectedIssue.user_email ?? selectedIssue.user_id}</p>
                  <p>{selectedIssue.card ? `${selectedIssue.card.network} •••• ${selectedIssue.card.last4}` : "No card attached"}</p>
                  <p>Updated: {when(selectedIssue.updated_at)}</p>
                </div>
                <label className="field">
                  <span>Status</span>
                  <select value={issueStatus} onChange={(e) => setIssueStatus(e.target.value as AdminIssue["status"])}>
                    <option value="OPEN">OPEN</option><option value="IN_REVIEW">IN_REVIEW</option><option value="RESOLVED">RESOLVED</option><option value="REJECTED">REJECTED</option>
                  </select>
                </label>
                <label className="field"><span>Resolution note</span><textarea rows={3} value={issueResolution} onChange={(e) => setIssueResolution(e.target.value)} /></label>
                <label className="field"><span>Admin note</span><textarea rows={2} value={issueAdminNote} onChange={(e) => setIssueAdminNote(e.target.value)} /></label>
                <button className="primary-button" type="submit">Update issue</button>
              </form>
            ) : <p>Select an issue to resolve.</p>}
          </article>
        </div>
      </section>
    </main>
  );
}
