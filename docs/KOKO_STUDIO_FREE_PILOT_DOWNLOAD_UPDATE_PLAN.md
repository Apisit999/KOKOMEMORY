# แผนพัฒนา KOKO Studio (Photobooth) — Free Pilot: ดาวน์โหลด, เก็บสถิติ, อัปเดตโปรแกรม

วันที่ 30 ตุลาคม 2026
ขอบเขต: เปิดให้คนภายนอกดาวน์โหลดและใช้งาน Free ได้จริงผ่านเว็บ เก็บข้อมูลการดาวน์โหลด/การติดตั้ง และมีระบบอัปเดตโปรแกรม
**ไม่อยู่ในขอบเขตรอบนี้:** แพ็กเกจเสียเงิน, checkout, webhook, subscription (ยังคงเป็นระยะ 4 ใน `KOKO_STUDIO_SALES_AND_INSTALLATION_PLAN.md` และ `/api/studio/purchase` ยังคืน 503 เหมือนเดิม)

---

## 1. สถานะปัจจุบัน (จากการอ่านโค้ดและเอกสาร)

| ส่วน | สถานะ | อ้างอิง |
| --- | --- | --- |
| หน้าแนะนำ `/koko-studio` | มีแล้ว แต่ปุ่มดาวน์โหลดถูกซ่อน เพราะ `kokoStudioRelease = null` | `src/data/koko-studio-release.ts`, `src/app/koko-studio/release-status.tsx` |
| ข้อมูลรุ่น (release metadata) | hard-code ในไฟล์ TS ต้อง deploy ใหม่ทุกครั้งที่ออกรุ่น | `src/data/koko-studio-release.ts` |
| License API สำหรับ Free | ครบ: claim / refresh / deactivate / device link | `src/lib/studio/*`, `/v1/desktop/*` |
| หลังบ้าน `/admin/koko-studio` | ดู licenses, plans, audit และ revoke ได้ | `src/components/studio/StudioDashboard` |
| สถิติการดาวน์โหลด | **ยังไม่มี** | — |
| ระบบอัปเดต | **ยังไม่มี** แผนเดิมกำหนดให้ "ดาวน์โหลดเองก่อน auto-update ภายหลัง" | Sales plan ระยะ 3 |
| ตัวติดตั้ง 0.1.27 | Setup.exe 154 MB, checksum ตรง แต่ **NotSigned** และยังไม่ผ่าน lifecycle test | `KOKO_STUDIO_DESKTOP_INTEGRATION.md` |
| Staging | Firebase `koko-studio-staging-6931c` + R2 staging พร้อมใน `.env.staging`; VPS/Nginx/TLS ยังไม่ deploy | `KOKO_STUDIO_HOSTINGER_STAGING_PLAN.md` |
| ไฟล์ deploy | เอกสารอ้างถึง `deploy/hostinger/*` แต่ **ไม่มีโฟลเดอร์นี้ใน checkout ปัจจุบัน** ต้องหาหรือสร้างใหม่ | — |

ข้อสรุป: ฝั่ง license พร้อมแล้ว สิ่งที่ขาดสำหรับการ pilot คือ **(ก) ช่องทางเผยแพร่ไฟล์ที่จัดการได้โดยไม่ต้อง deploy, (ข) การนับ/บันทึก, (ค) ช่องทางอัปเดต, (ง) installer ที่ผ่านการทดสอบ และ (จ) เว็บที่ deploy จริง**

---

## 2. ภาพรวมการออกแบบ

