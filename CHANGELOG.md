# บันทึกการเปลี่ยนแปลง (Changelog)

## v1.0.0 — 16 มีนาคม 2569

### เพิ่มใหม่
- สร้างระบบ Digital Partograph ตามมาตรฐาน WHO
- หน้า Dashboard พร้อม Hero Banner, Case Cards, Filter Chips
- Notification Dropdown สำหรับแจ้งเตือนผู้ป่วยวิกฤต/เฝ้าระวัง
- กราฟ Partograph ครบทุก Section (FHR, Liquor, Moulding, Cervix, Descent, Contractions, BP/Pulse, Temp, Urine)
- Latent Phase (0-4 cm, ≤4 ชม.) พร้อมเส้นจำกัดเวลาและแถบสี
- Alert Line และ Action Line เริ่มที่เส้น 4 ชม. พร้อมโซนสีเหลือง/แดง
- เส้น Dilation เปลี่ยนสีตามสถานะ (ม่วง/เขียว/ส้ม/แดง)
- Legend ใต้ทุก Section ของกราฟ
- Tooltip ภาษาไทยบนทุก Section และทุก Data Point
- เส้นเวลาปัจจุบัน พร้อมสวิตช์เปิด/ปิด
- Live Preview จุดกะพริบบนกราฟขณะกรอกข้อมูล
- แผงบันทึกข้อมูลแบบ Tap & Select แยก 3 Card (ทารก/การคลอด/มารดา)
- Tooltip คำอธิบาย (HeroUI Tooltip) ทุกหัวข้อ พร้อมไอคอน ⓘ
- ปุ่มบันทึก Sticky ด้านล่าง
- Alert Engine ตรวจจับ FHR ผิดปกติ, Meconium, Latent Phase เกินเวลา, ข้าม Alert/Action Line
- บันทึกข้อมูลลง localStorage อัตโนมัติ
- ประวัติข้อมูล (History Modal) แสดงตาราง
- หน้าสร้างเคสใหม่ (New Case)
- Mock Data 3 เคส: วิกฤต / เฝ้าระวัง / ปกติ
- ข้อมูลตัวอย่าง Partograph ที่สมจริง (Latent → Active, FHR ผันผวน, Syntocinon)

### Layout และ UX
- Top Header สีขาว พร้อม Nav Menu ตรงกลาง, User Avatar ขวา
- User Dropdown Menu (ตั้งค่า/ออกจากระบบ) แสดงเมื่อ Hover
- หน้า Partograph ไม่ Scroll ทั้งหน้า — แต่ละ Panel Scroll แยก
- ซ่อน Scrollbar ทั้งหมด
- รองรับภาษาไทยทั้งระบบ พร้อม "น." หลังเวลา
- Case Cards กดทั้ง Card เข้า Partograph ได้
- Status Banner สีทึบ (แดง/ส้ม/เขียว) บน Card Header
- Hero Banner พร้อมภาพ mother.svg และดอกไม้ประดับมุม

### Deployment
- GitHub Actions Workflow สำหรับ Deploy GitHub Pages อัตโนมัติ
- Vite config ตั้ง base path สำหรับ GitHub Pages
