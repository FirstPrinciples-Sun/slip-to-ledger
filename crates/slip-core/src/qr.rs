//! QR decoding + EMVCo TLV parsing for Thai PromptPay slips.
//!
//! PromptPay QR follows the EMVCo Merchant-Presented Mode spec with Thai
//! extensions. Top-level tags we care about:
//!
//! - `00` Payload Format Indicator (always "01")
//! - `01` Point of Initiation Method ("11" = static, "12" = dynamic)
//! - `29` Merchant Account Information — Domestic (PromptPay)
//!     - `00` AID = `A000000677010111`
//!     - `01` Mobile (BOT format `00668xxxxxxxx`)
//!     - `02` National ID
//!     - `03` E-Wallet ID
//! - `30` Merchant Account Information — Bill Payment (PromptPay)
//! - `52` Merchant Category Code
//! - `53` Currency Code (`764` = THB)
//! - `54` Transaction Amount
//! - `58` Country Code (`TH`)
//! - `62` Additional Data Field (often holds the bill ref / transaction ref)
//!     - `01`/`05` Reference IDs
//! - `63` CRC16-CCITT (FALSE) over everything up to and including "6304"
//!
//! Reference: BOT PromptPay specification + EMVCo MPM v1.x.

use crate::Error;
use image::{DynamicImage, GrayImage};
use serde::{Deserialize, Serialize};

