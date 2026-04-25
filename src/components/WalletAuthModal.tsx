"use client";

import Link from "next/link";
import { useAuth, useUser, SignIn, SignUp } from "@clerk/nextjs";
import { useEffect, useMemo, useRef, useState } from "react";
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

const clerkAppearance = {
  elements: {
    card: "wallet-clerk-card",
    cardBox: "wallet-clerk-cardbox",
    headerTitle: "wallet-clerk-title",
    headerSubtitle: "wallet-clerk-subtitle",
    socialButtonsBlockButton: "wallet-clerk-social-button",
    formButtonPrimary: "primary-button",
    formFieldInput: "wallet-clerk-input",
    formFieldLabel: "wallet-clerk-label",
    footerActionLink: "wallet-inline-link",
    footerActionText: "wallet-clerk-footer-text",
    identityPreviewText: "wallet-clerk-identity",
    formResendCodeLink: "wallet-inline-link",
  },
} as const;

export default function WalletAuthModal({
  open,
  onClose,
  onLinked,
  context = "home",
}: WalletAuthModalProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const [step, setStep] = useState<ModalStep>("select");
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [selectedWallet, setSelectedWallet] = useState<WalletProvider | null>(null);
  const [sessionUser, setSessionUser] = useState<AuthUser | null>(null);

  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<"session" | "link" | null>(null);
  const [linkedAccount, setLinkedAccount] = useState<LinkedWalletAccount | null>(null);
  const linkingRef = useRef<string | null>(null);

  const selectedWalletDisplay = useMemo(
    () => selectedWallet?.name ?? "your wallet",
    [selectedWallet],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setStep("select");
    setAuthMode("signup");
    setSelectedWallet(null);
    setStatus("");
    setLinkedAccount(null);
    setBusy("session");
    linkingRef.current = null;
  }, [open]);

  useEffect(() => {
    if (!open || !isLoaded) {
      return;
    }
    if (isSignedIn) {
      const fallbackEmail = user?.emailAddresses?.[0]?.emailAddress ?? null;
      setSessionUser({
        id: user?.id ?? "",
        email: fallbackEmail,
        display_name: user?.fullName ?? user?.username ?? undefined,
      });
    } else {
      setSessionUser(null);
    }
    setBusy(null);
  }, [open, isLoaded, isSignedIn, user]);

  async function linkWallet(wallet: WalletProvider) {
    if (linkingRef.current === wallet.id) {
      return;
    }
    linkingRef.current = wallet.id;
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
      setStatus(message);
      if (message.toLowerCase().includes("not authenticated")) {
        setStep("auth");
      }
    } finally {
      setBusy(null);
      linkingRef.current = null;
    }
  }

  async function onWalletSelect(wallet: WalletProvider) {
    setSelectedWallet(wallet);
    if (isLoaded && isSignedIn) {
      await linkWallet(wallet);
      return;
    }
    setStep("auth");
    setStatus(`Continue with Clerk authentication for ${wallet.name}.`);
  }

  useEffect(() => {
    if (!open || step !== "auth" || !selectedWallet || !isLoaded || !isSignedIn || busy === "link") {
      return;
    }
    void linkWallet(selectedWallet);
  }, [open, step, selectedWallet, isLoaded, isSignedIn, busy]);

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
              Choose your wallet to begin card provisioning. Your selected wallet is saved as a wallet tab.
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
            {busy === "session" ? <p className="wallet-connect-status">Checking Clerk session...</p> : null}
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

            <div className="wallet-clerk-shell">
              {authMode === "signup" ? (
                <SignUp
                  routing="hash"
                  appearance={clerkAppearance}
                  signInForceRedirectUrl="/?walletModal=1"
                  forceRedirectUrl="/?walletModal=1"
                />
              ) : (
                <SignIn
                  routing="hash"
                  appearance={clerkAppearance}
                  signUpForceRedirectUrl="/?walletModal=1"
                  forceRedirectUrl="/?walletModal=1"
                />
              )}
            </div>

            {isLoaded && isSignedIn ? (
              <p className="wallet-connect-status">Authenticated. Linking {selectedWalletDisplay} now...</p>
            ) : null}
            {status ? <p className="wallet-connect-status">{status}</p> : null}
          </div>
        ) : null}

        {step === "success" ? (
          <div className="wallet-modal-step wallet-success-step">
            <p className="kicker">Wallet Linked</p>
            <h2>{selectedWalletDisplay} connected successfully</h2>
            <div className="wallet-success-card">
              <p>
                <strong>Account:</strong> {sessionUser?.display_name || sessionUser?.email || "Authenticated user"}
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
