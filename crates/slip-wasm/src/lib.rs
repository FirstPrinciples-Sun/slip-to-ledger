//! WASM facade over slip-core.
//!
//! JS contract: caller runs tesseract.js, decodes QR via JS or this crate's
//! wasm-exposed helper, then calls [`process_slip`] with a JSON SlipContext.

use slip_core::ocr_input::SlipContext;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Parse a slip given a SlipContext serialized as JSON.
/// Returns NormalizedSlip JSON string, or throws.
#[wasm_bindgen]
pub fn process_slip(context_json: &str) -> Result<String, JsValue> {
    let ctx: SlipContext = serde_json::from_str(context_json)
        .map_err(|e| JsValue::from_str(&format!("invalid context: {e}")))?;
    let slip = slip_core::parse::parse(&ctx)
        .map_err(|e| JsValue::from_str(&format!("parse error: {e}")))?;
    serde_json::to_string(&slip).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Decode a QR code from raw image bytes (PNG/JPEG).
/// Returns the decoded payload string or null if no QR found.
#[wasm_bindgen]
pub fn decode_qr(image_bytes: &[u8]) -> Result<Option<String>, JsValue> {
    let img = image::load_from_memory(image_bytes)
        .map_err(|e| JsValue::from_str(&format!("image decode: {e}")))?;
    slip_core::qr::decode(&img).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Parse a PromptPay/EMVCo TLV payload into structured fields.
/// Returns JSON-serialized PromptPayQr struct.
#[wasm_bindgen]
pub fn parse_promptpay(payload: &str) -> Result<String, JsValue> {
    let qr = slip_core::qr::parse_promptpay_tlv(payload)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    serde_json::to_string(&qr).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Run Otsu threshold + skew correction on raw image bytes.
/// Returns PNG-encoded preprocessed image.
#[wasm_bindgen]
pub fn preprocess(image_bytes: &[u8]) -> Result<Vec<u8>, JsValue> {
    use std::io::Cursor;
    let img = image::load_from_memory(image_bytes)
        .map_err(|e| JsValue::from_str(&format!("image decode: {e}")))?;
    let processed = slip_core::preprocess::full_preprocess(&img);
    let mut buf = Vec::new();
    processed
        .write_to(&mut Cursor::new(&mut buf), image::ImageFormat::Png)
        .map_err(|e| JsValue::from_str(&format!("png encode: {e}")))?;
    Ok(buf)
}
