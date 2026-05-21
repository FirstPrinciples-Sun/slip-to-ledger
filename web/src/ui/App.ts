import { initialState, type AppState, type SlipRow } from "../state";
import { renderTopbar } from "./Topbar";
import { renderHero } from "./Hero";
import { renderDropZone } from "./DropZone";
import { renderBatchTable } from "./BatchTable";
import { renderDetailPanel } from "./DetailPanel";
import { renderExportModal } from "./ExportModal";
import { ocrImage } from "../ocr";
import { parseSlip, bankLabel } from "../parse";
import { hashFile, verifyLocal } from "../verify";

export function renderApp(root: HTMLElement) {
  const state: AppState = { ...initialState };
  let exportOpen = false;

  function rerender() {
    root.innerHTML = "";
    const topbar = renderTopbar();
    topbar.querySelector("#export-btn")?.addEventListener("click", () => {
      if (state.slips.length === 0) return;
      exportOpen = true;
      rerender();
    });
    root.appendChild(topbar);

    if (state.slips.length === 0) {
      root.appendChild(renderHero());
    }

    const layout = document.createElement("div");
    layout.className = state.selectedId ? "layout with-panel" : "layout";

    const main = document.createElement("main");
    main.className = "batch";
    main.appendChild(
      renderDropZone({
        onFiles: (files) => {
          const newRows: SlipRow[] = files.map((f) => ({
            id: crypto.randomUUID(),
            filename: f.name,
            bank: "—",
            amount: null,
            date: null,
            confidence: 0,
            status: "processing",
          }));
          state.slips.push(...newRows);
          rerender();
          for (let i = 0; i < newRows.length; i++) {
            void processSlip(newRows[i].id, files[i]);
          }
        },
      }),
    );
    main.appendChild(
      renderBatchTable(
        state,
        (id) => {
          state.selectedId = state.selectedId === id ? null : id;
          rerender();
        },
        (f) => {
          state.filter = f;
          rerender();
        },
      ),
    );
    layout.appendChild(main);

    if (state.selectedId) {
      const slip = state.slips.find((s) => s.id === state.selectedId);
      if (slip) {
        layout.appendChild(
          renderDetailPanel(
            slip,
            () => {
              state.selectedId = null;
              rerender();
            },
            (patch) => {
              const r = state.slips.find((x) => x.id === slip.id);
              if (!r) return;
              Object.assign(r, patch);
              if (patch.amount !== undefined && r.amount !== null && r.bank !== "—") {
                r.status = "ready";
              }
            },
            () => {
              state.slips = state.slips.filter((x) => x.id !== slip.id);
              state.selectedId = null;
              rerender();
            },
            () => {
              const reviewing = state.slips.filter((x) => x.status === "review");
              const idx = reviewing.findIndex((x) => x.id === slip.id);
              const next = reviewing[idx + 1];
              state.selectedId = next?.id ?? null;
              rerender();
            },
          ),
        );
      }
    }

    root.appendChild(layout);

    if (exportOpen) {
      root.appendChild(
        renderExportModal(state.slips, () => {
          exportOpen = false;
          rerender();
        }),
      );
    }
  }

  async function processSlip(id: string, file: File) {
    try {
      const dataUrl = await fileToDataUrl(file);
      const fileHash = await hashFile(file);
      const row = state.slips.find((s) => s.id === id);
      if (row) {
        row.imageDataUrl = dataUrl;
        row.imageHash = fileHash;
      }

      const ocr = await ocrImage(file);
      const parsed = parseSlip(ocr.text);
      const r = state.slips.find((s) => s.id === id);
      if (!r) return;
      r.bank = bankLabel(parsed.bank);
      r.amount = parsed.amount;
      r.date = parsed.date;
      r.confidence = ocr.confidence;
      r.raw = parsed;
      r.status = decideStatus(parsed, ocr.confidence);

      // Run local verifier — catches dup hash, dup ref, future date, etc.
      const v = verifyLocal(r, state.slips);
      r.verify = v.status;
      r.verifyDetail = v.detail;
      if (v.status === "duplicate" || v.status === "suspicious") {
        r.status = "review";
      }
    } catch (e) {
      const r = state.slips.find((s) => s.id === id);
      if (r) r.status = "failed";
      console.error("OCR failed:", e);
    } finally {
      rerender();
    }
  }

  rerender();
  window.addEventListener("slip:lang-changed", rerender);
  window.addEventListener("slip:theme-changed", rerender);
}

function fileToDataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(f);
  });
}

import type { ParsedSlip } from "../parse";
function decideStatus(p: ParsedSlip, ocrConfidence: number): SlipRow["status"] {
  if (ocrConfidence === 0) return "failed";
  // Score the extraction quality across 4 critical fields.
  let score = 0;
  if (p.bank !== "unknown") score += 0.3;
  if (p.amount !== null && p.amount > 0) score += 0.4;
  if (p.date !== null) score += 0.15;
  if (p.reference) score += 0.15;
  // Combine with raw OCR confidence — both must be reasonable.
  const combined = score * 0.7 + ocrConfidence * 0.3;
  if (combined >= 0.75 && p.amount !== null && p.bank !== "unknown") return "ready";
  if (combined >= 0.3) return "review";
  return "failed";
}
