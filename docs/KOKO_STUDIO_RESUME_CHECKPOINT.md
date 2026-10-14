# บันทึกสำหรับกลับมาทำต่อ — 13 ตุลาคม 2026

ผู้ใช้ขอ “บันทึกการทำงานเดี่ยวมาทำต่อ” จึงหยุดพัฒนาที่จุดนี้ งานระยะ 2 ยังแก้ไม่ครบและยังไม่ได้ตรวจหรือทดสอบหลังแก้ ห้ามรายงานว่าพร้อมใช้งานหรือแพ็กเป็นรุ่นใหม่แล้ว

## โครงการและแผน

- เว็บ/เอกสาร: `C:\KOKOwedding`
- Electron Desktop: `D:\pKOKO`
- แผน: `docs/KOKO_STUDIO_STABILITY_PLAN.md` และ `docs/KOKO_STUDIO_NEXT_DEVELOPMENT_PLAN.md`
- มีงานเดิมที่ยังไม่ commit ใน Desktop หลายไฟล์ ต้องอ่าน diff และรักษางานเดิมไว้ ห้าม reset/checkout ทับ
- การเขียน Desktop อยู่นอก writable root ของ session อาจต้องผ่านการอนุมัติของเครื่องมือ

## งานระยะ 1 ที่เสร็จแล้วในรอบก่อน

- ภาพ `Screenshot 2026-10-13 194209.png` แสดง License active และเชื่อมบัญชีสำเร็จใน Desktop
- `src/renderer/account-link-card.tsx` เพิ่ม retry เมื่อ polling ขัดข้องแบบหน่วง 2–30 วินาทีจนรหัสหมดอายุ; เก็บ callback/ภาษาใน ref เพื่อไม่ให้การเปลี่ยนค่าทั้งสองรีสตาร์ต effect
- `src/main/services/license-runtime.ts` คง pending เมื่อ HTTP 408, 425 หรือ 5xx; ใช้ Retry-After สูงสุด 60 วินาที; มี 429 เดิม
- ขยายกรณีทดสอบ account linking ให้ผ่าน 503 → 429 → pending → approved
- package.json และ package-lock.json เป็น 0.1.28
- ก่อนเริ่มระยะ 2: typecheck ผ่าน, license-runtime ผ่าน 7/7, license-verifier ผ่าน 5/5
- Installer ที่สร้างแล้ว: `D:\pKOKO\out-staging\make\squirrel.windows\x64\KOKO Studio Staging-0.1.28 Setup.exe`
- SHA-256: `32ea04d89145edee545650a9016d41b859260c7005cfa44d6d6e6ef2bf76b96c`
- มี `.nupkg`, `RELEASES`, `SHA256SUMS.txt`, `STAGING-TEST.txt` คู่กัน; installer ยัง NotSigned และเป็น staging
- ตรวจ app.asar แล้วพบ staging origin/public key ID/retry UI; ไม่พบ marker ของ private credentials การตรวจ marker ไม่ใช่การตรวจความลับทุกชนิดอย่างครอบคลุม
- คำสั่ง Forge make ล้าง output make เดิม: หลังสร้าง 0.1.28 ไม่พบ installer 0.1.27 ในโฟลเดอร์เดิม แม้บันทึกก่อนหน้าระบุว่าเก็บไว้ จึงต้องตรวจหา archive ถ้าจะย้อนรุ่น ห้ามอ้างว่ายังมีไฟล์เก่า
- ยังไม่มีผลจากผู้ใช้ยืนยันการติดตั้ง/อัปเกรด 0.1.28 หรือการปิดเปิดแอปและทดสอบเน็ตหลุดบน candidate นี้

## งานระยะ 2 ที่กำลังทำและแก้ค้างไว้

ผู้ใช้อนุญาต “เริ่มทำขั้นต่อไป” จึงตรวจ photo store, capture sessions และ camera manager พบว่ามี atomic index writes, fsync, serialized saves, recovery/quarantine, camera generation guards และ devicechange handling อยู่แล้ว เริ่มเพิ่มข้อมูลพื้นที่ว่างเพื่อให้ผู้ใช้เห็นก่อนถ่าย

ไฟล์ที่แก้ในระยะ 2:

1. `D:\pKOKO\src\main\services\photo-store.ts`
   - เพิ่ม import `statfsSync`
   - เพิ่ม `availableBytes: number | null` ใน PhotoStorageStatus
   - getStatus ส่ง availableBytes; ถ้ายังไม่ configure ให้ null
   - เพิ่ม getAvailableBytes(): อ่าน bavail × bsize; คืน null เมื่ออ่านไม่ได้หรือค่าไม่ถูกต้อง
2. `D:\pKOKO\src\shared\contract.ts`
   - เพิ่ม `MIN_FREE_PHOTO_STORAGE_BYTES = 256 * 1024 * 1024`
   - เพิ่ม availableBytes ใน IPC PhotoStorageStatus
3. `D:\pKOKO\tests\photo-store.test.cjs`
   - ปรับ test สถานะเริ่มต้นให้แยกตรวจ availableBytes เป็นจำนวนไม่ติดลบ ใช้ snapshot ครั้งเดียวเพื่อไม่เทียบพื้นที่ว่างข้ามเวลา
4. `D:\pKOKO\src\renderer\main.tsx`
   - import MIN_FREE_PHOTO_STORAGE_BYTES
   - เพิ่ม helpers hasLowPhotoStorage และ formatStorageSpace
   - เพิ่ม CameraPanel prop `storageAvailableBytes`, default null
   - เพิ่ม storageSpaceLow และรวมใน captureDisabled
   - เพิ่ม guard ใน capture() และ runSamplePhotoSession()
   - ปุ่ม sample session disabled เมื่อพื้นที่ต่ำกว่า threshold

