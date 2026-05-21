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

      <div class="hero-demo">
        <div class="demo-slip">
          K PLUS<br>
          โอนเงินสำเร็จ<br>
          15 พ.ค. 2569 14:32<br>
          จาก นาย สมชาย ใจดี<br>
          xxx-x-x1234-5<br>
          ไปยัง บจก. เอบีซี<br>
          xxx-x-x6789-0<br>
          จำนวนเงิน 1,250.00 บาท<br>
          รหัสอ้างอิง 20260515ABC
        </div>
        <div class="demo-fields">
          <div class="demo-field"><span>Bank</span><strong>KBank</strong></div>
          <div class="demo-field"><span>Amount</span><strong>1,250.00</strong></div>
          <div class="demo-field"><span>Date</span><strong>2026-05-15</strong></div>
          <div class="demo-field"><span>Reference</span><strong>20260515ABC</strong></div>
          <div class="demo-field"><span>Confidence</span><strong>●●●●○</strong></div>
        </div>
      </div>
    </div>
  `;
  return el;
}
