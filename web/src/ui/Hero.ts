import { t } from "../i18n";

export function renderHero(): HTMLElement {
  const el = document.createElement("section");
  el.className = "hero";
  el.innerHTML = `
    <div>
      <h1>${t("hero_title_a")}<span class="accent">${t("hero_title_b")}</span>${t("hero_title_c")}</h1>
      <p class="lede">${t("hero_lede")}</p>
      <div class="trust-row">
        <span class="badge"><span class="dot"></span>${t("badge_offline")}</span>
        <span class="badge"><span class="dot"></span>${t("badge_no_signup")}</span>
        <span class="badge"><span class="dot"></span>${t("badge_oss")}</span>
      </div>
    </div>
  `;
  return el;
}
