import nodemailer from "nodemailer";

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function appBaseUrl() {
  return (
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}

function configuredTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    return null;
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendMail(payload: MailPayload): Promise<{
  delivered: boolean;
  preview: string;
}> {
  const transport = configuredTransport();
  if (!transport) {
    const preview = `[DEV EMAIL] TO=${payload.to} SUBJECT=${payload.subject}\n${payload.text}`;
    console.info(preview);
    return { delivered: false, preview };
  }

  await transport.sendMail({
    from: process.env.MAIL_FROM ?? "security@hybrid-vault.local",
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
  return { delivered: true, preview: "sent" };
}

export async function sendVerificationEmail(input: {
  email: string;
  token: string;
}) {
  const url = `${appBaseUrl()}/api/auth/verify-email?token=${encodeURIComponent(input.token)}`;
  return sendMail({
    to: input.email,
    subject: "Verify your Hybrid Vault account",
    text: `Verify your email by opening: ${url}`,
    html: `<p>Verify your email by clicking <a href="${url}">this link</a>.</p>`,
  });
}

export async function sendPasswordResetEmail(input: {
  email: string;
  token: string;
}) {
  const url = `${appBaseUrl()}/auth?reset_token=${encodeURIComponent(input.token)}`;
  return sendMail({
    to: input.email,
    subject: "Hybrid Vault password reset",
    text: `Reset your password using this link: ${url}`,
    html: `<p>Reset your password using <a href="${url}">this secure link</a>.</p>`,
  });
}

