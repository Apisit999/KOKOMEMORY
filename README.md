# KOKO Memory — เว็บไซต์ + KOKO Studio (ระบบส่งรูป)

Next.js 16 + Tailwind 4 + Firebase (Auth, Firestore) + Cloudflare R2 เว็บไซต์ร้าน (จองบูธ, งานพิมพ์ 3D) และระบบ KOKO Studio:
สิทธิ์ใช้งานโปรแกรมตู้, คลาวด์รูป, หน้ารูปของแขก `/s/<token>`, แดชบอร์ดลูกค้า `/account/koko-studio`, ชำระเงินผ่าน Omise

## ต้องมี
- Node.js 24 (เวอร์ชันเดียวกับ CI), npm · Java 21 (สำหรับ Firebase emulator) · ไฟล์ `.env.studio.local` สร้างด้วย `node scripts/studio-local-config.mjs`

## Development
เว็บไซต์ทั่วไป: `npm ci` แล้ว `npm run dev` → http://localhost:3000

ระบบ Studio แบบแยกจากข้อมูลจริง (ใช้ระบบจำลองทั้งหมด):
```
npx --yes --package=firebase-tools firebase emulators:start --only auth,firestore --project demo-kokomemory-local --config firebase.json
node scripts/local-s3-mock.mjs          # ที่เก็บรูปจำลอง 127.0.0.1:9199
node scripts/studio-start-local.mjs     # เว็บที่ http://127.0.0.1:3040 (โหมดพัฒนา)
# อีกหน้าต่าง: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
npm run studio:migrate
node scripts/studio-seed-demo.mjs       # ข้อมูลตัวอย่าง (ต้องเปิดที่เก็บรูปจำลองก่อน)
```
การล็อกอินในเบราว์เซอร์ต่อระบบจำลองได้เฉพาะโหมดพัฒนา (`src/lib/firebase.ts`) ซ้อมแบบ production ผ่าน HTTPS จริงดู `docs/VPS_READINESS_2026-11-20.md`

## Tests
```
npm run test:studio     # ระบบ Studio (5 รายการข้ามถ้าไม่ได้เปิด emulator)
npm run test:auth
npm run lint
npx next build && npx tsc --noEmit
```

## Production
ขึ้นบน VPS (Docker + Nginx) ตาม `deploy/hostinger/README.md` และรายการตรวจ `docs/VPS_READINESS_2026-11-20.md`
ค่าตั้งของเซิร์ฟเวอร์ (ชื่อตัวแปรเท่านั้น ไม่มีค่าจริงในรีโป): `deploy/hostinger/.env.staging.example`
ห้ามตั้ง `STUDIO_ENV=local` หรือ `R2_LOCAL_ENDPOINT` บนเซิร์ฟเวอร์จริง

## เอกสาร (`docs/`)
- โครงสร้าง, data model, API: `ARCHITECTURE.md`
- ผลทดสอบตาม Milestone: `TEST_REPORT_2026-11-20.md` · Load test: `LOAD_TEST_2026-11-19.md`
- สำรอง/กู้คืน: `BACKUP_RESTORE.md` · เฝ้าระวัง: `MONITORING.md` · ต้นทุน: `COST_PER_EVENT_2026-11-19.md`
- สัญญาอนุญาตและช่องโหว่: `LICENSES_AND_SECURITY_2026-11-20.md`, SBOM `sbom/sbom.cdx.json`
- โปรแกรมตู้และคู่มือหน้างาน: repo `PhotoboothKoKo` (`README.md`, `docs/RUNBOOK_ONSITE_TH.md`)
