import { getLang, setLang, t } from "../i18n";

const THEME_KEY = "slip-to-ledger:theme";

function getTheme(): "light" | "dark" {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setTheme(theme: "light" | "dark") {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.dataset.theme = theme;
}

// Apply persisted theme/lang on first import.
setTheme(getTheme());
document.documentElement.lang = getLang();

export function renderTopbar(): HTMLElement {
  const lang = getLang();
  const theme = getTheme();
  const themeIcon = theme === "dark" ? "☀" : "☾";

  const el = document.createElement("header");
  el.className = "topbar";
  el.innerHTML = `
    <div class="brand">Slip<span class="accent">·</span>to<span class="accent">·</span>Ledger</div>
    <div class="topbar-actions">
      <button class="btn ghost" id="lang-toggle" aria-label="Toggle language">
        ${lang === "th" ? "<strong>TH</strong> | EN" : "TH | <strong>EN</strong>"}
      </button>
      <button class="btn ghost" id="theme-toggle" aria-label="Toggle theme">${themeIcon}</button>
      <a class="btn ghost" href="https://github.com/FirstPrinciples-Sun/slip-to-ledger"
         target="_blank" rel="noopener">GitHub</a>
      <button class="btn primary" id="export-btn">${t("export")}</button>
    </div>
  `;

  el.querySelector<HTMLButtonElement>("#theme-toggle")?.addEventListener("click", () => {
    setTheme(getTheme() === "dark" ? "light" : "dark");
    window.dispatchEvent(new CustomEvent("slip:theme-changed"));
  });

  el.querySelector<HTMLButtonElement>("#lang-toggle")?.addEventListener("click", () => {
    setLang(getLang() === "th" ? "en" : "th");
  });

  return el;
}
