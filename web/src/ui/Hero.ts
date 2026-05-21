export function renderHero(): HTMLElement {
  const el = document.createElement("section");
  el.className = "hero";
  el.innerHTML = `
    <div>
      <h1>สลิปโอนเงิน → <span class="accent">Sheet</span> ใน 3 วินาที</h1>
      <p class="lede">
        ลากสลิปลงมา ระบบอ่านอัตโนมัติ ส่งเข้าชีตได้ทันที
        OCR ทำงานในเบราว์เซอร์ของคุณ — สลิปไม่ถูกอัปโหลดที่ไหน
      </p>
      <div class="trust-row">
        <span class="badge"><span class="dot"></span>100% Offline</span>
        <span class="badge"><span class="dot"></span>No signup</span>
        <span class="badge"><span class="dot"></span>Open source</span>
      </div>
    </div>
  `;
  return el;
}
