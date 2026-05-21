/**
 * Local verifier — runs in browser, no network.
 *
 * Catches:
 *  1. Exact-image duplicates via SHA-256 hash of file bytes
 *  2. Reference-number duplicates across the batch
 *  3. Future-dated slips (Thai people sometimes alter dates in slips
 *     to fake more-recent payments — flag as suspicious)
 *  4. Zero/negative amounts after edit (catch typos)
 *
 * Returns the verify status to attach to the slip row.
 */

import type { SlipRow, VerifyStatus } from "./state";
import type { ParsedSlip } from "./parse";

export interface VerifyResult {
  status: VerifyStatus;
  detail?: string;
}

export async function hashFile(file: File | Blob): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function verifyLocal(
  candidate: SlipRow,
  allSlips: SlipRow[],
): VerifyResult {
  const parsed = candidate.raw as ParsedSlip | undefined;

  // 1. Image hash duplicate
  if (candidate.imageHash) {
    const dup = allSlips.find(
      (s) =>
        s.id !== candidate.id &&
        s.imageHash === candidate.imageHash,
    );
    if (dup) {
      return {
        status: "duplicate",
        detail: `รูปภาพเหมือนกับ "${dup.filename}" (sha256 ตรง)`,
      };
    }
  }

  // 2. Reference-number duplicate
  if (parsed?.reference) {
    const dup = allSlips.find(
      (s) =>
        s.id !== candidate.id &&
        (s.raw as ParsedSlip | undefined)?.reference === parsed.reference,
    );
    if (dup) {
      return {
        status: "duplicate",
        detail: `เลขอ้างอิง ${parsed.reference} ซ้ำกับ "${dup.filename}"`,
      };
    }
  }

  // 3. Future-dated
  if (candidate.date) {
    const slipDate = new Date(candidate.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (slipDate > today) {
      return {
        status: "suspicious",
        detail: `วันที่ในสลิป (${candidate.date}) อยู่ในอนาคต`,
      };
    }
  }

  // 4. Invalid amount
  if (candidate.amount !== null && candidate.amount <= 0) {
    return {
      status: "suspicious",
      detail: `จำนวนเงินไม่ถูกต้อง (${candidate.amount})`,
    };
  }

  return { status: "verified" };
}
