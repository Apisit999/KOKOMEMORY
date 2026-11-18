# 00 — รายงานตรวจโครงการเดิม (Phase 0 / M0)

วันที่ตรวจ: 18 พ.ย. 2026 · อ้างอิง: Master Prompt "KOKO MEMORY — ระบบส่งรูป Photobooth" หัวข้อ 3
ขอบเขต: repo นี้ (`C:\KOKOMEMORYTES`, branch `main`) เท่านั้น **โปรแกรม Desktop (KOKO Studio, Electron) อยู่ที่ `D:/pKOKO` ซึ่งไม่มีในเครื่องนี้ จึงยังไม่ได้ตรวจ** ข้อมูลของ Desktop ในรายงานนี้มาจากเอกสารใน `docs/` เท่านั้น

สรุปสั้น: ระบบปัจจุบันมีแกนของ "QR ส่วนตัวต่อกลุ่ม" อยู่แล้วเกือบครบ (ลิงก์ต่อ Session, Token สุ่ม 256 บิต, Storage ส่วนตัว, Signed URL, อัปโหลดพร้อม Checksum) **ควรต่อยอด ไม่ควรเขียนใหม่** ส่วนที่ขาดจริงคือการดาวน์โหลดบนมือถือ (ไม่มีรูปย่อ, โหลดรูปเต็มเข้าหน่วยความจำทีเดียว) การพิมพ์ใบเสร็จ QR และการทำงานตอนเน็ตหลุด

---

## 1. โครงสร้างโฟลเดอร์และหน้าที่

| ส่วน | ที่อยู่ | หน้าที่ |
| --- | --- | --- |
| เว็บไซต์ธุรกิจ | `src/app/` (`page.tsx`, `packages`, `booking/*`, `gallery/*`, `3d-printing/*`) | หน้าบริการ, จองงาน, ชำระเงิน, ผลงาน, ร้านพิมพ์ 3D |
| หลังบ้านแอดมิน | `src/app/admin/*`, `src/app/api/admin/*` | จัดการการจอง, การชำระเงิน, แกลเลอรีของการจอง, KOKO Studio |
| ระบบรูปลูกค้า (ใหม่) — **KOKO Studio Cloud** | `src/lib/studio/cloud.ts`, `src/app/s/[token]/page.tsx`, `src/components/studio/ShareGallery.tsx`, `save-photo.ts` | อีเวนต์ → รูป, ลิงก์แชร์ต่อ Session/อีเวนต์, หน้าแขก |
| License / Desktop API | `src/lib/studio/service.ts`, `http.ts`, `src/app/v1/desktop/[...path]`, `src/app/api/studio/[...path]` | License, ผูกเครื่องกับบัญชี, Release ของตัวติดตั้ง |
| แกลเลอรีแบบเก่า (ต่อการจอง) | `src/lib/gallery-share.ts`, `src/app/gallery/[bookingId]`, `src/app/api/gallery/*`, `src/app/api/admin/gallery/*` | อัลบั้มของการจอง + QR อัลบั้ม |
| ตัวอัปโหลด Windows แบบเก่า | `tools/windows-uploader/` (สคริปต์ PowerShell ดาวน์โหลดจากหน้าแอดมิน) | เฝ้าโฟลเดอร์แล้วส่งรูปเข้าอัลบั้มเดียว |
| โปรแกรมหน้างาน | `D:/pKOKO` (นอก repo) | Electron: ถ่าย, พิมพ์, เทมเพลต, ซิงก์คลาวด์ |
| Deploy | `deploy/hostinger/` | Docker + nginx สำหรับ VPS staging |
| ทดสอบ / สคริปต์ | `tests/studio`, `tests/auth`, `scripts/` | Unit/Emulator test, seed, device-matrix |

## 2. Tech stack และเวอร์ชัน (จาก `npm ls` ที่ติดตั้งจริง)