ยังค้างที่สำคัญ:

- ยังไม่ได้ส่ง `storageAvailableBytes={photoStorage?.availableBytes ?? null}` จากจุดเรียก CameraPanel หน้าสตูดิโอและโหมดแขก ดังนั้น prop ยังเป็น null และ guard ใหม่ยังไม่ทำงานจริงจาก UI
- ยังไม่ได้เพิ่มข้อความพื้นที่เหลือน้อยและพื้นที่ว่างในหน้าถ่าย/Settings/dashboard จึงต้องทำให้ปุ่มที่ถูกปิดมีคำอธิบายชัดเจน
- ยังไม่ได้จัดการ refresh เมื่อผู้ใช้เพิ่มพื้นที่หลังจากถูกปิดปุ่ม ต้องมีวิธีตรวจใหม่ ไม่ให้ปุ่มติดค้างจาก status เก่า
- ค่า 256 MiB เป็นค่าที่เลือกชั่วคราว ยังไม่ใช่ข้อกำหนดที่ผู้ใช้ตกลงหรือปริมาณที่รับประกันว่าถ่ายได้ทั้งรอบ ต้องพิจารณาว่าจะเตือนหรือบล็อก รวมกรณีอ่านพื้นที่ไม่ได้
- ถ้าจะบล็อกเริ่มรอบ ต้องตรวจข้อมูลสดใน Main ก่อนออก capture grant และรับมือ ENOSPC ระหว่างเขียนด้วย; UI snapshot เพียงอย่างเดียวไม่รับประกันว่าดิสก์จะไม่เต็มระหว่างถ่าย
- formatStorageSpace ใช้ GB แต่คำนวณฐาน 1024 และ threshold 256 MiB ถูกปัดเป็น 0.3 GB ควรปรับข้อความ/หน่วยให้แม่นยำ
- ยังไม่ได้แก้ camera lifecycle หรือ capture-session store ในระยะ 2
- ยังไม่ได้รัน typecheck/tests/build หลังการแก้ระยะ 2; installer 0.1.28 ยังเป็นรุ่นก่อนงานพื้นที่ว่างนี้

## ลำดับสำหรับทำต่อ

1. อ่านบันทึกนี้ ตรวจ git status/diff และ AGENTS.md ที่เกี่ยวข้องในทั้งสอง repo ก่อนแก้
2. ตรวจและทำงานพื้นที่ว่างที่ค้างให้ครบ: policy, Main preflight ถ้าจำเป็น, IPC/UI wiring, ข้อความและการ refresh
3. รัน typecheck และชุดที่เกี่ยวข้อง: test:storage, test:capture-sessions, test:capture, test:camera ตามส่วนที่เปลี่ยน เพิ่มกรณีจำลองพื้นที่ไม่พอโดยไม่เติมดิสก์จริงหรือแตะรูปผู้ใช้
4. ตรวจพฤติกรรม storage recovery ที่มีอยู่ก่อนเพิ่มกลไกใหม่ เก็บหลักฐานของการล้มเหลวระหว่างเขียนและการเปิดใหม่
5. เมื่อ source ผ่านแล้วจึงสร้าง staging candidate เลขรุ่นใหม่และคู่มือ/checksum; อย่าเขียนทับ candidate ที่ส่งให้ผู้ใช้แล้วโดยใช้เลขรุ่นเดิม
6. บันทึกผล actual installed app, กล้องจริง, เครื่องพิมพ์จริง และการใช้งานต่อเนื่องแยกจาก automated tests

## ข้อควรรู้สำหรับเครื่องมือ

- ใช้ PowerShell `login: false` เพื่อไม่โหลด profile ที่มีคำสั่งไม่ถูกต้องและอาจพิมพ์ข้อมูลไม่จำเป็น
- `node` ใน PATH ชี้ `C:\Windows\System32\node` ซึ่งเป็นตัวที่ไม่รัน JavaScript ตามต้องการ ใช้ `C:\Program Files\nodejs\node.exe` โดยตรง หรือ npm.cmd ซึ่งเรียก Node ตัวจริง
- PowerShell รุ่นนี้ทำให้ quoting ของ `node -e` เสียได้ ใช้ไฟล์ .cjs/.mjs ชั่วคราวที่มีเนื้อหาตรวจสอบได้แทน
- staging build รอบก่อนอ่าน `.env.staging` ด้วย dotenv จาก `C:\KOKOwedding\node_modules\dotenv`; ส่งเข้า child build เฉพาะ STUDIO_WEB_ORIGIN และ STUDIO_TRUSTED_PUBLIC_KEYS_JSON ที่ map เป็น KOKO_LICENSE_* พร้อม KOKO_BUILD_CHANNEL=staging, KOKO_LICENSE_PRODUCT_ID=koko-photobooth, KOKO_PHOTO_PUBLIC_BASE_URL=staging origin, KOKO_FORGE_OUT_DIR=out-staging
- ห้ามพิมพ์/ฝังค่า private keys หรือ Firebase/R2 credentials จาก .env.staging
- asar package คือ `D:\pKOKO\node_modules\@electron\asar\lib\asar.js` แบบ ESM; ใช้ pathToFileURL เมื่อนำเข้าบน Windows การตรวจ bundle ต้องรวม .cjs ด้วย มิฉะนั้นจะข้าม Electron Main
- สคริปต์ชั่วคราว build-staging-temp.cjs และ verify-staging-temp.mjs ใน C:\KOKOwedding ถูกลบหลังจบรอบ 0.1.28 แล้ว

สถานะเมื่อหยุด: บันทึกแล้ว โค้ดพื้นที่ว่างยังเป็นงานระหว่างทำ ยังไม่พร้อมให้ผู้ใช้ติดตั้งเป็นรุ่นใหม่
