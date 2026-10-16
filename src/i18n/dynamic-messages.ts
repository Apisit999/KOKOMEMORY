// Translations for labels that include an ID, count, date, or user data.
const patterns: Array<[RegExp, (...values: string[]) => string]> = [
    [/^↑ ↓ เลื่อนรายการ\s*·\s*Enter เลือก\s*·\s*Esc ปิด$/u, () => "↑ ↓ Navigate · Enter Select · Esc Close"],
    [/^ดูรูปที่ (\d+)$/u, (number) => `View image ${number}`],
    [/^เปิดรูปที่ (\d+)$/u, (number) => `Open image ${number}`],
    [/^รูปที่ (\d+)$/u, (number) => `Image ${number}`],
    [/^รูปสินค้า (\d+)$/u, (number) => `Product image ${number}`],
    [/^ลบรูป (\d+)$/u, (number) => `Delete image ${number}`],
    [/^เลื่อนรูป (\d+) ขึ้น$/u, (number) => `Move image ${number} up`],
    [/^เลื่อนรูป (\d+) ลง$/u, (number) => `Move image ${number} down`],
    [/^(\d+) - (\d+) น\.$/u, (start, end) => `${start} - ${end}`],
    [/^(\d{1,2}:\d{2}) น\.$/u, (time) => time],
    [/^ไฟล์งาน \((\d+)\)$/u, (count) => `Project files (${count})`],
    [/^(\d+) \+(\d+) รายการ$/u, (count, extra) => `${count} +${extra} items`],
    [/^(\d+) Orders เดือนนี้$/u, (count) => `${count} orders this month`],
    [/^(\d+) รายการต้องตรวจสอบเงิน$/u, (count) => `${count} payments to review`],
    [/^· (\d+) รายการ$/u, (count) => `· ${count} items`],
    [/^ดู (\d+)$/u, (count) => `View ${count}`],
    [/^ต้องการลบ Order (.+) ใช่หรือไม่\? การลบ Order ไม่สามารถย้อนกลับได้$/u, (number) => `Delete order ${number}? This action cannot be undone.`],
    [/^ลบ (.+) หรือไม่\?$/u, (name) => `Delete ${name}?`],
    [/^ไม่สามารถลบรายการจองได้ \((\d+)\)$/u, (code) => `Could not delete the booking (${code})`],
    [/^ลบรายการ (.+) เรียบร้อยแล้ว$/u, (id) => `Item ${id} deleted`],
    [/^ไม่สามารถยืนยันการชำระเงินได้ \((\d+)\)$/u, (code) => `Could not verify payment (${code})`],
    [/^ไม่สามารถปฏิเสธหลักฐานการชำระเงินได้ \((\d+)\)$/u, (code) => `Could not reject payment proof (${code})`],
    [/^ลูกค้า: (.+)$/u, (name) => `Customer: ${name}`],
    [/^ยอดที่แจ้งชำระ: (.+)$/u, (amount) => `Reported payment: ${amount}`],
    [/^ยืนยันว่าตรวจสอบการชำระเงินแล้ว\? ลูกค้า: (.+) ยอดเงิน: (.+)$/u, (name, amount) => `Confirm that the payment has been checked? Customer: ${name} Amount: ${amount}`],
    [/^KOKO Memory Booking ID: (.+) ยอดชำระ (.+) ธนาคาร: (.+)$/u, (id, amount, bank) => `KOKO Memory Booking ID: ${id} Payment: ${amount} Bank: ${bank}`],
    [/^เหตุผล: (.+)$/u, (reason) => `Reason: ${reason}`],
    [/^ต้องการลบหมวดหมู่ (.+) หรือไม่\?$/u, (name) => `Delete category ${name}?`],
    [/^(.+) ไม่ใช่ไฟล์รูปภาพที่รองรับ$/u, (name) => `${name} is not a supported image`],
    [/^(.+) มีขนาดเกิน 20MB$/u, (name) => `${name} exceeds 20 MB`],
    [/^(.+) เป็นไฟล์ว่างเปล่า$/u, (name) => `${name} is empty`],
    [/^สามารถเพิ่มรูปได้สูงสุด (\d+) รูป$/u, (count) => `You can add up to ${count} images`],
    [/^Upload รูปที่ (\d+) ไม่สำเร็จ$/u, (number) => `Could not upload image ${number}`],
    [/^Server Upload รูปที่ (\d+) สำเร็จแต่ไม่ได้ส่ง URL กลับมา$/u, (number) => `The server uploaded image ${number} but did not return a URL`],
    [/^ไฟล์ "(.+)" ไม่รองรับ หรือมีขนาดเกิน 20MB$/u, (name) => `File "${name}" is unsupported or exceeds 20 MB`],
    [/^ต้องการลบรูป "(.+)" ใช่หรือไม่\? รูปจะถูกลบออกจาก R2 ด้วย$/u, (name) => `Delete image "${name}"? It will also be removed from R2.`],
    [/^ต้องการลบ Portfolio "(.+)" ใช่หรือไม่\? ระบบจะพยายามลบรูปภาพจาก R2 ก่อนลบข้อมูล Portfolio$/u, (name) => `Delete portfolio "${name}"? The system will try to remove its images from R2 first.`],
    [/^(.+) - ผลงาน KOKO Memory$/u, (category) => `${category} - KOKO Memory portfolio`],
    [/^ผลงาน KOKO Memory (\d+)$/u, (number) => `KOKO Memory work ${number}`],
];

const months: Record<string, string> = {
    "มกราคม": "January", "กุมภาพันธ์": "February", "มีนาคม": "March", "เมษายน": "April",
    "พฤษภาคม": "May", "มิถุนายน": "June", "กรกฎาคม": "July", "สิงหาคม": "August",
    "กันยายน": "September", "ตุลาคม": "October", "พฤศจิกายน": "November", "ธันวาคม": "December",
    "ม.ค.": "Jan", "ก.พ.": "Feb", "มี.ค.": "Mar", "เม.ย.": "Apr",
    "พ.ค.": "May", "มิ.ย.": "Jun", "ก.ค.": "Jul", "ส.ค.": "Aug",
    "ก.ย.": "Sep", "ต.ค.": "Oct", "พ.ย.": "Nov", "ธ.ค.": "Dec",
};
const monthPattern = new RegExp(Object.keys(months).sort((a, b) => b.length - a.length).map((value) => value.replace(/\./gu, "\\.")).join("|"), "gu");

export function translateDynamicRaw(value: string): string | undefined {
    for (const [pattern, render] of patterns) {
        const match = value.match(pattern);
        if (match) return render(...match.slice(1));
    }
    if (monthPattern.test(value)) {
        monthPattern.lastIndex = 0;
        return value.replace(monthPattern, (month) => months[month])
            .replace(/[๐-๙]/gu, (digit) => String(digit.charCodeAt(0) - 0x0e50))
            .replace(/\b(25\d{2}|26\d{2})\b/gu, (year) => String(Number(year) - 543));
    }
    monthPattern.lastIndex = 0;
    return undefined;
}
