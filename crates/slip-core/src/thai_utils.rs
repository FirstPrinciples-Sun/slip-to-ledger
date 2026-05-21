//! Thai-specific text parsing utilities used by bank adapters.

use chrono::{DateTime, NaiveDate, NaiveDateTime, NaiveTime, TimeZone, Utc};
use once_cell::sync::Lazy;
use regex::Regex;
use std::collections::HashMap;

/// Convert Thai numerals (๐-๙) to ASCII digits in-place.
pub fn thai_to_arabic_digits(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            '๐' => '0',
            '๑' => '1',
            '๒' => '2',
            '๓' => '3',
            '๔' => '4',
            '๕' => '5',
            '๖' => '6',
            '๗' => '7',
            '๘' => '8',
            '๙' => '9',
            other => other,
        })
        .collect()
}

static THAI_MONTHS: Lazy<HashMap<&'static str, u32>> = Lazy::new(|| {
    let mut m = HashMap::new();
    for (full, short, num) in [
        ("มกราคม", "ม.ค.", 1),
        ("กุมภาพันธ์", "ก.พ.", 2),
        ("มีนาคม", "มี.ค.", 3),
        ("เมษายน", "เม.ย.", 4),
        ("พฤษภาคม", "พ.ค.", 5),
        ("มิถุนายน", "มิ.ย.", 6),
        ("กรกฎาคม", "ก.ค.", 7),
        ("สิงหาคม", "ส.ค.", 8),
        ("กันยายน", "ก.ย.", 9),
        ("ตุลาคม", "ต.ค.", 10),
        ("พฤศจิกายน", "พ.ย.", 11),
        ("ธันวาคม", "ธ.ค.", 12),
    ] {
        m.insert(full, num);
        m.insert(short, num);
    }
    m
});

static THAI_DATE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(\d{1,2})\s*(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม|ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s*(\d{2,4})"
    ).unwrap()
});

static TIME_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(\d{1,2}):(\d{2})(?::(\d{2}))?").unwrap());

static AMOUNT_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:บาท|THB|฿)?",
    )
    .unwrap()
});

/// Parse a Thai date+time line into a UTC DateTime. Years ≥ 2400 are treated
/// as Buddhist Era (พ.ศ.) and converted by subtracting 543.
pub fn parse_thai_datetime(text: &str) -> Option<DateTime<Utc>> {
    let normalized = thai_to_arabic_digits(text);
    let date_caps = THAI_DATE_RE.captures(&normalized)?;
    let day: u32 = date_caps.get(1)?.as_str().parse().ok()?;
    let month_str = date_caps.get(2)?.as_str();
    let month = *THAI_MONTHS.get(month_str)?;
    let mut year: i32 = date_caps.get(3)?.as_str().parse().ok()?;
    if year < 100 {
        year += 2500; // 2-digit Thai year => พ.ศ. 25xx
    }
    if year >= 2400 {
        year -= 543;
    }

    let date = NaiveDate::from_ymd_opt(year, month, day)?;
    let time = TIME_RE
        .captures(&normalized)
        .and_then(|c| {
            let h: u32 = c.get(1)?.as_str().parse().ok()?;
            let m: u32 = c.get(2)?.as_str().parse().ok()?;
            let s: u32 = c.get(3).and_then(|m| m.as_str().parse().ok()).unwrap_or(0);
            NaiveTime::from_hms_opt(h, m, s)
        })
        .unwrap_or_else(|| NaiveTime::from_hms_opt(0, 0, 0).unwrap());

    let naive = NaiveDateTime::new(date, time);
    // Treat naive as Asia/Bangkok (UTC+7) without depending on tz crate.
    let utc = naive - chrono::Duration::hours(7);
    Some(Utc.from_utc_datetime(&utc))
}

/// Parse a number-with-commas amount string like "1,250.00" or "12500".
pub fn parse_amount(text: &str) -> Option<f64> {
    let normalized = thai_to_arabic_digits(text);
    AMOUNT_RE.captures(&normalized).and_then(|c| {
        let raw = c.get(1)?.as_str().replace(',', "");
        raw.parse::<f64>().ok()
    })
}

/// Find the first amount that appears near a label keyword (e.g. "จำนวนเงิน").
pub fn parse_amount_near(text: &str, label_patterns: &[&str]) -> Option<f64> {
    let normalized = thai_to_arabic_digits(text);
    for label in label_patterns {
        if let Some(idx) = normalized.find(label) {
            let after = &normalized[idx + label.len()..];
            if let Some(amount) = parse_amount(after) {
                return Some(amount);
            }
        }
    }
    None
}

/// Extract a transaction reference following labels like "เลขที่อ้างอิง" / "Ref".
static REF_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"[A-Z0-9]{6,}").unwrap());

pub fn parse_reference_near(text: &str, label_patterns: &[&str]) -> Option<String> {
    for label in label_patterns {
        if let Some(idx) = text.find(label) {
            let after = &text[idx + label.len()..];
            if let Some(m) = REF_RE.find(after) {
                return Some(m.as_str().to_string());
            }
        }
    }
    None
}

/// Mask account: keep last 4 digits, replace rest with `x`. Works on
/// already-masked formats too (idempotent).
pub fn mask_account(s: &str) -> String {
    let digits: String = s.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.len() < 4 {
        return s.to_string();
    }
    let visible = &digits[digits.len() - 4..];
    format!("xxx-x-xxxxx-{}", visible)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_thai_short_month() {
        let dt = parse_thai_datetime("15 พ.ค. 2569 14:32").unwrap();
        assert_eq!(dt.format("%Y-%m-%d %H:%M").to_string(), "2026-05-15 07:32");
    }

    #[test]
    fn parses_thai_full_month_2_digit_year() {
        let dt = parse_thai_datetime("01 มกราคม 69 09:00:30").unwrap();
        assert_eq!(
            dt.format("%Y-%m-%d %H:%M:%S").to_string(),
            "2026-01-01 02:00:30"
        );
    }

    #[test]
    fn parses_amount_with_comma() {
        assert_eq!(parse_amount("จำนวน 12,500.00 บาท"), Some(12500.0));
        assert_eq!(parse_amount("250.50"), Some(250.5));
        assert_eq!(parse_amount("๑,๒๕๐.๐๐"), Some(1250.0));
    }

    #[test]
    fn parses_amount_near_label() {
        let text = "ผู้รับ บจก. เอบีซี\nจำนวนเงิน 1,250.00 บาท\nค่าธรรมเนียม 0.00";
        assert_eq!(parse_amount_near(text, &["จำนวนเงิน"]), Some(1250.0));
        assert_eq!(parse_amount_near(text, &["ค่าธรรมเนียม"]), Some(0.0));
    }

    #[test]
    fn masks_account_preserves_last_four() {
        assert_eq!(mask_account("123-4-56789-0"), "xxx-x-xxxxx-7890");
        assert_eq!(mask_account("0987654321"), "xxx-x-xxxxx-4321");
    }
}
