/**
 * Browser-side parser — mirrors the Rust slip-core adapter logic for KBank
 * and SCB. Used until slip-wasm is wired in D6-7. Same regex anchors, same
 * Thai date / amount handling.
 */

export type SourceBank =
  | "kbank"
  | "scb"
  | "bbl"
  | "ktb"
  | "bay"
  | "ttb"
  | "gsb"
  | "tisco"
  | "uob"
  | "cimb"
  | "lhb"
  | "kkp"
  | "icbc"
  | "truemoney"
  | "promptpay"
  | "unknown";

export interface ParsedSlip {
  bank: SourceBank;
  bankConfidence: number;
  amount: number | null;
  fee: number | null;
  date: string | null;
  reference: string | null;
  senderName: string | null;
  receiverName: string | null;
  rawText: string;
}

const THAI_MONTHS: Record<string, number> = {
  มกราคม: 1, "ม.ค.": 1,
  กุมภาพันธ์: 2, "ก.พ.": 2,
  มีนาคม: 3, "มี.ค.": 3,
  เมษายน: 4, "เม.ย.": 4,
  พฤษภาคม: 5, "พ.ค.": 5,
  มิถุนายน: 6, "มิ.ย.": 6,
  กรกฎาคม: 7, "ก.ค.": 7,
  สิงหาคม: 8, "ส.ค.": 8,
  กันยายน: 9, "ก.ย.": 9,
  ตุลาคม: 10, "ต.ค.": 10,
  พฤศจิกายน: 11, "พ.ย.": 11,
  ธันวาคม: 12, "ธ.ค.": 12,
};

function thaiToArabic(s: string): string {
  return s.replace(/[๐-๙]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x0e50 + 0x30));
}

function detectBank(text: string): { bank: SourceBank; confidence: number } {
  const t = text.toUpperCase();
  const orig = text;
  const candidates: Array<{ bank: SourceBank; score: number }> = [
    { bank: "kbank", score: scoreKeywords(t, orig, ["K PLUS", "K+", "KBANK", "KASIKORN"], ["กสิกรไทย"]) },
    { bank: "scb", score: scoreKeywords(t, orig, ["SCB EASY", "SCB"], ["ไทยพาณิชย์"]) },
    { bank: "bbl", score: scoreKeywords(t, orig, ["BANGKOK BANK", "BUALUANG", "BBL"], ["กรุงเทพ"]) },
    { bank: "ktb", score: scoreKeywords(t, orig, ["KRUNGTHAI", "KTB"], ["กรุงไทย"]) },
    { bank: "bay", score: scoreKeywords(t, orig, ["KMA", "KRUNGSRI", "BAY"], ["กรุงศรี"]) },
    { bank: "ttb", score: scoreKeywords(t, orig, ["TTB", "TMRW"], ["ทหารไทยธนชาต"]) },
    { bank: "gsb", score: scoreKeywords(t, orig, ["GSB", "MYMO"], ["ออมสิน"]) },
    { bank: "tisco", score: scoreKeywords(t, orig, ["TISCO"], ["ทิสโก้"]) },
    { bank: "uob", score: scoreKeywords(t, orig, ["UOB", "TMRW BY UOB"], ["ยูโอบี"]) },
    { bank: "cimb", score: scoreKeywords(t, orig, ["CIMB", "OCTO"], ["ซีไอเอ็มบี"]) },
    { bank: "lhb", score: scoreKeywords(t, orig, ["LH BANK", "LHB", "PROFITA"], ["แลนด์ แอนด์ เฮ้าส์", "แลนด์แอนด์เฮ้าส์"]) },
    { bank: "kkp", score: scoreKeywords(t, orig, ["KKP", "KIATNAKIN", "DIME"], ["เกียรตินาคิน", "เกียรตินาคินภัทร"]) },
    { bank: "icbc", score: scoreKeywords(t, orig, ["ICBC"], ["ไอซีบีซี", "ไอ ซี บี ซี"]) },
    { bank: "truemoney", score: scoreKeywords(t, orig, ["TRUEMONEY", "TRUE MONEY"], ["ทรูมันนี่"]) },
    { bank: "promptpay", score: scoreKeywords(t, orig, ["PROMPTPAY"], ["พร้อมเพย์"]) },
  ];
  candidates.sort((a, b) => b.score - a.score);
  const top = candidates[0];
  if (top.score < 20) return { bank: "unknown", confidence: 0 };
  return { bank: top.bank, confidence: Math.min(top.score / 100, 1) };
}

function scoreKeywords(upper: string, original: string, eng: string[], thai: string[]): number {
  let score = 0;
  for (const k of eng) if (upper.includes(k)) score += 50;
  for (const k of thai) if (original.includes(k)) score += 50;
  return Math.min(score, 100);
}

