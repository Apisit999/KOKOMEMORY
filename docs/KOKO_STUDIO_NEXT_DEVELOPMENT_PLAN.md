# แผนพัฒนา KOKO Studio รอบถัดไป

แผนต่อเนื่องด้านความเสถียรและลำดับพัฒนาหลังเชื่อมบัญชี: [KOKO_STUDIO_STABILITY_PLAN.md](KOKO_STUDIO_STABILITY_PLAN.md) — ภาพ Desktop เวลา 19:42:09 ยืนยัน License active และเชื่อมบัญชีสำเร็จแล้ว; การเปิดแอปใหม่และทดสอบอุปกรณ์จริงยังต้องเก็บผล

จัดทำ 13 ตุลาคม 2026 จากการอ่าน source ทั้งเว็บและ Desktop โดยรอบนี้ยังไม่แก้โค้ดแอปหรือรันทดสอบใหม่

## เป้าหมายรอบนี้

ส่ง Windows staging candidate ให้เจ้าของติดตั้งและทดสอบเส้นทางนี้ได้จริง:

ติดตั้ง → เปิดจากไอคอน → รับ Free → สร้างรหัสใน Desktop → ล็อกอินเว็บและยืนยันอุปกรณ์ → Desktop รับผลสำเร็จ → เว็บแสดงสิทธิ์ → ปิด/เปิดโปรแกรมแล้วยังใช้สิทธิ์ได้

หลังเส้นทางนี้ผ่าน จึงทดสอบถ่ายภาพ เทมเพลต ส่งออก และเครื่องพิมพ์จริง ก่อนพิจารณาเผยแพร่ให้ลูกค้า

## สถานะที่ยืนยันแล้วและข้อแก้ไขจากรายงานเดิม

- เว็บอยู่ที่ https://studio-staging.kokomemory.com และใช้ Firebase staging project `koko-studio-staging-6931c`.
- Firestore Rules สำหรับ Google profile ถูก deploy สำเร็จในบทสนทนานี้ และเจ้าของยืนยันว่า Google sign-in ใช้งานได้แล้ว ข้อความในบันทึกเดิมที่ว่ายัง deploy rules ไม่ได้เป็นสถานะเก่า
- Desktop source อยู่ที่ `D:\pKOKO` และมี account-linking ใน working tree แล้ว: Main begin/poll/cancel, IPC/preload และ `src/renderer/account-link-card.tsx` รวมถึงการแสดงรหัสและเปิด browser งานนี้ยังไม่ commit จึงต้องตรวจ diff และเก็บรักษางานเดิม
- คำอธิบายก่อนหน้านี้ว่า Desktop ยังไม่มีโค้ดเชื่อมบัญชีไม่ตรงกับ working tree ปัจจุบัน ต้องแยก source ที่มีแล้วออกจาก installer ที่สร้างก่อนหน้า
- `docs/KOKO_STUDIO_DESKTOP_INTEGRATION.md` บันทึกผลตรวจ source และ local linking เดิม แต่ไม่ได้ยืนยัน installed Desktop บน staging
- `src/main/license-config.ts` อ่าน API URL/public keys จาก runtime environment; `vite.main.config.mjs` ยังไม่มีการฝังค่าพวกนี้ขณะ build การตั้ง environment เฉพาะตอนสั่ง package จึงยังไม่รับประกันว่าเปิดจากไอคอนแล้วทำงานได้
- `artifacts/releases/0.1.27/INSTALL.txt` ระบุว่า installer เดิมไม่มี production License API/public key และไม่ได้ลงนาม ไม่ใช้ artifact นี้เป็นหลักฐานว่ารุ่นเชื่อมบัญชีพร้อมแล้ว
- หน้าเว็บยังบอกข้อจำกัดของ 0.1.27 และยังไม่เปิด download การอนุญาตใช้งานรหัสบนเว็บอย่างเดียวไม่ได้ทำให้ผู้ใช้รับรหัสจากโปรแกรมได้

## ลำดับงานและเกณฑ์ผ่าน

### 1. ตรวจงาน Desktop ที่มีอยู่และจัด configuration ของรุ่นทดสอบ

งาน:
- ตรวจ diff เดิมโดยเฉพาะ runtime, Main IPC, preload และ account-link card; ตรวจการเริ่มใหม่ ยกเลิก หมดเวลา และ component lifecycle ระหว่างรอผล
- กำหนด public configuration ที่บรรจุในแอปได้สำหรับ staging API origin, product ID และ trusted public key พร้อมตรวจค่าที่จำเป็นตอน build
- บรรจุเฉพาะ public key; server signing key และ Firebase/R2 credentials อยู่ฝั่งเซิร์ฟเวอร์
- แยกชื่อ/identity และพื้นที่ข้อมูลของ staging candidate จากแอปที่ใช้กับงานจริง เพื่อไม่เขียนทับรูป เทมเพลต หรือสิทธิ์เดิม
- กำหนดหมายเลข candidate ใหม่และบันทึก source revision/configuration ที่ใช้ ไม่เขียนทับ release 0.1.27 เดิม

