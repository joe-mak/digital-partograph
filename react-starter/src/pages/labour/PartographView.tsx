import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router";
import {
  Input,
  Button,
  Select,
  SelectItem,
  Textarea,
  Divider,
  Tooltip,
  Card,
  CardBody,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import {
  ArrowLeft,
  Save,
  Thermometer,
  Info,
  History,
  CheckCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────
interface FetalRecord { fhr: number; liquor: string; moulding: string; }
interface LabourRecord { dilation: number; descent: number; contractionFreq: number; contractionDuration: string; membrane: string; }
interface MaternalRecord { bpSystolic: number; bpDiastolic: number; pulse: number; temperature: number | null; urine: string; drugs: string; }
interface TimeSlotRecord { slotIndex: number; time: string; fetal: FetalRecord; labour: LabourRecord | null; maternal: MaternalRecord | null; }
interface Alert { level: "warning" | "danger"; message: string; }

// ── Tooltip label helper ──────────────────────────────────
function Label({ children, tip, className = "" }: { children: React.ReactNode; tip: string; className?: string }) {
  const lines = tip.split("·").map((s) => s.trim()).filter(Boolean);
  const content = lines.length > 1 ? (
    <div className="space-y-1">
      {lines.map((line, i) => <div key={i}>{line}</div>)}
    </div>
  ) : tip;
  return (
    <Tooltip content={content} placement="top" delay={200} closeDelay={0} classNames={{ content: "max-w-72 text-sm px-3 py-2" }}>
      <p className={`flex items-center gap-1.5 cursor-help ${className}`}>
        {children}
        <Info size={14} className="text-gray-400 shrink-0" />
      </p>
    </Tooltip>
  );
}

// ── Patient ───────────────────────────────────────────────
const patient = { name: "นางสาวสมหญิง ใจดี", hn: "6401234", an: "67-00451", age: 28, ga: "39+2", gravida: 1, parity: 0, admittedAt: "14:30", admittedDate: "16 มี.ค. 2569", ruptureTime: "16:00" };

// ── Initial records ───────────────────────────────────────
function createInitialRecords(): TimeSlotRecord[] {
  // Realistic G1P0 primigravida, admitted at 11:00, latent → active labour
  //                    Latent phase (slots 0-5)                          Active phase (slots 6-11)
  const fhrs =        [136, 140, 144, 138, 132, 148,                     142, 150, 136, 144, 156, 140];
  const liquors =     ["I", "I", "I", "I", "C", "C",                     "C", "C", "C", "C", "C", "M"];
  const mouldings =   ["0", "0", "0", "0", "0", "0",                     "0", "0", "+", "+", "+", "++"];
  const dilations =   [1,   null, 2,   null, 3,  null,                   4,   null, 6,   null, 7,   null] as (number | null)[];
  const descents =    [5,   null, 5,   null, 4,  null,                   4,   null, 3,   null, 2,   null] as (number | null)[];
  const cFreqs =      [1,   1,    2,   2,    2,  2,                      3,   3,    3,   4,    4,   5];
  const cDurs =       ["light","light","light","light","moderate","moderate", "moderate","moderate","moderate","strong","strong","strong"];
  const bps: [number, number][] = [
    [112, 72], [112, 72], [116, 74], [116, 74], [118, 76], [118, 76],
    [122, 78], [122, 78], [128, 82], [128, 82], [130, 84], [130, 84]
  ];
  const pulses =      [72, 72, 76, 76, 80, 80,                           84, 84, 88, 88, 92, 92];
  const temps =       [36.5, null, null, null, 36.6, null,                36.8, null, null, null, 37.0, null] as (number | null)[];
  const urines =      ["normal","normal","normal","normal","normal","normal", "normal","normal","normal","normal","protein","protein"];
  const drugs =       ["", "", "", "", "", "",                             "", "", "Synto 5U/NSS 1000ml 8dpm", "", "Synto ↑12dpm", ""];
  return fhrs.map((fhr, i) => {
    const totalMin = 30 + i * 30; const h = 11 + Math.floor(totalMin / 60); const m = totalMin % 60;
    const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const isH = i % 2 === 0;
    return { slotIndex: i, time, fetal: { fhr, liquor: liquors[i], moulding: mouldings[i] },
      labour: isH ? { dilation: dilations[i]!, descent: descents[i]!, contractionFreq: cFreqs[i], contractionDuration: cDurs[i], membrane: i < 8 ? "intact" : "spontaneous" } : null,
      maternal: isH ? { bpSystolic: bps[i][0], bpDiastolic: bps[i][1], pulse: pulses[i], temperature: temps[i] as number | null, urine: urines[i], drugs: drugs[i] } : null };
  });
}
function addMinutes(t: string, min: number): string { const [h, m] = t.split(":").map(Number); const tot = h * 60 + m + min; return `${String(Math.floor(tot / 60) % 24).padStart(2, "0")}:${String(tot % 60).padStart(2, "0")}`; }

// ── Alert Engine ──────────────────────────────────────────
function computeAlerts(records: TimeSlotRecord[]): Alert[] {
  const a: Alert[] = []; if (!records.length) return a;
  const lf = records[records.length - 1].fetal;
  if (lf.fhr < 110) a.push({ level: "danger", message: `FHR ต่ำ (${lf.fhr}) — Fetal Distress` });
  else if (lf.fhr > 160) a.push({ level: "danger", message: `FHR สูง (${lf.fhr}) — Tachycardia` });
  if (lf.liquor === "M") a.push({ level: "warning", message: "Meconium ในน้ำคร่ำ" });
  if (lf.liquor === "B") a.push({ level: "danger", message: "เลือดในน้ำคร่ำ" });
  const lr = records.filter((r) => r.labour);
  // Latent phase > 8 hrs warning
  if (lr.length >= 2) {
    const firstRec = lr[0], lastRec = lr[lr.length - 1];
    const activeStart = lr.find((r) => r.labour!.dilation >= 4);
    if (!activeStart && lastRec.labour!.dilation < 4) {
      const latentHrs = (lastRec.slotIndex - firstRec.slotIndex) / 2;
      if (latentHrs > 4) a.push({ level: "danger", message: `Latent phase นานเกิน 4 ชม. (${latentHrs.toFixed(1)} ชม.) — ต้องประเมินซ้ำ` });
      else if (latentHrs > 3) a.push({ level: "warning", message: `Latent phase ${latentHrs.toFixed(1)} ชม. — ใกล้ครบ 4 ชม.` });
    }
  }
  // Active phase alert/action lines
  if (lr.length >= 2) { const activeStart = lr.find((r) => r.labour!.dilation >= 4); const l = lr[lr.length - 1];
    if (activeStart && l.labour!.dilation >= 4) { const hrs = (l.slotIndex - activeStart.slotIndex) / 2;
      if (hrs > 0) { const def = activeStart.labour!.dilation + hrs - l.labour!.dilation;
        if (def > 0 && def <= 4) a.push({ level: "warning", message: `ข้ามเส้นเตือน — ช้า ${def.toFixed(1)} ซม.` });
        if (def > 4) a.push({ level: "danger", message: "ข้ามเส้นดำเนินการ — ต้องแทรกแซง" }); } } }
  const lm = [...records].reverse().find((r) => r.maternal)?.maternal;
  if (lm) { if (lm.bpSystolic >= 140 || lm.bpDiastolic >= 90) a.push({ level: "warning", message: `ความดันสูง (${lm.bpSystolic}/${lm.bpDiastolic})` });
    if (lm.temperature && lm.temperature >= 38) a.push({ level: "warning", message: `ไข้ (${lm.temperature}°C)` }); }
  return a;
}

// ── SVG Constants — matching paper proportions ────────────
const COLS = 24; const W = 960; const LBL = 100; const RR = 10; const GW = W - LBL - RR; const CW = GW / COLS;
function cx(h: number) { return LBL + h * CW; }
function cxSlot(s: number) { return LBL + (s / 2) * CW; }

function Grid({ y, h, rows }: { y: number; h: number; rows: number }) {
  const rh = h / rows;
  return (<g>
    {Array.from({ length: rows + 1 }, (_, i) => <line key={`h${i}`} x1={LBL} y1={y + i * rh} x2={W - RR} y2={y + i * rh} stroke="#000" strokeWidth={0.5} />)}
    {Array.from({ length: COLS + 1 }, (_, i) => <line key={`v${i}`} x1={cx(i)} y1={y} x2={cx(i)} y2={y + h} stroke="#000" strokeWidth={i % 2 === 0 ? 0.8 : 0.4} />)}
  </g>);
}
function TextRow({ y, h, label, sublabel, tooltip }: { y: number; h: number; label: string; sublabel?: string; tooltip?: string }) {
  return (<g>
    <line x1={LBL} y1={y} x2={W - RR} y2={y} stroke="#000" strokeWidth={0.8} />
    <line x1={LBL} y1={y + h} x2={W - RR} y2={y + h} stroke="#000" strokeWidth={0.8} />
    {Array.from({ length: COLS + 1 }, (_, i) => <line key={i} x1={cx(i)} y1={y} x2={cx(i)} y2={y + h} stroke="#000" strokeWidth={0.4} />)}
    <g style={tooltip ? { cursor: "help" } : undefined}>
      {tooltip && <><title>{tooltip}</title><rect x={4} y={y} width={LBL - 8} height={h} fill="transparent" /></>}
      <text x={LBL - 4} y={y + (sublabel ? h / 2 - 2 : h / 2 + 4)} textAnchor="end" fontSize={9} fill="#000">{label}</text>
      {sublabel && <text x={LBL - 4} y={y + h / 2 + 10} textAnchor="end" fontSize={8} fill="#000">{sublabel}</text>}
    </g>
  </g>);
}

// ══════════════════════════════════════════════════════════
// PARTOGRAPH SVG
// ══════════════════════════════════════════════════════════
// ── Determine labour status relative to alert/action lines ─
type LabourStatus = "normal" | "alert" | "action";
function getLabourStatus(records: TimeSlotRecord[]): LabourStatus {
  const labRecs = records.filter((r) => r.labour);
  if (labRecs.length < 2) return "normal";
  const first = labRecs[0], last = labRecs[labRecs.length - 1];
  const hrs = (last.slotIndex - first.slotIndex) / 2;
  if (hrs <= 0 || first.labour!.dilation < 4) return "normal";
  const expected = first.labour!.dilation + hrs;
  const deficit = expected - last.labour!.dilation;
  if (deficit > 4) return "action";
  if (deficit > 0) return "alert";
  return "normal";
}

const LABOUR_STATUS_CONFIG = {
  normal: { color: "#16a34a", bg: "bg-green-50", border: "border-green-500", text: "text-green-800", label: "ปกติ — Normal Progress", thLabel: "การคลอดดำเนินไปตามเกณฑ์" },
  alert: { color: "#d97706", bg: "bg-amber-50", border: "border-amber-500", text: "text-amber-800", label: "เฝ้าระวัง — Crossing Alert Line", thLabel: "การคลอดเริ่มล่าช้า ต้องประเมินซ้ำ" },
  action: { color: "#dc2626", bg: "bg-red-50", border: "border-red-600", text: "text-red-800", label: "วิกฤต — Crossing Action Line", thLabel: "ต้องทำหัตถการทันที!" },
};

interface PreviewData {
  slotIndex: number; fhr: number | null; liquor: string; moulding: string;
  dilation: number | null; descent: number | null;
  contractionFreq: number | null; contractionDuration: string | null;
  bpSystolic: number | null; bpDiastolic: number | null; pulse: number | null;
}

function PartographSVG({ records, hoveredCol, onColHover, onDilationClick, tooltipPoint, onPointClick, nextSlotIndex, preview, showNowLine }: {
  records: TimeSlotRecord[]; hoveredCol: number | null; onColHover: (c: number | null) => void;
  onDilationClick: (cm: number) => void; tooltipPoint: number | null; onPointClick: (i: number | null) => void; nextSlotIndex: number;
  preview: PreviewData | null; showNowLine: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  // FHR section: 80-200, 12 rows
  const fY = 10, fH = 156, fRH = fH / 12, fMin = 80, fMax = 200;
  const yF = (b: number) => fY + fH - ((b - fMin) / (fMax - fMin)) * fH;
  // Liquor + Moulding rows
  const lqY = fY + fH, lqH = 18, moY = lqY + lqH, moH = 18;
  // Cervix: 0-10, 10 rows
  const cGap = 6, cY = moY + moH + cGap, cH = 280, cRH = cH / 10;
  const yC = (cm: number) => cY + cH - cm * cRH;
  const yD = (fi: number) => cY + cH - fi * cRH; // descent fifths on same scale
  // Time row
  const tY = cY + cH, tH = 50;
  // Contractions: 5 rows
  const coGap = 6, coY = tY + tH + coGap, coH = 100, coRH = coH / 5;
  // Oxytocin
  const oxY = coY + coH, oxH = 28;
  // Drugs
  const drY = oxY + oxH, drH = 36;
  // Pulse & BP: 60-180, 12 rows
  const vGap = 4, vY = drY + drH + vGap, vH = 156, vRH = vH / 12, vMin = 60, vMax = 180;
  const yV = (v: number) => vY + vH - ((v - vMin) / (vMax - vMin)) * vH;
  // Temp
  const tmY = vY + vH, tmH = 20;
  // Urine: 3 sub-rows
  const uY = tmY + tmH, uRH = 16, uH = uRH * 3;
  const totalH = uY + uH + 2;

  const labRecs = records.filter((r) => r.labour);
  // First record in active phase (dilation >= 4) — used for Alert/Action lines
  // Alert/Action lines start at the 4-hour latent phase limit
  const firstLabSlot = labRecs.length > 0 ? labRecs[0].slotIndex : 0;
  const latent8Slot = firstLabSlot + 8; // 4 hrs = 8 half-hour slots
  const alX = cx(latent8Slot / 2); // align to grid line, not data point offset

  const contrPerSlot = useMemo(() => {
    const res: { freq: number; type: string }[] = []; let lf = 0, lt = "light";
    for (const r of records) { if (r.labour) { lf = r.labour.contractionFreq; lt = r.labour.contractionDuration; } res.push({ freq: lf, type: lt }); }
    return res;
  }, [records]);

  const handleCervixClick = (e: React.MouseEvent<SVGRectElement>) => {
    const svg = svgRef.current; if (!svg) return;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const sp = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const cm = Math.round(((cY + cH - sp.y) / cRH) * 2) / 2;
    if (cm >= 0 && cm <= 10) onDilationClick(cm);
  };

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${totalH}`} className="w-full block bg-white" style={{ minWidth: 780 }}>
      {/* ═══ FHR ═══ */}
      <Grid y={fY} h={fH} rows={12} />
      <line x1={LBL} y1={yF(180)} x2={W - RR} y2={yF(180)} stroke="#000" strokeWidth={2.5} />
      <line x1={LBL} y1={yF(100)} x2={W - RR} y2={yF(100)} stroke="#000" strokeWidth={2.5} />
      {Array.from({ length: 13 }, (_, i) => <text key={i} x={LBL - 4} y={fY + i * fRH + 4} textAnchor="end" fontSize={9} fill="#000">{fMax - i * 10}</text>)}
      <g style={{ cursor: "help" }}>
        <title>{"อัตราการเต้นหัวใจทารก (Fetal Heart Rate)\nปกติ 110-160 ครั้ง/นาที\n< 110 = Bradycardia (ช้าผิดปกติ)\n> 160 = Tachycardia (เร็วผิดปกติ)\nบันทึกทุก 30 นาที"}</title>
        <rect x={4} y={fY} width={LBL - 8} height={fH} fill="transparent" />
        <text x={14} y={fY + fH / 2 - 16} fontSize={9} fill="#000" fontWeight={700}>Fetal</text>
        <text x={14} y={fY + fH / 2 - 4} fontSize={9} fill="#000" fontWeight={700}>Heart</text>
        <text x={14} y={fY + fH / 2 + 8} fontSize={9} fill="#000" fontWeight={700}>Rate</text>
        <text x={14} y={fY + fH / 2 + 20} fontSize={7} fill="#555">(bpm)</text>
      </g>
      {records.length > 1 && <polyline points={records.map((r) => `${cxSlot(r.slotIndex) + CW / 4},${yF(r.fetal.fhr)}`).join(" ")} fill="none" stroke="#000" strokeWidth={1.5} />}
      {records.map((r, i) => { const px = cxSlot(r.slotIndex) + CW / 4, py = yF(r.fetal.fhr); const abnormal = r.fetal.fhr < 110 || r.fetal.fhr > 160; return (
        <g key={i} style={{ cursor: "pointer" }} onClick={() => onPointClick(tooltipPoint === i ? null : i)}>
          <title>{`${r.time} — FHR: ${r.fetal.fhr} bpm${abnormal ? " ⚠ ผิดปกติ" : " ปกติ"}`}</title>
          <circle cx={px} cy={py} r={10} fill="transparent" /><circle cx={px} cy={py} r={3} fill={abnormal ? "#dc2626" : "#000"} />
        </g>); })}
      {/* FHR legend — bottom-right */}
      <g opacity={1}>
        <circle cx={W - RR - 200} cy={fY + fH - 18} r={4} fill="#000" />
        <text x={W - RR - 190} y={fY + fH - 13} fontSize={11} fill="#000" fontWeight={500}>FHR · ปกติ 110-160 bpm</text>
      </g>

      {/* ═══ Liquor ═══ */}
      <TextRow y={lqY} h={lqH} label="Liquor" tooltip={"น้ำคร่ำ (Liquor / Amniotic Fluid)\nC = ใส (Clear) — ปกติ\nI = ถุงน้ำคร่ำยังไม่แตก (Intact)\nM = มีขี้เทาปน (Meconium) — ผิดปกติ\nB = มีเลือดปน (Blood)\nA = ไม่มีน้ำคร่ำ (Absent)"} />
      {records.map((r, i) => { const lqMap: Record<string, string> = { C: "ใส (Clear)", I: "ถุงไม่แตก (Intact)", M: "ขี้เทา (Meconium)", B: "เลือด (Blood)", A: "ไม่มี (Absent)" }; return (
        <text key={i} x={cxSlot(r.slotIndex) + CW / 4} y={lqY + 13} textAnchor="middle" fontSize={10} fontWeight={700} fill={r.fetal.liquor === "M" || r.fetal.liquor === "B" ? "#dc2626" : "#000"} style={{ cursor: "default" }}>
          <title>{`${r.time} — น้ำคร่ำ: ${lqMap[r.fetal.liquor] || r.fetal.liquor}`}</title>
          {r.fetal.liquor}
        </text>); })}
      {/* Liquor legend — bottom-right */}
      <text x={W - RR - 4} y={lqY + 14} textAnchor="end" fontSize={10} fill="#000" fontWeight={500}>C=ใส I=ถุงไม่แตก M=ขี้เทา B=เลือด A=ไม่มี</text>

      {/* ═══ Moulding ═══ */}
      <TextRow y={moY} h={moH} label="Moulding" tooltip={"การซ้อนของกะโหลกศีรษะทารก (Moulding)\n0 = กะโหลกแยกกัน ไม่ซ้อน\n+ = กะโหลกชนกัน แต่ไม่ซ้อน\n++ = กะโหลกซ้อนทับกัน แยกได้\n+++ = กะโหลกซ้อนทับมาก แยกไม่ได้ — อันตราย"} />
      {records.map((r, i) => { const moMap: Record<string, string> = { "0": "ไม่ซ้อน", "+": "ซ้อนเล็กน้อย", "++": "ซ้อนปานกลาง", "+++": "ซ้อนมาก" }; return (
        <text key={i} x={cxSlot(r.slotIndex) + CW / 4} y={moY + 13} textAnchor="middle" fontSize={10} fontWeight={700} fill={r.fetal.moulding === "+++" ? "#dc2626" : "#000"} style={{ cursor: "default" }}>
          <title>{`${r.time} — กะโหลกซ้อน: ${moMap[r.fetal.moulding] || r.fetal.moulding}`}</title>
          {r.fetal.moulding}
        </text>); })}
      {/* Moulding legend — bottom-right */}
      <text x={W - RR - 4} y={moY + 14} textAnchor="end" fontSize={10} fill="#000" fontWeight={500}>0=ไม่ซ้อน +=เล็กน้อย ++=ปานกลาง +++=มาก</text>

      {/* ═══ Cervix + Descent ═══ */}
      <Grid y={cY} h={cH} rows={10} />
      <rect x={LBL} y={cY} width={GW} height={cH} fill="transparent" style={{ cursor: "crosshair" }} onClick={handleCervixClick} />
      {Array.from({ length: 11 }, (_, i) => <text key={i} x={LBL - 4} y={yC(i) + 4} textAnchor="end" fontSize={10} fill="#000" fontWeight={i === 4 ? 700 : 400}>{i}</text>)}

      {/* Latent Phase shading (0-4 cm) */}
      {(() => {
        const firstLabRec = labRecs[0];
        const latent8Slot = firstLabRec ? firstLabRec.slotIndex + 8 : 8; // 4 hrs = 8 half-hour slots
        const latent8X = cxSlot(Math.min(latent8Slot, COLS * 2 - 1));
        return (<>
          {/* Normal latent zone (up to 4 hrs) */}
          <rect x={LBL} y={yC(4)} width={Math.min(latent8X - LBL, GW)} height={yC(0) - yC(4)} fill="#e0e7ff" opacity={0.25} />
          {/* Overdue latent zone (after 4 hrs) — red tint */}
          {latent8Slot < COLS * 2 && (
            <rect x={latent8X} y={yC(4)} width={W - RR - latent8X} height={yC(0) - yC(4)} fill="#fecaca" opacity={0.2} />
          )}
          {/* 8-hour limit line */}
          {latent8Slot < COLS * 2 && (<>
            <line x1={latent8X} y1={yC(4)} x2={latent8X} y2={yC(0)} stroke="#4f46e5" strokeWidth={1.5} strokeDasharray="6 3" />
            <text x={latent8X + 3} y={yC(0) - 4} fontSize={8} fill="#4f46e5" fontWeight={700}>4 ชม.</text>
          </>)}
        </>);
      })()}
      {/* Latent / Active phase divider at 4 cm */}
      <line x1={LBL} y1={yC(4)} x2={W - RR} y2={yC(4)} stroke="#000" strokeWidth={2} strokeDasharray="8 4" />
      {/* Phase labels */}
      <text x={14} y={cY + cH * 0.08} fontSize={9} fill="#000" fontWeight={700}>Active</text>
      <text x={14} y={cY + cH * 0.14} fontSize={9} fill="#000" fontWeight={700}>Phase</text>
      <text x={14} y={cY + cH * 0.20} fontSize={8} fill="#000">≥4 cm</text>

      <text x={14} y={cY + cH * 0.68} fontSize={9} fill="#4f46e5" fontWeight={700}>Latent</text>
      <text x={14} y={cY + cH * 0.74} fontSize={9} fill="#4f46e5" fontWeight={700}>Phase</text>
      <text x={14} y={cY + cH * 0.80} fontSize={8} fill="#4f46e5">0-4 cm</text>
      <text x={14} y={cY + cH * 0.86} fontSize={7} fill="#4f46e5">≤4 ชม.</text>

      <g style={{ cursor: "help" }}>
        <title>{"ปากมดลูก (Cervical Dilatation)\nPlot ด้วยเครื่องหมาย X\n\nLatent Phase (ระยะปากมดลูกเปิดช้า) = 0-4 cm\n- มดลูกหดตัวไม่สม่ำเสมอ\n- ใช้เวลาได้ถึง 4 ชม.\n\nActive Phase (ระยะปากมดลูกเปิดเร็ว) = 4-10 cm\n- อัตราปกติ ≥1 cm/ชม.\n- เส้น Alert/Action เริ่มนับจากจุดนี้\n\nคลิกบนกราฟเพื่อกำหนดค่าได้โดยตรง"}</title>
        <rect x={4} y={cY + cH * 0.22} width={LBL - 8} height={cH * 0.25} fill="transparent" />
        <text x={14} y={cY + cH * 0.30} fontSize={9} fill="#000">Cervix (cm)</text>
        <text x={14} y={cY + cH * 0.36} fontSize={8} fill="#000">[Plot X]</text>
      </g>
      <g style={{ cursor: "help" }}>
        <title>{"ศีรษะทารก (Descent of Head)\nPlot ด้วยเครื่องหมาย O\nวัดโดยคลำหน้าท้องเหนือหัวหน่าว\n5/5 = ศีรษะยังไม่ลง\n3/5 = ศีรษะลงมาครึ่งทาง\n0/5 = ศีรษะลงสู่อุ้งเชิงกรานหมดแล้ว\nควรลดลงตามเวลาที่ปากมดลูกเปิดขึ้น"}</title>
        <rect x={4} y={cY + cH * 0.45} width={LBL - 8} height={cH * 0.2} fill="transparent" />
        <text x={14} y={cY + cH * 0.50} fontSize={9} fill="#000">Descent</text>
        <text x={14} y={cY + cH * 0.57} fontSize={9} fill="#000">of head</text>
        <text x={14} y={cY + cH * 0.63} fontSize={8} fill="#000">[Plot O]</text>
      </g>

      {/* Zone shading between Alert and Action lines */}
      {labRecs.length > 0 && (() => {
        const startDil = 4; // Alert/Action always start from 4cm at the 8-hour line
        const hrsTo10 = 10 - startDil; // hours for alert line to reach 10cm at 1cm/hr
        const act = alX + 4 * CW; // Action line starts 4 hours (4 cells) to the right
        const alEnd = alX + hrsTo10 * CW; // Alert line end x
        const actEnd = act + hrsTo10 * CW; // Action line end x
        const clamp = (v: number) => Math.min(v, cx(COLS));
        return (<>
          {/* Yellow zone: between Alert and Action lines */}
          <polygon
            points={`${alX},${yC(startDil)} ${clamp(alEnd)},${yC(10)} ${clamp(actEnd)},${yC(10)} ${clamp(act)},${yC(startDil)}`}
            fill="#d97706" opacity={0.08}
          />
          {/* Red zone: right of Action line */}
          <polygon
            points={`${clamp(act)},${yC(startDil)} ${clamp(actEnd)},${yC(10)} ${cx(COLS)},${yC(10)} ${cx(COLS)},${yC(startDil)}`}
            fill="#dc2626" opacity={0.08}
          />

          {/* Alert line */}
          <line x1={alX} y1={yC(startDil)} x2={clamp(alEnd)} y2={yC(10)} stroke="#d97706" strokeWidth={2.5} />
          <g style={{ cursor: "help" }}>
            <title>{`เส้นเฝ้าระวัง (Alert Line)\nอัตราการเปิดปากมดลูก 1 cm/ชม.\nเริ่มจาก ${startDil} cm ถึง 10 cm\nถ้ากราฟตัดเส้นนี้ = การคลอดเริ่มล่าช้า\nต้องประเมินซ้ำและเตรียมส่งต่อ`}</title>
            <text x={(alX + clamp(alEnd)) / 2} y={yC(startDil + hrsTo10 / 2) - 6} fontSize={12} fill="#d97706" fontWeight={700} fontStyle="italic" transform={`rotate(-45,${(alX + clamp(alEnd)) / 2},${yC(startDil + hrsTo10 / 2) - 6})`}>Alert</text>
          </g>

          {/* Action line — 4 hours to the right of Alert */}
          <line x1={clamp(act)} y1={yC(startDil)} x2={clamp(actEnd)} y2={yC(10)} stroke="#dc2626" strokeWidth={2.5} />
          <g style={{ cursor: "help" }}>
            <title>{"เส้นอันตราย (Action Line)\nขนานกับ Alert Line ห่างไปทางขวา 4 ชม.\nถ้ากราฟตัดเส้นนี้ = วิกฤต!\nต้องทำหัตถการทันที:\n- เจาะถุงน้ำคร่ำ (ARM)\n- ให้ Oxytocin เร่งคลอด\n- ผ่าตัดคลอด (C/S)"}</title>
            <text x={(clamp(act) + clamp(actEnd)) / 2} y={yC(startDil + hrsTo10 / 2) - 6} fontSize={12} fill="#dc2626" fontWeight={700} fontStyle="italic" transform={`rotate(-45,${(clamp(act) + clamp(actEnd)) / 2},${yC(startDil + hrsTo10 / 2) - 6})`}>Action</text>
          </g>
        </>);
      })()}

      {/* Dilation X — color-coded per segment based on position vs alert/action */}
      {(() => {
        // Find the first record where dilation >= 4 (active phase start)
        const activeStart = labRecs.find((r) => r.labour!.dilation >= 4);
        return (<>
          {labRecs.length > 1 && labRecs.map((r, i) => {
            if (i === 0) return null;
            const prev = labRecs[i - 1];
            const px1 = cxSlot(prev.slotIndex) + CW / 4, py1 = yC(prev.labour!.dilation);
            const px2 = cxSlot(r.slotIndex) + CW / 4, py2 = yC(r.labour!.dilation);
            // Latent phase = indigo, Active phase = green/amber/red
            let segColor = "#4f46e5"; // indigo = latent phase
            if (r.labour!.dilation >= 4 && activeStart) {
              segColor = "#16a34a"; // green = normal active
              const hrs = (r.slotIndex - activeStart.slotIndex) / 2;
              const expected = activeStart.labour!.dilation + hrs;
              const deficit = expected - r.labour!.dilation;
              if (deficit > 4) segColor = "#dc2626"; // red = past action
              else if (deficit > 0) segColor = "#d97706"; // amber = past alert
            }
            return <line key={`seg-${i}`} x1={px1} y1={py1} x2={px2} y2={py2} stroke={segColor} strokeWidth={2.5} strokeLinecap="round" />;
          })}
          {labRecs.map((r, i) => {
            const px = cxSlot(r.slotIndex) + CW / 4, py = yC(r.labour!.dilation), s = 6;
            // Latent phase = indigo, Active = green/amber/red
            let ptColor = "#4f46e5"; // indigo = latent
            if (r.labour!.dilation >= 4 && activeStart) {
              ptColor = "#16a34a";
              const hrs = (r.slotIndex - activeStart.slotIndex) / 2;
              const expected = activeStart.labour!.dilation + hrs;
              const deficit = expected - r.labour!.dilation;
              if (deficit > 4) ptColor = "#dc2626";
              else if (deficit > 0) ptColor = "#d97706";
            }
            const statusTh = ptColor === "#dc2626" ? "วิกฤต — เลยเส้น Action" : ptColor === "#d97706" ? "เฝ้าระวัง — เลยเส้น Alert" : ptColor === "#4f46e5" ? "Latent Phase" : "ปกติ";
            return (
            <g key={`dx-${i}`} style={{ cursor: "pointer" }} onClick={() => onPointClick(tooltipPoint === r.slotIndex ? null : r.slotIndex)}>
              <title>{`${records.find(rec => rec.slotIndex === r.slotIndex)?.time || ""} — ปากมดลูก: ${r.labour!.dilation} cm · สถานะ: ${statusTh}`}</title>
              <circle cx={px} cy={py} r={14} fill="transparent" />
              <line x1={px - s} y1={py - s} x2={px + s} y2={py + s} stroke={ptColor} strokeWidth={2.5} strokeLinecap="round" />
              <line x1={px + s} y1={py - s} x2={px - s} y2={py + s} stroke={ptColor} strokeWidth={2.5} strokeLinecap="round" />
            </g>); })}
        </>);
      })()}

      {/* Descent O */}
      {labRecs.length > 1 && <polyline points={labRecs.map((r) => `${cxSlot(r.slotIndex) + CW / 4},${yD(r.labour!.descent)}`).join(" ")} fill="none" stroke="#000" strokeWidth={1.5} strokeDasharray="6 4" />}
      {labRecs.map((r, i) => (
        <g key={i} style={{ cursor: "default" }}>
          <title>{`${records.find(rec => rec.slotIndex === r.slotIndex)?.time || ""} — ศีรษะทารก: ${r.labour!.descent}/5 (${r.labour!.descent === 5 ? "ยังไม่ลง" : r.labour!.descent === 0 ? "ลงหมดแล้ว" : `ลง ${5 - r.labour!.descent}/5`})`}</title>
          <circle cx={cxSlot(r.slotIndex) + CW / 4} cy={yD(r.labour!.descent)} r={8} fill="transparent" />
          <circle cx={cxSlot(r.slotIndex) + CW / 4} cy={yD(r.labour!.descent)} r={5} fill="#fff" stroke="#000" strokeWidth={2} />
        </g>
      ))}
      {/* Cervix/Descent legend — bottom-right corner */}
      <g opacity={1}>
        {(() => { const rx = W - RR - 4, ly = cY + cH - 96; return (<>
          {/* X = Cervix */}
          <line x1={rx - 195} y1={ly - 5} x2={rx - 186} y2={ly + 4} stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" />
          <line x1={rx - 186} y1={ly - 5} x2={rx - 195} y2={ly + 4} stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" />
          <text x={rx - 178} y={ly + 4} fontSize={11} fill="#000" fontWeight={500}>X = ปากมดลูก (Cervix)</text>
          {/* O = Descent */}
          <circle cx={rx - 190} cy={ly + 20} r={5} fill="#fff" stroke="#000" strokeWidth={1.8} />
          <line x1={rx - 200} y1={ly + 20} x2={rx - 180} y2={ly + 20} stroke="#000" strokeWidth={1.2} strokeDasharray="4 3" />
          <text x={rx - 178} y={ly + 24} fontSize={11} fill="#000" fontWeight={500}>O = ศีรษะทารก (Descent)</text>
          {/* Latent Phase */}
          <rect x={rx - 195} y={ly + 34} width={10} height={10} fill="#e0e7ff" stroke="#4f46e5" strokeWidth={1} rx={1} />
          <text x={rx - 182} y={ly + 43} fontSize={10} fill="#4f46e5" fontWeight={600}>Latent Phase (0-4 cm, ≤4 ชม.)</text>
          {/* Zones */}
          <rect x={rx - 195} y={ly + 50} width={10} height={10} fill="#d97706" opacity={0.5} rx={1} />
          <text x={rx - 182} y={ly + 59} fontSize={10} fill="#d97706" fontWeight={500}>เฝ้าระวัง (Alert zone)</text>
          <rect x={rx - 60} y={ly + 50} width={10} height={10} fill="#dc2626" opacity={0.5} rx={1} />
          <text x={rx - 47} y={ly + 59} fontSize={10} fill="#dc2626" fontWeight={500}>วิกฤต (Action zone)</text>
          {/* Alert / Action */}
          <line x1={rx - 195} y1={ly + 76} x2={rx - 178} y2={ly + 66} stroke="#d97706" strokeWidth={2.5} />
          <text x={rx - 172} y={ly + 76} fontSize={10} fill="#d97706" fontWeight={600}>Alert (1 cm/ชม.)</text>
          <line x1={rx - 90} y1={ly + 76} x2={rx - 73} y2={ly + 66} stroke="#dc2626" strokeWidth={2.5} />
          <text x={rx - 67} y={ly + 76} fontSize={10} fill="#dc2626" fontWeight={600}>Action (+4 ชม.)</text>
        </>); })()}
      </g>

      {/* ═══ Hours + Time ═══ */}
      <line x1={LBL} y1={tY} x2={W - RR} y2={tY} stroke="#000" strokeWidth={1.5} />
      <line x1={LBL} y1={tY + tH} x2={W - RR} y2={tY + tH} stroke="#000" strokeWidth={1.5} />
      <text x={LBL - 4} y={tY + 12} textAnchor="end" fontSize={9} fill="#000">Hours</text>
      <text x={LBL - 4} y={tY + 30} textAnchor="end" fontSize={9} fill="#000">Time</text>
      {Array.from({ length: COLS + 1 }, (_, i) => (<g key={i}>
        <line x1={cx(i)} y1={tY} x2={cx(i)} y2={tY + tH} stroke="#000" strokeWidth={0.5} />
        {i < COLS && <text x={cx(i) + CW / 2} y={tY + 12} textAnchor="middle" fontSize={9} fill="#000">{i + 1}</text>}
      </g>))}
      {records.map((r) => {
        const col = Math.floor(r.slotIndex / 2); // which hour column
        const half = r.slotIndex % 2; // 0=first half, 1=second half
        const tx = cx(col) + CW / 2; // center of the hour column
        const row = half; // first half on top row, second half on bottom row
        return <text key={r.slotIndex} x={tx} y={tY + 24 + row * 12} textAnchor="middle" fontSize={10} fill="#000" fontWeight={500}>{r.time}</text>;
      })}

      {/* ═══ Contractions ═══ */}
      <Grid y={coY} h={coH} rows={5} />
      <g style={{ cursor: "help" }}>
        <title>{"การหดตัวของมดลูก (Uterine Contractions)\nนับจำนวนครั้งใน 10 นาที\n\nลวดลายของช่อง:\n□ จุด = หดตัว <20 วินาที (เบา)\n□ เส้นทแยง = หดตัว 20-40 วินาที (ปานกลาง)\n■ ทึบ = หดตัว >40 วินาที (รุนแรง)\n\nActive labour ปกติ: 3-5 ครั้ง/10 นาที"}</title>
        <rect x={4} y={coY} width={LBL - 8} height={coH} fill="transparent" />
        <text x={18} y={coY + coH / 2 - 6} fontSize={9} fill="#000" fontWeight={700}>Contractions</text>
        <text x={18} y={coY + coH / 2 + 6} fontSize={9} fill="#000">per 10 mins</text>
      </g>
      {[1, 2, 3, 4, 5].map((n) => <text key={n} x={LBL - 4} y={coY + coH - (n - 0.5) * coRH + 4} textAnchor="end" fontSize={9} fill="#000">{n}</text>)}
      {contrPerSlot.map((d, si) => { const r = records[si]; if (!r) return null; const bx = cxSlot(r.slotIndex) + 2, bw = CW / 2 - 4;
        const durTh: Record<string, string> = { light: "<20 วินาที (เบา)", moderate: "20-40 วินาที (ปานกลาง)", strong: ">40 วินาที (รุนแรง)" };
        return (
          <g key={`cg${si}`} style={{ cursor: "default" }}>
            <title>{`${r.time} — หดตัว: ${d.freq} ครั้ง/10 นาที · ระยะเวลา: ${durTh[d.type] || d.type}`}</title>
            {Array.from({ length: d.freq }, (_, bi) => { const by = coY + coH - (bi + 1) * coRH + 1, bh = coRH - 2;
              const clipId = `clip-c${si}-${bi}`;
              return (
              <g key={`c${si}-${bi}`}>
                <defs><clipPath id={clipId}><rect x={bx} y={by} width={bw} height={bh} /></clipPath></defs>
                <rect x={bx} y={by} width={bw} height={bh} fill={d.type === "strong" ? "#000" : "#fff"} stroke="#000" strokeWidth={1} />
                {d.type === "moderate" && (
                  <g clipPath={`url(#${clipId})`}>
                    {Array.from({ length: Math.ceil((bw + bh) / 4) + 1 }, (_, li) => {
                      const spacing = 4;
                      const x1 = bx + li * spacing;
                      return <line key={li} x1={x1} y1={by} x2={x1 - bh} y2={by + bh} stroke="#000" strokeWidth={0.8} />;
                    })}
                  </g>
                )}
                {d.type === "light" && Array.from({ length: 3 }, (_, ri) => Array.from({ length: 3 }, (_, ci) => <circle key={`${ri}${ci}`} cx={bx + (ci + 0.5) * (bw / 3)} cy={by + (ri + 0.5) * (bh / 3)} r={1} fill="#000" />))}
              </g>); })}
          </g>); })}
      {/* Contractions legend — bottom-right corner, vertical */}
      <g opacity={1}>
        {(() => { const rx = W - RR - 4, bw = 14, bh = 12, rowH = 18;
          const ly1 = coY + coH - 3 * rowH - 4;
          return (<>
          {/* Light */}
          <rect x={rx - 130} y={ly1} width={bw} height={bh} fill="#fff" stroke="#000" strokeWidth={0.8} />
          <circle cx={rx - 126} cy={ly1 + 4} r={1} fill="#000" /><circle cx={rx - 120} cy={ly1 + 4} r={1} fill="#000" />
          <circle cx={rx - 126} cy={ly1 + 8} r={1} fill="#000" /><circle cx={rx - 120} cy={ly1 + 8} r={1} fill="#000" />
          <text x={rx - 112} y={ly1 + 10} fontSize={10} fill="#000" fontWeight={500}>{"<20วิ (เบา)"}</text>
          {/* Moderate */}
          <defs><clipPath id="clip-legend-mod"><rect x={rx - 130} y={ly1 + rowH} width={bw} height={bh} /></clipPath></defs>
          <rect x={rx - 130} y={ly1 + rowH} width={bw} height={bh} fill="#fff" stroke="#000" strokeWidth={0.8} />
          <g clipPath="url(#clip-legend-mod)">
            {Array.from({ length: Math.ceil((bw + bh) / 4) + 1 }, (_, li) => (
              <line key={li} x1={rx - 130 + li * 4} y1={ly1 + rowH} x2={rx - 130 + li * 4 - bh} y2={ly1 + rowH + bh} stroke="#000" strokeWidth={0.7} />
            ))}
          </g>
          <text x={rx - 112} y={ly1 + rowH + 10} fontSize={10} fill="#000" fontWeight={500}>20-40วิ (ปานกลาง)</text>
          {/* Strong */}
          <rect x={rx - 130} y={ly1 + rowH * 2} width={bw} height={bh} fill="#000" stroke="#000" strokeWidth={0.8} />
          <text x={rx - 112} y={ly1 + rowH * 2 + 10} fontSize={10} fill="#000" fontWeight={500}>{">40วิ (รุนแรง)"}</text>
        </>); })()}
      </g>

      {/* ═══ Oxytocin ═══ */}
      <TextRow y={oxY} h={oxH} label="Oxytocin U/L" sublabel="drops/min" tooltip={"Oxytocin (ยาเร่งคลอด)\nบันทึกความเข้มข้น (U/L) และอัตราหยด (drops/min)\nใช้เมื่อการคลอดล่าช้า\nต้องมีคำสั่งแพทย์"} />

      {/* ═══ Drugs ═══ */}
      <TextRow y={drY} h={drH} label="Drugs given" sublabel="and IV fluids" tooltip={"ยาและสารน้ำ (Drugs & IV Fluids)\nบันทึกชื่อยา ขนาด และอัตราการให้\nเช่น Oxytocin, ยาแก้ปวด, ยาปฏิชีวนะ\nรวมถึงสารน้ำทางหลอดเลือด"} />
      {records.filter((r) => r.maternal?.drugs).map((r) => <text key={r.slotIndex} x={cxSlot(r.slotIndex) + CW / 4} y={drY + 18} textAnchor="middle" fontSize={7} fill="#000">{r.maternal!.drugs}</text>)}

      {/* ═══ Pulse & BP ═══ */}
      <Grid y={vY} h={vH} rows={12} />
      {Array.from({ length: 13 }, (_, i) => <text key={i} x={LBL - 4} y={vY + i * vRH + 4} textAnchor="end" fontSize={9} fill="#000">{vMax - i * 10}</text>)}
      <g style={{ cursor: "help" }}>
        <title>{"ชีพจรและความดันโลหิตมารดา (Pulse & BP)\n\nชีพจร (•) ปกติ 60-100 ครั้ง/นาที\n\nความดัน (↕) ปกติ 90-140/60-90 mmHg\nลูกศรบน = Systolic (ตัวบน)\nลูกศรล่าง = Diastolic (ตัวล่าง)\n\n⚠ BP ≥140/90 = ความดันสูง\n⚠ BP ≤90/60 = ความดันต่ำ"}</title>
        <rect x={4} y={vY} width={LBL - 8} height={vH} fill="transparent" />
        <text x={18} y={vY + vH * 0.3} fontSize={9} fill="#000">{"Pulse •"}</text>
        <text x={18} y={vY + vH * 0.45} fontSize={9} fill="#000">and</text>
        <text x={18} y={vY + vH * 0.58} fontSize={10} fill="#000" fontWeight={700}>BP</text>
      </g>
      {/* BP arrows */}
      {records.filter((r) => r.maternal).map((r) => { const m = r.maternal!; const px = cxSlot(r.slotIndex) + CW / 4, sy = yV(m.bpSystolic), dy = yV(m.bpDiastolic);
        const bpHigh = m.bpSystolic >= 140 || m.bpDiastolic >= 90; return (
        <g key={`bp${r.slotIndex}`} style={{ cursor: "default" }}>
          <title>{`${r.time} — ความดัน: ${m.bpSystolic}/${m.bpDiastolic} mmHg${bpHigh ? " ⚠ สูง" : " ปกติ"}`}</title>
          <rect x={px - 8} y={sy - 5} width={16} height={dy - sy + 10} fill="transparent" />
          <line x1={px} y1={sy} x2={px} y2={dy} stroke={bpHigh ? "#dc2626" : "#000"} strokeWidth={1.5} />
          <polygon points={`${px},${sy - 3} ${px - 3},${sy + 3} ${px + 3},${sy + 3}`} fill={bpHigh ? "#dc2626" : "#000"} />
          <polygon points={`${px},${dy + 3} ${px - 3},${dy - 3} ${px + 3},${dy - 3}`} fill={bpHigh ? "#dc2626" : "#000"} />
        </g>); })}
      {/* Pulse dots + line */}
      {records.filter((r) => r.maternal).map((r, i, arr) => { const m = r.maternal!; const px = cxSlot(r.slotIndex) + CW / 4, py = yV(m.pulse);
        const pulseAbn = m.pulse < 60 || m.pulse > 100; return (
        <g key={`pu${r.slotIndex}`} style={{ cursor: "default" }}>
          <title>{`${r.time} — ชีพจร: ${m.pulse} bpm${pulseAbn ? " ⚠ ผิดปกติ" : " ปกติ"}`}</title>
          <circle cx={px} cy={py} r={8} fill="transparent" />
          <circle cx={px} cy={py} r={3} fill={pulseAbn ? "#dc2626" : "#000"} />
          {i > 0 && arr[i - 1].maternal && <line x1={cxSlot(arr[i - 1].slotIndex) + CW / 4} y1={yV(arr[i - 1].maternal!.pulse)} x2={px} y2={py} stroke="#000" strokeWidth={1} />}
        </g>); })}
      {/* BP/Pulse legend — bottom-right corner */}
      <g opacity={1}>
        {(() => { const rx = W - RR - 4, ly = vY + vH - 30; return (<>
          {/* BP arrow */}
          <line x1={rx - 240} y1={ly - 6} x2={rx - 240} y2={ly + 6} stroke="#000" strokeWidth={1.8} />
          <polygon points={`${rx - 240},${ly - 9} ${rx - 244},${ly - 3} ${rx - 236},${ly - 3}`} fill="#000" />
          <polygon points={`${rx - 240},${ly + 9} ${rx - 244},${ly + 3} ${rx - 236},${ly + 3}`} fill="#000" />
          <text x={rx - 228} y={ly + 4} fontSize={11} fill="#000" fontWeight={500}>↕ ความดัน (BP) ปกติ 90-140/60-90</text>
          {/* Pulse */}
          <circle cx={rx - 240} cy={ly + 22} r={4} fill="#000" />
          <line x1={rx - 250} y1={ly + 22} x2={rx - 230} y2={ly + 22} stroke="#000" strokeWidth={1.2} />
          <text x={rx - 228} y={ly + 26} fontSize={11} fill="#000" fontWeight={500}>• ชีพจร (Pulse) ปกติ 60-100 bpm</text>
        </>); })()}
      </g>

      {/* ═══ Temp ═══ */}
      <TextRow y={tmY} h={tmH} label="Temp °C" tooltip={"อุณหภูมิร่างกายมารดา (Temperature)\nปกติ 36.5-37.5°C\nวัดทุก 2 ชั่วโมง\n≥37.5°C = ไข้ อาจมีการติดเชื้อ\n≥38°C = ต้องประเมินสาเหตุทันที"} />
      {records.filter((r) => r.maternal?.temperature).map((r) => { const t = r.maternal!.temperature!; const fever = t >= 37.5; return (
        <text key={r.slotIndex} x={cxSlot(r.slotIndex) + CW / 4} y={tmY + 14} textAnchor="middle" fontSize={9} fontWeight={600} fill={fever ? "#dc2626" : "#000"} style={{ cursor: "default" }}>
          <title>{`${r.time} — อุณหภูมิ: ${t}°C${fever ? " ⚠ ไข้" : " ปกติ (36.5-37.5°C)"}`}</title>
          {t}
        </text>); })}

      {/* ═══ Urine ═══ */}
      {["protein", "acetone", "volume"].map((l, idx) => { const ry = uY + idx * uRH; return (
        <g key={l}><TextRow y={ry} h={uRH} label={l} /></g>); })}
      <g style={{ cursor: "help" }}>
        <title>{"ปัสสาวะ (Urine Output)\nProtein: ตรวจโปรตีน (ถ้าพบ อาจเป็น Preeclampsia)\nAcetone: ตรวจคีโตน (ถ้าพบ แสดงว่าขาดน้ำ/อาหาร)\nVolume: ปริมาณปัสสาวะ\nควรมีปัสสาวะ ≥30 ml/ชม."}</title>
        <rect x={4} y={uY} width={LBL - 8} height={uH} fill="transparent" />
        <text x={8} y={uY + uH / 2 + 4} fontSize={9} fill="#000">Urine</text>
      </g>

      {/* ═══ Preview of current input — pulsing ═══ */}
      {preview && (() => {
        const px = cxSlot(preview.slotIndex) + CW / 4;
        const lastRec = records[records.length - 1];
        const lastX = lastRec ? cxSlot(lastRec.slotIndex) + CW / 4 : null;
        const pulse_anim = "preview-pulse";
        return (<>
          <style>{`@keyframes ${pulse_anim} { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
          {/* FHR preview */}
          {preview.fhr && (<>
            {lastX && <line x1={lastX} y1={yF(lastRec.fetal.fhr)} x2={px} y2={yF(preview.fhr)} stroke="#0d9488" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.5} />}
            <circle cx={px} cy={yF(preview.fhr)} r={5} fill="#0d9488" style={{ animation: `${pulse_anim} 1.5s ease-in-out infinite` }} />
            <text x={px + 8} y={yF(preview.fhr) + 4} fontSize={9} fill="#0d9488" fontWeight={700}>{preview.fhr}</text>
          </>)}
          {/* Liquor preview */}
          <text x={px} y={lqY + 13} textAnchor="middle" fontSize={10} fontWeight={700} fill="#0d9488" style={{ animation: `${pulse_anim} 1.5s ease-in-out infinite` }}>{preview.liquor}</text>
          {/* Moulding preview */}
          <text x={px} y={moY + 13} textAnchor="middle" fontSize={10} fontWeight={700} fill="#0d9488" style={{ animation: `${pulse_anim} 1.5s ease-in-out infinite` }}>{preview.moulding}</text>
          {/* Dilation preview */}
          {preview.dilation != null && (() => {
            const py = yC(preview.dilation), s = 6;
            const lastLab = [...records].reverse().find((r) => r.labour);
            return (<>
              {lastLab && <line x1={cxSlot(lastLab.slotIndex) + CW / 4} y1={yC(lastLab.labour!.dilation)} x2={px} y2={py} stroke="#0d9488" strokeWidth={2} strokeDasharray="4 3" opacity={0.5} />}
              <g style={{ animation: `${pulse_anim} 1.5s ease-in-out infinite` }}>
                <line x1={px - s} y1={py - s} x2={px + s} y2={py + s} stroke="#0d9488" strokeWidth={2.5} strokeLinecap="round" />
                <line x1={px + s} y1={py - s} x2={px - s} y2={py + s} stroke="#0d9488" strokeWidth={2.5} strokeLinecap="round" />
              </g>
              <text x={px + 10} y={py + 4} fontSize={9} fill="#0d9488" fontWeight={700}>{preview.dilation} cm</text>
            </>);
          })()}
          {/* Descent preview */}
          {preview.descent != null && (() => {
            const py = yD(preview.descent);
            const lastLab = [...records].reverse().find((r) => r.labour);
            return (<>
              {lastLab && <line x1={cxSlot(lastLab.slotIndex) + CW / 4} y1={yD(lastLab.labour!.descent)} x2={px} y2={py} stroke="#0d9488" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.5} />}
              <circle cx={px} cy={py} r={5} fill="#fff" stroke="#0d9488" strokeWidth={2} style={{ animation: `${pulse_anim} 1.5s ease-in-out infinite` }} />
            </>);
          })()}
          {/* BP preview */}
          {preview.bpSystolic && preview.bpDiastolic && (
            <g style={{ animation: `${pulse_anim} 1.5s ease-in-out infinite` }}>
              <line x1={px} y1={yV(preview.bpSystolic)} x2={px} y2={yV(preview.bpDiastolic)} stroke="#0d9488" strokeWidth={1.5} />
              <polygon points={`${px},${yV(preview.bpSystolic) - 3} ${px - 3},${yV(preview.bpSystolic) + 3} ${px + 3},${yV(preview.bpSystolic) + 3}`} fill="#0d9488" />
              <polygon points={`${px},${yV(preview.bpDiastolic) + 3} ${px - 3},${yV(preview.bpDiastolic) - 3} ${px + 3},${yV(preview.bpDiastolic) - 3}`} fill="#0d9488" />
            </g>
          )}
          {/* Pulse preview */}
          {preview.pulse && (() => {
            const py = yV(preview.pulse);
            const lastMat = [...records].reverse().find((r) => r.maternal);
            return (<>
              {lastMat && <line x1={cxSlot(lastMat.slotIndex) + CW / 4} y1={yV(lastMat.maternal!.pulse)} x2={px} y2={py} stroke="#0d9488" strokeWidth={1} strokeDasharray="3 2" opacity={0.5} />}
              <circle cx={px} cy={py} r={4} fill="#0d9488" style={{ animation: `${pulse_anim} 1.5s ease-in-out infinite` }} />
            </>);
          })()}
        </>);
      })()}

      {/* ═══ Current time indicator ═══ */}
      {showNowLine && nextSlotIndex < COLS * 2 && (() => {
        const nowX = cxSlot(nextSlotIndex) + CW / 4;
        return (<g>
          <line x1={nowX} y1={0} x2={nowX} y2={totalH} stroke="#0d9488" strokeWidth={1.5} strokeDasharray="6 3" />
          <polygon points={`${nowX - 5},0 ${nowX + 5},0 ${nowX},6`} fill="#0d9488" />
        </g>);
      })()}

      {/* ═══ Interactive overlays ═══ */}
      {hoveredCol !== null && <line x1={cx(hoveredCol) + CW / 2} y1={0} x2={cx(hoveredCol) + CW / 2} y2={totalH} stroke="#0d9488" strokeWidth={1} strokeDasharray="4 3" opacity={0.4} />}
      {Array.from({ length: COLS }, (_, i) => <rect key={i} x={cx(i)} y={0} width={CW} height={totalH} fill="transparent" onMouseEnter={() => onColHover(i)} onMouseLeave={() => onColHover(null)} style={{ cursor: "crosshair" }} />)}
    </svg>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════
const LS_KEY = "partograph_records";
function loadRecords(): TimeSlotRecord[] {
  try { const s = localStorage.getItem(LS_KEY); if (s) { const parsed = JSON.parse(s); if (Array.isArray(parsed) && parsed.length > 0) return parsed; } } catch { /* ignore */ }
  return createInitialRecords();
}
function saveToLS(records: TimeSlotRecord[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(records)); } catch { /* ignore */ }
}

export default function PartographView() {
  const [records, setRecords] = useState<TimeSlotRecord[]>(loadRecords);
  const [fhr, setFhr] = useState(""); const [liquor, setLiquor] = useState("C"); const [moulding, setMoulding] = useState("0");
  const [dilation, setDilation] = useState(6); const [descent, setDescent] = useState("3");
  const [contractionFreq, setContractionFreq] = useState("3"); const [contractionDuration, setContractionDuration] = useState("moderate");
  const [bpSystolic, setBpSystolic] = useState("120"); const [bpDiastolic, setBpDiastolic] = useState("80");
  const [pulse, setPulse] = useState("80"); const [temperature, setTemperature] = useState("");
  const [urine, setUrine] = useState("normal"); const [drugNotes, setDrugNotes] = useState("");
  const [saveFlash, setSaveFlash] = useState(false);
  const [showNowLine, setShowNowLine] = useState(false);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null); const [tooltipPt, setTooltipPt] = useState<number | null>(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Persist to localStorage on every change
  useEffect(() => { saveToLS(records); }, [records]);

  const alerts = useMemo(() => computeAlerts(records), [records]);
  const labourStatus = useMemo(() => getLabourStatus(records), [records]);
  const lsConfig = LABOUR_STATUS_CONFIG[labourStatus];
  const nsi = records.length > 0 ? records[records.length - 1].slotIndex + 1 : 0;
  const nt = records.length > 0 ? addMinutes(records[records.length - 1].time, 30) : patient.admittedAt;
  const isH = nsi % 2 === 0; const el = records.length * 30;
  const [lastUndo, setLastUndo] = useState<TimeSlotRecord | null>(null);

  const doSave = useCallback((rec: TimeSlotRecord) => { setRecords((p) => [...p, rec]); setFhr(""); setLastUndo(rec); setSaveFlash(true); setTimeout(() => { setSaveFlash(false); setLastUndo(null); }, 4000); }, []);
  const handleUndo = useCallback(() => { if (lastUndo) { setRecords((p) => p.filter((r) => r !== lastUndo)); setLastUndo(null); setSaveFlash(false); } }, [lastUndo]);
  const handleSave = useCallback(() => { const v = parseInt(fhr); if (!v || v < 60 || v > 220) return;
    doSave({ slotIndex: nsi, time: nt, fetal: { fhr: v, liquor, moulding },
      labour: isH ? { dilation, descent: parseInt(descent) || 3, contractionFreq: parseInt(contractionFreq) || 3, contractionDuration: contractionDuration || "moderate", membrane: "intact" } : null,
      maternal: isH ? { bpSystolic: parseInt(bpSystolic) || 120, bpDiastolic: parseInt(bpDiastolic) || 80, pulse: parseInt(pulse) || 80, temperature: temperature ? parseFloat(temperature) : null, urine, drugs: drugNotes } : null });
  }, [fhr, liquor, moulding, dilation, descent, contractionFreq, contractionDuration, bpSystolic, bpDiastolic, pulse, temperature, urine, drugNotes, nsi, nt, isH, doSave]);

  const tpRec = tooltipPt !== null ? records.find((r) => r.slotIndex === tooltipPt) ?? records[tooltipPt] : null;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
      {/* Compact header card */}
      <Card className="shadow-sm shrink-0">
        <CardBody className="px-3 py-2 flex-row! items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/labour"><Button isIconOnly variant="light" size="sm" radius="full"><ArrowLeft size={16} /></Button></Link>
            <span className="text-sm font-bold text-gray-900">{patient.name}</span>
            <span className="text-xs text-gray-400 font-mono">HN {patient.hn}</span>
            <span className="text-xs text-gray-400 font-mono">AN {patient.an}</span>
            <span className="text-xs text-gray-500">G{patient.gravida}P{patient.parity}</span>
            <span className="text-xs text-gray-500">GA {patient.ga}</span>
            <span className="text-xs text-gray-500">Admit {patient.admittedAt} น.</span>
            <span className="text-xs text-gray-500">{Math.floor(el / 60)} ชม.</span>
            {/* Status */}
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: lsConfig.color }} />
              <span className={`text-xs font-bold ${lsConfig.text}`}>{lsConfig.label}</span>
            </div>
            {alerts.length > 0 && alerts.map((a, i) => (
              <span key={i} className={`text-xs ${a.level === "danger" ? "text-red-600 font-semibold" : "text-amber-600"}`}>{a.message}</span>
            ))}
            {saveFlash && (
              <span className="flex items-center gap-1 text-xs text-teal-600">
                <CheckCircle size={12} /> บันทึกแล้ว
                {lastUndo && <button onClick={handleUndo} className="text-red-500 font-semibold ml-1">ยกเลิก</button>}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="light" size="sm" className="text-gray-500" startContent={<History size={14} />} onPress={onOpen}>
              ประวัติ ({records.length})
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-col xl:flex-row-reverse gap-3 flex-1 min-h-0 mt-3">
        {/* Partograph */}
        <div className="xl:w-[70%] min-w-0 relative overflow-auto pb-4 scrollbar-hidden">
          <div className="border border-black overflow-x-auto overflow-y-hidden bg-white scrollbar-hidden">
            <PartographSVG records={records} hoveredCol={hoveredCol} onColHover={setHoveredCol} onDilationClick={(cm) => setDilation(cm)} tooltipPoint={tooltipPt} onPointClick={setTooltipPt} nextSlotIndex={nsi}
              preview={nsi < COLS * 2 ? {
                slotIndex: nsi,
                fhr: fhr ? parseInt(fhr) || null : null,
                liquor, moulding,
                dilation: isH ? dilation : null,
                descent: isH ? parseInt(descent) || null : null,
                contractionFreq: isH ? parseInt(contractionFreq) || null : null,
                contractionDuration: isH ? contractionDuration : null,
                bpSystolic: isH ? parseInt(bpSystolic) || null : null,
                bpDiastolic: isH ? parseInt(bpDiastolic) || null : null,
                pulse: isH ? parseInt(pulse) || null : null,
              } : null}
              showNowLine={showNowLine}
            />
          </div>

          {tpRec && (
            <div className="absolute top-2 right-2 bg-white border border-gray-400 shadow-lg rounded p-3 text-xs z-20 min-w-48">
              <div className="flex justify-between mb-1"><strong className="font-mono">{tpRec.time}</strong><button onClick={() => setTooltipPt(null)} className="text-gray-400 hover:text-black w-8 h-8 flex items-center justify-center text-lg">✕</button></div>
              <Divider className="my-1" />
              <p>FHR: <strong>{tpRec.fetal.fhr}</strong> bpm · Liquor: <strong>{tpRec.fetal.liquor}</strong> · Moulding: <strong>{tpRec.fetal.moulding}</strong></p>
              {tpRec.labour && <><Divider className="my-1" /><p>Dilation: <strong>{tpRec.labour.dilation}</strong> cm · Descent: <strong>{tpRec.labour.descent}/5</strong> · Contr: <strong>{tpRec.labour.contractionFreq}</strong>/10min</p></>}
              {tpRec.maternal && <><Divider className="my-1" /><p>BP: <strong>{tpRec.maternal.bpSystolic}/{tpRec.maternal.bpDiastolic}</strong> · Pulse: <strong>{tpRec.maternal.pulse}</strong>{tpRec.maternal.temperature ? ` · Temp: ${tpRec.maternal.temperature}°C` : ""}</p></>}
            </div>
          )}
        </div>

        {/* Data entry panel */}
        <div className="xl:w-[30%] min-w-0 flex flex-col">
          {/* Fixed header row */}
          {nsi >= COLS * 2 ? (
            <Card className="shadow-sm shrink-0">
              <CardBody className="flex flex-col items-center justify-center text-gray-400 gap-2 py-8">
                <CheckCircle size={36} />
                <p className="text-base font-semibold">ครบ 24 ชั่วโมง</p>
              </CardBody>
            </Card>
          ) : (<>
            <Card className="shadow-sm shrink-0 mb-3">
              <CardBody className="p-4 flex-row! items-center justify-between">
                <span className="text-lg font-bold text-gray-900">บันทึกข้อมูล ณ <span className="text-teal-600 font-mono">{nt} น.</span></span>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-xs text-gray-500">แสดงในกราฟ</span>
                  <button
                    onClick={() => setShowNowLine(!showNowLine)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${showNowLine ? "bg-teal-600" : "bg-gray-300"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showNowLine ? "translate-x-4" : ""}`} />
                  </button>
                </label>
              </CardBody>
            </Card>

          {/* Scrollable cards */}
          <div className="overflow-y-auto flex-1 min-h-0 space-y-3 scrollbar-hidden">

              {/* Card 1: Fetal — FHR, Liquor, Moulding */}
              <Card className="shadow-sm">
                <CardBody className="p-4 space-y-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">ข้อมูลทารก (Fetal)</p>

                  <div>
                    <Label tip="ปกติ 110-160 ครั้ง/นาที · < 110 = Bradycardia (ช้าผิดปกติ) · > 160 = Tachycardia (เร็วผิดปกติ) · บันทึกทุก 30 นาที" className="text-base font-bold text-gray-900 mb-2">อัตราการเต้นหัวใจทารก (FHR)</Label>
                    <div className="grid grid-cols-5 gap-1.5 mb-2">
                      {[120, 130, 140, 150, 160].map((v) => (
                        <button key={v} onClick={() => setFhr(String(v))}
                          className={`h-12 rounded-lg text-base font-bold border-2 transition-all active:scale-95 ${
                            fhr === String(v) ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
                          }`}>
                          {v}
                        </button>
                      ))}
                    </div>
                    <Input
                      placeholder="หรือพิมพ์ค่า FHR"
                      size="lg" type="number" value={fhr} onValueChange={setFhr}
                      inputMode="numeric"
                      classNames={{ input: "text-center text-xl font-bold", inputWrapper: "h-12" }}
                      endContent={<span className="text-sm text-gray-400">bpm</span>}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label tip="C = ใส (Clear) · I = ถุงไม่แตก (Intact) · M = ขี้เทา (Meconium) · B = เลือด (Blood) · A = ไม่มี (Absent)" className="text-base font-bold text-gray-900 mb-2">น้ำคร่ำ (Liquor)</Label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {["C", "I", "M", "B", "A"].map((k) => (
                          <button key={k} onClick={() => setLiquor(k)}
                            className={`h-12 rounded-lg text-base font-bold border-2 transition-all active:scale-95 ${
                              liquor === k ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
                            }`}>
                            {k}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label tip="0 = ไม่ซ้อน · + = ซ้อนเล็กน้อย · ++ = ปานกลาง · +++ = มาก (อันตราย)" className="text-base font-bold text-gray-900 mb-2">กะโหลกซ้อน (Moulding)</Label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {["0", "+", "++", "+++"].map((m) => (
                          <button key={m} onClick={() => setMoulding(m)}
                            className={`h-12 rounded-lg text-base font-bold border-2 transition-all active:scale-95 ${
                              moulding === m ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
                            }`}>
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Card 2: Labour — Cervix, Descent, Contractions */}
              <Card className={`shadow-sm ${!isH ? "opacity-50 pointer-events-none" : ""}`}>
                <CardBody className="p-4 space-y-4">
                  {!isH && <p className="text-xs text-amber-600 font-semibold bg-amber-50 px-3 py-1.5 rounded-lg">บันทึกรายชั่วโมง — ข้ามรอบนี้ (ทุก 30 นาที บันทึกเฉพาะ FHR)</p>}
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">ข้อมูลการคลอด (Labour)</p>

                    <div>
                      <Label tip="หน่วย cm · Latent phase 0-3 cm (≤4 ชม.) · Active phase ≥4 cm (1 cm/ชม.) · คลิกบนกราฟเพื่อกำหนดค่าได้" className="text-base font-semibold text-gray-800 mb-1.5">ปากมดลูก (Cervix)</Label>
                      <p className="text-xs text-indigo-600 font-semibold mb-1">Latent Phase (0-3 cm)</p>
                      <div className="grid grid-cols-4 gap-1.5 mb-2">
                        {[0, 1, 2, 3].map((cm) => (
                          <button key={cm} onClick={() => setDilation(cm)}
                            className={`h-12 rounded-lg text-base font-bold border-2 transition-all active:scale-95 ${
                              dilation === cm ? "bg-indigo-600 text-white border-indigo-600" : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:border-indigo-400"
                            }`}>
                            {cm}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-800 font-semibold mb-1">Active Phase (4-10 cm)</p>
                      <div className="grid grid-cols-7 gap-1.5">
                        {[4, 5, 6, 7, 8, 9, 10].map((cm) => (
                          <button key={cm} onClick={() => setDilation(cm)}
                            className={`h-12 rounded-lg text-base font-bold border-2 transition-all active:scale-95 ${
                              dilation === cm ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300"
                            }`}>
                            {cm}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label tip="คลำเหนือหัวหน่าว · 5/5 = ยังไม่ลง · 3/5 = ลงครึ่งทาง · 0/5 = ลงหมดแล้ว" className="text-base font-semibold text-gray-800 mb-1.5">ศีรษะทารก (Descent)</Label>
                      <div className="grid grid-cols-6 gap-1.5">
                        {["5", "4", "3", "2", "1", "0"].map((d) => (
                          <button key={d} onClick={() => setDescent(d)}
                            className={`h-12 rounded-lg text-base font-bold border-2 transition-all active:scale-95 ${
                              descent === d ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300"
                            }`}>
                            {d}/5
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Label tip="จำนวนครั้งใน 10 นาที" className="text-base font-semibold text-gray-800 mb-1.5">การหดตัว</Label>
                        <div className="grid grid-cols-5 gap-1.5">
                          {["1", "2", "3", "4", "5"].map((f) => (
                            <button key={f} onClick={() => setContractionFreq(f)}
                              className={`h-12 rounded-lg text-base font-bold border-2 transition-all active:scale-95 ${
                                contractionFreq === f ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300"
                              }`}>
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex-1">
                        <Label tip="ความยาวแต่ละครั้ง" className="text-base font-semibold text-gray-800 mb-1.5">ระยะเวลา</Label>
                        <div className="space-y-1.5">
                          {[{ k: "light", l: "<20 วินาที" }, { k: "moderate", l: "20-40 วินาที" }, { k: "strong", l: ">40 วินาที" }].map((o) => (
                            <button key={o.k} onClick={() => setContractionDuration(o.k)}
                              className={`w-full h-11 rounded-lg text-sm font-semibold border-2 transition-all active:scale-95 ${
                                contractionDuration === o.k ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300"
                              }`}>
                              {o.l}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>

              {/* Card 3: Maternal — BP, Pulse, Temp, Urine, Drugs */}
              <Card className={`shadow-sm ${!isH ? "opacity-50 pointer-events-none" : ""}`}>
                <CardBody className="p-4 space-y-4">
                  {!isH && <p className="text-xs text-amber-600 font-semibold bg-amber-50 px-3 py-1.5 rounded-lg">บันทึกรายชั่วโมง — ข้ามรอบนี้</p>}
                  <div className="flex items-center gap-2">
                    <Thermometer size={18} className="text-gray-500" />
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">สัญญาณชีพมารดา (Maternal)</p>
                    </div>

                    <div>
                      <Label tip="ปกติ 90-140/60-90 mmHg" className="text-sm font-semibold text-gray-700 mb-1.5">ความดันโลหิต (Blood Pressure)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input label="Systolic (ตัวบน)" size="lg" type="number" inputMode="numeric" value={bpSystolic} onValueChange={setBpSystolic} classNames={{ input: "text-lg font-bold" }} endContent={<span className="text-xs text-gray-400">mmHg</span>} />
                        <Input label="Diastolic (ตัวล่าง)" size="lg" type="number" inputMode="numeric" value={bpDiastolic} onValueChange={setBpDiastolic} classNames={{ input: "text-lg font-bold" }} endContent={<span className="text-xs text-gray-400">mmHg</span>} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label tip="ปกติ 60-100 ครั้ง/นาที" className="text-sm font-semibold text-gray-700 mb-1.5">ชีพจร (Pulse)</Label>
                        <Input size="lg" type="number" inputMode="numeric" value={pulse} onValueChange={setPulse} classNames={{ input: "text-lg font-bold" }} endContent={<span className="text-xs text-gray-400">bpm</span>} />
                      </div>
                      <div>
                        <Label tip="ปกติ 36.5-37.5°C" className="text-sm font-semibold text-gray-700 mb-1.5">อุณหภูมิ (Temp)</Label>
                        <Input size="lg" type="number" inputMode="numeric" value={temperature} onValueChange={setTemperature} classNames={{ input: "text-lg font-bold" }} endContent={<span className="text-xs text-gray-400">°C</span>} />
                      </div>
                    </div>
                    <div>
                      <Label tip="ตรวจ protein (ถ้าพบ อาจเป็น Preeclampsia) · ตรวจ acetone (ถ้าพบ แสดงว่าขาดน้ำ)" className="text-sm font-semibold text-gray-700 mb-1.5">ปัสสาวะ (Urine)</Label>
                      <Select size="lg" selectedKeys={urine ? [urine] : []}
                        onSelectionChange={(k) => { const v = Array.from(k)[0]; setUrine(v ? String(v) : ""); }}>
                        <SelectItem key="normal">ปกติ</SelectItem>
                        <SelectItem key="protein">protein +</SelectItem>
                        <SelectItem key="acetone">acetone +</SelectItem>
                      </Select>
                    </div>
                    <div>
                      <Label tip="ระบุชื่อยา ขนาด อัตราหยด" className="text-sm font-semibold text-gray-700 mb-1.5">ยา / สารน้ำ (Drugs / IV fluids)</Label>
                      <Textarea placeholder="เช่น Oxytocin 10 U in NSS 1000 ml, 15 drop/min" size="lg" minRows={2} value={drugNotes} onValueChange={setDrugNotes} />
                    </div>
                  </CardBody>
                </Card>

              {/* Bottom spacer for sticky button */}
              <div className="h-4" />
          </div>
          </>)}
          {/* Sticky save button */}
          {nsi < COLS * 2 && (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3 space-y-2 z-10">
              <Button size="lg"
                className={`w-full h-14 text-base font-bold ${fhr ? "bg-teal-600 hover:bg-teal-700 text-white" : "bg-gray-100 text-gray-400"}`}
                startContent={<Save size={20} />}
                onPress={handleSave}
                isDisabled={!fhr || parseInt(fhr) < 60 || parseInt(fhr) > 220}>
                บันทึกข้อมูล ({nt} น.)
              </Button>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="4xl" scrollBehavior="inside"><ModalContent>{(onClose) => (<>
        <ModalHeader>ประวัติ — {patient.name}</ModalHeader>
        <ModalBody><table className="w-full text-sm border-collapse"><thead><tr className="border-b-2 border-black text-left">{["#", "เวลา", "FHR", "Liq", "Mould", "Dil", "Desc", "Contr", "BP", "Pulse", "Temp"].map((h) => <th key={h} className="px-2 py-1.5 font-semibold">{h}</th>)}</tr></thead>
          <tbody>{records.map((r, i) => <tr key={i} className="border-b border-gray-200 hover:bg-gray-50"><td className="px-2 py-1 text-gray-400">{i + 1}</td><td className="px-2 py-1 font-mono font-semibold">{r.time}</td><td className={`px-2 py-1 font-semibold ${r.fetal.fhr < 110 || r.fetal.fhr > 160 ? "text-red-600" : ""}`}>{r.fetal.fhr}</td><td className="px-2 py-1">{r.fetal.liquor}</td><td className="px-2 py-1">{r.fetal.moulding}</td><td className="px-2 py-1 font-semibold">{r.labour ? r.labour.dilation : "—"}</td><td className="px-2 py-1">{r.labour ? `${r.labour.descent}/5` : "—"}</td><td className="px-2 py-1">{r.labour ? `${r.labour.contractionFreq}/${r.labour.contractionDuration.charAt(0)}` : "—"}</td><td className="px-2 py-1">{r.maternal ? `${r.maternal.bpSystolic}/${r.maternal.bpDiastolic}` : "—"}</td><td className="px-2 py-1">{r.maternal ? r.maternal.pulse : "—"}</td><td className="px-2 py-1">{r.maternal?.temperature ?? "—"}</td></tr>)}</tbody></table></ModalBody>
        <ModalFooter><Button variant="light" onPress={onClose}>ปิด</Button></ModalFooter>
      </>)}</ModalContent></Modal>
    </div>
  );
}
