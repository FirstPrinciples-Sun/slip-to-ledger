# Contributing to Slip-to-Ledger

ขอบคุณที่สนใจ! โปรเจ็คนี้รับ contribution ทั้งภาษาไทยและอังกฤษ

## วิธีตั้ง dev env

```bash
git clone <repo>
cd slip-to-ledger
# Rust side
cargo build
cargo test
# Web side
cd web && npm install && npm run dev
```

## วิธีเพิ่ม Bank Adapter ใหม่

หัวใจของโปรเจ็คคือ adapter pattern — เพิ่มธนาคารใหม่ทำได้ในไฟล์เดียว

1. สร้างไฟล์ `crates/slip-core/src/banks/<bank_id>.rs`
2. Implement `BankAdapter` trait:

```rust
use crate::banks::{BankAdapter, PartialSlip};
use crate::ocr_input::SlipContext;
use crate::register_adapter;
use crate::schema::SourceBank;

#[derive(Default)]
pub struct MyBankAdapter;

impl BankAdapter for MyBankAdapter {
    fn id(&self) -> &'static str { "mybank" }

    fn detect(&self, ctx: &SlipContext) -> u8 {
        let mut score = 0u8;
        if ctx.full_text.contains("ธนาคาร XYZ") { score += 50; }
        if ctx.full_text.contains("MYBANK") { score += 30; }
        score.min(100)
    }

    fn parse(&self, ctx: &SlipContext) -> crate::Result<PartialSlip> {
        let mut p = PartialSlip::default();
        p.source_bank = Some(SourceBank::Unknown);
        p.adapter_version = Some("mybank_v2026_05".into());
        Ok(p)
    }
}

register_adapter!(MyBankAdapter);
```

3. เพิ่ม `pub mod <bank_id>;` ใน `banks/mod.rs`
4. เพิ่ม fixture: `samples/mybank_001.png` + `samples/mybank_001.json` (ground truth)
5. รัน `cargo test` — snapshot test ต้อง pass

## Style guide

- Rust: `cargo fmt` + `cargo clippy --all-targets -- -D warnings`
- TypeScript: strict mode, ไม่ใช้ `any`
- Commit messages: conventional commits (`feat:`, `fix:`, `docs:`, …)

## Privacy & PII

- **อย่า commit สลิปจริง** — ใช้ `samples/generator/` สร้าง synthetic slip
- ถ้ามีสลิปจริงให้ทดสอบ: redact ก่อน, เก็บใน `samples/private/` (gitignored), ใช้ env var `SLIP_PRIVATE_FIXTURES`

## ขอความช่วยเหลือ

เปิด GitHub Issue หรือ Discussion
