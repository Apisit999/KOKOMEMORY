# แผนขายซอฟต์แวร์และติดตั้ง KOKO Studio
วันที่ 11 ตุลาคม 2026

## รูปแบบเปิดตัว
เริ่มด้วย Free ราคา 0 บาท ไม่มีวันหมดอายุ ตาม Desktop 0.1.27: ถ่ายภาพ เทมเพลต และพิมพ์ในเครื่อง ไม่รวม Cloud ของ Desktop คำว่า “ทดลองฟรี” รอบแรกจึงหมายถึงเปิดให้ทดลองใช้ฟีเจอร์ Free ก่อน หากต้องการจำกัดจำนวนวันในอนาคต ต้องกำหนดแพ็กเกจ Trial และปรับ Desktop แยก เพราะ Free claim ปัจจุบันตรวจว่า expiresAt เป็น null

## ระยะ 1 — ระบบ Free ใน local
หน้าแนะนำ/ติดตั้ง, เกณฑ์เปิดดาวน์โหลด, License API บน Firestore, บัญชีและผู้ดูแล, flow รหัสเชื่อมอุปกรณ์ฝั่งเว็บ และ purchase gate อยู่ในโค้ดแล้ว ทดสอบแยกจากบัญชีและฐานข้อมูลจริง ใช้บัญชี Firebase เดิม
เกณฑ์ผ่าน: claim ซ้ำไม่ซ้ำข้อมูล, race ของสิทธิ์ถูกควบคุม, refresh หลังหมด offline grace, revoke/expiry/cross-account denial, Free cloud denial, migration ซ้ำปลอดภัย, build/lint และเบราว์เซอร์ผ่าน

## ระยะ 2 — Desktop เชื่อม staging
เลือกโฮสต์ Node และ staging Firebase/R2, ตั้ง HTTPS กับ signing key แยก, build Desktop ด้วย public key/API staging, เพิ่มหน้าจอ/IPC เชื่อมบัญชีตามเอกสาร integration
เส้นทางผู้ใช้: อ่านฟีเจอร์ → บัญชี KOKO → ดาวน์โหลดรุ่นที่ตรวจแล้ว → ติดตั้ง → รับ Free → เปิดหน้าเว็บยืนยันชื่ออุปกรณ์ → กลับ Desktop → ใช้งาน
Free แบบ installation เดิมยังทำงานได้ แม้ผู้ใช้ยังไม่ผูกบัญชี
เกณฑ์ผ่าน: ทดสอบแอปที่แพ็กจริงกับ API staging, ปิด/เปิดแอป, sample photos, export, Simulate print, booking uploader และ gallery link จริง ไม่มีการใช้ข้อมูลลูกค้า production

## ระยะ 3 — การติดตั้งและเผยแพร่ Free pilot
กำหนด Windows ที่รองรับ, ตรวจ code signing, ทดลอง clean install/upgrade/uninstall/reinstall และรักษารูป/เทมเพลต/ข้อมูลใน userData ทดสอบบนเครื่องแยกหรือ VM ที่เจ้าของจัดให้
ทำ release notes และ checksum จาก artifact จริง จัดไฟล์ดาวน์โหลดแบบ immutable ต่อเวอร์ชัน ไม่อ้าง “latest” ไปยังไฟล์ที่ยังไม่ผ่านตรวจ
เปิดปุ่มดาวน์โหลดเมื่อ checksum, production API/public key, installer lifecycle และผู้รับผิดชอบอนุมัติครบ ตัวติดตั้ง 0.1.27 ที่มีอยู่ยังไม่ผ่าน gate จึงยังไม่เผยแพร่
ช่วงแรกอัปเกรดแบบดาวน์โหลดด้วยตนเอง พร้อมสำรองข้อมูลก่อนติดตั้ง Auto-update เป็นงานภายหลัง ต้องตรวจ signed update feed, rollback และ data migration ก่อนเปิดใช้งาน
macOS ยังไม่มีปุ่มดาวน์โหลดจนผ่าน build/signing/notarization และเครื่องทดสอบ

## ระยะ 4 — เปิดขายหลัง Free pilot ผ่าน
เจ้าของเลือกแพ็กเกจ/ราคา/รอบบิล/จำนวนเครื่อง/พื้นที่และอายุภาพ รวมถึงเงื่อนไขคืนเงินและ support ไม่มีการใส่ราคาสมมติเป็นราคาขาย
ใช้ schema studioOrders/studioPaymentEvents และ adapter ของ provider ที่เลือกภายหลัง ไม่เปลี่ยนระบบ booking/3D payments โดยพลการ
flow ขาย: เลือกแพ็กเกจ → server สร้างคำสั่งซื้อจากราคา/plan version ที่เชื่อถือได้ → provider checkout → server ตรวจ webhook signature และยืนยันสถานะกับ provider → transaction บันทึก event/order และให้ entitlement ครั้งเดียว → Desktop activate/refresh
หน้า success แสดงผลอย่างเดียว ไม่ให้สิทธิ์ด้วย URL หรือข้อมูล client
งานต้องเพิ่ม: verified webhook/raw body, reconciliation, event idempotency, retry/dead letter, subscription renewal, refund/chargeback/revoke, upgrade/downgrade และหน้า admin orders/support
เกณฑ์ผ่าน: sandbox payments กับ events ซ้ำ/สลับลำดับ/refund/chargeback ให้ผลถูกต้อง จึงพิจารณาเปิดรับเงินจริง

## ข้อมูลที่ยังต้องตัดสินใจ
- โฮสต์และ URL staging สำหรับ Next.js Node runtime
- โปรเจกต์ Firebase และ R2 staging รวม booking ทดสอบ
- ผู้รับผิดชอบ signing key/code signing และเครื่องหรือ VM ทดสอบ Windows
- วันเปิด pilot และช่องทาง support
- แพ็กเกจ/ราคา/provider เมื่อพร้อมขาย

ไม่มี production deploy, เปลี่ยน DNS, เปิดรับเงินจริง หรือเผยแพร่ installer ในงานรอบนี้
