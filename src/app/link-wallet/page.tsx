"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

type LinkTab = "wallets" | "exchanges";
type WalletLinkMode = "walletconnect" | "address_signature";

type SessionPayload = {
  ok: boolean;
  user?: {
    id: string;
    email: string | null;
    display_name: string | null;
  };
  error?: string;
};

type LinkedAccount = {
  id: string;
  providerType: string;
  providerName: string;
  accountLabel: string;
  accountReference: string;
  status: string;
  createdAt: string;
};

type WalletProvider = {
  id: string;
  name: string;
  logo: string;
  domain: string;
  mode: WalletLinkMode;
  linkingHint: string;
  networkHint: string;
};

type ExchangeProvider = {
  id: string;
  name: string;
  logo: string;
  domain: string;
  linkingHint: string;
};

const wallets: WalletProvider[] = [
  {
    id: "trust-wallet",
    name: "Trust Wallet",
    logo: "https://logo.clearbit.com/trustwallet.com",
    domain: "trustwallet.com",
    mode: "walletconnect",
    linkingHint: "Scan WalletConnect QR and confirm ownership from wallet app.",
    networkHint: "Ethereum / BNB / TRON / multi-chain",
  },
  {
    id: "metamask",
    name: "MetaMask",
    logo: "https://logo.clearbit.com/metamask.io",
    domain: "metamask.io",
    mode: "address_signature",
    linkingHint: "Connect extension and sign a one-time ownership challenge.",
    networkHint: "Ethereum / EVM chains",
  },
  {
    id: "exodus",
    name: "Exodus",
    logo: "https://logo.clearbit.com/exodus.com",
    domain: "exodus.com",
    mode: "address_signature",
    linkingHint: "Enter receive address and confirm challenge signature.",
    networkHint: "BTC / ETH / SOL / multi-chain",
  },
  {
    id: "coinbase-wallet",
    name: "Coinbase Wallet",
    logo: "https://logo.clearbit.com/coinbase.com",
    domain: "coinbase.com",
    mode: "walletconnect",
    linkingHint: "Use WalletConnect deep-link and approve ownership prompt.",
    networkHint: "Ethereum / Base / multi-chain",
  },
  {
    id: "phantom",
    name: "Phantom",
    logo: "https://logo.clearbit.com/phantom.com",
    domain: "phantom.com",
    mode: "address_signature",
    linkingHint: "Connect wallet and sign message from selected network.",
    networkHint: "Solana / Ethereum / Bitcoin",
  },
  {
    id: "safepal",
    name: "SafePal",
    logo: "https://logo.clearbit.com/safepal.com",
    domain: "safepal.com",
    mode: "walletconnect",
    linkingHint: "Pair via WalletConnect and approve ownership in-app.",
    networkHint: "Multi-chain",
  },
];

