//! KBank (K PLUS / กสิกรไทย) slip adapter.

use crate::banks::{BankAdapter, PartialSlip};
use crate::ocr_input::SlipContext;
use crate::register_adapter;
use crate::schema::{Channel, Party, SourceBank};
use crate::thai_utils::{
    mask_account, parse_amount_near, parse_reference_near, parse_thai_datetime,
};

#[derive(Default)]
pub struct KbankAdapter;

impl BankAdapter for KbankAdapter {
    fn id(&self) -> &'static str {
        "kbank"
    }

    fn detect(&self, ctx: &SlipContext) -> u8 {
        let t = &ctx.full_text;
        let mut score = 0u8;
        if t.contains("K PLUS") || t.contains("K+") {
            score = score.saturating_add(60);
        }
        if t.contains("กสิกรไทย") || t.contains("KBANK") {
            score = score.saturating_add(35);
        }
        if t.contains("KASIKORNBANK") {
            score = score.saturating_add(20);
        }
        score.min(100)
    }

    fn parse(&self, ctx: &SlipContext) -> crate::Result<PartialSlip> {
        let t = &ctx.full_text;
        let mut p = PartialSlip {
            source_bank: Some(SourceBank::Kbank),
            adapter_version: Some("kbank_v2026_05".into()),
            channel: Some(Channel::MobileApp),
            ..Default::default()
        };

        p.timestamp = parse_thai_datetime(t);

        p.amount = parse_amount_near(t, &["จำนวนเงิน", "จำนวน", "Amount", "ยอดโอน"]);

        p.fee = parse_amount_near(t, &["ค่าธรรมเนียม", "Fee"]);

        p.reference = parse_reference_near(
            t,
            &["รหัสอ้างอิง", "เลขที่อ้างอิง", "Reference No.", "Ref:", "Ref."],
        );
        p.transaction_id = parse_reference_near(t, &["Transaction ID", "เลขที่รายการ"]);

        if let Some((sender_block, receiver_block)) = split_parties(t) {
            p.sender = parse_party(sender_block);
            p.receiver = parse_party(receiver_block);
        }

        if p.amount.is_some() {
            p.field_confidence.insert("amount".into(), 0.85);
        }
        if p.timestamp.is_some() {
            p.field_confidence.insert("timestamp".into(), 0.9);
        }

        Ok(p)
    }
}

fn split_parties(text: &str) -> Option<(&str, &str)> {
    let from_idx = text.find("จาก").or_else(|| text.find("ผู้โอน"))?;
    let to_idx = text[from_idx..]
        .find("ไปยัง")
        .or_else(|| text[from_idx..].find("ผู้รับ"))?;
    let to_idx_abs = from_idx + to_idx;
    Some((&text[from_idx..to_idx_abs], &text[to_idx_abs..]))
}

fn parse_party(block: &str) -> Option<Party> {
    let mut p = Party::default();
    let mut name_line: Option<String> = None;
    for line in block.lines().skip(1) {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let digit_count = trimmed.chars().filter(|c| c.is_ascii_digit()).count();
        if digit_count >= 4 {
            p.account_masked = Some(mask_account(trimmed));
        } else if name_line.is_none() {
            name_line = Some(trimmed.to_string());
        }
    }
    p.name = name_line;
    p.bank = Some("kbank".into());
    Some(p)
}

register_adapter!(KbankAdapter);

#[cfg(test)]
mod tests {
    use super::*;

    fn ctx(text: &str) -> SlipContext {
        SlipContext {
            full_text: text.into(),
            ..Default::default()
        }
    }

    #[test]
    fn detects_kplus() {
        let c = ctx("K PLUS\nโอนเงินสำเร็จ\nกสิกรไทย");
        assert!(KbankAdapter.detect(&c) >= 90);
    }

    #[test]
    fn ignores_other_banks() {
        let c = ctx("SCB EASY\nโอนเงินสำเร็จ");
        assert_eq!(KbankAdapter.detect(&c), 0);
    }

    #[test]
    fn parses_kbank_fixture() {
        let text = "\
K PLUS
โอนเงินสำเร็จ
15 พ.ค. 2569 14:32
จาก
นาย สมชาย ใจดี
xxx-x-x1234-5
ไปยัง
บจก. เอบีซี จำกัด
xxx-x-x6789-0 KBANK
จำนวนเงิน 1,250.00 บาท
ค่าธรรมเนียม 0.00 บาท
รหัสอ้างอิง 20260515ABCDEF12
";
        let c = ctx(text);
        assert!(KbankAdapter.detect(&c) >= 60);
        let p = KbankAdapter.parse(&c).unwrap();
        assert_eq!(p.amount, Some(1250.0));
        assert_eq!(p.fee, Some(0.0));
        assert_eq!(p.source_bank, Some(SourceBank::Kbank));
        assert!(p.timestamp.is_some());
        assert_eq!(p.reference.as_deref(), Some("20260515ABCDEF12"));
        assert!(p.sender.is_some());
        assert!(p.receiver.is_some());
    }
}
