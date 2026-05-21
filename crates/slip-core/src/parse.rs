//! Pipeline orchestration: detect bank → parse → cross-check QR → validate.

use crate::banks::{all_adapters, BankAdapter, PartialSlip};
use crate::ocr_input::SlipContext;
use crate::schema::{
    FraudSignals, Metadata, NormalizedSlip, Parties, SlipType, SourceBank, Transaction,
};
use chrono::Utc;

pub fn parse(ctx: &SlipContext) -> crate::Result<NormalizedSlip> {
    let adapters = all_adapters();
    let mut best: Option<(u8, Box<dyn BankAdapter>)> = None;
    for adapter in adapters {
        let score = adapter.detect(ctx);
        if best.as_ref().map(|(s, _)| score > *s).unwrap_or(true) {
            best = Some((score, adapter));
        }
    }

    let (score, adapter) = best.ok_or(crate::Error::NoAdapterMatched)?;
    let partial = if score >= 30 {
        adapter.parse(ctx)?
    } else {
        PartialSlip::default()
    };

    let qr_decoded = ctx
        .qr_payload
        .as_ref()
        .and_then(|p| crate::qr::parse_promptpay_tlv(p).ok());

    let amount = qr_decoded
        .as_ref()
        .and_then(|q| q.amount)
        .or(partial.amount)
        .unwrap_or(0.0);

    let reference = qr_decoded
        .as_ref()
        .and_then(|q| q.reference1.clone().or_else(|| q.bill_id.clone()))
        .or(partial.reference);

    let confidence_overall = (score as f32 / 100.0).min(1.0);

    let qr_code = ctx.qr_payload.as_ref().map(|p| crate::schema::QrCode {
        raw_payload: Some(p.clone()),
        decoded: qr_decoded.as_ref().and_then(|q| serde_json::to_value(q).ok()),
    });

    Ok(NormalizedSlip {
        metadata: Metadata {
            source_bank: partial.source_bank.unwrap_or(SourceBank::Unknown),
            slip_type: SlipType::BankTransfer,
            detected_at: Utc::now(),
            confidence_overall,
            adapter_version: partial.adapter_version,
        },
        transaction: Transaction {
            id: partial.transaction_id,
            reference,
            timestamp: partial.timestamp.unwrap_or_else(Utc::now),
            amount,
            currency: "THB".into(),
            fee: partial.fee,
        },
        parties: Parties {
            sender: partial.sender.unwrap_or_default(),
            receiver: partial.receiver.unwrap_or_default(),
        },
        channel: partial.channel,
        qr_code,
        fraud_signals: FraudSignals::default(),
        field_confidence: partial.field_confidence,
    })
}