pub fn decode(img: &DynamicImage) -> crate::Result<Option<String>> {
    let gray: GrayImage = img.to_luma8();
    let mut prep = rqrr::PreparedImage::prepare(gray);
    for grid in prep.detect_grids() {
        if let Ok((_meta, content)) = grid.decode() {
            return Ok(Some(content));
        }
    }
    Ok(None)
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct PromptPayQr {
    pub format: Option<String>,
    pub init_method: Option<InitMethod>,
    pub merchant_aid: Option<String>,
    pub mobile: Option<String>,
    pub national_id: Option<String>,
    pub ewallet_id: Option<String>,
    pub bill_id: Option<String>,
    pub merchant_category: Option<String>,
    pub currency: Option<String>,
    pub amount: Option<f64>,
    pub country: Option<String>,
    pub reference1: Option<String>,
    pub reference2: Option<String>,
    pub crc_ok: bool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum InitMethod {
    Static,
    Dynamic,
}

pub fn parse_promptpay_tlv(payload: &str) -> crate::Result<PromptPayQr> {
    let bytes = payload.as_bytes();
    let entries = parse_tlv(bytes).map_err(Error::Qr)?;

    let mut out = PromptPayQr::default();
    out.crc_ok = verify_crc(payload).unwrap_or(false);

    for (tag, value) in &entries {
        match tag.as_str() {
            "00" => out.format = Some(value.clone()),
            "01" => {
                out.init_method = match value.as_str() {
                    "11" => Some(InitMethod::Static),
                    "12" => Some(InitMethod::Dynamic),
                    _ => None,
                }
            }
            "29" => parse_merchant_account(value, &mut out)?,
            "30" => parse_bill_payment(value, &mut out)?,
            "52" => out.merchant_category = Some(value.clone()),
            "53" => out.currency = Some(value.clone()),
            "54" => out.amount = value.parse::<f64>().ok(),
            "58" => out.country = Some(value.clone()),
            "62" => parse_additional_data(value, &mut out)?,
            _ => {}
        }
    }

    Ok(out)
}

fn parse_merchant_account(value: &str, out: &mut PromptPayQr) -> crate::Result<()> {
    let entries = parse_tlv(value.as_bytes()).map_err(Error::Qr)?;
    for (tag, v) in entries {
        match tag.as_str() {
            "00" => out.merchant_aid = Some(v),
            "01" => out.mobile = Some(normalize_mobile(&v)),
            "02" => out.national_id = Some(v),
            "03" => out.ewallet_id = Some(v),
            _ => {}
        }
    }
    Ok(())
}

fn parse_bill_payment(value: &str, out: &mut PromptPayQr) -> crate::Result<()> {
    let entries = parse_tlv(value.as_bytes()).map_err(Error::Qr)?;
    for (tag, v) in entries {
        if tag == "01" {
            out.bill_id = Some(v);
        }
    }
    Ok(())
}

fn parse_additional_data(value: &str, out: &mut PromptPayQr) -> crate::Result<()> {
    let entries = parse_tlv(value.as_bytes()).map_err(Error::Qr)?;
    for (tag, v) in entries {
        match tag.as_str() {
            "01" => out.reference1 = Some(v),
            "05" => out.reference2 = Some(v),
            _ => {}
        }
    }
    Ok(())
}

fn normalize_mobile(raw: &str) -> String {
    let trimmed = raw.trim_start_matches("0066").trim_start_matches('0');
    format!("0{trimmed}")
}

fn parse_tlv(input: &[u8]) -> Result<Vec<(String, String)>, String> {
    let mut out = Vec::new();
    let mut i = 0;
    while i < input.len() {
        if i + 4 > input.len() {
            return Err("truncated TLV header".into());
        }
        let tag = std::str::from_utf8(&input[i..i + 2])
            .map_err(|_| "invalid tag utf8")?
            .to_string();
        let len_str = std::str::from_utf8(&input[i + 2..i + 4]).map_err(|_| "invalid len utf8")?;
        let len: usize = len_str.parse().map_err(|_| "invalid len digits")?;
        let value_start = i + 4;
        let value_end = value_start + len;
        if value_end > input.len() {
            return Err(format!("truncated value at tag {tag}"));
        }
        let value = std::str::from_utf8(&input[value_start..value_end])
            .map_err(|_| "invalid value utf8")?
            .to_string();
        out.push((tag, value));
        i = value_end;
    }
    Ok(out)
}

fn verify_crc(payload: &str) -> Result<bool, String> {
    let bytes = payload.as_bytes();
    if bytes.len() < 8 {
        return Err("payload too short".into());
    }
    let crc_marker_pos = bytes
        .windows(4)
        .rposition(|w| w == b"6304")
        .ok_or("missing CRC marker")?;
    let covered = &bytes[..crc_marker_pos + 4];
    let claimed_hex =
        std::str::from_utf8(&bytes[crc_marker_pos + 4..]).map_err(|_| "invalid CRC utf8")?;
    let claimed = u16::from_str_radix(claimed_hex.trim(), 16).map_err(|_| "invalid CRC hex")?;
    Ok(crc16_ccitt_false(covered) == claimed)
}

fn crc16_ccitt_false(data: &[u8]) -> u16 {
    let mut crc: u16 = 0xFFFF;
    for &b in data {
        crc ^= (b as u16) << 8;
        for _ in 0..8 {
            if crc & 0x8000 != 0 {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }
        }
    }
    crc
}

#[cfg(test)]
mod tests {
    use super::*;

    fn build_promptpay(amount_section: &str) -> String {
        let mut payload = format!(
            "00020101021129370016A000000677010111011300668123456785204000053037645802TH{amount_section}6304"
        );
        let crc = crc16_ccitt_false(payload.as_bytes());
        payload.push_str(&format!("{crc:04X}"));
        payload
    }

    #[test]
    fn parses_static_promptpay_no_amount() {
        let payload = build_promptpay("");
        let qr = parse_promptpay_tlv(&payload).unwrap();
        assert_eq!(qr.format.as_deref(), Some("01"));
        assert_eq!(qr.init_method, Some(InitMethod::Static));
        assert_eq!(qr.merchant_aid.as_deref(), Some("A000000677010111"));
        assert_eq!(qr.mobile.as_deref(), Some("0668123456785"));
        assert_eq!(qr.country.as_deref(), Some("TH"));
        assert_eq!(qr.currency.as_deref(), Some("764"));
        assert!(qr.amount.is_none());
        assert!(qr.crc_ok);
    }

    #[test]
    fn parses_dynamic_promptpay_with_amount() {
        let mut payload = String::from(
            "00020101021229370016A000000677010111011300668123456785204000053037645406250.005802TH6304"
        );
        let crc = crc16_ccitt_false(payload.as_bytes());
        payload.push_str(&format!("{crc:04X}"));

        let qr = parse_promptpay_tlv(&payload).unwrap();
        assert_eq!(qr.init_method, Some(InitMethod::Dynamic));
        assert_eq!(qr.amount, Some(250.0));
        assert!(qr.crc_ok);
    }

    #[test]
    fn detects_bad_crc() {
        let mut payload = build_promptpay("");
        let last = payload.pop().unwrap();
        payload.push(if last == '0' { '1' } else { '0' });
        let qr = parse_promptpay_tlv(&payload).unwrap();
        assert!(!qr.crc_ok);
    }

    #[test]
    fn rejects_truncated_tlv() {
        let result = parse_promptpay_tlv("00");
        assert!(result.is_err());
    }
}
