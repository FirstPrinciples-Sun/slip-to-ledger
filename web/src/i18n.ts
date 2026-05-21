/** Simple bilingual i18n — toggleable via topbar. Persists to localStorage. */

export type Lang = "th" | "en";

const STORAGE_KEY = "slip-to-ledger:lang";

export function getLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "th" || stored === "en") return stored;
  return navigator.language.toLowerCase().startsWith("th") ? "th" : "en";
}

export function setLang(l: Lang) {
  localStorage.setItem(STORAGE_KEY, l);
  document.documentElement.lang = l;
  window.dispatchEvent(new CustomEvent("slip:lang-changed", { detail: l }));
}

const STRINGS = {
  th: {
    add_slip: "+ เพิ่มสลิป",
    hero_title_a: "สลิปโอนเงิน → ",
    hero_title_b: "Sheet",
    hero_title_c: " ใน 3 วินาที",
    hero_lede:
      "ลากสลิปลงมา ระบบอ่านอัตโนมัติ ส่งเข้าชีตได้ทันที OCR ทำงานในเบราว์เซอร์ของคุณ — สลิปไม่ถูกอัปโหลดที่ไหน",
    badge_offline: "100% Offline",
    badge_no_signup: "ไม่ต้องสมัคร",
    badge_oss: "Open source",
    drop_main: "ลากสลิปลงมา · วาง (⌘V) · เลือกไฟล์ · 📷 ถ่าย",
    drop_hint: "PNG, JPG, PDF · ทำงานในเบราว์เซอร์ ไม่อัปโหลดที่ไหน",
    table_bank: "ธนาคาร",
    table_amount: "จำนวนเงิน (THB)",
    table_date: "วันที่",
    table_confidence: "ความมั่นใจ",
    table_status: "สถานะ",
    filter_all: "ทั้งหมด",
    filter_ready: "✓ พร้อม",
    filter_review: "⚠ ตรวจทาน",
    filter_failed: "✕ ล้มเหลว",
    empty: "ยังไม่มีสลิป — ลากมาวางได้เลย",
    status_ready: "✓ พร้อมส่งออก",
    status_review: "⚠ ตรวจทาน",
    status_failed: "✕ อ่านไม่ได้",
    status_processing: "… กำลังอ่าน",
  },
  en: {
    add_slip: "+ Add slip",
    hero_title_a: "Bank slips → ",
    hero_title_b: "Sheet",
    hero_title_c: " in 3 seconds",
    hero_lede:
      "Drop a slip. Auto-extracted, ready to export. OCR runs in your browser — slips never upload anywhere.",
    badge_offline: "100% Offline",
    badge_no_signup: "No signup",
    badge_oss: "Open source",
    drop_main: "Drop slips · Paste (⌘V) · Browse · 📷 Capture",
    drop_hint: "PNG, JPG, PDF · Runs in browser, no upload",
    table_bank: "Bank",
    table_amount: "Amount (THB)",
    table_date: "Date",
    table_confidence: "Confidence",
    table_status: "Status",
    filter_all: "All",
    filter_ready: "✓ Ready",
    filter_review: "⚠ Review",
    filter_failed: "✕ Failed",
    empty: "No slips yet — drop one in",
    status_ready: "✓ Ready",
    status_review: "⚠ Review",
    status_failed: "✕ Failed",
    status_processing: "… Reading",
  },
} as const;

type Key = keyof (typeof STRINGS)["th"];

export function t(key: Key): string {
  return STRINGS[getLang()][key];
}
