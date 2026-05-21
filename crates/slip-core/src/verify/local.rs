//! Local verifier — schema sanity + duplicate-ref detection. No network.

use super::{Verifier, VerifyResult, VerifyStatus};
use crate::schema::NormalizedSlip;
use std::collections::HashSet;
use std::sync::Mutex;

#[derive(Default)]
pub struct LocalVerifier {
    seen_refs: Mutex<HashSet<String>>,
}

impl Verifier for LocalVerifier {
    fn name(&self) -> &'static str {
        "local"
    }

    fn verify(&self, slip: &NormalizedSlip) -> VerifyResult {
        if slip.transaction.amount <= 0.0 {
            return VerifyResult {
                status: VerifyStatus::Suspicious("non-positive amount".into()),
                provider: self.name().into(),
                detail: None,
            };
        }
        if let Some(reference) = &slip.transaction.reference {
            let mut seen = self.seen_refs.lock().unwrap();
            if !seen.insert(reference.clone()) {
                return VerifyResult {
                    status: VerifyStatus::Suspicious("duplicate reference".into()),
                    provider: self.name().into(),
                    detail: None,
                };
            }
        }
        VerifyResult {
            status: VerifyStatus::Verified,
            provider: self.name().into(),
            detail: None,
        }
    }
}
