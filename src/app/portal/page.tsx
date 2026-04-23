"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./page.module.css";

type ThemeMode = "light" | "dark";

type PortalUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  created_at: string;
  last_login_at: string | null;
};

type DebitCard = {
  id: string;
  cardholder_name: string;
  masked_pan: string;
  network: "VISA" | "MASTERCARD";
  status: "PENDING_ISSUE" | "ACTIVE" | "FROZEN" | "BLOCKED" | "CLOSED";
  available_balance_usd: number;
  daily_spend_limit_usd: number;
  monthly_spend_limit_usd: number;
  spent_today_usd: number;
  spent_month_usd: number;
  freeze_reason: string | null;
  expires_month?: number;
  expires_year?: number;
  created_at: string;
};

type CardTxn = {
  id: string;
  type: string;
  status: string;
  amount_usd: number;
  merchant_name: string | null;
  description?: string | null;
  reference: string;
  created_at: string;
  settled_at?: string | null;
};

type CardIssue = {
  id: string;
  issue_type: string;
  status: string;
  subject: string;
  updated_at: string;
  card: { network: string; last4: string } | null;
};

type LinkedAccount = {
  id: string;
  providerType: string;
  providerName: string;
  status: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const compactMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);

const pct = (value: number) => `${value.toFixed(1)}%`;

const formatDateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString() : "n/a";

function readTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }
  const saved = window.localStorage.getItem("trustlock-theme");
  if (saved === "light" || saved === "dark") {
    return saved;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function parseMonthKey(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = date.getMonth();
  return `${year}-${month}`;
}

function lastMonths(count: number): Array<{ key: string; label: string }> {
  const out: Array<{ key: string; label: string }> = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString("en-US", { month: "short" }),
    });
  }
  return out;
}

function buildMonthSpendSeries(txns: CardTxn[]) {
  const months = lastMonths(6);
  const totals = new Map<string, number>();
  for (const txn of txns) {
    if (txn.type !== "SPEND" || txn.status !== "SETTLED") continue;
    const key = parseMonthKey(txn.created_at);
    totals.set(key, (totals.get(key) ?? 0) + txn.amount_usd);
  }
  return months.map((month) => ({
    label: month.label,
    value: totals.get(month.key) ?? 0,
  }));
}

function buildDailySeries(txns: CardTxn[]) {
  const out: Array<{ label: string; value: number }> = [];
  const totals = new Map<string, number>();
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toDateString();
    totals.set(key, 0);
  }
  for (const txn of txns) {
    if (txn.type !== "SPEND" || txn.status !== "SETTLED") continue;
    const key = new Date(txn.created_at).toDateString();
    if (totals.has(key)) {
      totals.set(key, (totals.get(key) ?? 0) + txn.amount_usd);
    }
  }
  for (const [key, value] of totals.entries()) {
    out.push({
      label: new Date(key).toLocaleString("en-US", { weekday: "short" }),
      value,
    });
  }
  return out;
}

