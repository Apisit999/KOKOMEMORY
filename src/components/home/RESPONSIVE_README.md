# KOKO Memory - Responsive UI Update

ปรับ component ที่แนบมาให้รองรับมือถือ แท็บเล็ต และเดสก์ท็อปด้วย Tailwind CSS responsive utilities โดยไม่เพิ่ม library หนักที่ไม่จำเป็น

## Breakpoints ที่ใช้
- base: มือถือ
- sm: >= 640px
- md: >= 768px
- lg: >= 1024px

## หลักการ
- ลด padding และ font size บนมือถือ
- ใช้ `grid-cols-2` / `md:grid-cols-2` / `lg:grid-cols-3-4` ตามประเภทเนื้อหา
- ปุ่มบนมือถือเต็มความกว้าง และกลับเป็นขนาดตามเนื้อหาบนจอใหญ่
- Hero ใช้ `100svh` และ `min-h` เพื่อหลีกเลี่ยงปัญหา browser address bar บนมือถือ
- รูปภาพใช้ `w-full` และ `object-cover`
- หลีกเลี่ยง fixed widths ที่ทำให้เกิด horizontal scroll

## สำคัญ
HeroSection ใช้ Navbar ที่ import มาจาก `../layout/Navbar` ดังนั้นเมนูบนมือถือจะสมบูรณ์ก็ต่อเมื่อ Navbar เองมี mobile menu/responsive classes ด้วย ไฟล์ Navbar ไม่ได้อยู่ในชุดไฟล์ที่แนบมาครั้งนี้