- Next.js 16.4.5 (Turbopack), React 19.1.0, TypeScript 5.9.3, Tailwind 4.3.0
- Firebase: `firebase` 12.19.0 (client), `firebase-admin` 14.5.0 — Firestore + Auth
- Storage: Cloudflare R2 ผ่าน `@aws-sdk/client-s3` 3.1114.0 + `s3-request-presigner` 3.1115.0
- อีเมล: `resend` 6.28.1 · ฟอร์ม: `react-hook-form` 7.84.0 + `zod` 4.6.7
- UI อื่น: `three` 0.186.0, `swiper` 14.0.5, `qrcode.react` 4.2.0, `lucide-react`, `sonner`, `@base-ui/react` 1.7.0
- โฮสต์: Hostinger VPS (Docker) ตาม `deploy/hostinger/` — ยังไม่ deploy ระบบ Studio
- สถานะ ณ วันตรวจ: `npx tsc --noEmit` 0 error, `npm run test:studio` ผ่าน 54 ข้าม 5 (ข้ามคือชุดที่ต้องใช้ emulator)

## 3. Data model ปัจจุบัน (Firestore)

ระบบรูปลูกค้า (KOKO Studio Cloud):

| Collection | ฟิลด์หลัก | ความสัมพันธ์ |
| --- | --- | --- |
| `studioLicenses` | ownerUid, planId, status, devices{} | 1 บัญชี → หลาย License → หลายเครื่อง |
| `studioPlans` | features, photoStorageQuotaBytes, photoRetentionDays | แผนของ License |
| `studioEvents` | ownerUid, clientEventId, name, date, photoCount, bytes | บัญชี → อีเวนต์ |
| `studioPhotos` | eventId, ownerUid, **sessionId**, key, size, sha256, status | อีเวนต์ → รูป; จัดกลุ่มด้วย sessionId |
| `studioShares` | id = hash(token), scope session/event, expiresAt, revoked, pin* | ลิงก์ QR (เก็บแค่ Hash ของ Token) |
| `studioShareIndex` | generation, revoked | ทำให้ขอลิงก์ซ้ำได้ลิงก์เดิม และยกเลิกแล้วได้ลิงก์ใหม่ |
| `studioUsage` | bytes, photos | โควตาต่อบัญชี |
| `studioAuditLogs`, `studioRateLimits`, `studioIdempotency`, `studioDeviceAuthorizations`, `studioReleases`, … | | License, Release, การผูกเครื่อง |

ระบบธุรกิจเดิม: `bookings`, `bookingDates`, `payments`, `photos` (แกลเลอรีของการจอง), `galleryShares`, `portfolio`, `reviews`, `enquiries`, `threeD*`, `auditLogs`, `rateLimits`, `users`

เทียบกับหัวข้อ 8.2: **ยังไม่มี Session เป็น Collection ของตัวเอง** (มีแค่ `sessionId` บนรูป) จึงไม่มี `media_count_expected` สำหรับแสดง "กำลังอัปโหลด 3/6", ไม่มี `short_code`, ไม่มี `media_derivatives`, ไม่มี `devices` ต่ออีเวนต์ และยังไม่มีแนวคิด Organization (ใช้บัญชีผู้ใช้เป็นเจ้าของ)

## 4. Flow ปัจจุบัน: ถ่าย → อัปโหลด → ลูกค้าได้รูป

1. Desktop ถ่ายรูป (ฝั่ง `D:/pKOKO`) แล้วเรียก `POST desktop/cloud/events` สร้าง/ใช้อีเวนต์
2. Desktop ขอลิงก์ QR ของ Session: `POST desktop/cloud/shares` → ได้ `https://<origin>/s/<token>` (**ต้องออนไลน์** เพราะ Token สร้างที่เซิร์ฟเวอร์)
3. ต่อรูป: `photos/init` (ส่ง size + sha256) → PUT ตรงเข้า R2 ด้วย Presigned URL (15 นาที) → `photos/confirm` เซิร์ฟเวอร์อ่านไฟล์เองเพื่อเทียบขนาดและ SHA-256
4. แขกสแกน QR → `/s/[token]` (noindex, no-referrer) → `POST share/view` ได้ Signed URL อายุ 10 นาทีของ **ไฟล์ต้นฉบับ** → หน้าโหลดใหม่ทุก 15 วินาที รูปที่มาทีหลังขึ้นเอง
5. บันทึก: `navigator.share({ files })` → ถ้าไม่ได้ ดาวน์โหลดผ่านลิงก์ของเว็บเอง (`share/photo?t=` ที่ตั้ง Content-Disposition) → สุดท้ายบอกให้กดค้างที่รูป