เกณฑ์ผ่าน: แอปที่ package แล้วเปิดจากไอคอนบนเครื่องที่ไม่ได้ตั้ง environment สามารถติดต่อ staging และตรวจลายเซ็นสิทธิ์ได้; typecheck และ tests ของ license/account-link ที่เกี่ยวข้องผ่าน

### 2. ทดสอบการเชื่อม Desktop กับเว็บ staging จนครบ

งาน:
- ตรวจ health/readiness ของ staging ใหม่ก่อนทดสอบ ไม่อาศัยผลที่บันทึกไว้เพียงอย่างเดียว
- รับ Free ใน candidate แล้วกดเชื่อมบัญชี; Desktop แสดงรหัสและเปิดหน้าเว็บถูกโดเมน
- เจ้าของล็อกอินด้วยบัญชี staging ตรวจชื่ออุปกรณ์แล้วอนุมัติ; Desktop แสดงสำเร็จและเว็บแสดงสิทธิ์ของบัญชีนั้น
- ตรวจยกเลิก รหัสหมดอายุ รหัสใช้ซ้ำ เน็ตหลุด/ลองใหม่ และการปฏิเสธการย้ายสิทธิ์ไปบัญชีอื่นโดยไม่ได้รับอนุญาต
- ตรวจปิด/เปิดแอป ใช้สิทธิ์ออฟไลน์ตามช่วงที่กำหนด และ refresh เมื่อกลับออนไลน์

เกณฑ์ผ่าน: มีหลักฐานจาก packaged app และ browser จริง พร้อมผล ownership ในบัญชีที่ถูกต้อง; การทดสอบด้วย mock หรือ local consumer เพียงอย่างเดียวยังไม่ผ่านขั้นนี้

### 3. ทำหน้าเว็บให้พาผู้ใช้ไปถึงการเชื่อมบัญชีได้

งาน:
- อัปเดตข้อความเวอร์ชันและความพร้อมจาก release metadata ให้แยก installer เดิมกับ candidate ที่รองรับ account-linking
- ระหว่างยังไม่มี candidate ให้ผู้ใช้เข้าถึงได้ แสดงข้อจำกัดและขั้นตอนที่ทำได้จริงบนหน้ากรอกรหัส
- เมื่อรุ่นทดสอบพร้อม เพิ่มคำแนะนำตามหน้าจอ Desktop จริง: รับ Free → เริ่มเชื่อมบัญชี → นำรหัสมากรอก → ตรวจชื่อเครื่อง → ยืนยัน
- แยกสถานะไม่มีสิทธิ์ที่เชื่อมออกจาก API ใช้งานไม่ได้ เพื่อให้ผู้ใช้ทราบสาเหตุและวิธีดำเนินการ

เกณฑ์ผ่าน: ผู้ทดสอบทราบว่าจะรับโปรแกรมและรหัสจากที่ใด โดยไม่ต้องเดารหัสหรือย้อนกลับไปมา; ตรวจหน้า desktop/mobile และ redirect หลัง login

### 4. สร้างและทดสอบตัวติดตั้ง Windows

งาน:
- สร้าง installer จาก revision ที่ผ่านขั้นก่อนหน้า พร้อม checksum และ release notes ที่ระบุว่าเชื่อม staging
- ทดสอบ clean install, เปิดจาก shortcut, upgrade preserving data, uninstall/reinstall และการกู้คืนข้อมูลบนเครื่องทดสอบหรือ VM
- ทดสอบภาพตัวอย่าง เทมเพลต บันทึก/เปิดแกลเลอรี ส่งออก และ Simulate print
- บันทึกสถานะ code signing และวิธีติดตั้งให้ตรงกับ artifact จริง ก่อนการเผยแพร่สาธารณะต้องผ่านเกณฑ์ release ของโปรเจกต์

เกณฑ์ผ่าน: เจ้าของติดตั้งและทำขั้นตอนหลักได้จากคู่มือ โดยไม่ต้องเปิด terminal ตั้งค่า API หรือแก้ไฟล์ภายในโปรแกรม

### 5. ทดสอบอุปกรณ์จริงและพิจารณา Free pilot

งาน:
- ระบุรุ่น Windows กล้อง วิธีเชื่อมต่อ เครื่องพิมพ์ ไดรเวอร์ และขนาดกระดาษของเครื่องเป้าหมายก่อนเริ่มขั้นนี้
- ทดสอบ preview/capture หลายรอบ เทมเพลต ตำแหน่งตัดภาพ จำนวนสำเนา และคิวพิมพ์จริง รวมกรณีอุปกรณ์หลุดแล้วเชื่อมใหม่
- ตรวจ dependency และ build ที่จะเผยแพร่จริงตามผลปัจจุบัน; บันทึกผลพร้อมข้อจำกัดที่ยังเหลือ
- จัดทำคู่มือติดตั้ง คู่มือใช้งาน และวิธีคืนรุ่น/กู้ข้อมูล แล้วนำหลักฐานมาให้เจ้าของพิจารณาเปิด Free pilot