```
ผู้ใช้ ──► /koko-studio ──► ปุ่ม "ดาวน์โหลด" ──► GET /api/studio/download?channel=stable
                                                   │ 1) บันทึก studioDownloads (+ เพิ่มตัวนับ)
                                                   │ 2) 302 redirect
                                                   ▼
                                     R2: releases/windows/0.1.28/KOKO-Studio-Setup-0.1.28.exe (immutable)

Desktop (เปิดโปรแกรม / ทุก 24 ชม.)
   └─► GET /v1/desktop/updates?version=0.1.28&channel=stable&deviceId=…
          ◄─ { latest, notes, downloadUrl, sha256, mandatory }
   └─► POST /v1/desktop/licenses/free/claim  (มีอยู่แล้ว = นับ "ติดตั้งจริง")

Admin /admin/koko-studio
   ├─ แท็บ Releases: เพิ่มรุ่น, ใส่ checksum, ติ๊ก gate, เผยแพร่/ถอนรุ่น, เลือก channel
   └─ แท็บ สถิติ: ดาวน์โหลดต่อวัน/รุ่น, ติดตั้ง (free claim), active devices ตามเวอร์ชัน
```

แนวคิดหลัก:
1. **ไฟล์ใน R2 ไม่เปลี่ยนแปลงต่อเวอร์ชัน** ไม่มีไฟล์ "latest.exe" รุ่นล่าสุดกำหนดจาก Firestore
2. **ย้าย release metadata ไป Firestore** (`studioReleases`) เพื่อให้แอดมินออกรุ่นได้โดยไม่ต้อง build เว็บใหม่ แต่ยังใช้ `isDownloadableRelease()` เดิมเป็น gate ฝั่ง server
3. **นับ 3 ชั้น:** คลิกดาวน์โหลด → ติดตั้งแล้วเปิดใช้ (free claim) → ยังใช้งานอยู่ (refresh / update check) เพื่อให้เห็น funnel จริง ไม่ใช่แค่ยอดคลิก
4. **อัปเดตแบบ 2 ขั้น:** ขั้นแรกแจ้งเตือนในแอปและให้ดาวน์โหลดเอง (ทำได้ทันที ไม่ต้อง code signing) ขั้นสองทำ auto-update เมื่อมี code signing

---

## 3. Data model (Firestore, เขียนผ่าน Admin SDK เท่านั้น)

### `studioReleases/{version}`
```ts
{
  version: "0.1.28",               // semver, เป็น doc id
  channel: "stable" | "beta",
  platform: "windows",
  status: "draft" | "published" | "withdrawn",
  publishedAt: Timestamp | null,
  notes: string[],                 // release notes ภาษาไทย
  fileKey: "releases/windows/0.1.28/KOKO-Studio-Setup-0.1.28.exe",
  fileSize: number,
  sha256: string,                  // 64 hex
  minimumSupportedVersion?: string,// ต่ำกว่านี้ = บังคับอัปเดต
  checks: { checksumVerified, installerLifecycleVerified, apiVerified, publicKeyVerified, approved },
  downloadCount: number,           // FieldValue.increment
  createdBy, updatedAt
}
```

### `studioDownloads/{autoId}` (log ดิบ เก็บ 180 วัน)
```ts
{ version, channel, at: Timestamp, ipHash: sha256(ip + dailySalt), uaFamily: "Windows 11/Chrome",
  referrer?: string (เฉพาะ host), utm?: { source, medium, campaign }, uid?: string | null }
```
- **ไม่เก็บ IP ดิบ** ใช้ hash กับ salt รายวันเพื่อนับผู้ใช้ไม่ซ้ำรายวันได้ แต่ย้อนกลับไม่ได้ (สอดคล้อง PDPA)
- ใช้ `STUDIO_TRUSTED_CLIENT_IP_HEADER` ที่มีอยู่แล้วตอนอ่าน IP หลัง Nginx

### `studioStatsDaily/{yyyy-mm-dd}` (aggregate สำหรับ dashboard)
```ts
{ downloads: { [version]: n }, uniqueDownloaders: n, freeClaims: n, updateChecks: { [version]: n } }
```
อัปเดตด้วย increment ใน request เดียวกัน dashboard จึงไม่ต้อง scan log

