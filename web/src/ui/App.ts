import { initialState, type AppState, type SlipRow } from "../state";
import { renderTopbar } from "./Topbar";
import { renderHero } from "./Hero";
import { renderDropZone } from "./DropZone";
import { renderBatchTable } from "./BatchTable";
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
    main.appendChild(renderBatchTable(state));
    root.appendChild(main);
  }

  async function processSlip(id: string, file: File) {
    try {
      const ocr = await ocrImage(file);
      const parsed = parseSlip(ocr.text);
      const row = state.slips.find((s) => s.id === id);
      if (!row) return;
      row.bank = bankLabel(parsed.bank);
      row.amount = parsed.amount;
      row.date = parsed.date;
      row.confidence = ocr.confidence;
      row.raw = parsed;
      row.status =
        parsed.amount !== null && parsed.bank !== "unknown" ? "ready"
        : ocr.confidence > 0 ? "review" : "failed";
    } catch (e) {
      const row = state.slips.find((s) => s.id === id);
      if (row) row.status = "failed";
      console.error("OCR failed:", e);
    } finally {
      rerender();
    }
  }

  rerender();
  window.addEventListener("slip:lang-changed", rerender);
  window.addEventListener("slip:theme-changed", rerender);
}