จุดที่ทำให้ช้าหรือพัง:
- **ขั้น 2 ต้องใช้เน็ต:** ถ้าเน็ตหลุด QR ออกไม่ได้ ขัดกับหัวข้อ 4.3 (Offline-first)
- **ไม่มีรูปย่อ:** ตารางรูปโหลดไฟล์ต้นฉบับ (สูงสุด 25 MB/รูป ตาม `MAX_PHOTO_BYTES`) ทุกรูป
- **รูปต่อหน้าจำกัด 100:** `store.list(..., 100)` ทำให้ลิงก์ระดับอีเวนต์ที่มีเกิน 100 รูปแสดงไม่ครบ (Session ปกติไม่ถึง)
- **ไฟล์ดาวน์โหลดผ่านเซิร์ฟเวอร์ Next.js:** `sharePhoto*` อ่านทั้งไฟล์เข้าหน่วยความจำเซิร์ฟเวอร์แล้วส่งต่อ ใช้แบนด์วิดท์และ RAM ของ VPS แทน CDN
- แกลเลอรีแบบเก่า: ตัวอัปโหลด PowerShell ส่งทุกรูปเข้าอัลบั้มเดียว ไม่แยกกลุ่ม (README ระบุไว้เอง)

## 5. ความปลอดภัย

| ประเด็น | ผล | หลักฐาน |
| --- | --- | --- |
| Key/Secret ในโค้ด | ไม่พบใน git (ค้นรูปแบบ AWS/Google/Resend/Private key) ไฟล์ `.env*` ถูก ignore ทั้งหมด | `.gitignore:35` |
| Secret ที่เคยวางในแชต | **ยังค้าง:** handoff 4 พ.ย. ระบุว่าต้องหมุนคีย์ที่หลุดในแชต, ลบ SSH key ชั่วคราว, แยกคีย์ production | `docs/PROGRESS_HANDOFF_2026-11-04.md` |
| รูปลูกค้า Studio | Private, อ่านผ่าน Signed URL 10 นาที, Token 256 บิต (HMAC), เก็บเฉพาะ Hash, ลิงก์ผิด/หมดอายุ/ยกเลิกตอบเหมือนกัน (404) | `cloud.ts:254-415` |
| เดา URL / เข้ารูปกลุ่มอื่น | เดาไม่ได้ในทางปฏิบัติ; กรอง `ownerUid` ซ้ำทุกครั้ง; มี PIN + ล็อก 15 นาทีหลังผิด 5 ครั้ง | `cloud.ts:332-365` |
| R2 Public URL | **ต้องตรวจบน Cloudflare:** สลิปการจอง (`booking/payment-slip`), ไฟล์ 3D และ Portfolio สร้าง URL สาธารณะผ่าน `R2_PUBLIC_URL` ถ้าใช้ bucket เดียวกับรูปลูกค้าและเปิด Public ไว้ ไฟล์ทุกตัวที่รู้ key จะเปิดได้ (key รูป Studio มี uid + id 32 hex จึงเดายาก แต่ไม่ควรพึ่ง) สลิปชำระเงินเป็นข้อมูลส่วนบุคคล ไม่ควรเป็น URL สาธารณะ | `payment-slip/route.ts:70` |
| Endpoint ทดสอบ | `/api/r2-test` ยังอยู่ (ต้องเป็นแอดมิน แต่ log มาก) ควรลบก่อน production | `src/app/api/r2-test/route.ts` |
| Rate limit | มีบน enquiries/auth/studio; ถ้าไม่ตั้ง `TRUSTED_CLIENT_IP_HEADER` ทุกคนใช้ถังเดียว และ fail-open เมื่อ Firestore ผิดพลาด | `src/lib/rate-limit.ts` |
| Dependency | handoff ระบุเหลือ 4 high (`firebase` → `@grpc/grpc-js`) ยังไม่ยืนยันผลกระทบ | handoff 4 พ.ย. |
| CSP | ยังไม่มี | handoff 4 พ.ย. |

## 6. สาเหตุที่ Android โหลดช้า/ค้าง (จากโค้ดจริง)

