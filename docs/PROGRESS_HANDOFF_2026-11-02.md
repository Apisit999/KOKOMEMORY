# บันทึกความคืบหน้า / ส่งต่องาน — 2 พฤศจิกายน 2026

ต่อจาก `PROGRESS_HANDOFF_2026-11-01.md` ทั้งหมดอยู่ใน git `main` ของเว็บ (และ Desktop `C:\PhotoboothKoKo` commit `9b47c1b`) ยังไม่มีอะไร deploy

## เสร็จแล้ววันนี้
- **บันทึกรูปบนมือถือ:** หน้าแชร์และหน้ารูปในบัญชีใช้ share sheet (ลง Photos/Gallery) ถ้าไม่ได้ลดเป็นดาวน์โหลด, ปุ่มบันทึกทั้งหมด, แจ้งเตือนเมื่อเปิดในแอป LINE/Facebook/Instagram (`save-photo.ts`) รับรองบนเครื่องจริงยังไม่ได้
- **ฟอนต์:** IBM Plex Sans Thai ผ่าน `next/font` แทน Tahoma
- **แผนราคา** (`migration.ts`, `docs/KOKO_STUDIO_PRICING_ANALYSIS.md`): Starter 199 / Pro 449 / Studio 990 บาทต่อเดือน (รายปีจ่าย 10 เดือน), 10/50/200 GB, เก็บรูป 30/90/180 วัน, 1/2/5 เครื่อง ซื้อไม่ได้จนกว่าเปิดระบบชำระเงิน
- **ลบรูปตามอายุ:** `sweepExpiredPhotos`, เรียกที่ `admin/cloud/retention-sweep` ยังไม่มีตัวตั้งเวลา
- **PIN ลิงก์แชร์ระดับอีเวนต์:** 4-8 หลัก, ล็อก 15 นาทีเมื่อผิด 5 ครั้ง (ปุ่มตั้ง PIN ระดับเซสชันยังไม่มีใน UI)
- **ปรับสีให้เข้าชุดเว็บ:** หน้า account ทั้งหมด, ผลงาน, 3D (แทนที่รหัสสีอัตโนมัติ ตรวจด้วยภาพเฉพาะหน้า login/สมัคร/ผลงาน/3D) หน้าที่ต้องล็อกอินยังไม่เห็นภาพจริง
- **ตัวอักษรเล็ก** ในหน้า Studio ปรับเป็น 12-14px
- **stack ทดสอบในเครื่อง:** `scripts/local-s3-mock.mjs` + `R2_LOCAL_ENDPOINT` (เฉพาะ loopback) + `scripts/studio-seed-demo.mjs` สร้างบัญชีและรูปตัวอย่าง
- ผลตรวจล่าสุด: `tsc` ไม่มี error, lint 0 error, `npm run test:studio` ผ่าน 43 (ข้าม 5), `npm run build` สำเร็จ

## ยังไม่ได้ทำ / ไม่ได้ตรวจ
- ทดสอบบนมือถือจริง (iPhone/Android/LINE), หน้า account หลังล็อกอิน, หน้าผลงานตอนมีรูปจริง
- รูปแตกหนึ่งรูปในภาพประกอบหน้า login/สมัคร; หน้า 3D ยังไม่มีรูปชิ้นงานจริง
- ทดสอบติดตั้ง Desktop บนเครื่องสะอาด, กล้อง/เครื่องพิมพ์จริง
- ยังไม่มีหน้าราคาให้ลูกค้า, ระบบชำระเงินปิดอยู่, ไม่มี zip/โลโก้บนหน้าแขก
- Deploy ต้องมี: R2 private bucket ตั้ง CORS ให้ GET จากโดเมนเว็บ (ไม่งั้นบันทึกลง Photos บน iPhone ไม่ได้), ตัวเรียก retention sweep รายวัน, `STUDIO_SHARE_SECRET`, ตามข้อ 6 ของบันทึกเดิม (หมุนคีย์, SSH key ใหม่, ขออนุมัติก่อน)

## ลำดับต่อไป
1. ทดสอบหน้าเว็บบนมือถือจริงผ่าน Wi-Fi วงเดียวกัน
2. ทดสอบ Desktop บนเครื่อง/VM Windows สะอาด
3. รูปงานจริงสำหรับผลงานและ 3D; หน้าราคาและระบบชำระเงิน
4. ออกแบบตู้ (มินิพีซี + เว็บแคม/ไฟ), deploy เป็นขั้นสุดท้าย

ข้อควรระวังเรื่องสี: อย่ารันสคริปต์แทนที่สีซ้ำบนโค้ดที่แปลงแล้ว (ทำให้สีชมพูเข้มเพี้ยน) และในพื้นที่สีเข้มต้องใช้เขียวมะนาว/ชมพูอ่อน ไม่ใช่ดำ

