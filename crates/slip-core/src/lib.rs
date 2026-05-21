//! slip-core — Pure Rust core for Thai bank slip OCR + parsing.
//!
//! This crate has zero network and zero JS deps. Adapters live in [`banks`],
//! the canonical schema in [`schema`], and the parsing pipeline in [`parse`].

pub mod banks;
pub mod export;
pub mod fraud;
pub mod ocr_input;
pub mod parse;
pub mod preprocess;
pub mod qr;
pub mod schema;
pub mod thai_utils;
pub mod verify;

pub use schema::{
    Channel, FraudSignals, Metadata, NormalizedSlip, Parties, Party, QrCode, SlipType, SourceBank,
    Transaction,
};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("image decode failed: {0}")]
    Image(String),
    #[error("qr decode failed: {0}")]
    Qr(String),
    #[error("no bank adapter matched")]
    NoAdapterMatched,
    #[error("parse failed: {0}")]
    Parse(String),
    #[error("schema validation failed: {0}")]
    Schema(String),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
}

pub type Result<T> = std::result::Result<T, Error>;
