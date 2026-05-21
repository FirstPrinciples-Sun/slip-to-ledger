//! Fraud heuristics — duplicate hash, future-date, ELA, font variance. Stub for D10.

use crate::schema::{FraudSignals, NormalizedSlip};
use chrono::Utc;

pub fn evaluate(slip: &NormalizedSlip) -> FraudSignals {
    let mut signals = FraudSignals::default();
    if slip.transaction.timestamp > Utc::now() {
        signals.future_dated = Some(true);
    }
    signals
}
