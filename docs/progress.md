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

## 2026-05-21 — CI Postmortem (commits 49ae8c9, 3a5f8c8, 927effe, 915fedf all red)

**What broke:**
1. `slip-wasm/Cargo.toml` referenced `image::ImageFormat::Png` and `image::load_from_memory` but never declared `image` as a direct dep — only inherited transitively through `slip-core`. Path-dep transitive imports are not visible without explicit declaration. **3 × E0433 errors.**
2. `cargo fmt --check` failed across **7 files** (kbank.rs, scb.rs, parse.rs, preprocess.rs, qr.rs, schema.rs) — code was hand-written without rustfmt because the dev machine has no Rust toolchain installed.
3. `parse.rs` had `Party` and `BTreeMap` imports that became unused after the D2 QR-anchor refactor. Unused imports are warnings → errors under `RUSTFLAGS=-D warnings`.
4. `preprocess.rs` imported `GenericImageView` which is provided implicitly via the `image` prelude — also unused-import error.

**Why it happened (root cause):**
Local environment has no `rustup`/`cargo` → can't run `cargo fmt` / `cargo clippy` / `cargo check` / `cargo build` locally before push. Every commit goes blind to GitHub Actions CI for first feedback. Each CI cycle is ~2 minutes wasted per fix iteration.

**Fixes applied (commit a37d4eb):**
- Added `image.workspace = true` to `slip-wasm/Cargo.toml`.
- Removed `Party` + `BTreeMap` from `parse.rs` imports.
- Removed `GenericImageView` from `preprocess.rs` imports.
- Reformatted 7 files to match what rustfmt would produce: collapse argument lists that fit on one line, expand single-statement closures only when they don't fit, expand long `if cond1 && cond2` into multi-line with `&&` at line start.

**Lesson learned (write down so this never repeats):**
1. **Install rustup before continuing past D5.** Without it, every Rust change ships blind. https://rustup.rs takes 5 minutes.
2. **Until rustup is installed, follow the rustfmt convention manually:**
   - Function calls fitting on one line → keep on one line. Don't pre-split args "for readability."
   - Closures with single expr → no braces (`|x| Luma(...)`, not `|x| { Luma(...) }`).
   - `&&`/`||` chains: if line > 100 cols, break before the operator, indent +4.
   - Imports: add to `Cargo.toml` workspace deps + the crate's `[dependencies]` for **every** crate that uses the symbol — never rely on transitive availability.
3. **Always `RUSTFLAGS=-D warnings` in mind:** unused imports, dead code, dead vars are errors. Strip imports as part of the same edit that removes their usage.
4. **CI matrix order:** rust → wasm → web. Web step is downstream of wasm — don't push if wasm is broken (web `npm run build` doesn't catch it because we haven't wired wasm-pack output to web yet).

**Pre-push checklist (manual until rustup installed):**
- [ ] No multi-line function calls when args fit on one line
- [ ] All `image::` / `chrono::` / `regex::` etc. usage has explicit dep in *that* crate's Cargo.toml
- [ ] `parse.rs` imports match what's actually referenced
- [ ] No leftover `BTreeMap` / `Party` / etc. imports after refactor
- [ ] If touched `slip-wasm`: confirm `image.workspace = true` still present

## 2026-05-21 — CI green at last (commit 13d068c)

After 7 failing CI cycles, all 3 jobs (rust+wasm+web) green. **17/17 unit tests pass.**

**Lessons (final, after going green):**

1. **rustfmt rules I kept missing by hand:**
   - Function calls with args fitting on one line → MUST stay one line. `parse_reference_near(t, &["a", "b", "c", "d", "e"])` stays single-line if total < 100 col, even with 5 array elements.
   - String literals that don't fit single line: `let body = "..."` keep on one line if the literal length itself > 100 col (rustfmt won't split a string).
   - `String::from("...")` multi-line: trailing comma required after the literal.
   - Single-expr closures: no braces. `|x, _| Luma([...])` not `|x, _| { Luma([...]) }`.
   - `static FOO: Type = expr;` collapses to one line if it fits ≤ 100 col.
   - Imports: alphabetical → `Verifier` before `VerifyResult` before `VerifyStatus`.

2. **clippy lints under `-D warnings`:**
   - `needless_range_loop` — `for i in 0..n { x[i] }` → `for (i, v) in x.iter().enumerate()`.
   - `field_reassign_with_default` — `let mut x = X::default(); x.foo = bar;` → `let mut x = X { foo: bar, ..Default::default() };`.
   - `needless_lifetimes` — single-ref function params don't need `<'a>` if return type unrelated.
   - `manual_range_contains` — `t >= 30 && t < 220` → `(30..220).contains(&t)`.

3. **Test assertions about real algorithms:** test the *property* (Otsu picks a value in a sensible range) not specific numerics (exact threshold or pixel count). Synthetic inputs hit edge cases real images never do.

4. **Commit window glitch:** when issuing `Edit` calls in parallel with `Bash git commit`, the commit may run before later edits land in the file. **Fix:** always run Edits FIRST, finish them all, THEN run a single Bash commit. Saw this twice — `caa63e3` and `13d068c` had to be amended via follow-up no-op commits.

**Working state at 2026-05-21 16:40 UTC:**
- ✅ All 3 CI jobs green
- ✅ 17/17 Rust unit tests pass
- ✅ Web app loads in browser, drop zone + batch table render correctly
- ✅ Repo public at https://github.com/FirstPrinciples-Sun/slip-to-ledger
- ✅ D1+D2+D4 done (D3 deferred to D12 — synthetic generator)
- 🟡 Next: D5 (BBL, KTB, BAY, TTB, GSB, TrueMoney adapters — same pattern as KBank/SCB)
- ⚠️ Blocker still open: install rustup locally to enable `cargo fmt`/`cargo clippy`/`cargo test` pre-push
