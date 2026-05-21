import { initialState, type AppState, type SlipRow } from "../state";
import { renderTopbar } from "./Topbar";
import { renderHero } from "./Hero";
import { renderDropZone } from "./DropZone";
import { renderBatchTable } from "./BatchTable";

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
          for (const f of files) {
            const row: SlipRow = {
              id: crypto.randomUUID(),
              filename: f.name,
              bank: "—",
              amount: null,
              date: null,
              confidence: 0,
              status: "processing",
            };
            state.slips.push(row);
          }
          rerender();
        },
      }),
    );
    main.appendChild(renderBatchTable(state));
    root.appendChild(main);
  }

  rerender();
}