### ต่อยอดของเดิม
- `studioLicenses.devices[deviceId]`: เพิ่ม `appVersion`, `lastSeenAt` (อัปเดตตอน refresh / update check) เพื่อดูสัดส่วนเวอร์ชันที่ใช้งานจริง
- เพิ่ม Firestore rules ปฏิเสธการอ่าน/เขียนจาก client ทุกคอลเลกชันข้างบน และเพิ่ม index สำหรับ `studioDownloads(at desc)` และ `studioReleases(channel, status, publishedAt desc)`

---

## 4. API ที่ต้องเพิ่ม

เพิ่มใน `src/lib/studio/http.ts` เพื่อใช้ origin check, rate limit, requestId และ error format เดิม

| Method | Route | สิทธิ์ | หน้าที่ |
| --- | --- | --- | --- |
| GET | `/api/studio/releases/latest?channel=stable` | public | คืน metadata รุ่นล่าสุดที่ผ่าน gate (ให้หน้าเว็บใช้) |
| GET | `/api/studio/download?channel=stable` หรือ `?version=` | public, rate-limit ต่อ IP | บันทึก log และ counter แล้ว 302 ไป R2 URL; ถ้าไม่มีรุ่นที่ผ่าน gate คืน 404 |
| GET | `/v1/desktop/updates?version=&channel=&deviceId=` | public, rate-limit | คืน `{ updateAvailable, latest, notes, downloadUrl, sha256, mandatory }` และบันทึก lastSeen/version |
| GET | `/api/studio/admin/releases` | admin claim | รายการทุกรุ่นพร้อมสถานะและยอด |
| POST | `/api/studio/admin/releases` | admin claim | action: `create-draft` / `request-upload-url` (presigned PUT ไป R2) / `verify` (server ดาวน์โหลดและคำนวณ sha256 เทียบ) / `publish` / `withdraw` พร้อม audit log |
| GET | `/api/studio/admin/stats?from=&to=` | admin claim | อ่าน `studioStatsDaily` |

กติกาสำคัญ:
- `publish` ต้องผ่าน `isDownloadableRelease()` ฝั่ง server (ปรับให้รับข้อมูลจาก Firestore) **ห้ามข้าม gate จาก client**
- `verify` ให้ server คำนวณ SHA-256 จากไฟล์ใน R2 เอง ไม่เชื่อค่าที่แอดมินพิมพ์
- `withdraw` ทำให้ `/download` และ `/updates` หยุดชี้รุ่นนั้นทันที (rollback = ถอนรุ่นใหม่ รุ่นก่อนหน้ากลับมาเป็น latest เอง)
- Download redirect ใช้ public URL ของ R2 (custom domain เช่น `downloads.kokomemory.com` ดีกว่า `pub-xxx.r2.dev` เพราะ r2.dev มี rate limit และไม่เหมาะกับ production)

---

## 5. ฝั่ง Desktop (repo `D:\pKOKO`, Electron)

### ขั้นที่ 1: แจ้งอัปเดตในแอป (ทำใน pilot)
- Main process เรียก `/v1/desktop/updates` ตอนเปิดแอปและทุก 24 ชม. (ใช้ base URL เดียวกับ `KOKO_LICENSE_API_BASE_URL`)
- แสดงแบนเนอร์ "มีเวอร์ชันใหม่ x.y.z" + release notes + ปุ่ม "ดาวน์โหลด" ที่เปิดเบราว์เซอร์ระบบไป `downloadUrl` (จำกัด origin เหมือน account-link)
- ถ้า `mandatory` (ต่ำกว่า `minimumSupportedVersion`) ให้แสดงหน้าบล็อกพร้อมปุ่มดาวน์โหลด แต่**ไม่ลบข้อมูลและไม่หยุดงานที่กำลังพิมพ์อยู่**
- ส่ง `deviceId` และ `version` เท่านั้น ไม่ส่งข้อมูลรูปหรือข้อมูลลูกค้า
- **ข้อมูลผู้ใช้ต้องอยู่รอดการอัปเกรด:** ทดสอบติดตั้งรุ่นใหม่ทับรุ่นเก่าแล้ว `userData` (รูป, เทมเพลต, การตั้งค่า, license) ยังอยู่ ต้องมี data migration แบบมีเวอร์ชันใน Desktop

