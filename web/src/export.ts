/** Export helpers — CSV, JSON, webhook POST. All in-browser, no upload. */

import type { SlipRow } from "./state";
import type { ParsedSlip } from "./parse";

export function toJson(rows: SlipRow[]): string {
  const out = rows.map((r) => ({
    bank: r.bank,
    amount: r.amount,
    date: r.date,
    confidence: r.confidence,
    status: r.status,
    parsed: r.raw,
  }));
  return JSON.stringify(out, null, 2);
}

export function toCsv(rows: SlipRow[]): string {
  const header = [
    "date",
    "bank",
    "amount",
    "currency",
    "reference",
    "sender",
    "receiver",
    "fee",
    "confidence",
    "status",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    const p = r.raw as ParsedSlip | undefined;
    lines.push(
      [
        csvEscape(r.date ?? ""),
        csvEscape(r.bank),
        r.amount ?? "",
        "THB",
        csvEscape(p?.reference ?? ""),
        csvEscape(p?.senderName ?? ""),
        csvEscape(p?.receiverName ?? ""),
        p?.fee ?? "",
        r.confidence.toFixed(2),
        r.status,
      ].join(","),
    );
  }
  return lines.join("\n");
}

function csvEscape(s: string | number): string {
  const str = String(s);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function postWebhook(url: string, payload: unknown): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
}
