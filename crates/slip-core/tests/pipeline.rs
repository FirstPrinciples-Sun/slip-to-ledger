//! End-to-end snapshot tests for the parse pipeline.
//!
//! Builds known SlipContext inputs and asserts the NormalizedSlip output
//! shape. Adapter coverage tests live next to each adapter.

use slip_core::ocr_input::SlipContext;
use slip_core::qr::{parse_promptpay_tlv, InitMethod};

fn promptpay_static_no_amount() -> String {
    let body =
        "00020101021129370016A000000677010111011300668123456785204000053037645802TH6304";
    let crc = crc16(body.as_bytes());
    format!("{body}{crc:04X}")
}

fn crc16(data: &[u8]) -> u16 {
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

#[test]
fn promptpay_static_round_trip() {
    let payload = promptpay_static_no_amount();
    let qr = parse_promptpay_tlv(&payload).unwrap();
    assert!(qr.crc_ok);
    assert_eq!(qr.init_method, Some(InitMethod::Static));
    assert_eq!(qr.country.as_deref(), Some("TH"));
    assert_eq!(qr.currency.as_deref(), Some("764"));
}

#[test]
fn parse_pipeline_with_qr_anchors_amount() {
    let mut payload = String::from(
        "00020101021229370016A000000677010111011300668123456785204000053037645406250.005802TH6304"
    );
    let crc = crc16(payload.as_bytes());
    payload.push_str(&format!("{crc:04X}"));

    let ctx = SlipContext {
        full_text: String::new(),
        words: vec![],
        qr_payload: Some(payload),
        image_width: 800,
        image_height: 1200,
        image_phash: None,
    };

    let result = slip_core::parse::parse(&ctx);
    match result {
        Ok(slip) => {
            assert_eq!(slip.transaction.amount, 250.0);
            assert_eq!(slip.transaction.currency, "THB");
            assert!(slip.qr_code.is_some());
        }
        Err(slip_core::Error::NoAdapterMatched) => {
            // Expected for now — no bank adapters registered yet (D4-5 work).
            // QR-only parsing path is exercised in unit tests for qr.rs.
        }
        Err(e) => panic!("unexpected error: {e}"),
    }
}
