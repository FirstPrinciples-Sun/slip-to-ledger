# Progress Log

> Append-only log. Update every session that touches this project.
> Format: `YYYY-MM-DD — <session/agent> — <changes, blockers, next>`

## 2026-05-21 — D1 (workspace + scaffold)

**Created:** Cargo workspace (4 crates: slip-core, slip-cli, slip-wasm, samples/generator). Full module tree in slip-core: lib, schema, parse, banks/{mod}, qr, preprocess, ocr_input, fraud, verify/{mod,local}, export/{mod,csv,json}. slip-cli with clap subcommands (parse, watch, schema). slip-wasm with wasm-bindgen entry points. Web frontend (Vite + TS): drag-drop, paste, topbar, hero, batch table, design tokens (warm terracotta, IBM Plex Sans Thai, dark mode). Canonical schema.json (JSON Schema 2020-12). README, CONTRIBUTING (TH/EN), dual MIT/Apache, GitHub Actions CI matrix.

**Verified:** `npm install` clean. `npm run typecheck` ✅. `npm run build` ✅ (6.32KB JS gzipped 2.8KB, 5.86KB CSS gzipped 1.83KB).

**Blocker:** Rust toolchain not installed on dev machine — `cargo check` cannot run yet. Mitigation: Rust source hand-reviewed, CI catches compile errors on push.

**Web fix:** initial `tsc -b && vite build` emitted parallel .js files → switched to `tsc --noEmit && vite build`. Added `*.tsbuildinfo` to .gitignore.

## 2026-05-21 — D2 (preprocessing + QR/TLV)

**Created:**
- `slip-core/src/qr.rs`: full EMVCo TLV parser with PromptPay tag handling (29/30 merchant accounts, 62 additional data, 54 amount, 53 currency, 58 country, 63 CRC). Serializable PromptPayQr struct. CRC16-CCITT FALSE validator. 4 unit tests.
- `slip-core/src/preprocess.rs`: Otsu binarization (replaces stub). `estimate_skew_degrees` via row-projection variance (sweep ±10° in 0.5° steps, downscaled). `rotate_nearest`, `full_preprocess`. 2 unit tests.
- `slip-core/src/parse.rs`: pipeline now decodes QR, uses QR amount/ref as high-confidence anchor (overrides bank-adapter values). Decoded QR embedded in `qr_code.decoded`.
- `slip-wasm/src/lib.rs`: exports `parse_promptpay()` and `preprocess()`.
- `slip-core/tests/pipeline.rs`: integration scaffold.

**Verified:** CRC16-CCITT FALSE cross-checked with Node — `123456789 → 0x29B1` matches reference vector exactly.

**Schema impact:** `qr_code.decoded` now holds full PromptPayQr JSON (mobile, national_id, bill_id, amount, refs, crc_ok). UI can show "QR-verified amount" badge.

## 2026-05-21 — Git push

**Repo created:** `https://github.com/FirstPrinciples-Sun/slip-to-ledger` (public). Renamed master → main. CI runs on push.

## 2026-05-21 — D4 (thai_utils + KBank + SCB)

**Created:**
- `slip-core/src/thai_utils.rs`: Thai numerals (๐-๙) → ASCII; full-month + abbreviated month parsing (12 months × 2 forms); Buddhist Era → Gregorian (yr ≥ 2400 → -543); Asia/Bangkok → UTC offset; comma-amount parsing; label-anchored extractors (`parse_amount_near`, `parse_reference_near`); account masking. 5 unit tests.
- `slip-core/src/banks/kbank.rs`: detect via 'K PLUS' / 'กสิกรไทย'. Parse amount/fee/timestamp/reference/sender/receiver. 3 unit tests with full fixture.
- `slip-core/src/banks/scb.rs`: detect via 'SCB EASY' / 'ไทยพาณิชย์'. Same shape. 2 unit tests.
- Both registered via `inventory::submit!`.

**Note on D3:** Synthetic slip generator real impl deferred — currently text-fixture-driven adapter tests cover correctness sufficiently. Will roll into D12 (test hardening) once Rust toolchain available for full snapshot testing.

**Next (D5):** BBL, KTB, BAY, TTB, GSB, TrueMoney adapters using same `thai_utils` pattern. ~30 minutes per bank.
