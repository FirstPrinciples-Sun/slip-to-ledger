//! Canonical types matching `schema.json`. Keep in lockstep.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NormalizedSlip {
    pub metadata: Metadata,
    pub transaction: Transaction,
    pub parties: Parties,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel: Option<Channel>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qr_code: Option<QrCode>,
    #[serde(default)]
    pub fraud_signals: FraudSignals,
    #[serde(default)]
    pub field_confidence: BTreeMap<String, f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Metadata {
    pub source_bank: SourceBank,
    pub slip_type: SlipType,
    pub detected_at: DateTime<Utc>,
    pub confidence_overall: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub adapter_version: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum SourceBank {
    Kbank,
    Scb,
    Bbl,
    Ktb,
    Bay,
    Ttb,
    Gsb,
    Tisco,
    Uob,
    Lh,
    Cimb,
    Truemoney,
    RabbitLinepay,
    Shopeepay,
    Promptpay,
    CounterService,
    Unknown,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SlipType {
    BankTransfer,
    Wallet,
    CounterPayment,
    CrossBank,
    Unknown,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Channel {
    MobileApp,
    Atm,
    Counter,
    WalletApp,
    Web,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Transaction {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reference: Option<String>,
    pub timestamp: DateTime<Utc>,
    pub amount: f64,
    #[serde(default = "default_currency")]
    pub currency: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fee: Option<f64>,
}

fn default_currency() -> String {
    "THB".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Parties {
    pub sender: Party,
    pub receiver: Party,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct Party {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub account_masked: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bank: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct QrCode {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw_payload: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decoded: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct FraudSignals {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ela_score: Option<f32>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub exif_anomalies: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duplicate_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub future_dated: Option<bool>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_minimal_slip() {
        let slip = NormalizedSlip {
            metadata: Metadata {
                source_bank: SourceBank::Kbank,
                slip_type: SlipType::BankTransfer,
                detected_at: Utc::now(),
                confidence_overall: 0.95,
                adapter_version: Some("kbank_v2026_05".into()),
            },
            transaction: Transaction {
                id: Some("TX123".into()),
                reference: None,
                timestamp: Utc::now(),
                amount: 1250.0,
                currency: "THB".into(),
                fee: None,
            },
            parties: Parties {
                sender: Party {
                    name: Some("Test".into()),
                    account_masked: Some("xxx-x-12345-6".into()),
                    bank: Some("kbank".into()),
                },
                receiver: Party::default(),
            },
            channel: Some(Channel::MobileApp),
            qr_code: None,
            fraud_signals: FraudSignals::default(),
            field_confidence: BTreeMap::new(),
        };
        let json = serde_json::to_string(&slip).unwrap();
        let back: NormalizedSlip = serde_json::from_str(&json).unwrap();
        assert_eq!(slip, back);
    }
}