function parseAmountNear(text: string, labels: string[]): number | null {
  const norm = thaiToArabic(text);
  for (const label of labels) {
    const idx = norm.indexOf(label);
    if (idx === -1) continue;
    const after = norm.slice(idx + label.length, idx + label.length + 80);
    const m = after.match(/([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/);
    if (m) {
      const v = parseFloat(m[1].replace(/,/g, ""));
      if (v > 0) return v;
    }
  }
  return null;
}

/**
 * Fallback: scan the whole slip for "<number> บาท" or "<number> THB",
 * pick the largest match (slips usually show fee = 0.00 separately, so the
 * transfer amount is the bigger one). Used when label-anchored search fails.
 */
function parseAmountFallback(text: string): number | null {
  const norm = thaiToArabic(text);
  const re = /([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2}|[0-9]+\.[0-9]{2})\s*(?:บาท|THB|฿)/g;
  let max = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(norm))) {
    const v = parseFloat(m[1].replace(/,/g, ""));
    if (v > max) max = v;
  }
  return max > 0 ? max : null;
}

function parseRefNear(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const idx = text.indexOf(label);
    if (idx === -1) continue;
    const after = text.slice(idx + label.length, idx + label.length + 60);
    const m = after.match(/[A-Z0-9]{6,}/);
    if (m) return m[0];
  }
  return null;
}

function parseThaiDate(text: string): string | null {
  const norm = thaiToArabic(text);
  const months = Object.keys(THAI_MONTHS)
    .map((m) => m.replace(/\./g, "\\."))
    .join("|");
  const re = new RegExp(`(\\d{1,2})\\s*(${months})\\s*(\\d{2,4})`);
  const m = norm.match(re);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = THAI_MONTHS[m[2]];
  let year = parseInt(m[3], 10);
  if (year < 100) year += 2500;
  if (year >= 2400) year -= 543;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parsePartyName(text: string, label: string, until: string[]): string | null {
  const idx = text.indexOf(label);
  if (idx === -1) return null;
  let end = text.length;
  for (const u of until) {
    const i = text.indexOf(u, idx + label.length);
    if (i !== -1 && i < end) end = i;
  }
  const block = text.slice(idx + label.length, end);
  for (const line of block.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const digitCount = (trimmed.match(/\d/g) ?? []).length;
    if (digitCount < 4 && trimmed.length >= 2) return trimmed;
  }
  return null;
}

export function parseSlip(text: string): ParsedSlip {
  const detected = detectBank(text);
  const amount =
    parseAmountNear(text, [
      "จำนวนเงิน",
      "จำนวน",
      "ยอดโอน",
      "ยอดเงิน",
      "ยอดที่โอน",
      "ยอดที่ชำระ",
      "Transfer Amount",
      "Transferred Amount",
      "Amount",
      "Total",
    ]) ?? parseAmountFallback(text);

  const fee = parseAmountNear(text, ["ค่าธรรมเนียม", "Fee", "Service fee"]);

  return {
    bank: detected.bank,
    bankConfidence: detected.confidence,
    amount,
    fee,
    date: parseThaiDate(text),
    reference: parseRefNear(text, [
      "รหัสอ้างอิง",
      "เลขที่อ้างอิง",
      "เลขที่รายการ",
      "เลขที่ทำรายการ",
      "หมายเลขอ้างอิง",
      "Reference No.",
      "Reference",
      "Ref ID",
      "Ref:",
      "Ref.",
      "Transaction ID",
    ]),
    senderName:
      parsePartyName(text, "จาก", ["ไปยัง", "ผู้รับ", "ไป"]) ??
      parsePartyName(text, "ผู้โอน", ["ไปยัง", "ผู้รับ", "จำนวน"]) ??
      parsePartyName(text, "From", ["To", "Amount"]),
    receiverName:
      parsePartyName(text, "ไปยัง", ["จำนวน", "ค่าธรรมเนียม", "รหัส", "เลขที่"]) ??
      parsePartyName(text, "ผู้รับ", ["จำนวน", "ค่าธรรมเนียม", "รหัส", "เลขที่"]) ??
      parsePartyName(text, "To", ["Amount", "Fee", "Reference"]),
    rawText: text,
  };
}

export function bankLabel(b: SourceBank): string {
  const labels: Record<SourceBank, string> = {
    kbank: "KBank",
    scb: "SCB",
    bbl: "BBL",
    ktb: "KTB",
    bay: "Krungsri",
    ttb: "TTB",
    gsb: "GSB",
    tisco: "TISCO",
    uob: "UOB",
    cimb: "CIMB",
    lhb: "LH Bank",
    kkp: "KKP",
    icbc: "ICBC",
    truemoney: "TrueMoney",
    promptpay: "PromptPay",
    unknown: "?",
  };
  return labels[b];
}
