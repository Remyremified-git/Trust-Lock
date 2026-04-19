"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { entropyToMnemonic } from "bip39";
import {
  encryptWithServerPublicKey,
  randomUserId,
  sha256HexBrowser,
} from "@/lib/browser-crypto";

type ApiStatus = {
  ok: boolean;
  message: string;
};

function generateMnemonicLocally(): string {
  const entropy = new Uint8Array(32);
  crypto.getRandomValues(entropy);
  const entropyHex = Array.from(entropy)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  return entropyToMnemonic(entropyHex);
}

export default function OnboardingPage() {
  const [userId, setUserId] = useState(randomUserId());
  const [sessionEmail, setSessionEmail] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [seedPhrase, setSeedPhrase] = useState(generateMnemonicLocally());
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ApiStatus | null>(null);

  const seedWords = useMemo(() => seedPhrase.split(" "), [seedPhrase]);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/auth/me");
      const payload = (await response.json()) as {
        ok: boolean;
        user?: { id: string; email: string | null };
      };
      if (payload.ok && payload.user) {
        setUserId(payload.user.id);
        setSessionEmail(payload.user.email ?? "");
        setEmail(payload.user.email ?? "");
      }
    };
    void load();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) {
      setStatus({
        ok: false,
        message: "Consent is required before admin seed transmission.",
      });
      return;
    }

    try {
      setLoading(true);
      setStatus(null);

      const keyResponse = await fetch("/api/crypto/public-key");
      const keyData = (await keyResponse.json()) as {
        public_key_pem: string;
      };

      const encryptedSeed = await encryptWithServerPublicKey(
        keyData.public_key_pem,
        seedPhrase,
      );
      const checksum = await sha256HexBrowser(seedPhrase);

      const response = await fetch("/api/vault/admin-seed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          email: email || undefined,
          display_name: displayName || undefined,
          encrypted_seed: encryptedSeed,
          checksum,
          consent_timestamp: new Date().toISOString(),
        }),
      });
      const result = (await response.json()) as { ok: boolean; error?: string };

      if (!result.ok) {
        setStatus({
          ok: false,
          message: result.error ?? "Failed to store admin seed copy",
        });
        return;
      }

      setStatus({
        ok: true,
        message:
          "Seed copied to admin vault and encrypted backup flow initialized.",
      });
    } catch (error) {
      setStatus({
        ok: false,
        message: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="screen">
      <section className="panel">
        <p className="kicker">Wallet Linking Onboarding</p>
        <h1>Prepare your wallet for secure virtual card attachment</h1>
        <p className="muted">
          Complete secure setup for card-linked crypto spending with encrypted
          recovery controls and account-level security consent.
        </p>
        <div className="warning-box">
          <strong>Critical disclosure:</strong> A copy of this seed phrase is
          transmitted to admin controls for recovery/support.
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>User ID</span>
            <input
              type="text"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Email (optional)</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
            />
          </label>
          {sessionEmail ? (
            <p className="muted">
              Session detected for {sessionEmail}. Seed copy is bound to this account.
            </p>
          ) : null}

          <label className="field">
            <span>Display name (optional)</span>
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Wallet User"
            />
          </label>

          <div>
            <div className="seed-grid">
              {seedWords.map((word, index) => (
                <div className="seed-chip" key={`${word}-${index + 1}`}>
                  <span>{index + 1}.</span> {word}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setSeedPhrase(generateMnemonicLocally())}
            >
              Regenerate seed locally
            </button>
          </div>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>
              I understand this seed will be encrypted and sent to admin
              controls for account recovery.
            </span>
          </label>

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Encrypting + uploading..." : "Confirm and transmit seed"}
          </button>
        </form>

        {status ? (
          <p className={status.ok ? "success-text" : "error-text"}>
            {status.message}
          </p>
        ) : null}
      </section>
    </main>
  );
}