const exchanges: ExchangeProvider[] = [
  {
    id: "kucoin",
    name: "KuCoin",
    logo: "https://logo.clearbit.com/kucoin.com",
    domain: "kucoin.com",
    linkingHint: "Use API credentials with read-only + transfer scopes.",
  },
  {
    id: "gate-io",
    name: "Gate.io",
    logo: "https://logo.clearbit.com/gate.io",
    domain: "gate.io",
    linkingHint: "Use API key and account UID validation.",
  },
  {
    id: "kraken",
    name: "Kraken",
    logo: "https://logo.clearbit.com/kraken.com",
    domain: "kraken.com",
    linkingHint: "Link with account ID and permission-scoped API token.",
  },
  {
    id: "binance",
    name: "Binance",
    logo: "https://logo.clearbit.com/binance.com",
    domain: "binance.com",
    linkingHint: "Bind account ID and API key from API Management.",
  },
  {
    id: "bybit",
    name: "Bybit",
    logo: "https://logo.clearbit.com/bybit.com",
    domain: "bybit.com",
    linkingHint: "Attach account UID and encrypted API token.",
  },
  {
    id: "okx",
    name: "OKX",
    logo: "https://logo.clearbit.com/okx.com",
    domain: "okx.com",
    linkingHint: "Use API key + passphrase and account verification code.",
  },
];

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function LinkWalletPage() {
  const [tab, setTab] = useState<LinkTab>("wallets");
  const [selectedWalletId, setSelectedWalletId] = useState(wallets[0]?.id ?? "");
  const [selectedExchangeId, setSelectedExchangeId] = useState(exchanges[0]?.id ?? "");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [sessionEmail, setSessionEmail] = useState<string>("");

  const [walletAlias, setWalletAlias] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletNetwork, setWalletNetwork] = useState("Ethereum");
  const [walletSignature, setWalletSignature] = useState("");
  const [walletConnectUri, setWalletConnectUri] = useState("");

  const [exchangeAlias, setExchangeAlias] = useState("");
  const [exchangeAccountRef, setExchangeAccountRef] = useState("");
  const [exchangeApiToken, setExchangeApiToken] = useState("");

  const selectedWallet = useMemo(
    () => wallets.find((provider) => provider.id === selectedWalletId) ?? wallets[0],
    [selectedWalletId],
  );

  const selectedExchange = useMemo(
    () => exchanges.find((provider) => provider.id === selectedExchangeId) ?? exchanges[0],
    [selectedExchangeId],
  );

  async function loadSessionAndAccounts() {
    setIsLoading(true);
    setStatus("");
    try {
      const [sessionRes, accountRes] = await Promise.all([fetch("/api/auth/me"), fetch("/api/linking/accounts")]);

      const session = (await sessionRes.json()) as SessionPayload;
      const accountPayload = (await accountRes.json()) as {
        ok: boolean;
        linked_accounts?: LinkedAccount[];
        error?: string;
      };

      if (!session.ok || !session.user) {
        setSessionEmail("");
        setAccounts([]);
        setStatus("Sign in to start linking external wallets and exchanges.");
        return;
      }

      setSessionEmail(session.user.email ?? "");
      if (accountPayload.ok) {
        setAccounts(accountPayload.linked_accounts ?? []);
      } else {
        setStatus(accountPayload.error ?? "Could not load linked accounts.");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load linking module.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSessionAndAccounts();
  }, []);

  async function submitWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedWallet) return;
    if (!sessionEmail) {
      setStatus("Please sign in before linking a wallet.");
      return;
    }

    setIsSubmitting(true);
    setStatus("");
    try {
      const walletRef =
        selectedWallet.mode === "walletconnect"
          ? walletConnectUri.trim()
          : `${walletNetwork.trim()}:${walletAddress.trim()}`;

      if (!walletRef || walletRef.length < 2) {
        setStatus("Add a valid wallet reference to continue.");
        return;
      }

      const response = await fetch("/api/linking/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_type: "WALLET",
          provider_name: selectedWallet.name,
          account_label: walletAlias.trim() || `${selectedWallet.name} wallet`,
          account_reference: walletRef,
          access_token: walletSignature.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!payload.ok) {
        setStatus(payload.error ?? "Wallet linking failed.");
        return;
      }

      setWalletAlias("");
      setWalletAddress("");
      setWalletSignature("");
      setWalletConnectUri("");
      setStatus(`${selectedWallet.name} submitted for verification.`);
      await loadSessionAndAccounts();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Wallet link request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitExchange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedExchange) return;
    if (!sessionEmail) {
      setStatus("Please sign in before linking an exchange account.");
      return;
    }

    setIsSubmitting(true);
    setStatus("");
    try {
      const response = await fetch("/api/linking/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_type: "EXCHANGE",
          provider_name: selectedExchange.name,
          account_label: exchangeAlias.trim() || `${selectedExchange.name} account`,
          account_reference: exchangeAccountRef.trim(),
          access_token: exchangeApiToken.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!payload.ok) {
        setStatus(payload.error ?? "Exchange linking failed.");
        return;
      }

      setExchangeAlias("");
      setExchangeAccountRef("");
      setExchangeApiToken("");
      setStatus(`${selectedExchange.name} submitted for verification.`);
      await loadSessionAndAccounts();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Exchange link request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const providerItems = tab === "wallets" ? wallets : exchanges;

  return (
    <main className="screen">
      <section className={`panel ${styles.moduleShell}`}>
        <p className="kicker">Link Wallet Module</p>
        <h1>Attach external wallets and exchanges to your Trust Lock card rail</h1>
        <p className="muted">
          Select a provider, verify ownership, and route balances into your virtual debit card flow. For security, use
          ownership signatures or WalletConnect confirmation only.
        </p>

        <div className={styles.tabRow}>
          <button
            type="button"
            className={`${styles.tabButton} ${tab === "wallets" ? styles.tabButtonActive : ""}`}
            onClick={() => setTab("wallets")}
          >
            Wallets
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${tab === "exchanges" ? styles.tabButtonActive : ""}`}
            onClick={() => setTab("exchanges")}
          >
            Exchanges
          </button>
        </div>

        <div className={styles.providerGrid}>
          {providerItems.map((provider) => {
            const isActive = tab === "wallets" ? provider.id === selectedWalletId : provider.id === selectedExchangeId;
            return (
              <button
                key={provider.id}
                type="button"
                className={`${styles.providerCard} ${isActive ? styles.providerCardActive : ""}`}
                onClick={() =>
                  tab === "wallets"
                    ? setSelectedWalletId(provider.id)
                    : setSelectedExchangeId(provider.id)
                }
              >
                <span className={styles.providerLogoWrap}>
                  <img
                    src={provider.logo}
                    alt={`${provider.name} logo`}
                    className={styles.providerLogo}
                    loading="lazy"
                  />
                </span>
                <span className={styles.providerTitle}>{provider.name}</span>
                <span className={styles.providerDomain}>{provider.domain}</span>
              </button>
            );
          })}
        </div>

        {tab === "wallets" && selectedWallet ? (
          <form className={styles.formPanel} onSubmit={submitWallet}>
            <div className={styles.formHeader}>
              <h2>{selectedWallet.name} wallet linking</h2>
              <p>{selectedWallet.linkingHint}</p>
              <p className={styles.networkNote}>Supported networks: {selectedWallet.networkHint}</p>
            </div>
            <div className={styles.fieldGrid}>
              <label className="field">
                <span>Wallet Label</span>
                <input
                  value={walletAlias}
                  onChange={(event) => setWalletAlias(event.target.value)}
                  placeholder={`${selectedWallet.name} primary`}
                />
              </label>
              {selectedWallet.mode === "walletconnect" ? (
                <label className="field">
                  <span>WalletConnect URI</span>
                  <input
                    value={walletConnectUri}
                    onChange={(event) => setWalletConnectUri(event.target.value)}
                    placeholder="wc:xxxx@2?relay-protocol=irn..."
                    required
                  />
                </label>
              ) : (
                <>
                  <label className="field">
                    <span>Network</span>
                    <input
                      value={walletNetwork}
                      onChange={(event) => setWalletNetwork(event.target.value)}
                      placeholder="Ethereum"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Wallet Address</span>
                    <input
                      value={walletAddress}
                      onChange={(event) => setWalletAddress(event.target.value)}
                      placeholder="0x... or network address"
                      required
                    />
                  </label>
                </>
              )}
              <label className="field">
                <span>Ownership Signature (optional)</span>
                <input
                  value={walletSignature}
                  onChange={(event) => setWalletSignature(event.target.value)}
                  placeholder="Signed challenge proof"
                />
              </label>
            </div>
            <div className={styles.formActions}>
              <button className="primary-button" type="submit" disabled={isSubmitting || !sessionEmail}>
                {isSubmitting ? "Linking..." : "Link Wallet"}
              </button>
              {!sessionEmail ? (
                <p className={styles.authHint}>
                  Session required. <Link href="/auth">Sign in here</Link>.
                </p>
              ) : null}
            </div>
          </form>
        ) : null}

        {tab === "exchanges" && selectedExchange ? (
          <form className={styles.formPanel} onSubmit={submitExchange}>
            <div className={styles.formHeader}>
              <h2>{selectedExchange.name} exchange linking</h2>
              <p>{selectedExchange.linkingHint}</p>
              <p className={styles.networkNote}>Use least-privilege API scopes and read/transfer-only permissions.</p>
            </div>
            <div className={styles.fieldGrid}>
              <label className="field">
                <span>Exchange Label</span>
                <input
                  value={exchangeAlias}
                  onChange={(event) => setExchangeAlias(event.target.value)}
                  placeholder={`${selectedExchange.name} main`}
                />
              </label>
              <label className="field">
                <span>Account UID / Email / Reference</span>
                <input
                  value={exchangeAccountRef}
                  onChange={(event) => setExchangeAccountRef(event.target.value)}
                  placeholder="Exchange account reference"
                  required
                />
              </label>
              <label className="field">
                <span>API Token (optional)</span>
                <input
                  value={exchangeApiToken}
                  onChange={(event) => setExchangeApiToken(event.target.value)}
                  placeholder="Encrypted at rest after submission"
                />
              </label>
            </div>
            <div className={styles.formActions}>
              <button className="primary-button" type="submit" disabled={isSubmitting || !sessionEmail}>
                {isSubmitting ? "Linking..." : "Link Exchange"}
              </button>
              {!sessionEmail ? (
                <p className={styles.authHint}>
                  Session required. <Link href="/auth">Sign in here</Link>.
                </p>
              ) : null}
            </div>
          </form>
        ) : null}

        <div className={styles.linkedPanel}>
          <div className={styles.linkedPanelHeader}>
            <h3>Linked providers</h3>
            <button type="button" className="secondary-button" onClick={() => void loadSessionAndAccounts()}>
              Refresh
            </button>
          </div>
          {isLoading ? <p className="muted">Loading linked accounts...</p> : null}
          {!isLoading && accounts.length === 0 ? (
            <p className="muted">No linked providers yet. Start with a wallet or exchange above.</p>
          ) : null}
          {accounts.length > 0 ? (
            <div className={styles.accountList}>
              {accounts.map((account) => (
                <article key={account.id} className={styles.accountRow}>
                  <div>
                    <p className={styles.accountTitle}>
                      {account.providerName} <span>{account.providerType}</span>
                    </p>
                    <p className={styles.accountRef}>{account.accountReference}</p>
                  </div>
                  <div className={styles.accountMeta}>
                    <span className={styles.statusChip}>{account.status}</span>
                    <small>{formatDate(account.createdAt)}</small>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>

        {status ? <p className={styles.statusText}>{status}</p> : null}
      </section>
    </main>
  );
}
