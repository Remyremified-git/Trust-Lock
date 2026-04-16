import { randomInt } from "crypto";
import { DebitCard } from "@prisma/client";

export function usdToCents(amountUsd: number): number {
  return Math.round(amountUsd * 100);
}

export function centsToUsd(cents: number): number {
  return Math.round(cents) / 100;
}

export function formatUsd(cents: number): string {
  return `$${centsToUsd(cents).toFixed(2)}`;
}

export function generateCardPan(network: "VISA" | "MASTERCARD"): {
  maskedPan: string;
  last4: string;
} {
  const prefix = network === "VISA" ? "4" : "5";
  const digits = Array.from({ length: 15 }, () => randomInt(0, 10).toString()).join("");
  const full = `${prefix}${digits}`;
  const last4 = full.slice(-4);
  return {
    maskedPan: `**** **** **** ${last4}`,
    last4,
  };
}

export function cardExpiry(): { month: number; year: number } {
  const now = new Date();
  return {
    month: ((now.getMonth() + 1 + 35) % 12) + 1,
    year: now.getFullYear() + 3,
  };
}

export function normalizeCardCounters(card: DebitCard): {
  spentTodayCents: number;
  spentMonthCents: number;
  lastLimitResetAt: Date;
  changed: boolean;
} {
  const now = new Date();
  const last = card.lastLimitResetAt ?? card.updatedAt;
  const sameDay =
    now.getFullYear() === last.getFullYear() &&
    now.getMonth() === last.getMonth() &&
    now.getDate() === last.getDate();
  const sameMonth =
    now.getFullYear() === last.getFullYear() && now.getMonth() === last.getMonth();

  const spentTodayCents = sameDay ? card.spentTodayCents : 0;
  const spentMonthCents = sameMonth ? card.spentMonthCents : 0;
  const changed =
    spentTodayCents !== card.spentTodayCents || spentMonthCents !== card.spentMonthCents;

  return {
    spentTodayCents,
    spentMonthCents,
    lastLimitResetAt: now,
    changed,
  };
}

