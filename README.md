# Slip-to-Ledger

> สลิปโอนเงิน → Sheet ใน 3 วินาที. Bank slips to spreadsheets, in seconds.

OCR สำหรับสลิปโอนเงินไทยทุกธนาคาร (KBank, SCB, BBL, KTB, BAY, TTB, GSB, TrueMoney, PromptPay QR …) — รันในเบราว์เซอร์ของคุณเอง สลิปไม่ถูกอัปโหลดที่ไหน มี CLI สำหรับ batch + webhook export ไป Google Sheets / LINE / Discord

**สถานะ:** alpha, MVP กำลังพัฒนา (D1 เสร็จแล้ว)

## ทำไมต้องมีโปรเจ็คนี้

- ฟรีแลนซ์/ร้านค้าไทยต้องบันทึกรายรับจากสลิปโอนเงินมือเปล่า ทุกวัน ทุกธนาคาร format ต่างกัน
- เครื่องมือที่มีอยู่เป็น SaaS ผูกบัญชีร้านค้า ไม่เหมาะกับ dev ที่อยาก self-host
- ยังไม่มี OSS ที่ทำเรื่องนี้ดีๆ ครอบคลุมทุกธนาคารหลัก

## สิ่งที่ทำได้ (เป้าหมาย v0.1)

- Drag-drop สลิป (PNG/JPG/PDF) → JSON มาตรฐานเดียวกัน
- รองรับธนาคารหลักไทย + e-wallet + PromptPay QR
- ตรวจจับสลิปซ้ำ / สลิปปลอม (ELA, EXIF, perceptual hash)
- ทุก field มี confidence score → UI ชี้ field ที่ต้อง review
- Export: JSON / CSV / Google Sheets / LINE / Discord webhook
- Verify pluggable: Local (default), BOT slip-verify, RDCW slipok
- 100% client-side ใน browser — privacy-first

## โครงสร้างโปรเจ็ค

```
slip-to-ledger/
├── crates/
│   ├── slip-core/   # Pure Rust core: schema, parsing, QR, fraud, verify
│   ├── slip-cli/    # CLI: batch processing + webhook export
│   └── slip-wasm/   # WASM bindings สำหรับ browser
├── web/             # Vanilla TS + Vite frontend
├── samples/         # Synthetic slip generator + ground-truth JSON
└── schema.json      # Canonical NormalizedSlip JSON schema
```

## Quick start

> Rust toolchain ยังไม่ได้ install — ดู [Setup](#setup)

### Web (frontend only — Day 1 ใช้ได้)

```bash
cd web
npm install
npm run dev
```

เปิด `http://localhost:5173` → ลาก slip ลง drop zone

### CLI (Day 8)

```bash
cargo run -p slip-cli -- parse path/to/slip.png --format json
cargo run -p slip-cli -- watch ./inbox
```

### WASM build (Day 6-7)

```bash
cd crates/slip-wasm
wasm-pack build --target web --out-dir ../../web/pkg
```

## Setup

ต้องมี:

- **Rust** stable + `wasm32-unknown-unknown` target ([rustup.rs](https://rustup.rs))
- **Node.js** 20+ และ npm
- **wasm-pack** (`cargo install wasm-pack`)

## Architecture

ดู `C:/Users/ACER/.claude/plans/c-users-acer-projects-generic-wadler.md` สำหรับ plan เต็ม
รวม UX/UI design, 14-day schedule, risk register, progress log

หลักการสั้นๆ:

- **Hybrid pipeline:** preprocess → QR decode (high-confidence anchor) → OCR → bank detect → bank-specific parser → validate → fraud check
- **Privacy boundary:** `slip-core` ไม่มี network เลย; `slip-cli` คือตัวเดียวที่ต่อ HTTP; `slip-wasm` เป็น facade ของ core บน browser
- **Bank adapters:** เพิ่มธนาคารใหม่ = สร้างไฟล์เดียวใน `crates/slip-core/src/banks/<bank>.rs`

## Contributing

ดู [CONTRIBUTING.md](CONTRIBUTING.md) — เพิ่ม bank adapter ใหม่ใช้เวลา ~20 บรรทัด

## License

Dual-licensed under either:
- MIT ([LICENSE-MIT](LICENSE-MIT))
- Apache 2.0 ([LICENSE-APACHE](LICENSE-APACHE))

at your option.
