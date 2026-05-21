//! Pluggable verification — local, BOT, slipok, webhook.

use crate::schema::NormalizedSlip;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum VerifyStatus {
    Verified,
    Unverified,
    Suspicious(String),
    Unsupported,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyResult {
    pub status: VerifyStatus,
    pub provider: String,
    pub detail: Option<serde_json::Value>,
}

pub trait Verifier {
    fn name(&self) -> &'static str;
    fn verify(&self, slip: &NormalizedSlip) -> VerifyResult;
}

pub mod local;