1. **ไฟล์ใหญ่:** หน้าแขกแสดงและดาวน์โหลดไฟล์ต้นฉบับเสมอ ไม่มีขนาด thumb/preview/download (`ShareGallery.tsx` ใช้ `photo.url` ของต้นฉบับใน `<img>` ของตาราง)
2. **Blob ในหน่วยความจำทั้งชุด:** "บันทึกทั้งหมด" เรียก `Promise.all(items.map(toFile))` ดึงทุกรูปเป็น Blob พร้อมกันก่อนเปิด Share sheet (`save-photo.ts:57`) 8 รูป × 10 MB = ~80 MB ใน RAM ทีเดียว เครื่อง RAM 3–4 GB เสี่ยงค้างหรือแท็บถูกปิด
3. **ดาวน์โหลดทีละรูปยิงติดกัน:** fallback กดลิงก์ดาวน์โหลดทุก ~1.4 วินาที Chrome Android มักบล็อกการดาวน์โหลดหลายไฟล์อัตโนมัติ
4. **In-app browser:** ตรวจจับ LINE/Facebook/Instagram ได้และขึ้นข้อความเตือน แต่ **ไม่มี** `openExternalBrowser=1` ใน URL ของ QR และไม่มีปุ่ม Android Intent "เปิดใน Chrome"
5. **ไม่มี CDN:** ไฟล์ดาวน์โหลดวิ่งผ่าน VPS (ข้อ 4 ด้านบน) และ Signed URL ต่างกันทุก 8 นาที ทำให้ cache ไม่ได้
6. ไม่มี ZIP บนมือถือ (ดีแล้ว — ตรงกับข้อกำหนด 6.2)
7. หน้าแขกเป็น Client component ใน Next.js ที่โหลด i18n ทั้งเว็บ ยังไม่ได้วัดขนาด JS จริง

ยังไม่ได้ทดสอบบนมือถือ Android จริง (handoff ระบุว่าพักไว้รอทดสอบบน HTTPS) ข้อ 1–3 สรุปจากการอ่านโค้ด ยังไม่ได้วัด

## 7. เก็บไว้ได้ / ต้องแก้ / ควรเปลี่ยน

| รายการ | ตัดสิน | เหตุผล | ความเสี่ยงถ้าไม่ทำ |
| --- | --- | --- | --- |
| Share token แบบ HMAC + เก็บ Hash + ยกเลิกด้วย generation | เก็บไว้ | ตรงหัวข้อ 4.2 (≥128 บิต, เดาไม่ได้) | — |
| init → PUT R2 → confirm พร้อม SHA-256 | เก็บไว้ | ตรงหัวข้อ 4.3 (Checksum, idempotent) | — |
| R2 private + Signed URL | เก็บไว้ | ไม่มีค่า Egress ตรงหัวข้อ 8.1 | — |
| หน้า `/s/[token]` (noindex, no-referrer, polling) | เก็บไว้ ปรับ | โครงถูกแล้ว ขาดสถานะ "3/6" และรูปย่อ | ลูกค้าเห็นหน้าว่างระหว่างรอ |
| สร้าง Token ที่เซิร์ฟเวอร์ | **ต้องแก้ (M3)** | ต้องให้ Desktop สร้าง Token ในเครื่องแล้วลงทะเบียนภายหลัง เพื่อพิมพ์ QR ตอนเน็ตหลุด | ใบเสร็จออกไม่ได้เมื่อเน็ตหลุด |
| ไม่มีรูปย่อ | **ต้องแก้ (M2)** | สาเหตุหลักที่ Android ช้า | ปัญหาข้อ 1 ของธุรกิจไม่หาย |
| `savePhotos` ดึงทุกไฟล์พร้อมกัน | **ต้องแก้ (M2)** | ดึงไฟล์ขนาด download ทีละรูป จำกัดขนาดรวมก่อนเรียก share | เครื่อง RAM น้อยค้าง |
| ลิงก์ QR ไม่มี `openExternalBrowser=1` | **ต้องแก้ (M2)** | แก้ง่าย ผลมากกับผู้ใช้ LINE | บันทึกรูปใน LINE ไม่ได้ |
| ไฟล์ดาวน์โหลดผ่าน VPS | ควรเปลี่ยน (M2) | ใช้ Presigned URL ที่มี `ResponseContentDisposition` (มีใน `presignDownload` แล้ว) หรือโดเมน R2 + CDN | VPS คอขวดตอนแขกโหลดพร้อมกัน |
| ไม่มี Collection `sessions` | ควรเปลี่ยน (M1) | ต้องใช้เก็บ `media_count_expected`, `short_code`, สถานะ, พิมพ์ซ้ำ | ทำหัวข้อ 4.3 และ 7 ไม่ได้ |
| Firestore แทน PostgreSQL | **เก็บไว้ (เสนอ)** | หัวข้อ 8.1 แนะนำ Postgres แต่ระบบใช้ Firestore อยู่แล้วและมี Test; ย้ายตอนนี้เสี่ยงและเสียเวลา กฎ "ต่อยอดไม่เขียนใหม่" ชนะ | Query ซับซ้อน (สถิติ, หลายองค์กร) ทำยากขึ้นใน M4/M6 |
| `list` จำกัด 100 | ต้องแก้ (M1) | ทำ pagination สำหรับลิงก์ระดับอีเวนต์ | เจ้าภาพเห็นรูปไม่ครบ |
| แกลเลอรีแบบเก่า + ตัวอัปโหลด PowerShell | ควรเปลี่ยน (หลัง M3) | ซ้ำกับ Studio Cloud; ค่อยย้ายเมื่อ Desktop ใช้งานจริงแล้ว | ดูแลสองระบบ |
| `/api/r2-test` | ต้องแก้ (M5) | ลบก่อน production | log มาก, พื้นผิวโจมตีเพิ่ม |
| สลิปชำระเงินเป็น Public URL | ต้องแก้ (ตรวจก่อน) | ข้อมูลส่วนบุคคล ควร Private + Signed URL | ข้อมูลรั่วถ้ามีคนได้ลิงก์ |

