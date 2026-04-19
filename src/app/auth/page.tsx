"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { FormEvent, useEffect, useState } from "react";

type AuthView = "signup" | "login";

export default function AuthPage() {
  const [view, setView] = useState<AuthView>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [antiPhishingCode, setAntiPhishingCode] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("reset_token");
    const verified = params.get("verified");
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResetToken(token);
    }
    if (verified === "1") {
      setStatus("Email verified successfully. You can now sign in.");
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(view === "signup" ? "Creating account..." : "Signing in...");

    const endpoint = view === "signup" ? "/api/auth/signup" : "/api/auth/login";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        mfa_code: mfaCode || undefined,
        display_name: displayName || undefined,
        anti_phishing_code: antiPhishingCode || undefined,
      }),
    });
    const payload = (await response.json()) as {
      ok: boolean;
      error?: string;
      requires_mfa?: boolean;
    };
    if (!payload.ok) {
      setStatus(
        payload.requires_mfa
          ? `${payload.error ?? "MFA required"}: enter authenticator or backup code`
          : payload.error ?? "Authentication failed",
      );
      return;
    }
    setStatus("Authenticated. You can now open the user portal.");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setStatus("Logged out.");
  }

  async function resendVerification() {
    const response = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const payload = (await response.json()) as { ok: boolean; error?: string; message?: string };
    setStatus(payload.ok ? payload.message ?? "Verification email sent." : payload.error ?? "Failed");
  }

  async function requestPasswordReset() {
    const response = await fetch("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const payload = (await response.json()) as { ok: boolean; error?: string; message?: string };
    setStatus(payload.ok ? payload.message ?? "Password reset requested." : payload.error ?? "Failed");
  }

  async function submitPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: resetToken,
        new_password: newPassword,
      }),
    });
    const payload = (await response.json()) as { ok: boolean; error?: string; message?: string };
    setStatus(payload.ok ? payload.message ?? "Password reset done." : payload.error ?? "Failed");
    if (payload.ok) {
      setResetToken("");
      setNewPassword("");
      const url = new URL(window.location.href);
      url.searchParams.delete("reset_token");
      window.history.replaceState({}, "", url.toString());
    }
  }

  async function passkeyLogin() {
    setStatus("Starting passkey login...");
    const optionsRes = await fetch("/api/auth/passkey/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const optionsPayload = (await optionsRes.json()) as {
      ok: boolean;
      error?: string;
      options?: unknown;
    };
    if (!optionsPayload.ok || !optionsPayload.options) {
      setStatus(optionsPayload.error ?? "Failed to start passkey login.");
      return;
    }

    const credential = await startAuthentication({
      optionsJSON: optionsPayload.options as never,
    });
    const verifyRes = await fetch("/api/auth/passkey/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, response: credential }),
    });
    const verifyPayload = (await verifyRes.json()) as { ok: boolean; error?: string };
    setStatus(verifyPayload.ok ? "Passkey login successful." : verifyPayload.error ?? "Failed");
  }

  return (
    <main className="screen">
      <section className="panel">
        <p className="kicker">Account Access</p>
        <h1>Sign in to manage linked wallets and virtual spending cards</h1>

        <div className="button-row">
          <button
            type="button"
            className={view === "signup" ? "primary-button" : "secondary-button"}
            onClick={() => setView("signup")}
          >
            Signup
          </button>
          <button
            type="button"
            className={view === "login" ? "primary-button" : "secondary-button"}
            onClick={() => setView("login")}
          >
            Login
          </button>
          <button type="button" className="danger-button" onClick={handleLogout}>
            Logout
          </button>
          <button type="button" className="secondary-button" onClick={passkeyLogin}>
            Passkey Login
          </button>
          <button type="button" className="secondary-button" onClick={resendVerification}>
            Resend Verification
          </button>
          <button type="button" className="secondary-button" onClick={requestPasswordReset}>
            Forgot Password
          </button>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {view === "login" ? (
            <label className="field">
              <span>MFA Code (if enabled)</span>
              <input
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
                placeholder="123456 or backup code"
              />
            </label>
          ) : null}

          {view === "signup" ? (
            <label className="field">
              <span>Display name</span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
          ) : null}

          {view === "signup" ? (
            <label className="field">
              <span>Anti-Phishing Code (optional)</span>
              <input
                type="text"
                value={antiPhishingCode}
                onChange={(event) => setAntiPhishingCode(event.target.value)}
                placeholder="MY-SAFE-CODE"
              />
            </label>
          ) : null}

          <button className="primary-button" type="submit">
            {view === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        {resetToken ? (
          <form className="stack" onSubmit={submitPasswordReset}>
            <h3>Reset Password</h3>
            <label className="field">
              <span>New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </label>
            <button className="primary-button" type="submit">
              Reset Password
            </button>
          </form>
        ) : null}

        {status ? <p className="muted">{status}</p> : null}
      </section>
    </main>
  );
}