## ปัญหาค้าง: บันทึกรูปบน Android (ทดสอบผ่าน HTTP ในบ้าน)
- โค้ดที่เปลี่ยนแล้ว: ดาวน์โหลดผ่านลิงก์ลงนามของเว็บเราเอง (`share/photo?t=...`, หมดอายุ 10 นาที), หน้าต่างแชร์เมื่อเป็น HTTPS, blob เป็นทางสำรอง, ข้อความตามจริง, S3 mock รองรับ Range
- ผลล่าสุดจากมือถือ Android (Xiaomi): เปิดลิงก์ไฟล์ตรงๆ แล้วระบบขึ้น "เปิดด้วย คลังภาพ / Photos" แปลว่าไฟล์ถูกส่งมาแล้ว แต่ก่อนหน้านี้ "คลังภาพ" ขึ้น "ไม่รองรับรูปแบบไฟล์หรือไฟล์เสียหาย" ยังไม่รู้ว่าเกิดจากแอปคลังภาพของเครื่องหรือจากไฟล์ (ไฟล์บนเซิร์ฟเวอร์เป็น JPEG ปกติ ตรวจด้วย sharp แล้ว) ยังไม่เคยลองเปิดด้วย Photos
- ที่ยังไม่ได้ลอง: เปิดด้วย Google Photos, เบราว์เซอร์ Chrome ล้วนๆ, HTTPS (staging หรืออุโมงค์), ใช้รูปถ่ายจริงแทนรูปตัวอย่างที่สร้างจาก SVG
- ตัดสินใจ 2 พ.ย.: พักเรื่องนี้ไว้ก่อน ทดสอบใหม่บน staging HTTPS ด้วยรูปจริงตอน deploy

## ทดสอบหลายอุปกรณ์ (จำลอง) — ยังไม่จบ
- สคริปต์ `scripts/device-matrix.mjs`: จำลอง 8 อุปกรณ์ (iPhone SE/15 Pro Max, Galaxy S23, Pixel 7, iPad แนวตั้ง/นอน, แล็ปท็อป 1366, เดสก์ท็อป 1920) × 12 หน้า ตรวจเลื่อนแนวนอนเกิน, รูปแตก, ตัวอักษรเล็กกว่า 11.5px, ปุ่มเล็กกว่า 32px, ข้อผิดพลาดใน console และ HTTP 4xx/5xx
- รันค้างอยู่ตอนพักงาน (ไปได้ประมาณ 37 จาก 96) ผลจะเขียนที่ `<scratchpad>/matrix.json` เมื่อจบ ถ้าไฟล์หายให้รันใหม่ (ใช้เวลาราว 6 นาที)
- เป็นการจำลองใน Chrome เท่านั้น ไม่ใช่เครื่องจริงและไม่ใช่เอนจิน Safari ยังต้องทดสอบ iPhone/Android จริงบน HTTPS (staging)

### ผลทดสอบหลายอุปกรณ์ (จำลอง, 96 ชุด เสร็จแล้ว)
- ผ่าน: ไม่มีหน้าเลื่อนข้างเกินจอ, ไม่มีรูปแตก, ไม่มี error ใน console และไม่มี HTTP 4xx/5xx, ฟอนต์ IBM Plex Sans Thai ใช้ทุกหน้า
- ควรแก้: ตัวอักษรเล็กกว่า 12px ในเกือบทุกหน้า (91 จาก 96 ชุด) ส่วนใหญ่เป็นป้ายอังกฤษตัวพิมพ์ใหญ่ 9–11px (`.studio-eyebrow`, `.studio-ribbon`, figcaption) และปุ่มไทย "ทั้งหมด", "หยุดภาพเคลื่อนไหว" 11px
- ควรแก้: ปุ่ม/ลิงก์สูงหรือกว้างต่ำกว่า 32px: /photobooth 22 จุด, /3d-printing 17, หน้าอื่น ~10
- หน้าแชร์รูป `/s/…` เนื้อหาน้อย (183 ตัวอักษร) เป็นปกติ ไม่ใช่บั๊ก
- ยังไม่ได้ทดสอบ: Safari จริง, มือถือ/แท็บเล็ตจริง, หน้าหลังล็อกอิน (booking/account) ในทุกขนาดจอ, สลับภาษาอังกฤษ

## 2026-11-03: Pilot (free trial) phase 1, local only, uncommitted
- Plan `pilot` (everything incl. cloud, 20 GB, 30-day photo retention, 2 devices), 60 days, cap 30 (`PILOT_*` in `migration.ts`). Customer starts it from the account page (`account/pilot/start`); admin grants any plan (`admin/licenses/grant`, audited). Expiry never locks the booth: `effectivePlanId` drops to Free; photos stay 14 days then purge.
- Retention sweep now reads up to 1000 licenses and purges lapsed accounts. Scheduler hook: `POST /api/studio/cron/retention-sweep` with header `x-cron-secret` = env `STUDIO_CRON_SECRET` (32+ chars). VPS cron must call it daily (not set up yet).
- Tests: `tests/studio/pilot.test.ts`; 48 pass. Not yet checked in a real logged-in browser. Text minimum 12px done.
- Still to do: expiry/quota emails, ToS + privacy (PDPA), pricing-page banner, phase 2 (PromptPay + slip orders).

## 2026-11-03 (later): terms, privacy, trial maxed, notification emails (local, uncommitted)
- Pilot plan v2 = Studio-level limits (200 GB, 180-day retention, 5 devices, 60 days, cap 30). Lower these before the pilot ends (bump plan `version` so migrate updates it).
- `/terms`, `/privacy` (drafts written by Claude, NOT lawyer-reviewed; legal entity name/address still missing). Pilot start requires `acceptTerms === LEGAL_VERSION` (types.ts), recorded on the license.
- `src/lib/studio/notifications.ts`: emails at 7d/1d before expiry, after expiry (grace 14 days), quota 80%/90%; once each, retried on failure, re-armed on renewal. Runs inside `POST /api/studio/cron/retention-sweep` (response includes `notices`). Needs `RESEND_API_KEY` (+ `RESEND_FROM_EMAIL`); never sent for real yet, tests use a fake mailer.
- Still open: VPS cron (daily), real Resend send test, lawyer review.
