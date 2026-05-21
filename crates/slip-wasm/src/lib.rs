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
/// Returns the decoded payload or null if no QR found.
#[wasm_bindgen]
pub fn decode_qr(image_bytes: &[u8]) -> Result<Option<String>, JsValue> {
    let img = image::load_from_memory(image_bytes)
        .map_err(|e| JsValue::from_str(&format!("image decode: {e}")))?;
    slip_core::qr::decode(&img).map_err(|e| JsValue::from_str(&e.to_string()))
}
