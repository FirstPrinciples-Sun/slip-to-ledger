import type { SlipRow } from "../state";
import type { ParsedSlip } from "../parse";

export function renderDetailPanel(
  slip: SlipRow,
  onClose: () => void,
  onEdit: (patch: Partial<SlipRow>) => void,
  onDelete: () => void,
  onSaveAndNext: () => void,
): HTMLElement {
  const panel = document.createElement("aside");
  panel.className = "detail-panel";
  const parsed = slip.raw as ParsedSlip | undefined;

  panel.innerHTML = `
    <div class="detail-head">
      <button class="btn ghost" id="close-panel" aria-label="Close">✕</button>
      <strong>${escape(slip.filename)}</strong>
      ${slip.edited ? '<span class="edited-badge">edited</span>' : ""}
      <button class="btn ghost danger" id="delete-slip" aria-label="Delete">ลบ</button>
    </div>

    <div class="detail-body">
      ${slip.imageDataUrl ? `<img class="detail-image" src="${slip.imageDataUrl}" alt="slip" />` : ""}

      ${renderVerifyBlock(slip)}

      <h3>Edit fields</h3>
      <div class="edit-form">
        <label>
          <span>ธนาคาร</span>
          <input type="text" data-field="bank" value="${escape(slip.bank)}" />
        </label>
        <label>
          <span>จำนวนเงิน (THB)</span>
          <input type="number" step="0.01" data-field="amount" value="${slip.amount ?? ""}" />
        </label>
        <label>
          <span>วันที่ (YYYY-MM-DD)</span>
          <input type="date" data-field="date" value="${slip.date ?? ""}" />
        </label>
        <div class="kbd-hint">บันทึก: <kbd>Ctrl</kbd>+<kbd>↵</kbd> · ปิด: <kbd>Esc</kbd></div>
      </div>

      <h3>OCR confidence</h3>
      <div class="kv">
        <dt>Overall</dt><dd>${Math.round(slip.confidence * 100)}%</dd>
        <dt>Status</dt><dd>${slip.status}</dd>
        <dt>Reference</dt><dd>${escape(parsed?.reference ?? "—")}</dd>
        <dt>Sender</dt><dd>${escape(parsed?.senderName ?? "—")}</dd>
        <dt>Receiver</dt><dd>${escape(parsed?.receiverName ?? "—")}</dd>
        <dt>Fee</dt><dd>${parsed?.fee ?? "—"}</dd>
      </div>

      <h3 style="display:flex; align-items:center; justify-content:space-between;">
        Raw OCR text
        <button class="btn ghost copy-raw" id="copy-raw" style="font-size:11px; padding:4px 10px;">copy</button>
      </h3>
      <pre class="raw-ocr">${escape(parsed?.rawText ?? "(no OCR text)")}</pre>

      ${slip.status === "review" ? hintBlock(parsed) : ""}
    </div>
  `;

  // Wire inputs to onEdit
  panel.querySelectorAll<HTMLInputElement>("input[data-field]").forEach((input) => {
    input.addEventListener("input", () => {
      const field = input.dataset.field!;
      let value: string | number | null = input.value;
      if (field === "amount") {
        const n = parseFloat(input.value);
        value = isNaN(n) ? null : n;
      } else if (field === "date") {
        value = input.value || null;
      }
      onEdit({ [field]: value, edited: true } as Partial<SlipRow>);
    });
  });

  panel.querySelector("#close-panel")?.addEventListener("click", onClose);
  panel.querySelector("#delete-slip")?.addEventListener("click", () => {
    if (confirm(`ลบสลิป "${slip.filename}"?`)) onDelete();
  });
  panel.querySelector("#copy-raw")?.addEventListener("click", () => {
    void navigator.clipboard.writeText(parsed?.rawText ?? "");
  });

  // Keyboard shortcuts within panel
  const keyHandler = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onSaveAndNext();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };
  panel.addEventListener("keydown", keyHandler);
  // Auto-focus first review field
  setTimeout(() => {
    panel.querySelector<HTMLInputElement>('input[data-field="amount"]')?.focus();
  }, 0);

  return panel;
}

function hintBlock(parsed?: ParsedSlip): string {
  if (!parsed) return "";
  const missing: string[] = [];
  if (parsed.amount === null) missing.push("amount");
  if (parsed.date === null) missing.push("date");
  if (parsed.reference === null) missing.push("reference");
  if (parsed.bank === "unknown") missing.push("bank");
  if (missing.length === 0) return "";
  return `
    <div class="hint-block">
      <strong>Why review?</strong> Couldn't extract: <code>${missing.join(", ")}</code>.
      Fix above and press <kbd>Ctrl</kbd>+<kbd>↵</kbd> to save and jump to the next slip needing review.
    </div>
  `;
}

function renderVerifyBlock(slip: SlipRow): string {
  if (!slip.verify || slip.verify === "verified" || slip.verify === "unverified") return "";
  const tone = slip.verify === "duplicate" ? "duplicate" : "suspicious";
  const title = slip.verify === "duplicate" ? "⚠ สลิปซ้ำ" : "⚠ น่าสงสัย";
  return `
    <div class="verify-block ${tone}">
      <strong>${title}</strong>
      <div>${escape(slip.verifyDetail ?? "")}</div>
    </div>
  `;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!;
  });
}
