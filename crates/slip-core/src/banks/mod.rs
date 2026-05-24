//! Bank adapter framework.
//!
//! Adding a new bank: create `banks/<id>.rs`, implement [`BankAdapter`],
//! register via `inventory::submit!`. The registry auto-collects all impls.

use crate::ocr_input::SlipContext;
use crate::schema::{Channel, Party, SourceBank};

#[derive(Debug, Default, Clone)]
pub struct PartialSlip {
    pub source_bank: Option<SourceBank>,
    pub adapter_version: Option<String>,
    pub timestamp: Option<chrono::DateTime<chrono::Utc>>,
    pub amount: Option<f64>,
    pub fee: Option<f64>,
    pub reference: Option<String>,
    pub transaction_id: Option<String>,
    pub sender: Option<Party>,
    pub receiver: Option<Party>,
    pub channel: Option<Channel>,
    pub field_confidence: std::collections::BTreeMap<String, f32>,
}

pub trait BankAdapter: Send + Sync {
    fn id(&self) -> &'static str;

    /// 0..100 — how strongly this slip matches the adapter's bank.
    fn detect(&self, ctx: &SlipContext) -> u8;

    fn parse(&self, ctx: &SlipContext) -> crate::Result<PartialSlip>;
}

pub struct AdapterEntry {
    pub make: fn() -> Box<dyn BankAdapter>,
}
inventory::collect!(AdapterEntry);

pub fn all_adapters() -> Vec<Box<dyn BankAdapter>> {
    inventory::iter::<AdapterEntry>()
        .map(|entry| (entry.make)())
        .collect()
}

pub mod bay;
pub mod bbl;
pub mod cimb;
pub mod gsb;
pub mod kbank;
pub mod ktb;
pub mod scb;
pub mod tisco;
pub mod truemoney;
pub mod ttb;
pub mod uob;

#[macro_export]
macro_rules! register_adapter {
    ($ty:ty) => {
        inventory::submit! {
            $crate::banks::AdapterEntry {
                make: || Box::new(<$ty>::default()),
            }
        }
    };
}
