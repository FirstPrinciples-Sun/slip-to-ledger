/**
 * Synthetic slip text fixtures — represent OCR output for each bank.
 *
 * These are NOT real slips and contain NO real PII. They mimic the layout
 * of each bank's slip text so we can snapshot-test parseSlip() without
 * needing real images. Real-image tests live in samples/ (D12 stretch).
 */

export interface Fixture {
  bank: string;
  text: string;
  expect: {
    bank: string;
    amount: number;
    date: string;
    reference?: string;
    senderName?: string;
    receiverName?: string;
  };
}

export const FIXTURES: Fixture[] = [
  {
    bank: "kbank",
    text: `K PLUS
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
รหัสอ้างอิง 20260515ABCDEF12`,
    expect: {
      bank: "kbank",
      amount: 1250.0,
      date: "2026-05-15",
      reference: "20260515ABCDEF12",
      senderName: "นาย สมชาย ใจดี",
      receiverName: "บจก. เอบีซี จำกัด",
    },
  },
  {
    bank: "scb",
    text: `SCB EASY
โอนเงินสำเร็จ
15 พ.ค. 2569 09:15
จาก
นางสาว มาลี ดอกไม้
xxx-x-x4321-0
ไปยัง
บจก. เอ็กซ์วายแซด
xxx-x-x9876-5 SCB
จำนวนเงิน 5,250.75 บาท
ค่าธรรมเนียม 0.00 บาท
รหัสอ้างอิง SCB20260515XYZ`,
    expect: {
      bank: "scb",
      amount: 5250.75,
      date: "2026-05-15",
      reference: "SCB20260515XYZ",
    },
  },
  {
    bank: "ktb",
    text: `กรุงไทย NEXT
โอนเงินสำเร็จ
20 พ.ค. 2569 11:08
จาก
นาย วิชัย เก่งกาจ
xxx-x-x5566-7
ไปยัง
บจก. กรีนฟาร์ม
xxx-x-x1122-3 KTB
ยอดเงิน 850.00 บาท
ค่าธรรมเนียม 0.00 บาท
เลขที่อ้างอิง KTB20260520ABC`,
    expect: {
      bank: "ktb",
      amount: 850.0,
      date: "2026-05-20",
      reference: "KTB20260520ABC",
    },
  },
  {
    bank: "bbl",
    text: `Bualuang mBanking
ธนาคารกรุงเทพ
โอนเงินสำเร็จ
22 พ.ค. 2569 16:45
จาก
นาง สมหญิง รวยมาก
xxx-x-x9988-7
ไปยัง
นาย ปรีชา ดีงาม
xxx-x-x3344-5 BBL
ยอดที่โอน 12,000.50 บาท
ค่าธรรมเนียม 25.00 บาท
หมายเลขอ้างอิง BBL20260522XYZ123`,
    expect: {
      bank: "bbl",
      amount: 12000.5,
      date: "2026-05-22",
      reference: "BBL20260522XYZ123",
    },
  },
  {
    bank: "bay",
    text: `KMA Krungsri Mobile
โอนเงินสำเร็จ
01 มิ.ย. 2569 08:30
จาก
นาย เดช มั่นคง
xxx-x-x7777-1
ไปยัง
บจก. เอเชี่ยน เทค
xxx-x-x8888-2 BAY
ยอดที่โอน 3,750.25 บาท
ค่าธรรมเนียม 0.00 บาท
Reference No. KSI20260601ABCDEF`,
    expect: {
      bank: "bay",
      amount: 3750.25,
      date: "2026-06-01",
      reference: "KSI20260601ABCDEF",
    },
  },
  {
    bank: "ttb",
    text: `ttb touch
ทหารไทยธนชาต
โอนเงินสำเร็จ
05 มิ.ย. 2569 13:22
จาก
นางสาว นภา สวยงาม
xxx-x-x5555-9
ไปยัง
บจก. สมาร์ทเทค
xxx-x-x6666-0 TTB
จำนวนเงิน 999.99 บาท
ค่าธรรมเนียม 0.00 บาท
เลขที่ทำรายการ TTB20260605REF99`,
    expect: {
      bank: "ttb",
      amount: 999.99,
      date: "2026-06-05",
      reference: "TTB20260605REF99",
    },
  },
  {
    bank: "gsb",
    text: `MyMo by GSB
ธนาคารออมสิน
โอนเงินสำเร็จ
10 มิ.ย. 2569 09:00
จาก
นาย ออม ทรัพย์
xxx-x-x4444-8
ไปยัง
นาง สบาย ดี
xxx-x-x3333-7 GSB
ยอดที่โอน 2,500.00 บาท
ค่าธรรมเนียม 0.00 บาท
เลขที่อ้างอิง GSB20260610AABBCC`,
    expect: {
      bank: "gsb",
      amount: 2500.0,
      date: "2026-06-10",
      reference: "GSB20260610AABBCC",
    },
  },
  {
    bank: "truemoney",
    text: `TrueMoney Wallet
ทรูมันนี่
โอนเงินสำเร็จ
15 มิ.ย. 2569 19:55
จาก
0812345678
True Money Wallet
ไปยัง
0898765432
True Money Wallet
จำนวนเงิน 150.00 บาท
ค่าธรรมเนียม 0.00 บาท
รหัสอ้างอิง TMW20260615REF`,
    expect: {
      bank: "truemoney",
      amount: 150.0,
      date: "2026-06-15",
      reference: "TMW20260615REF",
    },
  },
  {
    bank: "tisco",
    text: `TISCO Mobile
โอนเงินสำเร็จ
15 พ.ค. 2569 14:32
ธนาคารทิสโก้
จาก
นาย สมชาย ใจดี
xxx-x-x1234-5
ไปยัง
บจก. เอบีซี จำกัด
xxx-x-x6789-0
ยอดเงิน 600.00 บาท
ค่าธรรมเนียม 0.00 บาท
เลขที่อ้างอิง TIS20260515X`,
    expect: {
      bank: "tisco",
      amount: 600.0,
      date: "2026-05-15",
      reference: "TIS20260515X",
    },
  },
  {
    bank: "uob",
    text: `UOB Thai
โอนเงินสำเร็จ
15 พ.ค. 2569 14:32
ธนาคารยูโอบี
จาก
นาย สมชาย ใจดี
xxx-x-x1234-5
ไปยัง
บจก. เอบีซี จำกัด
xxx-x-x6789-0
ยอดเงิน 1,200.00 บาท
ค่าธรรมเนียม 0.00 บาท
Reference No. UOB20260515ABC`,
    expect: {
      bank: "uob",
      amount: 1200.0,
      date: "2026-05-15",
      reference: "UOB20260515ABC",
    },
  },
  {
    bank: "cimb",
    text: `OCTO by CIMB
โอนเงินสำเร็จ
15 พ.ค. 2569 14:32
ซีไอเอ็มบีไทย
จาก
นาย สมชาย ใจดี
xxx-x-x1234-5
ไปยัง
บจก. เอบีซี จำกัด
xxx-x-x6789-0
ยอดเงิน 850.00 บาท
ค่าธรรมเนียม 0.00 บาท
Reference CIMB20260515Z`,
    expect: {
      bank: "cimb",
      amount: 850.0,
      date: "2026-05-15",
      reference: "CIMB20260515Z",
    },
  },
  {
    bank: "lhb",
    text: `LH Bank Profita
แลนด์ แอนด์ เฮ้าส์
โอนเงินสำเร็จ
12 มิ.ย. 2569 10:15
จาก
นาย ที่ดิน บ้านดี
xxx-x-x2222-1
ไปยัง
บจก. โฮมแลนด์
xxx-x-x3333-2 LHB
จำนวนเงิน 4,500.00 บาท
ค่าธรรมเนียม 0.00 บาท
เลขที่อ้างอิง LHB20260612REF1`,
    expect: {
      bank: "lhb",
      amount: 4500.0,
      date: "2026-06-12",
      reference: "LHB20260612REF1",
    },
  },
  {
    bank: "kkp",
    text: `KKP DIME
เกียรตินาคินภัทร
โอนเงินสำเร็จ
18 มิ.ย. 2569 16:20
จาก
นางสาว ภัทรา ทองคำ
xxx-x-x4444-3
ไปยัง
บจก. แคปปิตอล โกรท
xxx-x-x5555-4 KKP
จำนวนเงิน 7,800.50 บาท
ค่าธรรมเนียม 0.00 บาท
Reference No. KKP20260618ABC`,
    expect: {
      bank: "kkp",
      amount: 7800.5,
      date: "2026-06-18",
      reference: "KKP20260618ABC",
    },
  },
  {
    bank: "icbc",
    text: `ICBC Thai
ไอซีบีซี (ไทย)
โอนเงินสำเร็จ
25 มิ.ย. 2569 09:45
จาก
นาย หลี่ เจิ้ง
xxx-x-x6666-5
ไปยัง
บจก. ดราก้อน เทรด
xxx-x-x7777-6 ICBC
ยอดที่โอน 15,000.00 บาท
ค่าธรรมเนียม 35.00 บาท
รหัสอ้างอิง ICBC20260625XY`,
    expect: {
      bank: "icbc",
      amount: 15000.0,
      date: "2026-06-25",
      reference: "ICBC20260625XY",
    },
  },
  // Edge case: amount has no labelled match — fallback should pick the
  // "<n> บาท" with the largest value
  {
    bank: "kbank-fallback",
    text: `K PLUS
โอนสำเร็จ 20 มิ.ย. 2569 10:00
ผู้รับ บจก. ABC xxx-x-x1234-5
500.00 บาท ค่าธรรมเนียม 0.00
2,750.00 บาท
รหัสอ้างอิง ABCDEF123456`,
    expect: {
      bank: "kbank",
      amount: 2750.0,
      date: "2026-06-20",
      reference: "ABCDEF123456",
    },
  },
];
