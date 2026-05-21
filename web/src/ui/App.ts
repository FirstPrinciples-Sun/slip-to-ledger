import { initialState, type AppState, type SlipRow } from "../state";
import { renderTopbar } from "./Topbar";
import { renderHero } from "./Hero";
import { renderDropZone } from "./DropZone";
import { renderBatchTable } from "./BatchTable";
import { renderDetailPanel } from "./DetailPanel";
import { ocrImage } from "../ocr";
import { parseSlip, bankLabel } from "../parse";

export function renderApp(root: HTMLElement) {
  const state: AppState = { ...initialState };

  function rerender() {
    root.innerHTML = "";
    root.appendChild(renderTopbar());

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
      renderBatchTable(state, (id) => {
        state.selectedId = state.selectedId === id ? null : id;
        rerender();
      }),
    );
    layout.appendChild(main);

    if (state.selectedId) {
      const slip = state.slips.find((s) => s.id === state.selectedId);
      if (slip) {
        layout.appendChild(
          renderDetailPanel(slip, () => {
            state.selectedId = null;
            rerender();
          }),
        );
      }
    }

    root.appendChild(layout);
  }

  async function processSlip(id: string, file: File) {
    try {
      const dataUrl = await fileToDataUrl(file);
      const row = state.slips.find((s) => s.id === id);
      if (row) row.imageDataUrl = dataUrl;

      const ocr = await ocrImage(file);
      const parsed = parseSlip(ocr.text);
      const r = state.slips.find((s) => s.id === id);
      if (!r) return;
      r.bank = bankLabel(parsed.bank);
      r.amount = parsed.amount;
      r.date = parsed.date;
      r.confidence = ocr.confidence;
      r.raw = parsed;
      r.status =
        parsed.amount !== null && parsed.bank !== "unknown" ? "ready"
        : ocr.confidence > 0 ? "review" : "failed";
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
