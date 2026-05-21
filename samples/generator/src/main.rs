//! Synthetic Thai slip generator. Produces (image, ground-truth JSON) pairs
//! for snapshot tests. NO real PII — every name/account is faked.
//!
//! Stub for D1 — full impl D12.

use anyhow::Result;

fn main() -> Result<()> {
    eprintln!("slip-samples-generator [stub D1]");
    eprintln!("TODO(D12): render synthetic slips for KBank, SCB, BBL, KTB, BAY, TTB, GSB, TrueMoney.");
    eprintln!("Output: samples/<bank>_<n>.png + samples/<bank>_<n>.json (ground truth).");
    Ok(())
}
