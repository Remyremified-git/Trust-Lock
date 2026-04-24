"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

export type WalletProvider = {
  id: string;
  name: string;
  logo: string;
};

export type LinkedWalletAccount = {
  id: string;
  providerType: string;
  providerName: string;
  accountLabel: string;
  accountReference: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
};

type AuthUser = {
  id: string;
  email: string | null;
  display_name?: string | null;
};

type WalletAuthModalProps = {
  open: boolean;
  onClose: () => void;
  onLinked?: (account: LinkedWalletAccount) => void;
  context?: "home" | "portal";
};

type ModalStep = "select" | "auth" | "success";
type AuthMode = "signup" | "signin";

const walletProviders: WalletProvider[] = [
  { id: "trust-wallet", name: "Trust Wallet", logo: "/wallet-logos/trust-wallet.png" },
  { id: "metamask", name: "MetaMask", logo: "/wallet-logos/metamask.png" },
  { id: "exodus", name: "Exodus", logo: "/wallet-logos/exodus.png" },
  { id: "phantom", name: "Phantom", logo: "/wallet-logos/phantom.png" },
  { id: "rabby", name: "Rabby Wallet", logo: "/wallet-logos/rabby.png" },
  { id: "keplr", name: "Keplr", logo: "/wallet-logos/keplr.png" },
];

async function readJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json()) as T & { ok?: boolean; error?: string };
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error ?? "Request failed.");
  }
  return payload;
}