function pathForSeries(values: number[], width = 430, height = 140, pad = 12) {
  if (values.length === 0) return "";
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : width - pad * 2;

  return values
    .map((value, index) => {
      const x = pad + step * index;
      const y = height - pad - ((value - min) / range) * (height - pad * 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json()) as T & { ok?: boolean; error?: string };
  if (!response.ok || (typeof payload.ok === "boolean" && !payload.ok)) {
    const message = payload.error ?? `Request failed for ${url}`;
    throw new Error(message);
  }
  return payload;
}

export default function PortalPage() {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Loading dashboard...");
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const [user, setUser] = useState<PortalUser | null>(null);
  const [cards, setCards] = useState<DebitCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [transactionsByCard, setTransactionsByCard] = useState<Record<string, CardTxn[]>>({});
  const [issues, setIssues] = useState<CardIssue[]>([]);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [showCardModal, setShowCardModal] = useState(false);

  const [issueCardholderName, setIssueCardholderName] = useState("");
  const [issueCardNetwork, setIssueCardNetwork] = useState<"VISA" | "MASTERCARD">("VISA");
  const [topUpAmount, setTopUpAmount] = useState("250");
  const [topUpAsset, setTopUpAsset] = useState("USDT");
  const [spendAmount, setSpendAmount] = useState("42");
  const [spendMerchant, setSpendMerchant] = useState("Online Checkout");
  const [spendDescription, setSpendDescription] = useState("Card payment");
  const [freezeReason, setFreezeReason] = useState("Suspicious spend behavior");
  const [blockReason, setBlockReason] = useState("Compromised card details");
  const [ticketType, setTicketType] = useState("OTHER");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("trustlock-theme", theme);
  }, [theme]);

  const selectedCard = useMemo(
    () => cards.find((card) => card.id === selectedCardId) ?? null,
    [cards, selectedCardId],
  );

  const allTransactions = useMemo(
    () =>
      Object.values(transactionsByCard)
        .flat()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [transactionsByCard],
  );

  const selectedTransactions = useMemo(() => {
    if (!selectedCardId) return [];
    return transactionsByCard[selectedCardId] ?? [];
  }, [selectedCardId, transactionsByCard]);

  const totals = useMemo(() => {
    const totalBalance = cards.reduce((sum, card) => sum + card.available_balance_usd, 0);
    const totalDailyLimit = cards.reduce((sum, card) => sum + card.daily_spend_limit_usd, 0);
    const spentToday = cards.reduce((sum, card) => sum + card.spent_today_usd, 0);
    const spentMonth = cards.reduce((sum, card) => sum + card.spent_month_usd, 0);
    const monthTopups = allTransactions
      .filter((txn) => txn.type === "TOP_UP" && txn.status === "SETTLED")
      .reduce((sum, txn) => sum + txn.amount_usd, 0);
    const monthSpends = allTransactions
      .filter((txn) => txn.type === "SPEND" && txn.status === "SETTLED")
      .reduce((sum, txn) => sum + txn.amount_usd, 0);
    const declined = allTransactions.filter((txn) => txn.status === "DECLINED").length;
    const declineRate = allTransactions.length ? (declined / allTransactions.length) * 100 : 0;

    return {
      totalBalance,
      totalDailyLimit,
      spentToday,
      spentMonth,
      monthTopups,
      monthSpends,
      declineRate,
    };
  }, [allTransactions, cards]);

  const spendByMonth = useMemo(() => buildMonthSpendSeries(allTransactions), [allTransactions]);
  const spendByDay = useMemo(() => buildDailySeries(selectedTransactions), [selectedTransactions]);

  const spendLinePath = useMemo(
    () => pathForSeries(spendByDay.map((item) => item.value)),
    [spendByDay],
  );

  const merchantBuckets = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const txn of selectedTransactions) {
      if (txn.type !== "SPEND" || txn.status !== "SETTLED") continue;
      const key = (txn.merchant_name ?? "Unknown").trim() || "Unknown";
      buckets.set(key, (buckets.get(key) ?? 0) + txn.amount_usd);
    }
    const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const total = sorted.reduce((sum, [, value]) => sum + value, 0);
    const colors = ["#5ba7ff", "#7f6dff", "#41d3bc", "#8ec5ff"];
    return sorted.map(([merchant, value], index) => ({
      merchant,
      value,
      percent: total > 0 ? (value / total) * 100 : 0,
      color: colors[index % colors.length],
    }));
  }, [selectedTransactions]);

  const donutGradient = useMemo(() => {
    if (!merchantBuckets.length) {
      return "conic-gradient(#4f6a99 0deg 360deg)";
    }
    let cursor = 0;
    const segments = merchantBuckets.map((bucket) => {
      const start = cursor;
      cursor += bucket.percent * 3.6;
      return `${bucket.color} ${start}deg ${cursor}deg`;
    });
    if (cursor < 360) {
      segments.push(`#2e3c62 ${cursor}deg 360deg`);
    }
    return `conic-gradient(${segments.join(", ")})`;
  }, [merchantBuckets]);

  async function loadDashboard() {
    setLoading(true);
    setStatus("Syncing dashboard data...");
    try {
      const mePayload = await getJson<{ ok: true; user: PortalUser }>("/api/auth/me");
      setUser(mePayload.user);

      const [cardsPayload, issuesPayload, linkedPayload] = await Promise.all([
        getJson<{ ok: true; cards: DebitCard[] }>("/api/cards"),
        getJson<{ ok: true; tickets: CardIssue[] }>("/api/cards/issues"),
        getJson<{ ok: true; linked_accounts: LinkedAccount[] }>("/api/linking/accounts"),
      ]);

      const nextCards = cardsPayload.cards ?? [];
      setCards(nextCards);
      setIssues(issuesPayload.tickets ?? []);
      setLinkedAccounts(linkedPayload.linked_accounts ?? []);

      const nextSelected =
        selectedCardId && nextCards.some((card) => card.id === selectedCardId)
          ? selectedCardId
          : nextCards[0]?.id ?? "";
      setSelectedCardId(nextSelected);

      const txnPairs = await Promise.all(
        nextCards.map(async (card) => {
          const txPayload = await getJson<{ ok: true; transactions: CardTxn[] }>(
            `/api/cards/${card.id}/transactions`,
          );
          return [card.id, txPayload.transactions ?? []] as const;
        }),
      );
      setTransactionsByCard(Object.fromEntries(txnPairs));

      setStatus("Dashboard synced.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load dashboard.";
      setStatus(message);
      setUser(null);
      setCards([]);
      setIssues([]);
      setLinkedAccounts([]);
      setTransactionsByCard({});
      setSelectedCardId("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAction(actionKey: string, task: () => Promise<void>) {
    setActionBusy(actionKey);
    try {
      await task();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action failed.";
      setStatus(message);
    } finally {
      setActionBusy(null);
    }
  }

  async function issueCard(event: FormEvent) {
    event.preventDefault();
    await runAction("issue", async () => {
      await getJson("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardholder_name: issueCardholderName,
          network: issueCardNetwork,
          is_virtual: true,
        }),
      });
      setIssueCardholderName("");
      setStatus("Card issued successfully.");
      await loadDashboard();
    });
  }

  async function topUpCard(event: FormEvent) {
    event.preventDefault();
    if (!selectedCard) {
      setStatus("Select a card first.");
      return;
    }
    await runAction("topup", async () => {
      await getJson(`/api/cards/${selectedCard.id}/top-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_usd: Number(topUpAmount),
          source_asset: topUpAsset,
        }),
      });
      setStatus("Card top-up completed.");
      await loadDashboard();
    });
  }

  async function spendCard(event: FormEvent) {
    event.preventDefault();
    if (!selectedCard) {
      setStatus("Select a card first.");
      return;
    }
    await runAction("spend", async () => {
      await getJson(`/api/cards/${selectedCard.id}/spend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_usd: Number(spendAmount),
          merchant_name: spendMerchant,
          description: spendDescription,
        }),
      });
      setStatus("Spend transaction settled.");
      await loadDashboard();
    });
  }

  async function toggleFreeze() {
    if (!selectedCard) {
      setStatus("Select a card first.");
      return;
    }
    await runAction("freeze", async () => {
      const nextFreeze = selectedCard.status !== "FROZEN";
      await getJson(`/api/cards/${selectedCard.id}/freeze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freeze: nextFreeze,
          reason: freezeReason,
        }),
      });
      setStatus(nextFreeze ? "Card frozen." : "Card reactivated.");
      await loadDashboard();
    });
  }

  async function blockCard() {
    if (!selectedCard) {
      setStatus("Select a card first.");
      return;
    }
    await runAction("block", async () => {
      await getJson(`/api/cards/${selectedCard.id}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: blockReason,
        }),
      });
      setStatus("Card blocked.");
      await loadDashboard();
    });
  }

  async function createIssue(event: FormEvent) {
    event.preventDefault();
    await runAction("ticket", async () => {
      await getJson("/api/cards/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: selectedCard?.id ?? undefined,
          issue_type: ticketType,
          subject: ticketSubject,
          description: ticketDescription,
        }),
      });
      setTicketSubject("");
      setTicketDescription("");
      setStatus("Support issue submitted.");
      await loadDashboard();
    });
  }

  const spendLimitPercent =
    totals.totalDailyLimit > 0 ? Math.min(100, (totals.spentToday / totals.totalDailyLimit) * 100) : 0;

  if (!user && !loading) {
    return (
      <main className={`${styles.portalPage} ${styles.light}`}>
        <section className={styles.authPanel}>
          <p className={styles.kicker}>Session Required</p>
          <h1>Sign in to access your card dashboard</h1>
          <p className={styles.muted}>
            Dashboard operations are tied to live user card data. Please authenticate to continue.
          </p>
          <div className={styles.inlineActions}>
            <Link className={styles.primaryButton} href="/auth">
              Open Auth
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={`${styles.portalPage} ${theme === "dark" ? styles.dark : styles.light}`}>
      <section className={styles.dashboardShell}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.kicker}>User Card Dashboard</p>
            <h1>
              Welcome back, {user?.display_name?.trim() || user?.email?.split("@")[0] || "Operator"}
            </h1>
            <p className={styles.muted}>
              Monitor balances, card health, spend performance, and security actions in one control plane.
            </p>
          </div>
          <div className={styles.topbarActions}>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            >
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
            <button type="button" className={styles.ghostButton} onClick={() => void loadDashboard()}>
              Refresh
            </button>
            <Link className={styles.ghostButton} href="/security">
              Security
            </Link>
          </div>
        </header>

        <div className={styles.statusStrip}>{status}</div>

        <div className={styles.grid}>
          <section className={styles.mainColumn}>
            <article className={styles.glassCard}>
              <div className={styles.sectionHeader}>
                <h2>My Cards</h2>
                <button type="button" className={styles.secondaryButton} onClick={() => setShowCardModal(true)}>
                  View Card
                </button>
              </div>
              <div className={styles.cardRail}>
                {cards.length ? (
                  cards.map((card, index) => {
                    const selected = card.id === selectedCardId;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        className={`${styles.virtualCard} ${styles[`tone${(index % 6) + 1}`]} ${selected ? styles.cardActive : ""}`}
                        onClick={() => setSelectedCardId(card.id)}
                      >
                        <div className={styles.cardTop}>
                          <span>TRUST LOCK</span>
                          <span>{card.network}</span>
                        </div>
                        <div className={styles.cardNumber}>{card.masked_pan}</div>
                        <div className={styles.cardBottom}>
                          <span>{card.cardholder_name}</span>
                          <span>{money(card.available_balance_usd)}</span>
                        </div>
                        <div className={`${styles.statusChip} ${styles[`status${card.status}`]}`}>{card.status}</div>
                      </button>
                    );
                  })
                ) : (
                  <div className={styles.emptySurface}>No cards yet. Issue your first card from Quick Actions.</div>
                )}
              </div>
            </article>

            <div className={styles.chartGrid}>
              <article className={styles.glassCard}>
                <div className={styles.sectionHeader}>
                  <h2>Spend by Month</h2>
                  <span className={styles.metricTag}>{compactMoney(totals.monthSpends)}</span>
                </div>
                <div className={styles.barChart}>
                  {spendByMonth.map((item) => {
                    const peak = Math.max(...spendByMonth.map((entry) => entry.value), 1);
                    const height = `${Math.max(8, (item.value / peak) * 100)}%`;
                    return (
                      <div key={item.label} className={styles.barCol}>
                        <span className={styles.barFill} style={{ height } as CSSProperties} />
                        <span className={styles.barLabel}>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className={styles.glassCard}>
                <div className={styles.sectionHeader}>
                  <h2>7-Day Spend Trend</h2>
                  <span className={styles.metricTag}>{selectedCard ? selectedCard.network : "No card"}</span>
                </div>
                <svg className={styles.lineChart} viewBox="0 0 430 140" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7ca7ff" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#5f57ff" stopOpacity="0.2" />
                    </linearGradient>
                  </defs>
                  <path d={spendLinePath} fill="none" stroke="url(#lineGlow)" strokeWidth="4" strokeLinecap="round" />
                </svg>
                <div className={styles.lineLegend}>
                  {spendByDay.map((item) => (
                    <span key={item.label}>
                      {item.label}: {compactMoney(item.value)}
                    </span>
                  ))}
                </div>
              </article>
            </div>

            <article className={styles.glassCard}>
              <div className={styles.sectionHeader}>
                <h2>Recent Transactions</h2>
                <span className={styles.metricTag}>{selectedTransactions.length} records</span>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Merchant</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Amount</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTransactions.length ? (
                      selectedTransactions.slice(0, 20).map((txn) => (
                        <tr key={txn.id}>
                          <td>{txn.merchant_name || txn.description || "-"}</td>
                          <td>{txn.type}</td>
                          <td>
                            <span className={`${styles.statusChip} ${styles[`statusTxn${txn.status}`]}`}>
                              {txn.status}
                            </span>
                          </td>
                          <td>{money(txn.amount_usd)}</td>
                          <td>{formatDateTime(txn.created_at)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className={styles.emptyCell}>
                          No transactions for this card yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </section>

          <aside className={styles.sideColumn}>
            <article className={styles.glassCard}>
              <h2>Live Snapshot</h2>
              <div className={styles.metricsList}>
                <div className={styles.metricRow}>
                  <span>Total Balance</span>
                  <strong>{money(totals.totalBalance)}</strong>
                </div>
                <div className={styles.metricRow}>
                  <span>Month Top-ups</span>
                  <strong>{money(totals.monthTopups)}</strong>
                </div>
                <div className={styles.metricRow}>
                  <span>Month Spend</span>
                  <strong>{money(totals.monthSpends)}</strong>
                </div>
                <div className={styles.metricRow}>
                  <span>Decline Rate</span>
                  <strong>{pct(totals.declineRate)}</strong>
                </div>
              </div>
              <div className={styles.limitTrack}>
                <div className={styles.limitFill} style={{ width: `${spendLimitPercent}%` }} />
              </div>
              <p className={styles.muted}>
                Daily spend usage: {money(totals.spentToday)} / {money(totals.totalDailyLimit)}
              </p>
            </article>

            <article className={styles.glassCard}>
              <h2>Merchant Split</h2>
              <div className={styles.donutRow}>
                <div className={styles.donut} style={{ background: donutGradient }} />
                <div className={styles.legend}>
                  {merchantBuckets.length ? (
                    merchantBuckets.map((item) => (
                      <div key={item.merchant} className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: item.color }} />
                        <span>{item.merchant}</span>
                        <strong>{pct(item.percent)}</strong>
                      </div>
                    ))
                  ) : (
                    <p className={styles.muted}>Not enough spend data yet.</p>
                  )}
                </div>
              </div>
            </article>

            <article className={styles.glassCard}>
              <h2>Quick Actions</h2>
              <form className={styles.formStack} onSubmit={issueCard}>
                <label className={styles.field}>
                  <span>Issue cardholder name</span>
                  <input
                    value={issueCardholderName}
                    onChange={(event) => setIssueCardholderName(event.target.value)}
                    placeholder="Wallet owner name"
                    required
                  />
                </label>
                <label className={styles.field}>
                  <span>Network</span>
                  <select
                    value={issueCardNetwork}
                    onChange={(event) => setIssueCardNetwork(event.target.value as "VISA" | "MASTERCARD")}
                  >
                    <option value="VISA">VISA</option>
                    <option value="MASTERCARD">MASTERCARD</option>
                  </select>
                </label>
                <button className={styles.primaryButton} type="submit" disabled={actionBusy === "issue"}>
                  {actionBusy === "issue" ? "Issuing..." : "Issue New Card"}
                </button>
              </form>

              <form className={styles.formStack} onSubmit={topUpCard}>
                <label className={styles.field}>
                  <span>Top-up (USD)</span>
                  <input
                    type="number"
                    min={1}
                    step="0.01"
                    value={topUpAmount}
                    onChange={(event) => setTopUpAmount(event.target.value)}
                    required
                  />
                </label>
                <label className={styles.field}>
                  <span>Asset source</span>
                  <input value={topUpAsset} onChange={(event) => setTopUpAsset(event.target.value)} />
                </label>
                <button className={styles.secondaryButton} type="submit" disabled={actionBusy === "topup"}>
                  {actionBusy === "topup" ? "Processing..." : "Top-up Card"}
                </button>
              </form>

              <form className={styles.formStack} onSubmit={spendCard}>
                <label className={styles.field}>
                  <span>Spend amount (USD)</span>
                  <input
                    type="number"
                    min={0.5}
                    step="0.01"
                    value={spendAmount}
                    onChange={(event) => setSpendAmount(event.target.value)}
                    required
                  />
                </label>
                <label className={styles.field}>
                  <span>Merchant</span>
                  <input
                    value={spendMerchant}
                    onChange={(event) => setSpendMerchant(event.target.value)}
                    required
                  />
                </label>
                <label className={styles.field}>
                  <span>Description</span>
                  <input
                    value={spendDescription}
                    onChange={(event) => setSpendDescription(event.target.value)}
                  />
                </label>
                <button className={styles.secondaryButton} type="submit" disabled={actionBusy === "spend"}>
                  {actionBusy === "spend" ? "Settling..." : "Run Spend Transaction"}
                </button>
              </form>
            </article>

            <article className={styles.glassCard}>
              <h2>Card Safety</h2>
              <label className={styles.field}>
                <span>Freeze reason</span>
                <input value={freezeReason} onChange={(event) => setFreezeReason(event.target.value)} />
              </label>
              <button className={styles.secondaryButton} type="button" onClick={() => void toggleFreeze()}>
                {actionBusy === "freeze"
                  ? "Updating..."
                  : selectedCard?.status === "FROZEN"
                    ? "Unfreeze Card"
                    : "Freeze Card"}
              </button>
              <label className={styles.field}>
                <span>Block reason</span>
                <input value={blockReason} onChange={(event) => setBlockReason(event.target.value)} />
              </label>
              <button className={styles.dangerButton} type="button" onClick={() => void blockCard()}>
                {actionBusy === "block" ? "Blocking..." : "Block Card"}
              </button>
              {selectedCard?.freeze_reason ? (
                <p className={styles.muted}>Current reason: {selectedCard.freeze_reason}</p>
              ) : null}
            </article>

            <article className={styles.glassCard}>
              <h2>Support and Wallet Links</h2>
              <form className={styles.formStack} onSubmit={createIssue}>
                <label className={styles.field}>
                  <span>Issue type</span>
                  <select value={ticketType} onChange={(event) => setTicketType(event.target.value)}>
                    <option value="LOST_STOLEN">Lost / Stolen</option>
                    <option value="CARD_NOT_RECEIVED">Card not received</option>
                    <option value="CHARGEBACK">Chargeback</option>
                    <option value="FRAUD">Fraud</option>
                    <option value="LIMIT_CHANGE">Limit change</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Subject</span>
                  <input
                    value={ticketSubject}
                    onChange={(event) => setTicketSubject(event.target.value)}
                    required
                  />
                </label>
                <label className={styles.field}>
                  <span>Description</span>
                  <textarea
                    rows={3}
                    value={ticketDescription}
                    onChange={(event) => setTicketDescription(event.target.value)}
                    required
                  />
                </label>
                <button className={styles.primaryButton} type="submit" disabled={actionBusy === "ticket"}>
                  {actionBusy === "ticket" ? "Submitting..." : "Submit Ticket"}
                </button>
              </form>

              <div className={styles.issueList}>
                {issues.slice(0, 4).map((issue) => (
                  <div key={issue.id} className={styles.issueRow}>
                    <div>
                      <strong>{issue.subject}</strong>
                      <p>{issue.issue_type}</p>
                    </div>
                    <span className={`${styles.statusChip} ${styles[`statusIssue${issue.status}`]}`}>{issue.status}</span>
                  </div>
                ))}
                {!issues.length ? <p className={styles.muted}>No support tickets created yet.</p> : null}
              </div>

              <div className={styles.walletLinks}>
                <h3>Linked Wallet Accounts</h3>
                {linkedAccounts.length ? (
                  linkedAccounts.slice(0, 6).map((item) => (
                    <div key={item.id} className={styles.linkedRow}>
                      <span>{item.providerName}</span>
                      <span className={`${styles.statusChip} ${styles[`statusLinked${item.status}`]}`}>{item.status}</span>
                    </div>
                  ))
                ) : (
                  <p className={styles.muted}>No wallet links yet.</p>
                )}
              </div>
            </article>
          </aside>
        </div>
      </section>

      {showCardModal && selectedCard ? (
        <div className={styles.cardModalOverlay} role="dialog" aria-modal="true" aria-label="Card details">
          <div className={styles.cardModal}>
            <button type="button" className={styles.modalClose} onClick={() => setShowCardModal(false)}>
              x
            </button>
            <div className={`${styles.virtualCard} ${styles.tone1}`}>
              <div className={styles.cardTop}>
                <span>TRUST LOCK</span>
                <span>{selectedCard.network}</span>
              </div>
              <div className={styles.cardNumber}>{selectedCard.masked_pan}</div>
              <div className={styles.cardBottom}>
                <span>{selectedCard.cardholder_name}</span>
                <span>{money(selectedCard.available_balance_usd)}</span>
              </div>
              <div className={`${styles.statusChip} ${styles[`status${selectedCard.status}`]}`}>{selectedCard.status}</div>
            </div>
            <div className={styles.modalMetrics}>
              <p>
                Expires:{" "}
                {selectedCard.expires_month && selectedCard.expires_year
                  ? `${selectedCard.expires_month}/${selectedCard.expires_year}`
                  : "n/a"}
              </p>
              <p>Daily limit: {money(selectedCard.daily_spend_limit_usd)}</p>
              <p>Monthly limit: {money(selectedCard.monthly_spend_limit_usd)}</p>
              <p>Spent today: {money(selectedCard.spent_today_usd)}</p>
              <p>Spent this month: {money(selectedCard.spent_month_usd)}</p>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