เกณฑ์ผ่าน: หลักฐานใช้งานกับอุปกรณ์เป้าหมายจริงครบ; ผล Simulate print ไม่ใช้แทนผลเครื่องพิมพ์จริง

## ขอบเขตหลังจากรอบนี้

- แพ็กเกจเสียเงินและการชำระเงินเป็นรอบแยก ต้องกำหนดราคา/provider/เงื่อนไขก่อน
- Free รอบนี้ใช้ถ่ายภาพ เทมเพลต และพิมพ์ในเครื่อง; Desktop Cloud album ไม่อยู่ในสิทธิ์ Free
- ถ้าต้องทดสอบ booking uploader ให้ใช้ test booking กับ staging R2 ตาม runbook และเก็บผลแยกจาก account linking
- macOS และ auto-update เป็นงานภายหลัง

## สิ่งที่ต้องใช้ระหว่างดำเนินงาน

- งาน Desktop ต้องแก้ไฟล์ใน `D:\pKOKO` ซึ่งอยู่นอก writable root `C:\KOKOwedding`; ใช้การอนุมัติ filesystem ของเครื่องมือเมื่อถึงขั้นแก้ไฟล์ โดยคงงานที่ยังไม่ commit ไว้
- เจ้าของทำ Google login และยืนยันชื่ออุปกรณ์ด้วยตนเองระหว่างทดสอบจริง
- ใช้เครื่องทดสอบหรือ VM สำหรับ installer lifecycle และขอรายละเอียดอุปกรณ์เมื่อถึงขั้นทดสอบฮาร์ดแวร์
- การเผยแพร่ production และเปิด download สาธารณะต้องพิจารณาหลังมี artifact และผลตรวจครบ; แผนนี้ยังไม่เปลี่ยนสถานะ release

## ผลงานที่จะส่งให้เจ้าของ

1. Windows staging candidate ที่เปิดจากไอคอนแล้วรับ Free/เชื่อมบัญชีได้ พร้อม checksum และข้อมูล revision
2. หน้าเว็บและคู่มือที่บอกขั้นตอนตรงกับ Desktop รุ่นนั้น
3. ตารางผลทดสอบซึ่งแยก automated tests, installed-app flow และกล้อง/เครื่องพิมพ์จริง
4. รายการข้อจำกัดและข้อเสนอเปิด Free pilot จากหลักฐานที่ได้

## ความคืบหน้าการลงมือ — 13 ตุลาคม 2026

- ตรวจ diff เดิมและรักษางาน account-linking ที่ยังไม่ commit ใน `D:\pKOKO` ไว้
- แก้ `vite.main.config.mjs` ให้ฝังเฉพาะ public config ใน main bundle และตรวจ staging origin/product/public key ก่อน build
- แยก Forge installer identity, executable, AppUserModelId และ user data path สำหรับ `KOKO Studio Staging`; candidate ไม่ใช้โฟลเดอร์ข้อมูลของ KOKO Studio ปกติ
- `npm.cmd run typecheck` ผ่าน; `npm.cmd run test:license-runtime` ผ่าน 7/7; Vite/Forge staging smoke check ผ่าน
- `npm.cmd run make` สร้าง candidate ที่ `D:\pKOKO\out-staging\make\squirrel.windows\x64\KOKO Studio Staging-0.1.27 Setup.exe`; matching `.nupkg`, `RELEASES`, `SHA256SUMS.txt` และ `STAGING-TEST.txt` อยู่ข้างกัน
- Installer SHA-256: `6f1651903b0666a98d8570aa89c5c4d22ca2223f3c1db96374d9453846e7afb5`; Authenticode: `NotSigned`
- ตรวจ bundle แล้วว่ามี staging origin, public key ID, staging data directory และ UI account-linking; ไม่พบ private-key marker
- Staging health และ readiness ตอบ HTTP 200/ready ในรอบนี้

ขั้นถัดไป: เจ้าของติดตั้ง staging candidate ตาม `STAGING-TEST.txt`, ลองรับ Free และเชื่อมบัญชีบน staging แล้วส่งผลหรือ error กลับมา งานทดสอบนี้ยังไม่ผ่านจนกว่าจะยืนยันจากแอปที่ติดตั้งจริง และยังไม่มีผลกล้อง/เครื่องพิมพ์จริง

อัปเดต 13 ตุลาคม 2026: หลังเจ้าของยืนยัน License active และเชื่อมบัญชีสำเร็จจาก Desktop แล้ว สร้าง candidate 0.1.28 โดยเพิ่มการ retry account-link polling เมื่อเครือข่ายหรือ server สะดุด; automated typecheck และ License tests ผ่าน ดู [แผนเพิ่มความเสถียร](KOKO_STUDIO_STABILITY_PLAN.md) และไฟล์ `STAGING-TEST.txt` คู่กับ installer สำหรับ hash/ขั้นตอนทดสอบ Candidate ยังต้องติดตั้งจริงและทดสอบเปิดใหม่/เครือข่ายอีกครั้งก่อนถือว่าระยะ License ผ่าน
