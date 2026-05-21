export function renderTopbar(): HTMLElement {
  const el = document.createElement("header");
  el.className = "topbar";
  el.innerHTML = `
    <div class="brand">Slip<span class="accent">·</span>to<span class="accent">·</span>Ledger</div>
    <div class="topbar-actions">
      <button class="btn ghost" id="lang-toggle" aria-label="Toggle language">TH | EN</button>
      <button class="btn ghost" id="theme-toggle" aria-label="Toggle theme">◐</button>
      <a class="btn ghost" href="https://github.com/" target="_blank" rel="noopener">GitHub</a>
      <button class="btn primary">+ เพิ่มสลิป</button>
    </div>
  `;
  el.querySelector<HTMLButtonElement>("#theme-toggle")?.addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = cur === "dark" ? "light" : "dark";
  });
  return el;
}