### ขั้นที่ 2: Auto-update (หลังมี code signing)
- ใช้ `electron-updater` (NSIS) กับ generic provider ชี้ไปที่ R2 `releases/windows/{channel}/latest.yml` ที่สร้างจากระบบ release ข้างต้น (publish แล้วจึงเขียน latest.yml)
- ต้องมี Authenticode signing ก่อน มิฉะนั้น SmartScreen จะเตือนทุกครั้ง และไม่ควรเปิด auto-update จาก feed ที่ไม่ได้ verify
- ทดสอบ rollback และ staged rollout (เช่น ปล่อยให้ 20% ก่อน โดยใช้ hash ของ deviceId)

---

## 6. หน้าเว็บที่ต้องปรับ

1. **`/koko-studio`**
   - ปรับ `KokoStudioDownloadStatus` ให้ดึงจาก `/api/studio/releases/latest` (server component, revalidate สั้น) แทนค่าคงที่
   - ปุ่มดาวน์โหลดชี้ไป `/api/studio/download` ไม่ชี้ R2 ตรง เพื่อให้นับได้
   - แสดงเวอร์ชัน, วันที่, ขนาดไฟล์, SHA-256, ความต้องการระบบ (Windows 10/11 64-bit, RAM, กล้อง/เครื่องพิมพ์ที่ทดสอบแล้ว)
   - **คู่มือติดตั้ง** พร้อมภาพหน้าจอ SmartScreen ("More info → Run anyway") ระหว่างที่ยังไม่มี code signing, วิธีรับ Free, วิธีเชื่อมบัญชี
   - หน้า **"ประวัติเวอร์ชัน"** (changelog) จาก `studioReleases`
2. **`/admin/koko-studio`** เพิ่มแท็บ
   - **Releases:** อัปโหลด installer (presigned), กด verify checksum, ติ๊ก gate ทีละข้อ, publish/withdraw, เลือก channel
   - **สถิติ:** กราฟดาวน์โหลดต่อวัน, ดาวน์โหลด → ติดตั้ง (free claim) → active 7/30 วัน, สัดส่วนเวอร์ชันที่ใช้งาน
3. **Feedback ช่วง pilot:** ฟอร์ม "แจ้งปัญหา / ข้อเสนอแนะ" (ต่อยอด `/api/enquiries` โดยเพิ่ม service `photobooth-software` ที่มีอยู่แล้ว) และลิงก์ LINE OA บนหน้า `/koko-studio` และในแอป

---

## 7. ลำดับงาน (แนะนำ)

### Sprint 1: ระบบ release และ download tracking บนเว็บ (ทดสอบบน emulator)
- [ ] เพิ่ม types และ store methods: `studioReleases`, `studioDownloads`, `studioStatsDaily`
- [ ] API: `releases/latest`, `download`, `admin/releases`, `admin/stats`
- [ ] ปรับ `isDownloadableRelease` ให้รับข้อมูล Firestore และเขียน unit test ใน `tests/studio/` (gate, withdraw/rollback, ห้าม publish ถ้า checksum ไม่ตรง)
- [ ] Firestore rules และ indexes
- [ ] หน้า admin Releases และสถิติ, ปรับหน้า `/koko-studio`
- เกณฑ์ผ่าน: `npm run test:studio` (รวม `STUDIO_TEST_EMULATORS=true`), `tsc`, lint ไม่มี error, ลอง publish → download → นับยอดบน emulator ได้

### Sprint 2: Update check ใน Desktop
- [ ] `/v1/desktop/updates` + บันทึก `appVersion/lastSeenAt`
- [ ] Desktop: service เช็กอัปเดต, IPC, แบนเนอร์, mandatory screen, test ใน `D:\pKOKO`
- [ ] Test upgrade ทับรุ่นเดิมโดยข้อมูลไม่หาย
- เกณฑ์ผ่าน: Desktop 0.1.28 เห็นรุ่น 0.1.29 จาก emulator/staging แล้วอัปเกรดทับได้

