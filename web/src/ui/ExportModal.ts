import type { SlipRow } from "../state";
import { toJson, toCsv, downloadFile, postWebhook } from "../export";

export function renderExportModal(
  rows: SlipRow[],
  onClose: () => void,
): HTMLElement {
  const ready = rows.filter((r) => r.status === "ready" || r.status === "review");
  const exportable = ready.length;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h2>ส่งออก ${exportable} สลิป</h2>
        <button class="btn ghost" id="close" aria-label="Close">✕</button>
      </div>

      <div class="modal-body">
        <div class="export-grid">
          <button class="export-card" data-action="copy-json">
            <div class="export-icon">{ }</div>
            <div class="export-label">Copy JSON</div>
            <div class="export-hint">วางลง Notion, Airtable, ฯลฯ</div>
          </button>

          <button class="export-card" data-action="download-csv">
            <div class="export-icon">⬇</div>
            <div class="export-label">Download CSV</div>
            <div class="export-hint">เปิดด้วย Excel / Google Sheets</div>
          </button>

          <button class="export-card" data-action="download-json">
            <div class="export-icon">⬇</div>
            <div class="export-label">Download JSON</div>
            <div class="export-hint">โครงสร้างเต็มทุก field</div>
          </button>

          <button class="export-card" data-action="webhook">
            <div class="export-icon">⇄</div>
            <div class="export-label">Webhook URL</div>
            <div class="export-hint">POST ไป LINE / Discord / Sheet relay</div>
          </button>
        </div>

        <div id="webhook-form" class="webhook-form" style="display:none">
          <label>
            <span>Webhook URL</span>
            <input type="url" id="webhook-url" placeholder="https://hooks.example.com/..." />
          </label>
          <div class="webhook-actions">
            <button class="btn ghost" id="webhook-cancel">ยกเลิก</button>
            <button class="btn primary" id="webhook-send">Send</button>
          </div>
          <div id="webhook-status" class="webhook-status"></div>
        </div>

        <div id="result" class="export-result"></div>
      </div>
    </div>
  `;

  const showResult = (text: string, ok = true) => {
    const r = overlay.querySelector<HTMLDivElement>("#result")!;
    r.textContent = text;
    r.className = `export-result ${ok ? "ok" : "err"}`;
  };

  overlay.querySelectorAll<HTMLButtonElement>(".export-card").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.dataset.action!;
      try {
        switch (action) {
          case "copy-json":
            await navigator.clipboard.writeText(toJson(ready));
            showResult(`คัดลอก JSON ของ ${ready.length} สลิปแล้ว`);
            break;
          case "download-csv":
            downloadFile(`slips-${stamp()}.csv`, toCsv(ready), "text/csv");
            showResult(`ดาวน์โหลด CSV เรียบร้อย`);
            break;
          case "download-json":
            downloadFile(`slips-${stamp()}.json`, toJson(ready), "application/json");
            showResult(`ดาวน์โหลด JSON เรียบร้อย`);
            break;
          case "webhook":
            overlay.querySelector<HTMLDivElement>("#webhook-form")!.style.display = "block";
            overlay.querySelector<HTMLInputElement>("#webhook-url")!.focus();
            break;
        }
      } catch (e) {
        showResult(`ผิดพลาด: ${(e as Error).message}`, false);
      }
    });
  });

  overlay.querySelector("#webhook-cancel")?.addEventListener("click", () => {
    overlay.querySelector<HTMLDivElement>("#webhook-form")!.style.display = "none";
  });

  overlay.querySelector("#webhook-send")?.addEventListener("click", async () => {
    const url = overlay.querySelector<HTMLInputElement>("#webhook-url")!.value.trim();
    const status = overlay.querySelector<HTMLDivElement>("#webhook-status")!;
    if (!url) {
      status.textContent = "ใส่ URL ก่อน";
      status.className = "webhook-status err";
      return;
    }
    status.textContent = "กำลังส่ง…";
    status.className = "webhook-status";
    try {
      await postWebhook(url, { slips: ready });
      status.textContent = `✓ ส่ง ${ready.length} สลิปสำเร็จ`;
      status.className = "webhook-status ok";
    } catch (e) {
      status.textContent = `✕ ${(e as Error).message}`;
      status.className = "webhook-status err";
    }
  });

  overlay.querySelector("#close")?.addEventListener("click", onClose);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) onClose();
  });
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") onClose();
    },
    { once: true },
  );

  return overlay;
}

function stamp(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
