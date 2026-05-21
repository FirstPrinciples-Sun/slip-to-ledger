//! QR decoding + PromptPay TLV parsing. Stub — full impl D2-3.

use crate::Error;
use image::{DynamicImage, GrayImage};

pub fn decode(img: &DynamicImage) -> crate::Result<Option<String>> {
    let gray: GrayImage = img.to_luma8();
    let mut prep = rqrr::PreparedImage::prepare(gray);
    for grid in prep.detect_grids() {
        match grid.decode() {
            Ok((_meta, content)) => return Ok(Some(content)),
            Err(_) => continue,
        }
    }
    Ok(None)
}

/// Parse PromptPay/EMVCo QR TLV payload into structured fields.
/// TODO(D3): full TLV parser.
pub fn parse_promptpay_tlv(_payload: &str) -> crate::Result<serde_json::Value> {
    Err(Error::Qr("TLV parser not yet implemented (D3)".into()))
}
