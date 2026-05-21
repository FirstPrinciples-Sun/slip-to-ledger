import type { SlipRow } from "../state";
import type { ParsedSlip } from "../parse";

export function renderDetailPanel(slip: SlipRow, onClose: () => void): HTMLElement {
  const panel = document.createElement("aside");
  panel.className = "detail-panel";
  const parsed = slip.raw as ParsedSlip | undefined;

  panel.innerHTML = `
    <div class="detail-head">
      <button class="btn ghost" id="close-panel" aria-label="Close">✕</button>
      <strong>${escape(slip.filename)}</strong>
    </div>

    <div class="detail-body">
      ${slip.imageDataUrl ? `<img class="detail-image" src="${slip.imageDataUrl}" alt="slip" />` : ""}

      <h3>Parsed fields</h3>
      <dl class="kv">
        ${row("Bank", slip.bank)}
        ${row("Amount", slip.amount !== null ? slip.amount.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "❌ not found")}
        ${row("Date", slip.date ?? "❌ not found")}
        ${row("Reference", parsed?.reference ?? "❌ not found")}
        ${row("Sender", parsed?.senderName ?? "—")}
        ${row("Receiver", parsed?.receiverName ?? "—")}
        ${row("Fee", parsed?.fee !== null && parsed?.fee !== undefined ? String(parsed.fee) : "—")}
        ${row("OCR confidence", `${Math.round(slip.confidence * 100)}%`)}
      </dl>

      <h3 style="display:flex; align-items:center; justify-content:space-between;">
        Raw OCR text
        <button class="btn ghost copy-raw" id="copy-raw" style="font-size:11px; padding:4px 10px;">copy</button>
      </h3>
      <pre class="raw-ocr">${escape(parsed?.rawText ?? "(no OCR text)")}</pre>

      <h3 style="display:flex; align-items:center; justify-content:space-between;">
        Parsed JSON
        <button class="btn ghost" id="copy-json" style="font-size:11px; padding:4px 10px;">copy</button>
      </h3>
      <pre class="raw-ocr">${escape(JSON.stringify(parsed ?? slip, null, 2))}</pre>

      ${slip.status === "review" ? hintBlock(parsed) : ""}
    </div>
  `;

  panel.querySelector("#close-panel")?.addEventListener("click", onClose);
  panel.querySelector("#copy-raw")?.addEventListener("click", () => {
    void navigator.clipboard.writeText(parsed?.rawText ?? "");
  });
  panel.querySelector("#copy-json")?.addEventListener("click", () => {
    void navigator.clipboard.writeText(JSON.stringify(parsed ?? slip, null, 2));
  });
  return panel;
}

function row(label: string, value: string): string {
  return `<dt>${escape(label)}</dt><dd>${escape(value)}</dd>`;
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
      Send the raw OCR text above as a GitHub issue —
      help us add this slip layout to the parser.
    </div>
  `;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!;
  });
}