## 8. ข้อเสนอสถาปัตยกรรมเป้าหมาย (ต่อยอดจากของเดิม)

- **Booth Agent = KOKO Studio Desktop เดิม (Electron)** ไม่เขียนใหม่ เพิ่ม: สร้าง `session_id` + Token ในเครื่อง, คิว SQLite, พิมพ์ ESC/POS, หน้าสถานะ (งานอยู่ใน repo `D:/pKOKO`)
- **Web App = Next.js เดิม** หน้า `/s/[token]` ทำให้เบาลง (ลด JS ที่ไม่จำเป็น)
- **Database = Firestore เดิม** เพิ่ม Collection `studioSessions` (`eventId, deviceId, tokenHash, shortCode, expectedCount, status, expiresAt`) และ `derivatives` บน `studioPhotos`
- **Storage = R2 เดิม** prefix `studio/{uid}/{event}/originals|derivatives/…`, Lifecycle rule ตามอายุงาน, โดเมน R2 + Cloudflare CDN สำหรับ derivative
- **Worker สร้างรูปย่อ:** ใช้ `sharp` (มีใน dependency tree อยู่แล้ว ผ่าน Next) รันตอน `confirm` หรือคิวใน Firestore — เริ่มแบบง่ายใน process เดียวกับเว็บ แยกเมื่อวัดแล้วว่าจำเป็น
- **Monitoring:** Sentry หรือเทียบเท่า (มีค่าใช้จ่าย — เสนอราคาก่อนตาม กฎข้อ 6)

ลำดับงานที่เสนอ (ตามหัวข้อ 11):
1. **M1** `studioSessions` + Token ที่ Desktop สร้างได้ + `short_code` + rate limit + pagination + Test สิทธิ์
2. **M2** รูปย่อ 3 ขนาด, บันทึกทีละรูป, `openExternalBrowser=1`, ปุ่ม Intent, ดาวน์โหลดผ่าน CDN, Device Test Matrix บนเครื่องจริง
3. **M3** ใน repo Desktop: คิว offline, ESC/POS, ทดสอบถอดเน็ต 10 นาที

## 9. คำถามที่เจ้าของต้องตอบก่อนเริ่ม M1

1. เปิด repo Desktop (`D:/pKOKO`) ให้ตรวจได้ไหม — ตอนนี้ไม่มีในเครื่องนี้ (M3 ทำไม่ได้ถ้าไม่มี)
2. ยอมรับให้ใช้ **Firestore ต่อ** แทนการย้ายไป PostgreSQL หรือไม่
3. รุ่นเครื่องพิมพ์ใบเสร็จ, ขนาดกระดาษ (58/80 มม.), การเชื่อมต่อ และราคาม้วน (ช่อง [ใส่ …] ในเอกสาร)
4. จำนวนแขกต่องานและรูปต่อกลุ่มโดยประมาณ (ใช้ทำตารางต้นทุนและ Load test)
5. R2 bucket ที่ใช้กับสลิป/Portfolio เป็นตัวเดียวกับรูปลูกค้าหรือไม่ และเปิด Public อยู่หรือไม่
6. หมุนคีย์ที่เคยหลุดในแชตแล้วหรือยัง