export default function WalletAuthModal({
  open,
  onClose,
  onLinked,
  context = "home",
}: WalletAuthModalProps) {
  const [step, setStep] = useState<ModalStep>("select");
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [selectedWallet, setSelectedWallet] = useState<WalletProvider | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionUser, setSessionUser] = useState<AuthUser | null>(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<"session" | "auth" | "link" | null>(null);
  const [linkedAccount, setLinkedAccount] = useState<LinkedWalletAccount | null>(null);

  const selectedWalletDisplay = useMemo(
    () => selectedWallet?.name ?? "your wallet",
    [selectedWallet],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    let mounted = true;
    setStep("select");
    setAuthMode("signup");
    setSelectedWallet(null);
    setStatus("");
    setLinkedAccount(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setBusy("session");

    void (async () => {
      try {
        const payload = await readJson<{ ok: true; user: AuthUser }>("/api/auth/me");
        if (!mounted) return;
        setIsAuthenticated(true);
        setSessionUser(payload.user);
        if (payload.user.email) {
          setEmail(payload.user.email);
        }
      } catch {
        if (!mounted) return;
        setIsAuthenticated(false);
        setSessionUser(null);
      } finally {
        if (mounted) {
          setBusy(null);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open]);

  async function linkWallet(wallet: WalletProvider) {
    setBusy("link");
    setStatus(`Linking ${wallet.name}...`);
    try {
      const accountsPayload = await readJson<{ ok: true; linked_accounts: LinkedWalletAccount[] }>(
        "/api/linking/accounts",
      );
      const walletCount =
        accountsPayload.linked_accounts?.filter((account) => account.providerType === "WALLET").length ?? 0;
      const accountLabel = `Wallet ${walletCount + 1}`;

      const createPayload = await readJson<{ ok: true; linked_account: LinkedWalletAccount }>(
        "/api/linking/accounts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider_type: "WALLET",
            provider_name: wallet.name,
            account_label: accountLabel,
            account_reference: `${wallet.id}-${Date.now()}`,
          }),
        },
      );

      setLinkedAccount(createPayload.linked_account);
      setStatus(`${wallet.name} linked successfully.`);
      setStep("success");
      onLinked?.(createPayload.linked_account);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to link wallet.";
      if (message.toLowerCase().includes("not authenticated")) {
        setIsAuthenticated(false);
        setStep("auth");
        setStatus("Sign in or create an account to complete wallet linking.");
      } else {
        setStatus(message);
      }
    } finally {
      setBusy(null);
    }
  }

  async function onWalletSelect(wallet: WalletProvider) {
    setSelectedWallet(wallet);
    if (isAuthenticated) {
      await linkWallet(wallet);
      return;
    }
    setStep("auth");
    setStatus(`Continue to authentication for ${wallet.name}.`);
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedWallet) {
      setStatus("Select a wallet first.");
      setStep("select");
      return;
    }

    if (authMode === "signup") {
      if (!username.trim()) {
        setStatus("Username is required.");
        return;
      }
      if (password !== confirmPassword) {
        setStatus("Passwords do not match.");
        return;
      }
      if (!acceptTerms) {
        setStatus("Accept Terms and Privacy Policy to continue.");
        return;
      }
    }

    setBusy("auth");
    setStatus(authMode === "signup" ? "Creating account..." : "Signing in...");
    try {
      if (authMode === "signup") {
        const payload = await readJson<{ ok: true; user: AuthUser }>("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            display_name: username.trim(),
            email,
            password,
          }),
        });
        setSessionUser(payload.user);
      } else {
        const payload = await readJson<{ ok: true; user: AuthUser }>("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
          }),
        });
        setSessionUser(payload.user);
      }

      setIsAuthenticated(true);
      await linkWallet(selectedWallet);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed.";
      setStatus(message);
    } finally {
      setBusy(null);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="wallet-modal-overlay" role="dialog" aria-modal="true" aria-label="Wallet linking modal">
      <div className="wallet-modal-shell">
        <button type="button" className="wallet-modal-close" aria-label="Close wallet modal" onClick={onClose}>
          ×
        </button>

        {step === "select" ? (
          <div className="wallet-modal-step">
            <p className="kicker">Wallet Linking</p>
            <h2>Select your wallet platform</h2>
            <p className="muted">
              Choose your wallet to begin card provisioning. Your selected wallet will be logged and added to your
              dashboard tabs.
            </p>
            <div className="wallet-modal-grid">
              {walletProviders.map((wallet, index) => (
                <button
                  type="button"
                  key={wallet.id}
                  className="wallet-logo-button"
                  onClick={() => void onWalletSelect(wallet)}
                  title={wallet.name}
                  aria-label={`Select ${wallet.name}`}
                  style={{ "--wallet-float-delay": `${index * 0.12}s` } as CSSProperties}
                  disabled={busy === "session" || busy === "link"}
                >
                  <img src={wallet.logo} alt={`${wallet.name} logo`} loading="lazy" />
                </button>
              ))}
            </div>
            {busy === "session" ? <p className="wallet-connect-status">Checking account session...</p> : null}
            {status ? <p className="wallet-connect-status">{status}</p> : null}
          </div>
        ) : null}

        {step === "auth" ? (
          <div className="wallet-modal-step wallet-connect-form">
            <div className="wallet-connect-head">
              <p className="kicker">Account Authentication</p>
              <h2>{authMode === "signup" ? "Create your account" : "Sign in to continue"}</h2>
              <p className="muted">Selected wallet: {selectedWalletDisplay}</p>
            </div>

            <div className="wallet-auth-switch">
              <button
                type="button"
                className={authMode === "signup" ? "primary-button" : "secondary-button"}
                onClick={() => setAuthMode("signup")}
              >
                Sign Up
              </button>
              <button
                type="button"
                className={authMode === "signin" ? "primary-button" : "secondary-button"}
                onClick={() => setAuthMode("signin")}
              >
                Sign In
              </button>
            </div>

            <form className="wallet-auth-grid" onSubmit={submitAuth}>
              {authMode === "signup" ? (
                <label className="field">
                  <span>Username</span>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="your_username"
                    required
                  />
                </label>
              ) : null}

              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@domain.com"
                  required
                />
              </label>

              <label className="field">
                <span>Password</span>
                <div className="wallet-password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    className="wallet-password-toggle"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              {authMode === "signup" ? (
                <label className="field">
                  <span>Confirm Password</span>
                  <div className="wallet-password-field">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Re-enter password"
                      required
                    />
                    <button
                      type="button"
                      className="wallet-password-toggle"
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      onClick={() => setShowConfirmPassword((value) => !value)}
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>
              ) : null}

              {authMode === "signup" ? (
                <label className="wallet-checkbox-field">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(event) => setAcceptTerms(event.target.checked)}
                  />
                  <span>I agree to Terms of Service and Privacy Policy</span>
                </label>
              ) : null}

              <button className="primary-button" type="submit" disabled={busy === "auth" || busy === "link"}>
                {busy === "auth" || busy === "link"
                  ? "Processing..."
                  : authMode === "signup"
                    ? "Sign Up and Link Wallet"
                    : "Sign In and Link Wallet"}
              </button>
            </form>

            <p className="wallet-inline-toggle">
              {authMode === "signup" ? "Already have an account?" : "New here?"}{" "}
              <button
                type="button"
                className="wallet-inline-link"
                onClick={() => setAuthMode(authMode === "signup" ? "signin" : "signup")}
              >
                {authMode === "signup" ? "Sign in" : "Create account"}
              </button>
            </p>
            {status ? <p className="wallet-connect-status">{status}</p> : null}
          </div>
        ) : null}

        {step === "success" ? (
          <div className="wallet-modal-step wallet-success-step">
            <p className="kicker">Wallet Linked</p>
            <h2>{selectedWalletDisplay} connected successfully</h2>
            <div className="wallet-success-card">
              <p>
                <strong>Account:</strong>{" "}
                {sessionUser?.display_name || sessionUser?.email || "Authenticated user"}
              </p>
              <p>
                <strong>Dashboard tab:</strong> {linkedAccount?.accountLabel ?? "Wallet"}
              </p>
              <p>
                <strong>Status:</strong> {linkedAccount?.status ?? "PENDING"}
              </p>
            </div>
            <div className="wallet-success-actions">
              <button type="button" className="secondary-button" onClick={() => setStep("select")}>
                Add Another Wallet
              </button>
              {context === "home" ? (
                <Link className="primary-button" href="/portal" onClick={onClose}>
                  Open Dashboard
                </Link>
              ) : null}
              <button type="button" className="primary-button" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
