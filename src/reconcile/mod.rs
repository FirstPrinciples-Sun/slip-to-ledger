//! Multi-bank reconciliation report.
//!
//! Groups [`LedgerEntry`] rows by `(bank, date)` and surfaces aggregate
//! totals + counts so finance can spot a missing or duplicate slip
//! against the bank's own daily statement.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use crate::ledger::LedgerEntry;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DailyBucket {
    pub bank: String,
    pub date: String,
    pub count: usize,
    pub total_thb: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Report {
    pub buckets: Vec<DailyBucket>,
    pub grand_total_thb: f64,
}

/// Build a reconciliation report by `(bank, date)`.
///
/// The output is deterministic: buckets are sorted by bank then date
/// (BTreeMap iteration order), which keeps diff-based asserts stable.
pub fn build_report(entries: &[LedgerEntry]) -> Report {
    let mut grouped: BTreeMap<(String, String), DailyBucket> = BTreeMap::new();

    for e in entries {
        let key = (e.bank.clone(), e.date.clone());
        let bucket = grouped.entry(key).or_insert(DailyBucket {
            bank: e.bank.clone(),
            date: e.date.clone(),
            count: 0,
            total_thb: 0.0,
        });
        bucket.count += 1;
        bucket.total_thb += e.amount_thb;
    }

    let buckets: Vec<DailyBucket> = grouped.into_values().collect();
    let grand_total_thb = buckets.iter().map(|b| b.total_thb).sum();

    Report {
        buckets,
        grand_total_thb,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(bank: &str, date: &str, amount: f64) -> LedgerEntry {
        LedgerEntry {
            date: date.into(),
            bank: bank.into(),
            amount_thb: amount,
            reference: "x".into(),
            counterparty: None,
        }
    }

    #[test]
    fn empty_report_has_no_buckets() {
        let r = build_report(&[]);
        assert!(r.buckets.is_empty());
        assert_eq!(r.grand_total_thb, 0.0);
    }

    #[test]
    fn groups_by_bank_and_date() {
        let entries = vec![
            entry("KBank", "2025-01-10", 100.0),
            entry("KBank", "2025-01-10", 250.0),
            entry("KBank", "2025-01-11", 50.0),
            entry("SCB", "2025-01-10", 700.0),
        ];
        let r = build_report(&entries);
        assert_eq!(r.buckets.len(), 3);

        // BTreeMap order: (KBank,01-10), (KBank,01-11), (SCB,01-10)
        assert_eq!(r.buckets[0].bank, "KBank");
        assert_eq!(r.buckets[0].date, "2025-01-10");
        assert_eq!(r.buckets[0].count, 2);
        assert_eq!(r.buckets[0].total_thb, 350.0);

        assert_eq!(r.buckets[2].bank, "SCB");
        assert_eq!(r.buckets[2].total_thb, 700.0);

        assert_eq!(r.grand_total_thb, 1100.0);
    }

    #[test]
    fn deterministic_ordering() {
        let a = build_report(&[
            entry("SCB", "2025-02-01", 1.0),
            entry("BBL", "2025-02-01", 2.0),
            entry("KBank", "2025-02-01", 3.0),
        ]);
        let banks: Vec<_> = a.buckets.iter().map(|b| b.bank.as_str()).collect();
        assert_eq!(banks, vec!["BBL", "KBank", "SCB"]);
    }
}
