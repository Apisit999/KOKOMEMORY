# สถานะ KOKO Studio / Photo Booth — 13 ต.ค. 2026

## ทำเสร็จแล้ว

- ยืนยัน Firebase service-account JSON ที่ผู้ใช้สร้างว่าเป็นของโปรเจกต์ staging `koko-studio-staging-6931c` ภายใต้ข้อกำหนดใช้อีเมล `realme66688@gmail.com` เท่านั้น
- บันทึก Firebase Admin credentials ลง `.env.staging` ที่ถูก Git ignore และส่งไฟล์ไปยัง staging VPS ด้วย SCP; ไฟล์บน VPS จำกัด permission `600` ไม่มีการบันทึกค่า secret ในเอกสารนี้
- รัน migration แบบ additive กับ Firestore staging สำเร็จ: schema version 1 และแผน Free ถูกสร้าง
- เปิด `STUDIO_LICENSE_ENABLED=true` ใน `.env.staging` หลัง migration สำเร็จ
- Deploy เว็บ revision พื้นฐาน `4b546d2` พร้อม source fixes ในรายการด้านล่าง ไปที่ `/opt/koko-studio-staging/releases/4b546d2-20261013b`
- Docker container `hostinger-web-1` ทำงานแบบ healthy บน `127.0.0.1:3001`; `/api/studio/health` และ `/api/studio/readiness` ตอบ HTTP 200
- ติดตั้ง Nginx staging vhost แยกจาก production และสำรอง Nginx config ไว้ที่ `/opt/koko-studio-staging/rollback/nginx-before-staging-20261013.tar.gz`
- ออกใบรับรอง Let's Encrypt สำหรับ `studio-staging.kokomemory.com` โดยใช้อีเมล `realme66688@gmail.com`; หมดอายุ 11 ม.ค. 2027 และตั้งต่ออายุอัตโนมัติแล้ว
- ตรวจ `kokomemory.com` ได้ HTTP 200 และ PM2 production ยัง online หลัง reload Nginx

## Source ที่แก้และยังไม่ commit

- `src/lib/firebase-admin.ts` — เลื่อนการสร้าง Firebase Admin จนกว่าจะมี request ใช้งาน เพื่อไม่ต้องใส่ service-account secret ตอน build
- `src/app/api/auth/send-password-reset/route.ts` — สร้าง Resend client ภายใน handler หลังตรวจ API key เพื่อให้ build ได้เมื่อ staging ยังไม่มี Resend key
- `src/lib/r2.ts` — สร้าง R2 client เมื่อมีการใช้งานจริง เพื่อไม่ต้องใช้ R2 secret ตอน build

Docker build บน VPS ผ่าน compile, TypeScript และสร้าง static routes หลังแก้ทั้งสามจุดแล้ว ไม่มีการรัน test suite รอบนี้ ระหว่าง `npm ci` มีรายงาน dependency advisories 32 รายการ (moderate 11, high 20, critical 1) ซึ่งต้องประเมินก่อน release จริง

## ผลตรวจต่อ 13 ต.ค. 2026

- Browser เปิด `/photobooth` และ `/koko-studio` บน staging ได้ หน้าแสดงเนื้อหาครบ และ browser console ไม่มี error หรือ warning
- ปุ่มเริ่ม KOKO Studio พาไป `/account/login?redirect=%2Faccount%2Fkoko-studio` ถูกต้อง ยังไม่ได้ล็อกอินหรือสร้างบัญชี เพราะไม่มีบัญชีทดสอบในข้อมูลที่ได้รับ
- Desktop source อยู่ใน `D:\pKOKO` และมีการแก้ account-linking ที่ยังไม่ commit ใน working tree นั้น ตรวจเฉพาะแบบ read-only ในรอบนี้
- พบ artifact `D:\pKOKO\artifacts\releases\0.1.27\KOKO Studio-0.1.27 Setup.exe` ขนาด 154,504,192 bytes; SHA-256 ตรง manifest คือ `7e87419f26b3753e972f306cbaa659c07e3841faf769354d57cd9fba91c64ef8`; Authenticode status เป็น `NotSigned`
- `INSTALL.txt` ของ 0.1.27 ระบุว่า build นี้ยังไม่มี production License API URL และ trusted public signing key จึงใช้ Free activation ผ่าน kokomemory.com ไม่ได้; ตัวติดตั้งยังไม่ผ่านเกณฑ์ส่งลูกค้า
- `npm audit` ปัจจุบันรายงาน 32 รายการ (moderate 11, high 20, critical 1) รายการ critical คือ `proxy-addr@2.0.7` ผ่าน `shadcn -> @modelcontextprotocol/sdk -> express`; npm ระบุว่ามี fix แบบไม่ต้องอัปเกรด major ส่วน production dependency view (`--omit=dev`) ยังมี 30 รายการ รวม critical 1 และ high 18 จึงต้องจัด dependency ก่อน release จริง
- หน้า `/koko-studio` ระบุ installer ยังไม่พร้อมดาวน์โหลด ซึ่งตรงกับสถานะ artifact และการตั้งค่าในแพ็กเกจ

## ขั้นต่อไปเมื่อกลับมาทำ

1. ทดสอบ login และ Studio account-linking บน staging ด้วยบัญชีทดสอบที่เจ้าของจัดเตรียม; browser review แบบไม่ล็อกอินผ่านแล้ว
2. กำหนด License API origin และ trusted public key สำหรับ packaged Desktop build โดยห้ามใส่ private signing key หรือ Firebase/R2 secret ลงในแอป แล้วสร้าง candidate ใหม่
3. ทดสอบ candidate บน Windows: clean install, upgrade โดยรักษาข้อมูล, uninstall/reinstall/recovery และ account-linking จริง; การจำลอง print ไม่ถือเป็นหลักฐานว่ากล้องหรือเครื่องพิมพ์จริงทำงาน
4. แก้ dependency advisories โดยเฉพาะ critical `proxy-addr` และ high ของ `next`, `firebase` ก่อนพิจารณา release จริง
5. หากต้องทดสอบอีเมล ให้ตั้งค่า Resend key/from address ของ staging ผ่าน secret config ภายใต้อีเมล `realme66688@gmail.com`; ตอนนี้ `RESEND_API_KEY` และ `RESEND_FROM_EMAIL` ยังว่าง
6. ก่อนใช้ข้อมูลจริง ให้หมุน R2 token ที่เคยปรากฏใน output เก่าตามที่วางแผนไว้ และอัปเดต staging secret
7. ตรวจหรือสร้าง Hostinger snapshot ใหม่ก่อนการแก้ VPS ครั้งต่อไป: หน้า hPanel ล่าสุดแสดง snapshot เดียวสร้าง 12 ต.ค. 2026 ซึ่งหมดอายุ 13 ต.ค. 2026 และยังไม่มี backup อัตโนมัติ
8. ตรวจ Git diff และเก็บ commit ของ source fixes เมื่อพร้อม

## ข้อควรจำ

- `.env.staging` เก็บ secret ในเครื่องและบน VPS; ห้าม commit หรือคัดลอกค่า secret ลง issue/log/document
- มีโฟลเดอร์ `/opt/koko-studio-staging/releases/4b546d2-20261013` ค้างจากการส่ง tar รอบแรกที่เสียรูป; release ที่ใช้งานจริงคือ `4b546d2-20261013b` อย่าใช้โฟลเดอร์แรก
- staging ใช้ Firebase project `koko-studio-staging-6931c` และ hostname `studio-staging.kokomemory.com`; production process ที่ตรวจคือ PM2 `kokomemory`
