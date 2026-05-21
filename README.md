# Slip-to-Ledger

> **สลิปโอนเงิน → Sheet ใน 3 วินาที.** Bank slips to spreadsheets, in seconds.

OCR สำหรับสลิปโอนเงินไทยทุกธนาคาร — รันในเบราว์เซอร์ของคุณเอง สลิปไม่ถูกอัปโหลดที่ไหน ส่งออกเป็น JSON / CSV / Webhook ได้ทันที

[![CI](https://github.com/FirstPrinciples-Sun/slip-to-ledger/actions/workflows/ci.yml/badge.svg)](https://github.com/FirstPrinciples-Sun/slip-to-ledger/actions/workflows/ci.yml)
[![Live Demo](https://img.shields.io/badge/demo-live-D97757)](https://firstprinciples-sun.github.io/slip-to-ledger/)
[![License: MIT OR Apache-2.0](https://img.shields.io/badge/license-MIT_OR_Apache--2.0-blue)](#license)

🟢 **ลองเลย:** https://firstprinciples-sun.github.io/slip-to-ledger/

---

## Features

- 📄 **Drag · drop · paste · 📷 capture** — รับ PNG / JPG / PDF (PDF.js)
- 🇹🇭 **9 ธนาคาร / wallet:** KBank · SCB · BBL · KTB · Krungsri · TTB · GSB · TrueMoney · PromptPay
- 🔒 **100% client-side** — OCR ทำงานในเบราว์เซอร์ ไม่อัปโหลดสลิปที่ไหน
- ✏️ **Inline edit + ⌘↵ save-and-next** — แก้ฟิลด์ที่ OCR อ่านผิดได้ในตัว, กดเดียวข้ามไปสลิปถัดไปที่ต้อง review
- 🛡️ **Local verifier** — ตรวจจับสลิปซ้ำ (SHA-256 + duplicate ref), วันที่ในอนาคต, จำนวนเงินผิด
- 📊 **Confidence score per row** — 5-dot meter ชี้ field ที่น่าจะอ่านผิด
- 📤 **Export:** Copy JSON · Download CSV / JSON · Generic webhook (LINE / Discord / Sheet relay)
- 🌗 **Dark mode + TH/EN toggle** — persist ผ่าน localStorage
- 🎨 **Warm terracotta UI** — IBM Plex Sans Thai, ไม่ใช่สี bank-blue น่าเบื่อ

## Status — D14 / 14 (~93%)

| ช่วง | งาน | สถานะ |
|---|---|---|
| D1 | Workspace + schema + CI | ✅ |
| D2 | Otsu binarization + EMVCo TLV + CRC | ✅ |
| D3 | Synthetic generator | ⏭ deferred to D12 |
| D4 | thai_utils + adapter framework | ✅ |
| D5 | Bank adapters (9 banks via JS-side parser) | ✅ |
| D6-7 | tesseract.js + drag-drop end-to-end | ✅ |
| D8 | CLI batch + watch | 🟡 stubs only — needs Rust toolchain |
| D9 | Local verifier (dup detect + suspicious) | ✅ |
| D10 | Inline edit + filter pills + save-and-next | ✅ |
| D11 | Export modal (JSON / CSV / webhook) | ✅ |
| D12 | Synthetic generator + golden snapshots | ⬜ |
| D13 | README + screencast | 🟡 README done, screencast pending |
| D14 | Live deploy on GitHub Pages | ✅ |

ดู [docs/progress.md](docs/progress.md) สำหรับ progress log + postmortem ทุกวัน

## Quick start

### Try it (no install)
👉 https://firstprinciples-sun.github.io/slip-to-ledger/

### Run locally

```bash
git clone https://github.com/FirstPrinciples-Sun/slip-to-ledger
cd slip-to-ledger/web
npm install
npm run dev
```

เปิด http://localhost:5173

### Rust core (optional, for `slip-core` development)

ต้องมี Rust toolchain — install ผ่าน [rustup.rs](https://rustup.rs)

```bash
rustup target add wasm32-unknown-unknown
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
```

## Project layout

```
slip-to-ledger/
├── crates/
│   ├── slip-core/    # Pure Rust: schema, parsing, QR/TLV, preprocess, verify
│   ├── slip-cli/     # CLI: batch processing + webhook export (stub)
│   └── slip-wasm/    # WASM bindings — browser-only facade
├── web/              # Vanilla TS + Vite — what GH Pages serves
├── samples/          # Synthetic slip generator (D12)
├── schema.json       # Canonical NormalizedSlip JSON Schema
└── docs/progress.md  # Daily progress log
```

## Architecture

**Hybrid pipeline:**
```
upload → SHA-256 hash → preprocess → QR decode (high-confidence anchor)
       → tesseract.js OCR (Thai+Eng) → bank detect → adapter parse
       → validate → fraud check → verify → render row
```

**Privacy boundary:** `slip-core` ไม่ทำ network call. `slip-cli` เป็น crate เดียวที่เรียก HTTP. `slip-wasm` เป็น facade ของ core สำหรับเบราว์เซอร์.

**QR > OCR override:** ถ้าเจอ PromptPay QR ในสลิป จะใช้ amount/ref จาก TLV (high-confidence) แทนค่าที่ OCR อ่านได้ — เพราะ QR carrier ตัวเลขแน่นอน 100%.

**Adapter pattern:** เพิ่มธนาคารใหม่ = ไฟล์เดียวที่ `crates/slip-core/src/banks/<bank>.rs` + `inventory::submit!` หนึ่งบรรทัด ดู [CONTRIBUTING.md](CONTRIBUTING.md).

## Roadmap (post v0.1)

- [ ] Synthetic slip generator + golden snapshot tests in CI (D12)
- [ ] Native CLI binary with file-watch + verifier plugins (D8)
- [ ] BOT slip-verify integration via self-hosted relay (Cloudflare Worker example included)
- [ ] Counter Service slip support (7-Eleven, Lotus, Big C bill payments)
- [ ] Per-field bounding-box highlights on slip preview (UX nice-to-have)
- [ ] FlowAccount / PEAK CSV templates

## Contributing

PRs welcome — especially bank adapter coverage. Adding a new bank takes ~20 lines, see [CONTRIBUTING.md](CONTRIBUTING.md).

ส่ง raw OCR text ของสลิปที่ parser ของเราไม่อ่าน (ใช้ปุ่ม `copy` ใน detail panel) ก็ช่วยได้มาก — เปิด GitHub Issue พร้อม raw text + bank name.

## License

Dual-licensed at your option:
- MIT ([LICENSE-MIT](LICENSE-MIT))
- Apache 2.0 ([LICENSE-APACHE](LICENSE-APACHE))

---

**Built with:** Rust · TypeScript · Vite · tesseract.js · IBM Plex Sans Thai
