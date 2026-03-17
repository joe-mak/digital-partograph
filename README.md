# Digital Partograph — ระบบติดตามการคลอดอัจฉริยะ

ระบบ Digital Partograph สำหรับห้องคลอด พัฒนาตามมาตรฐาน WHO Partograph เพื่อช่วยพยาบาลและแพทย์ติดตามความก้าวหน้าของการคลอดแบบ Real-time

## คุณสมบัติหลัก

### แดชบอร์ด (Dashboard)
- แสดงเคสผู้คลอดทั้งหมดในรูปแบบ Card พร้อมสถานะ (ปกติ / เฝ้าระวัง / วิกฤต)
- กรองเคสด้วย Filter Chips
- แจ้งเตือนผ่าน Notification Dropdown
- สร้างเคสใหม่ได้จาก Hero Banner

### Partograph (กราฟการคลอด)
- กราฟ WHO Partograph ครบทุก Section
  - อัตราการเต้นหัวใจทารก (Fetal Heart Rate)
  - น้ำคร่ำ (Liquor) และกะโหลกซ้อน (Moulding)
  - ปากมดลูก (Cervical Dilation) พร้อม Latent/Active Phase
  - ศีรษะทารก (Descent of Head)
  - การหดตัวของมดลูก (Contractions)
  - Oxytocin, ยา/สารน้ำ
  - ความดันโลหิต (BP) และชีพจร (Pulse)
  - อุณหภูมิ (Temperature) และปัสสาวะ (Urine)
- เส้น Alert Line และ Action Line พร้อมโซนสี
- Latent Phase (0-4 cm, ≤8 ชม.) พร้อมเส้นจำกัดเวลา
- เส้นสีเปลี่ยนตามสถานะ (ม่วง=Latent, เขียว=ปกติ, ส้ม=เฝ้าระวัง, แดง=วิกฤต)
- Legend ครบทุก Section
- Tooltip ภาษาไทยบนทุกจุดข้อมูล

### บันทึกข้อมูล (Data Entry)
- แผงบันทึกแบบ Tap & Select ลดการพิมพ์
- แยกเป็น 3 Card: ข้อมูลทารก / ข้อมูลการคลอด / สัญญาณชีพมารดา
- Live Preview แสดงจุดกะพริบบนกราฟขณะกรอกข้อมูล
- Tooltip คำอธิบายภาษาไทยทุกหัวข้อ
- ปุ่มบันทึก Sticky ด้านล่าง

### Alert Engine
- ตรวจจับ FHR ผิดปกติ (< 110 หรือ > 160 bpm)
- ตรวจจับ Meconium / เลือดในน้ำคร่ำ
- แจ้งเตือน Latent Phase เกิน 4 ชม.
- แจ้งเตือนเมื่อข้าม Alert Line และ Action Line
- แจ้งเตือนความดันสูง / ไข้

## เทคโนโลยี

| เทคโนโลยี | เวอร์ชัน |
|-----------|---------|
| React | 19 |
| TypeScript | 5.x |
| Vite | 7.x |
| TailwindCSS | 4.x |
| HeroUI | 2.x |
| Lucide Icons | - |

## การติดตั้ง

```bash
cd react-starter
npm install
npm run dev
```

## การ Deploy

ระบบใช้ GitHub Actions สำหรับ Deploy ไปยัง GitHub Pages อัตโนมัติเมื่อ Push ไป Branch `main`

**URL:** https://joe-mak.github.io/digital-partograph/

## โครงสร้างไฟล์

```
react-starter/src/pages/labour/
  LabourLayout.tsx      — Layout หลัก (Top Header + Content)
  LabourDashboard.tsx   — หน้า Dashboard
  PartographView.tsx    — หน้า Partograph + แผงบันทึกข้อมูล
  NewCase.tsx           — หน้าสร้างเคสใหม่
```

## ผู้พัฒนา

พัฒนาโดยใช้ Claude Code (Anthropic) ร่วมกับ UX/UI Designer
