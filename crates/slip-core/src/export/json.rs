use crate::schema::NormalizedSlip;

pub fn to_pretty_json(slips: &[NormalizedSlip]) -> crate::Result<String> {
    Ok(serde_json::to_string_pretty(slips)?)
}
