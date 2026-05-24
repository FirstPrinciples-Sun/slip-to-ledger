//! TrueMoney Wallet (ทรูมันนี่) slip adapter.

use crate::banks::{BankAdapter, PartialSlip};
use crate::ocr_input::SlipContext;
use crate::register_adapter;
use crate::schema::{Channel, Party, SlipType, SourceBank};
use crate::thai_utils::{
    mask_account, parse_amount_near, parse_reference_near, parse_thai_datetime,
};

#[derive(Default)]
pub struct TruemoneyAdapter;

impl BankAdapter for TruemoneyAdapter {
    fn id(&self) -> &'static str {
        "truemoney"
    }

    fn detect(&self, ctx: &SlipContext) -> u8 {
        let t = &ctx.full_text;
        let mut score = 0u8;
        if t.contains("TrueMoney") || t.contains("TRUEMONEY") || t.contains("TrueMoney Wallet") {
            score = score.saturating_add(70);
        }
        if t.contains("ทรูมันนี่") {
            score = score.saturating_add(50);
        }
        score.min(100)
    }

    fn parse(&self, ctx: &SlipContext) -> crate::Result<PartialSlip> {
        let t = &ctx.full_text;
        let mut p = PartialSlip {
            source_bank: Some(SourceBank::Truemoney),
            adapter_version: Some("truemoney_v2026_05".into()),
            channel: Some(Channel::WalletApp),
            ..Default::default()
        };

        // Wallet slips: still BankTransfer-like, but mark slip_type explicitly.
        // PartialSlip carries source_bank; slip_type is set in the merge step.
        let _wallet_marker = SlipType::Wallet;

        p.timestamp = parse_thai_datetime(t);
        p.amount = parse_amount_near(t, &["จำนวนเงิน", "ยอดเงิน", "ยอดที่โอน", "Amount", "Total"]);
        p.fee = parse_amount_near(t, &["ค่าธรรมเนียม", "Fee"]);
        p.reference = parse_reference_near(
            t,
            &[
                "Transaction ID",
                "เลขที่รายการ",
                "เลขที่อ้างอิง",
                "หมายเลขอ้างอิง",
                "รหัสอ้างอิง",
                "Reference",
            ],
        );

        if let Some((s, r)) = split_parties(t) {
            p.sender = parse_party(s);
            p.receiver = parse_party(r);
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
    p.bank = Some("truemoney".into());
    Some(p)
}

register_adapter!(TruemoneyAdapter);

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
    fn detects_truemoney() {
        let c = ctx("TrueMoney Wallet\nทรูมันนี่ วอลเล็ท");
        assert!(TruemoneyAdapter.detect(&c) >= 90);
    }

    #[test]
    fn parses_truemoney_fixture() {
        let text = "\
TrueMoney Wallet
โอนเงินสำเร็จ
15 พ.ค. 2569 14:32
ทรูมันนี่
จาก
นาย สมชาย ใจดี
xxx-x-x1234-5
ไปยัง
บจก. เอบีซี จำกัด
xxx-x-x6789-0
จำนวนเงิน 95.00 บาท
ค่าธรรมเนียม 0.00 บาท
Transaction ID TMN20260515ABC
";
        let c = ctx(text);
        assert!(TruemoneyAdapter.detect(&c) >= 60);
        let p = TruemoneyAdapter.parse(&c).unwrap();
        assert_eq!(p.amount, Some(95.0));
        assert_eq!(p.source_bank, Some(SourceBank::Truemoney));
        assert_eq!(p.reference.as_deref(), Some("TMN20260515ABC"));
    }
}
