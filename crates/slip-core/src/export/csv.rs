use crate::schema::NormalizedSlip;
use std::fmt::Write;

pub fn to_csv(slips: &[NormalizedSlip]) -> crate::Result<String> {
    let mut out = String::new();
    writeln!(
        out,
        "timestamp,bank,amount,currency,reference,sender_name,receiver_name"
    )
    .ok();
    for s in slips {
        writeln!(
            out,
            "{},{},{},{},{},{},{}",
            s.transaction.timestamp.to_rfc3339(),
            serde_json::to_string(&s.metadata.source_bank)
                .unwrap_or_default()
                .trim_matches('"'),
            s.transaction.amount,
            s.transaction.currency,
            csv_escape(s.transaction.reference.as_deref().unwrap_or("")),
            csv_escape(s.parties.sender.name.as_deref().unwrap_or("")),
            csv_escape(s.parties.receiver.name.as_deref().unwrap_or("")),
        )
        .ok();
    }
    Ok(out)
}

fn csv_escape(s: &str) -> String {
    if s.contains([',', '"', '\n']) {
        format!("\"{}\"", s.replace('"', "\"\""))
    } else {
        s.to_string()
    }
}