### Sprint 3: Staging deploy (ตาม `KOKO_STUDIO_HOSTINGER_STAGING_PLAN.md`)
- [ ] หา/สร้างไฟล์ `deploy/hostinger/*` ใหม่ (Dockerfile, compose, nginx vhost)
- [ ] Deploy `studio-staging.kokomemory.com` + TLS, run migration กับ project staging
- [ ] R2 custom domain สำหรับดาวน์โหลด (staging)
- [ ] Build Desktop ด้วย API/public key staging แล้วทดสอบ end-to-end: ดาวน์โหลด → ติดตั้ง → claim Free → link account → update check → upgrade
- เกณฑ์ผ่าน: checklist ใน `KOKO_STUDIO_STAGING_RUNBOOK.md` บนเครื่อง Windows สะอาดหรือ VM อย่างน้อย 2 เครื่อง (Win 10 และ Win 11)

### Sprint 4: เปิด Free Pilot แบบจำกัด
- [ ] Production signing key แยกจาก staging, Desktop build production
- [ ] เปิด channel `beta` ให้กลุ่มทดลอง 10–30 ราย (แจกลิงก์หรือติดป้าย Beta บนหน้าเว็บ)
- [ ] ติดตาม dashboard และ feedback 2–4 สัปดาห์ แก้บั๊กผ่านระบบอัปเดต
- [ ] เมื่อเสถียรจึงย้ายไป `stable` และเปิดปุ่มดาวน์โหลดสาธารณะ

### Sprint 5 (หลัง pilot): Auto-update + code signing
- [ ] จัดหา code signing certificate (ดูข้อ 8)
- [ ] `electron-updater` + `latest.yml` + staged rollout
- จากนั้นจึงเริ่มระยะ 4 (แพ็กเกจเสียเงิน) ตามแผนเดิม

---

## 8. ความเสี่ยงและเรื่องที่ต้องตัดสินใจ

| เรื่อง | ผลกระทบ | ข้อเสนอ |
| --- | --- | --- |
| Installer ไม่มี code signing | SmartScreen เตือน "Windows protected your PC" ผู้ใช้บางส่วนจะเลิกติดตั้ง และ antivirus อาจ flag | Pilot: ทำคู่มือพร้อมภาพประกอบ, แสดง SHA-256. ก่อนเปิดสาธารณะ: ซื้อ OV/EV certificate หรือใช้ Azure Artifact Signing (ต้องตรวจคุณสมบัติผู้สมัครในไทย) |
| ต้องล็อกอินก่อนดาวน์โหลดหรือไม่ | ถ้าบังคับ: ได้ข้อมูลติดต่อแต่คนโหลดน้อยลง | **แนะนำ: ไม่บังคับ** ใช้การนับแบบไม่ระบุตัวตน และชวนเชื่อมบัญชีในแอปภายหลัง (flow device link มีอยู่แล้ว) |
| ข้อมูลส่วนบุคคล (PDPA) | log ดาวน์โหลดและ device | Hash IP, เก็บ log 180 วัน, เพิ่มข้อความในนโยบายความเป็นส่วนตัวว่าแอปเช็กอัปเดตและส่ง deviceId/version |
| R2 `pub-xxx.r2.dev` | มี rate limit, ไม่เหมาะกับไฟล์ 150 MB ที่โหลดเยอะ | ผูก custom domain `downloads.kokomemory.com` (ต้องย้าย DNS ไป Cloudflare หรือใช้ CNAME setup) |
| ขนาดไฟล์ 154 MB | ค่า egress ของ R2 เป็น 0 แต่ class B operations มีค่าใช้จ่ายเล็กน้อย | ยอมรับได้ ควรเพิ่มคำเตือนขนาดไฟล์บนหน้าเว็บ |
| macOS | ยังไม่มี build | คงสถานะ "ยังไม่รองรับ" |
| `deploy/hostinger/*` หายไปจาก checkout | ยังไม่มีไฟล์สำหรับ staging | ตรวจว่าอยู่ใน repo/เครื่องอื่น หรือสร้างใหม่ใน Sprint 3 |
| เครื่องพิมพ์/กล้องที่รองรับ | ผู้ใช้ pilot จะใช้อุปกรณ์หลากหลาย | รวบรวมรุ่นที่ทดสอบแล้วไว้บนหน้าเว็บ และเก็บรุ่นอุปกรณ์จากฟอร์ม feedback |

