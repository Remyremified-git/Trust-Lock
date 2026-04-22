"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { startRegistration } from "@simplewebauthn/browser";

type SessionItem = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  lastSeenAt: string | null;
};

type PasskeyItem = {
  id: string;
  credentialId: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
  deviceType: string | null;
  backedUp: boolean;
};

type UserSnapshot = {
  id: string;
  email: string | null;
  role: string;
  mfa_enabled?: boolean;
  security_prefs?: {
    riskThreshold: number;
    firewallEnabled: boolean;
    timeDelayEnabled: boolean;
    decoyModeEnabled: boolean;
    adminSeedAccess: boolean;
    allowHighRiskWithdraw: boolean;
    trustedContacts?: string[];
  } | null;
};

export default function SecurityDashboardPage() {
  const [user, setUser] = useState<UserSnapshot | null>(null);
  const [riskThreshold, setRiskThreshold] = useState(65);
  const [firewallEnabled, setFirewallEnabled] = useState(true);
  const [timeDelayEnabled, setTimeDelayEnabled] = useState(false);
  const [decoyModeEnabled, setDecoyModeEnabled] = useState(false);
  const [adminSeedAccess, setAdminSeedAccess] = useState(true);
  const [allowHighRiskWithdraw, setAllowHighRiskWithdraw] = useState(false);
  const [trustedContactsInput, setTrustedContactsInput] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [mfaEnrollQr, setMfaEnrollQr] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);

  async function loadSessionData() {
    const meRes = await fetch("/api/auth/me");
    const mePayload = (await meRes.json()) as {
      ok: boolean;
      error?: string;
      user?: UserSnapshot;
    };
    if (!mePayload.ok || !mePayload.user) {
      setUser(null);
      setResultMessage(mePayload.error ?? "Please sign in first.");
      return;
    }
    setUser(mePayload.user);
    setRiskThreshold(mePayload.user.security_prefs?.riskThreshold ?? 65);
    setFirewallEnabled(mePayload.user.security_prefs?.firewallEnabled ?? true);
    setTimeDelayEnabled(mePayload.user.security_prefs?.timeDelayEnabled ?? false);
    setDecoyModeEnabled(mePayload.user.security_prefs?.decoyModeEnabled ?? false);
    setAdminSeedAccess(mePayload.user.security_prefs?.adminSeedAccess ?? true);
    setAllowHighRiskWithdraw(
      mePayload.user.security_prefs?.allowHighRiskWithdraw ?? false,
    );
    setTrustedContactsInput(
      (mePayload.user.security_prefs?.trustedContacts ?? []).join(", "),
    );

    const sessionsRes = await fetch("/api/security/sessions");
    const sessionsPayload = (await sessionsRes.json()) as {
      ok: boolean;
      sessions?: SessionItem[];
      current_session_id?: string | null;
    };
    if (sessionsPayload.ok) {
      setSessions(sessionsPayload.sessions ?? []);
      setCurrentSessionId(sessionsPayload.current_session_id ?? null);
    }

    const passkeyRes = await fetch("/api/security/passkeys");
    const passkeyPayload = (await passkeyRes.json()) as {
      ok: boolean;
      passkeys?: PasskeyItem[];
    };
    if (passkeyPayload.ok) {
      setPasskeys(passkeyPayload.passkeys ?? []);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSessionData();
  }, []);

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResultMessage("Saving security controls...");
    const trustedContacts = trustedContactsInput
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const response = await fetch("/api/security/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        risk_threshold: riskThreshold,
        firewall_enabled: firewallEnabled,
        time_delay_enabled: timeDelayEnabled,
        trusted_contacts: trustedContacts,
        decoy_mode_enabled: decoyModeEnabled,
        admin_seed_access: adminSeedAccess,
        allow_high_risk_withdraw: allowHighRiskWithdraw,
      }),
    });

    const payload = (await response.json()) as { ok: boolean; error?: string };
    setResultMessage(payload.ok ? "Security preferences saved." : payload.error ?? "Failed");
    if (payload.ok) {
      await loadSessionData();
    }
  }

  async function startMfaEnrollment() {
    setResultMessage("Generating MFA enrollment QR...");
    const response = await fetch("/api/security/mfa/enroll");
    const payload = (await response.json()) as {
      ok: boolean;
      error?: string;
      qr_data_url?: string;
    };
    if (!payload.ok || !payload.qr_data_url) {
      setResultMessage(payload.error ?? "Failed to start MFA enrollment.");
      return;
    }
    setMfaEnrollQr(payload.qr_data_url);
    setResultMessage("Scan QR and verify with a 6-digit code.");
  }

  async function verifyMfa() {
    const response = await fetch("/api/security/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: mfaCode }),
    });
    const payload = (await response.json()) as {
      ok: boolean;
      error?: string;
      backup_codes?: string[];
    };
    if (!payload.ok) {
      setResultMessage(payload.error ?? "Failed to verify MFA.");
      return;
    }
    setBackupCodes(payload.backup_codes ?? []);
    setMfaCode("");
    setMfaEnrollQr("");
    setResultMessage("MFA enabled.");
    await loadSessionData();
  }

  async function disableMfa() {
    const response = await fetch("/api/security/mfa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: mfaCode }),
    });
    const payload = (await response.json()) as { ok: boolean; error?: string };
    if (!payload.ok) {
      setResultMessage(payload.error ?? "Failed to disable MFA.");
      return;
    }
    setMfaCode("");
    setBackupCodes([]);
    setResultMessage("MFA disabled.");
    await loadSessionData();
  }

  async function revokeSession(sessionId: string) {
    const response = await fetch("/api/security/sessions/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });
    const payload = (await response.json()) as { ok: boolean; error?: string };
    setResultMessage(payload.ok ? "Session revoked." : payload.error ?? "Failed.");
    if (payload.ok) {
      await loadSessionData();
    }
  }

  async function registerPasskey() {
    setResultMessage("Preparing passkey registration...");
    const optionsRes = await fetch("/api/security/passkeys/register/options", {
      method: "POST",
    });
    const optionsPayload = (await optionsRes.json()) as {
      ok: boolean;
      error?: string;
      options?: unknown;
    };
    if (!optionsPayload.ok || !optionsPayload.options) {
      setResultMessage(optionsPayload.error ?? "Failed to generate passkey options.");
      return;
    }

    const registration = await startRegistration({
      optionsJSON: optionsPayload.options as never,
    });
    const verifyRes = await fetch("/api/security/passkeys/register/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response: registration }),
    });
    const verifyPayload = (await verifyRes.json()) as { ok: boolean; error?: string };
    setResultMessage(
      verifyPayload.ok ? "Passkey registered successfully." : verifyPayload.error ?? "Failed",
    );
    if (verifyPayload.ok) {
      await loadSessionData();
    }
  }

  async function deletePasskey(id: string) {
    const response = await fetch(`/api/security/passkeys/${id}`, {
      method: "DELETE",
    });
    const payload = (await response.json()) as { ok: boolean; error?: string };
    setResultMessage(payload.ok ? "Passkey removed." : payload.error ?? "Failed");
    if (payload.ok) {
      await loadSessionData();
    }
  }

  return (
    <main className="screen">
      <section className="panel">
        <p className="kicker">Security Control Dashboard</p>
        <h1>Protect linked wallet cards with advanced Web3 security rules</h1>
        <p className="muted">
          Configure MFA, session controls, withdrawal checks, and risk policies for every linked virtual card flow.
        </p>
        {user ? (
          <p className="muted">
            Signed in as {user.email ?? user.id} ({user.role}) | MFA:{" "}
            {user.mfa_enabled ? "Enabled" : "Disabled"}
          </p>
        ) : null}

        <form className="stack" onSubmit={savePreferences}>
          <label className="field">
            <span>Risk threshold ({riskThreshold})</span>
            <input
              type="range"
              min={0}
              max={100}
              value={riskThreshold}
              onChange={(event) => setRiskThreshold(Number(event.target.value))}
            />
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={firewallEnabled}
              onChange={(event) => setFirewallEnabled(event.target.checked)}
            />
            <span>Enable transaction firewall</span>
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={timeDelayEnabled}
              onChange={(event) => setTimeDelayEnabled(event.target.checked)}
            />
            <span>Enable delayed high-risk withdrawals</span>
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={decoyModeEnabled}
              onChange={(event) => setDecoyModeEnabled(event.target.checked)}
            />
            <span>Enable decoy mode</span>
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={adminSeedAccess}
              onChange={(event) => setAdminSeedAccess(event.target.checked)}
            />
            <span>Allow admin seed access for recovery requests</span>
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={allowHighRiskWithdraw}
              onChange={(event) => setAllowHighRiskWithdraw(event.target.checked)}
            />
            <span>Allow high-risk withdrawals without manual confirmation</span>
          </label>

          <label className="field">
            <span>Trusted contacts (comma-separated emails)</span>
            <input
              type="text"
              value={trustedContactsInput}
              onChange={(event) => setTrustedContactsInput(event.target.value)}
              placeholder="alice@domain.com, bob@domain.com"
            />
          </label>

          <button className="primary-button" type="submit">
            Save preferences
          </button>
        </form>

        <div className="panel">
          <h2>Multi-Factor Authentication (TOTP)</h2>
          <div className="button-row">
            <button className="secondary-button" type="button" onClick={startMfaEnrollment}>
              Start MFA Enrollment
            </button>
          </div>
          {mfaEnrollQr ? (
            <Image
              src={mfaEnrollQr}
              alt="MFA QR code"
              width={220}
              height={220}
              className="mfa-qr"
              unoptimized
            />
          ) : null}
          <label className="field">
            <span>Authenticator / Backup Code</span>
            <input
              value={mfaCode}
              onChange={(event) => setMfaCode(event.target.value)}
              placeholder="123456"
            />
          </label>
          <div className="button-row">
            <button className="primary-button" type="button" onClick={verifyMfa}>
              Verify & Enable MFA
            </button>
            <button className="danger-button" type="button" onClick={disableMfa}>
              Disable MFA
            </button>
          </div>
          {backupCodes.length > 0 ? (
            <div className="output-box">
              <strong>Backup Codes</strong>
              {backupCodes.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="panel">
          <h2>Passkeys (WebAuthn)</h2>
          <div className="button-row">
            <button className="secondary-button" type="button" onClick={registerPasskey}>
              Register Passkey
            </button>
          </div>
          <div className="session-list">
            {passkeys.map((passkey) => (
              <div className="session-card" key={passkey.id}>
                <div>
                  <strong>{passkey.credentialId.slice(0, 18)}...</strong>
                  <p className="muted">
                    Device: {passkey.deviceType ?? "unknown"} | Backed up:{" "}
                    {passkey.backedUp ? "Yes" : "No"}
                  </p>
                  <p className="muted">
                    Last used:{" "}
                    {passkey.lastUsedAt
                      ? new Date(passkey.lastUsedAt).toLocaleString()
                      : "Never"}
                  </p>
                </div>
                <button
                  className="danger-button"
                  type="button"
                  onClick={() => deletePasskey(passkey.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Session & Device Management</h2>
          <p className="muted">
            Revoke any session you do not recognize. Current session cannot be revoked
            from this panel.
          </p>
          <div className="session-list">
            {sessions.map((session) => (
              <div className="session-card" key={session.id}>
                <div>
                  <strong>{session.userAgent ?? "Unknown client"}</strong>
                  <p className="muted">IP: {session.ipAddress ?? "n/a"}</p>
                  <p className="muted">
                    Last seen:{" "}
                    {session.lastSeenAt
                      ? new Date(session.lastSeenAt).toLocaleString()
                      : "n/a"}
                  </p>
                </div>
                <div className="button-row">
                  <span className="muted">
                    {session.id === currentSessionId ? "Current" : "Other"}
                  </span>
                  {session.id !== currentSessionId && !session.revokedAt ? (
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => revokeSession(session.id)}
                    >
                      Revoke
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {resultMessage ? <p className="muted">{resultMessage}</p> : null}
      </section>
    </main>
  );
}
