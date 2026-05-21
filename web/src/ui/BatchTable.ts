import { t } from "../i18n";
import type { AppState, SlipRow } from "../state";

export function renderBatchTable(state: AppState): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.marginTop = "var(--space-5)";

  const counts = countByStatus(state.slips);
  const toolbar = document.createElement("div");
  toolbar.className = "batch-toolbar";
  toolbar.innerHTML = `
    <span class="filter-pill ${state.filter === "all" ? "active" : ""}">${t("filter_all")} (${state.slips.length})</span>
    <span class="filter-pill ${state.filter === "ready" ? "active" : ""}">${t("filter_ready")} (${counts.ready})</span>
    <span class="filter-pill ${state.filter === "review" ? "active" : ""}">${t("filter_review")} (${counts.review})</span>
    <span class="filter-pill ${state.filter === "failed" ? "active" : ""}">${t("filter_failed")} (${counts.failed})</span>
  `;
  wrap.appendChild(toolbar);

  if (state.slips.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText =
      "padding: var(--space-8) 0; text-align: center; color: var(--muted);";
    empty.textContent = t("empty");
    wrap.appendChild(empty);
    return wrap;
  }

  const table = document.createElement("table");
  table.className = "batch-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>${t("table_bank")}</th>
        <th style="text-align:right">${t("table_amount")}</th>
        <th>${t("table_date")}</th>
        <th>${t("table_confidence")}</th>
        <th>${t("table_status")}</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody")!;
  for (const s of filterRows(state)) {
    tbody.appendChild(renderRow(s));
  }
  wrap.appendChild(table);
  return wrap;
}

function filterRows(state: AppState): SlipRow[] {
  if (state.filter === "all") return state.slips;
  return state.slips.filter((s) => s.status === state.filter);
}

function countByStatus(slips: SlipRow[]) {
  return slips.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    },
    { ready: 0, review: 0, failed: 0, processing: 0 } as Record<string, number>,
  );
}

function renderRow(s: SlipRow): HTMLTableRowElement {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><span class="bank-chip">${escapeHtml(s.bank)}</span></td>
    <td style="text-align:right; font-variant-numeric: tabular-nums;">${formatAmount(s.amount)}</td>
    <td style="color: var(--muted)">${s.date ?? "—"}</td>
    <td>${renderDots(s.confidence)}</td>
    <td>${renderStatus(s.status)}</td>
  `;
  return tr;
}

function renderDots(c: number): string {
  const filled = Math.round(Math.max(0, Math.min(1, c)) * 5);
  const tone = c >= 0.8 ? "high" : c >= 0.5 ? "mid" : "low";
  let dots = "";
  for (let i = 0; i < 5; i++) {
    dots += `<span class="d ${i < filled ? `on ${tone}` : ""}"></span>`;
  }
  return `<span class="dots" aria-label="confidence ${filled} of 5">${dots}</span>`;
}

function renderStatus(s: SlipRow["status"]): string {
  switch (s) {
    case "ready":      return `<span class="status ok">${t("status_ready")}</span>`;
    case "review":     return `<span class="status review">${t("status_review")}</span>`;
    case "failed":     return `<span class="status failed">${t("status_failed")}</span>`;
    case "processing": return `<span class="status" style="color:var(--muted)">${t("status_processing")}</span>`;
  }
}

function formatAmount(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!;
  });
}