**คำถามถึงเจ้าของก่อนเริ่ม Sprint 1**
1. จะให้บังคับล็อกอินก่อนดาวน์โหลดไหม (แนะนำ: ไม่บังคับ)
2. Pilot ปิด (แจกลิงก์ beta) หรือเปิดสาธารณะเลย
3. งบ code signing certificate และใครเป็นผู้ถือ
4. ใช้โดเมน `downloads.kokomemory.com` ได้ไหม (ต้องตัดสินเรื่องย้าย DNS ไป Cloudflare)
5. ช่องทาง support: LINE OA / อีเมล

---

## 9. สิ่งที่ไม่ทำในรอบนี้
- แพ็กเกจเสียเงิน, checkout, webhook, subscription, refund
- Cloud sync ของ Desktop (Free ปฏิเสธอยู่แล้ว)
- macOS build
- Auto-update แบบติดตั้งเองโดยไม่ถามผู้ใช้ (รอ code signing)

---

## 10. ความคืบหน้า (อัปเดต 30 ต.ค. 2026)

**Sprint 1 เสร็จ (ฝั่งเว็บ):** `src/lib/studio/releases.ts` (ReleaseService), เส้นทางใหม่ใน `http.ts`, `ReleaseManager` ใน `/admin/koko-studio`, หน้า `/koko-studio` อ่านรุ่นจาก Firestore, `tests/studio/releases.test.ts` (8 เทสต์)
**เพิ่มเติมจาก `/v1/desktop/updates` (Sprint 2 ฝั่งเซิร์ฟเวอร์):** endpoint เช็กอัปเดตทำเสร็จแล้ว ส่วน Desktop ยังไม่ได้เริ่ม

ข้อแตกต่างจากแผนเดิม:
- document id ของรุ่นใช้ `0_1_28` (Firestore store ไม่รับจุดใน id); ค่า `version` จริงอยู่ในฟิลด์
- log ดาวน์โหลดเก็บ 1 เอกสารต่อ (วัน × ผู้เข้าชม hash × เวอร์ชัน) พร้อมตัวนับ `count` จึงไม่โตตามจำนวนคลิก
- rate limit ของ `download`, `releases/latest`, `desktop/updates` ตั้ง 300 ครั้ง/นาที/ผู้เรียก **ต้องตั้ง `STUDIO_TRUSTED_CLIENT_IP_HEADER` หลัง Nginx** มิฉะนั้นทุกคนใช้ bucket เดียวกัน (`global-native-client`)
- ตัวแปรใหม่: `STUDIO_DOWNLOAD_BASE_URL` (ไม่ตั้ง = ใช้ `R2_PUBLIC_URL`) ต้องเป็น https ถึงจะเผยแพร่ได้
- ยังไม่ได้ทำ: TTL ลบ log ดาวน์โหลด 180 วัน (ต้องตั้ง Firestore TTL policy), custom domain ดาวน์โหลด, CORS ของ R2 bucket สำหรับอัปโหลดจากเบราว์เซอร์ (`PUT` จาก origin ของเว็บ)
- ข้อความเตือน SmartScreen ใน `release-status.tsx` ต้องลบเมื่อ installer ลงนามแล้ว
