# ซ้อมรันก่อนขึ้น VPS (2026-11-20)

สรุป: ซ้อมรันเว็บ Studio แบบ production บนเครื่อง PC เปิดออกอินเทอร์เน็ตด้วย HTTPS จริงผ่าน Cloudflare Tunnel
แล้วให้แอปถ่ายภาพตัวจริงส่งรอบถ่ายขึ้น "คลาวด์" ผ่านทั้งสายตามแผน (Master Prompt หัวข้อ 5–6) โดยไม่ใช้ VPS

## ที่ใช้ซ้อม (ใช้ชั่วคราวเท่านั้น ห้ามใช้เป็นระบบจริง)

| ส่วน | ซ้อมด้วย | ของจริงบน VPS |
|---|---|---|
| เว็บ Studio | `next build` + `next start` พอร์ต 3040 ที่ `https://studio-test.kokomemory.com` | Docker (`deploy/hostinger`) หลัง Nginx |
| ฐานข้อมูล / ล็อกอิน | Firebase **emulator** (ข้อมูลหายเมื่อปิด) | โปรเจกต์ Firebase จริง |
| ที่เก็บรูป | ตัวจำลอง S3 (`scripts/local-s3-mock.mjs`) ที่ `https://s3-test.kokomemory.com` รับเฉพาะคำขอที่มีลายเซ็น | Cloudflare R2 |
| HTTPS | Cloudflare Tunnel `koko-booth` | Nginx + Let's Encrypt |

เปิดชุดซ้อม: emulator (`firebase emulators:start --only auth,firestore --project demo-kokomemory-local`),
`S3_MOCK_REQUIRE_SIGNATURE=1 node scripts/local-s3-mock.mjs`,
`STUDIO_ENV_FILE=.env.studio.public node scripts/studio-start-prod-local.mjs build` แล้วรันโดยไม่ใส่ `build`,
`npm run studio:migrate`, แล้ว `node scripts/rehearsal-account.mjs approve <รหัสจากแอป> https://studio-test.kokomemory.com` และ `... plan`
(`.env.studio.public` คือ `.env.studio.local` ที่เปลี่ยน `STUDIO_WEB_ORIGIN` และ `R2_LOCAL_ENDPOINT` เป็น https ของชื่อทดสอบ ไม่ถูก commit)

## ที่พิสูจน์แล้วด้วยของจริง

- แอปขอสิทธิ์ใช้งานฟรีจากเซิร์ฟเวอร์ผ่าน HTTPS และตรวจลายเซ็นด้วยกุญแจสาธารณะที่ฝังในแอปผ่าน
- ผูกเครื่องกับบัญชีลูกค้า (รหัสผูก → อนุมัติ → แอปได้สิทธิ์) และเมื่อเปลี่ยนแพ็กเกจ แอปได้ `cloud_sync` หลังรีเฟรช
- รอบถ่ายจริง 2 ภาพ (รูป 2880x1920 จากกล้อง Canon 5D Mark III) ขึ้นเซิร์ฟเวอร์ครบ 2/2 ลิงก์ `https://studio-test.kokomemory.com/s/<token>`
- ระหว่างทดสอบ เซิร์ฟเวอร์ตอบ `server_error` ชั่วคราว (ตัวจำลองที่เก็บรูปปฏิเสธลายเซ็นแบบ header ซึ่งเป็นข้อบกพร่องของตัวจำลอง ไม่ใช่ของระบบ) แอปเก็บรอบไว้ ลองใหม่เอง และอัปโหลดครบเมื่อแก้แล้ว (พฤติกรรม M3)
- หน้าแขก `/s/<token>` เปิดบนมือถือจำลองได้ แสดงรูปย่อ ปุ่ม "บันทึกทั้งหมด (2 รูป)" และปุ่มคัดลอกลิงก์ รูปมาจากที่เก็บรูปด้วย URL ที่เซ็นอายุ 10 นาที
- เข้าที่เก็บรูปตรง ๆ โดยไม่มีลายเซ็นได้ 403

## ที่ต้องรอพิสูจน์บน VPS เท่านั้น

1. Docker image build และ `docker compose up` (เครื่องที่ซ้อมไม่มี Docker; ไฟล์ใน `deploy/hostinger` ยังไม่เคยถูกรัน)
2. Nginx vhost + Let's Encrypt และค่า `STUDIO_TRUSTED_CLIENT_IP_HEADER=x-real-ip`
3. Firebase จริง (ดัชนี Firestore, กฎความปลอดภัย, การสำรอง/PITR) และ Auth จริง
4. Cloudflare R2 จริง: คีย์, bucket, นโยบาย CORS (อนุญาต `PUT` จาก origin ของเว็บ และ `GET` สำหรับหน้าแขก), ความเร็วดาวน์โหลดจริง
5. Omise webhook (ต้องมี URL สาธารณะที่ลงทะเบียนใน Omise dashboard) และคีย์ live
6. ทดสอบบนมือถือจริง (iPhone 1 รุ่น, Android 2 รุ่น ตามแผน M2) และเปิดจากในแอป LINE
7. ทดสอบโหลดซ้ำบนเครื่องจริง และตั้งงานตรวจสอบ/แจ้งเตือน (`docs/MONITORING.md`)

## ขั้นตอนย้ายจากชุดซ้อมไปขึ้นจริง

1. ตั้ง `.env` ของเซิร์ฟเวอร์จาก `deploy/hostinger/.env.staging.example` (อย่าตั้ง `R2_LOCAL_ENDPOINT` และอย่าตั้ง `STUDIO_ENV=local`; ใช้คีย์ R2 และโปรเจกต์ Firebase จริง)
2. ขึ้นตามลำดับใน `deploy/hostinger/README.md` (สำรอง VPS ก่อน, `docker compose up`, Nginx, certbot, migrate เฉพาะโปรเจกต์ที่ยืนยันแล้ว)
3. ตั้ง CORS ของ bucket, ตรวจ `/api/studio/health` และ `/api/studio/readiness`
4. **สร้างตัวติดตั้งแอปถ่ายภาพใหม่** โดยตั้งค่าตอน build: `KOKO_LICENSE_API_BASE_URL=https://<โดเมนจริง>` และ `KOKO_LICENSE_TRUSTED_KEYS_JSON=` กุญแจสาธารณะของการลงนามจริง (ฝังในแอปตอน build ตาม `vite.main.config.mjs`) แอปที่สร้างด้วยค่าของชุดซ้อมจะไม่เชื่อกุญแจจริง
5. ถ่ายรอบทดลองด้วยแอปตัวติดตั้งจริงบนเครื่องสะอาด (`docs/DESKTOP_CLEAN_PC_TEST_CHECKLIST.md`) แล้วสแกน QR ผ่าน 4G

## หมายเหตุความปลอดภัยของชุดซ้อม
- ตัวจำลองที่เก็บรูปไม่มีการยืนยันตัวตนจริง (เช็กแค่ว่ามีลายเซ็น ไม่ตรวจความถูกต้อง) ใช้กับข้อมูลทดสอบเท่านั้น และปิดทันทีเมื่อทดสอบเสร็จ
- `R2_LOCAL_ENDPOINT` แบบ https อนุญาตเฉพาะเมื่อ `STUDIO_ENV=local` (ดู `src/lib/r2.ts`)
