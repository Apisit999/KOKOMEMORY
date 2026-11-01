# บันทึกความคืบหน้า / ส่งต่องาน — 30 ตุลาคม 2026

## เสร็จแล้ว

**เว็บ (repo KOKOMEMORYTES)**
- ระบบ release/ดาวน์โหลด/สถิติ/เช็กอัปเดต: `src/lib/studio/releases.ts`, route ใหม่ใน `http.ts`, `ReleaseManager` ใน `/admin/koko-studio`, หน้า `/koko-studio` อ่านรุ่นจาก Firestore, เทสต์ `tests/studio/releases.test.ts` (8 ข้อ)
- ไฟล์ deploy ใหม่ `deploy/hostinger/*` + สคริปต์ตรวจ `validate-on-vps.ps1/.sh` (ผ่าน 13/13 บน VPS)
- `CLAUDE.md` เขียนใหม่ และแผน `docs/KOKO_STUDIO_FREE_PILOT_DOWNLOAD_UPDATE_PLAN.md` (หัวข้อ 10 = ความคืบหน้า)

**Desktop (`C:\PhotoboothKoKo`, 0.1.28 — ยังไม่ได้ commit)**
- เช็กอัปเดตจากเว็บ: `update-checker.ts`, IPC, `update-banner.tsx`, เทสต์ใหม่ (รวม 95 ข้อผ่าน), สคริปต์ `npm run start:website-local` + `.env.website-local` (public key เท่านั้น)
- แผน `docs/SOFTWARE_FIRST_PLAN_TH.md`: ทำโปรแกรมให้เสร็จก่อน กล้อง/เครื่องพิมพ์รอทีหลัง ห้ามอ้างว่ารองรับก่อนมีผลทดสอบจริง

**โครงสร้างพื้นฐาน**
- DNS `kokomemory.com` อยู่ที่ Cloudflare (ทุกเรคคอร์ด DNS only), `downloads.kokomemory.com` ผูกกับ R2 bucket `koko-studio-staging-public` ใช้งานได้
- staging อัปเดตเป็น `sprint1-20261030` แล้ว (`https://studio-staging.kokomemory.com`) ย้อนกลับได้ตามขั้นตอนใน `deploy/hostinger/README.md`

## ยังค้าง (ลำดับแนะนำ)

1. **ลบกุญแจ SSH ชั่วคราว:** `claude-temp-validate-2026-10-30` ใน hPanel (VPS → รหัส SSH) และไฟล์ `C:\Users\User\.ssh\koko-claude-temp` ในเครื่องนี้
2. **หมุนกุญแจ staging:** Firebase service account และ signing key (เคยปรากฏในแชตหลายครั้ง)
3. **ตั้ง CORS ของ R2** (`koko-studio-staging-public`): AllowedOrigins `https://studio-staging.kokomemory.com`, method `PUT`, headers `*`
4. **ให้บัญชี admin ของ staging มี custom claim `admin`** (ใช้ `scripts/set-admin.ts` กับ Firebase staging — ต้องขออนุญาตก่อนแตะข้อมูลจริง)
5. ทดสอบเผยแพร่รุ่นจากหน้า admin บน staging → ดาวน์โหลด → แบนเนอร์อัปเดตใน Desktop (ยังไม่เคยเห็นแบนเนอร์ขึ้นจอจริง)
6. งาน Desktop ตาม `SOFTWARE_FIRST_PLAN_TH.md`: กล้องจำลอง + โครง camera adapter → ทดสอบ flow ครบวงจร → ทดสอบตัวติดตั้งบน Windows สะอาด
7. ซิงค์นาฬิกาเครื่องนี้ (เร็วกว่าจริงราว 21 นาที)
8. commit โค้ด Desktop แล้ว push (เครื่องหลักอยู่อีกเครื่อง)
9. ตัดสินใจ: code signing (ช่วง pilot ใช้คู่มือ SmartScreen ไปก่อน), pilot แบบปิด (beta 10–30 ราย), production bucket R2 แยกจาก staging

## สถานะในเครื่องนี้ (จะหายถ้าปิด)

- เว็บ local `http://127.0.0.1:3040` (`npm run studio:dev`) และ Firebase emulator (พอร์ต 8080/9099) ยังรันเบื้องหลัง ข้อมูลใน emulator (รุ่นทดสอบ 0.1.28/0.1.29/0.1.30 และบัญชี admin ทดสอบ) หายเมื่อปิด
- วิธีรันซ้ำและข้อควรระวังอยู่ใน memory `koko-local-test-stack` และ `koko-staging-vps`
- ไฟล์ `.env.staging` / `.env.studio.local` มีความลับ อยู่ในเครื่องเท่านั้น ถูก ignore จาก git และ Docker
