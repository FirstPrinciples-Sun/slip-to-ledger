import { describe, it, expect } from "vitest";
import { parseSlip } from "../parse";
import { FIXTURES } from "./fixtures";

describe("parseSlip — bank coverage", () => {
  for (const f of FIXTURES) {
    it(`parses ${f.bank} fixture`, () => {
      const result = parseSlip(f.text);

      expect(result.bank).toBe(f.expect.bank);
      expect(result.amount).toBe(f.expect.amount);
      expect(result.date).toBe(f.expect.date);

      if (f.expect.reference !== undefined) {
        expect(result.reference).toBe(f.expect.reference);
      }
      if (f.expect.senderName !== undefined) {
        expect(result.senderName).toBe(f.expect.senderName);
      }
      if (f.expect.receiverName !== undefined) {
        expect(result.receiverName).toBe(f.expect.receiverName);
      }
    });
  }
});

describe("parseSlip — edge cases", () => {
  it("returns unknown bank when no signature matches", () => {
    const result = parseSlip("Random PDF text\nAmount 100\nDate 2026-01-01");
    expect(result.bank).toBe("unknown");
  });

  it("returns null amount when nothing parseable", () => {
    const result = parseSlip("ไม่มีข้อมูลอะไรเลย");
    expect(result.amount).toBeNull();
  });

  it("converts Buddhist Era year correctly", () => {
    const r = parseSlip("K PLUS\n01 มกราคม 2570\nจำนวนเงิน 100.00 บาท");
    expect(r.date).toBe("2027-01-01");
  });

  it("handles 2-digit Thai year", () => {
    const r = parseSlip("K PLUS\n15 พ.ค. 69 14:32\nจำนวนเงิน 100.00 บาท");
    expect(r.date).toBe("2026-05-15");
  });

  it("amount fallback skips fee=0.00 and picks largest", () => {
    const r = parseSlip("K PLUS\n15 พ.ค. 2569\n100.00 บาท ค่าธรรมเนียม\n5,500.00 บาท");
    expect(r.amount).toBe(5500.0);
  });
});
