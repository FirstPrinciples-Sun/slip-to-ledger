//! Inputs to the parsing pipeline. The browser/CLI fills this in before calling parse.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct OcrWord {
    pub text: String,
    pub bbox: BBox,
    pub confidence: f32,
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
pub struct BBox {
    pub x: u32,
    pub y: u32,
    pub w: u32,
    pub h: u32,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SlipContext {
    pub full_text: String,
    pub words: Vec<OcrWord>,
    pub qr_payload: Option<String>,
    pub image_width: u32,
    pub image_height: u32,
    pub image_phash: Option<String>,
}
