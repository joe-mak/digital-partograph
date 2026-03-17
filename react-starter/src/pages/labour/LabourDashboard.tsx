import { useState } from "react";
import motherPng from "../../assets/Mother.png";
import { Link } from "react-router";
import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Button,
} from "@heroui/react";
import { useRef, useEffect } from "react";
import {
  Clock,
  Heart,
  AlertTriangle,
  TrendingUp,
  Baby,
  Plus,
  Bell,
} from "lucide-react";

// ── Mock Data ──────────────────────────────────────────────

interface Patient {
  id: number;
  hn: string;
  an: string;
  name: string;
  initials: string;
  ga: string;
  gravida: number;
  parity: number;
  dilation: number;
  fhr: number;
  status: "ปกติ" | "เฝ้าระวัง" | "วิกฤต";
  timeInLabour: string;
  alert?: string;
}

const mockPatients: Patient[] = [
  {
    id: 1,
    hn: "6405678",
    an: "67-00455",
    name: "นางวิภา สุขสันต์",
    initials: "วภ",
    ga: "40+1",
    gravida: 2,
    parity: 1,
    dilation: 5,
    fhr: 98,
    status: "วิกฤต",
    timeInLabour: "9 ชม. 30 นาที",
    alert: "FHR ต่ำ 98 bpm — Fetal Bradycardia ข้ามเส้น Action Line",
  },
  {
    id: 2,
    hn: "6402345",
    an: "67-00460",
    name: "นางสาวพิมพ์ชนก รัตนากร",
    initials: "พช",
    ga: "38+5",
    gravida: 1,
    parity: 0,
    dilation: 4,
    fhr: 152,
    status: "เฝ้าระวัง",
    timeInLabour: "7 ชม. 15 นาที",
    alert: "Partograph ข้าม Alert Line — การคลอดเริ่มล่าช้า",
  },
  {
    id: 3,
    hn: "6401234",
    an: "67-00451",
    name: "นางสาวสมหญิง ใจดี",
    initials: "สญ",
    ga: "39+2",
    gravida: 1,
    parity: 0,
    dilation: 7,
    fhr: 140,
    status: "ปกติ",
    timeInLabour: "5 ชม. 45 นาที",
  },
];

// ── Helpers ─────────────────────────────────────────────────


/** Sort order: วิกฤต (0) → เฝ้าระวัง (1) → ปกติ (2) */
const statusSortOrder: Record<Patient["status"], number> = {
  วิกฤต: 0,
  เฝ้าระวัง: 1,
  ปกติ: 2,
};

/** Status dot + text label component for accessibility */
function StatusDot({ status }: { status: Patient["status"] }) {
  const colorClass =
    status === "วิกฤต"
      ? "bg-red-500 animate-pulse"
      : status === "เฝ้าระวัง"
      ? "bg-amber-500"
      : "bg-emerald-500";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
      <span className="text-xs font-medium">{status}</span>
    </span>
  );
}

function DilationBar({ value }: { value: number }) {
  const pct = (value / 10) * 100;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-teal-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-lg font-bold text-teal-700">{value}/10 ซม.</span>
    </div>
  );
}

function isFhrOutOfRange(fhr: number) {
  return fhr < 110 || fhr > 160;
}

// ── Component ───────────────────────────────────────────────

export default function LabourDashboard() {
  const criticalPatients = mockPatients.filter((p) => p.alert);
  const [notiOpen, setNotiOpen] = useState(false);
  const notiRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!notiOpen) return;
    const handler = (e: MouseEvent) => { if (notiRef.current && !notiRef.current.contains(e.target as Node)) setNotiOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notiOpen]);
  const [filter, setFilter] = useState<"ทั้งหมด" | "ปกติ" | "เฝ้าระวัง" | "วิกฤต">("ทั้งหมด");

  // Sort patients by severity: วิกฤต → เฝ้าระวัง → ปกติ
  const sortedPatients = [...mockPatients]
    .filter((p) => filter === "ทั้งหมด" || p.status === filter)
    .sort((a, b) => statusSortOrder[a.status] - statusSortOrder[b.status]);

  // Derive stat counts from mock data
  const totalCount = mockPatients.length;
  const normalCount = mockPatients.filter((p) => p.status === "ปกติ").length;
  const watchCount = mockPatients.filter((p) => p.status === "เฝ้าระวัง").length;
  const criticalCount = mockPatients.filter((p) => p.status === "วิกฤต").length;

  return (
    <div className="space-y-6">
      {/* ── Hero Section ── */}
      <div className="bg-linear-to-r from-teal-700 to-teal-600 rounded-2xl px-5 md:px-8 py-6 md:py-8 text-white relative overflow-hidden">
        {/* Mother character — offset center */}
        <img src={motherPng} alt="" className="absolute right-10 md:right-40 -top-6 h-[120%] md:h-[150%] opacity-50 md:opacity-100 pointer-events-none select-none" />
        {/* Decorative flowers — corners */}
        <svg className="absolute top-0 left-0 w-24 h-24 pointer-events-none" viewBox="0 0 100 100" opacity={0.15}>
          <circle cx="20" cy="20" r="8" fill="#0d9488" /><circle cx="12" cy="20" r="5" fill="#14b8a6" /><circle cx="28" cy="20" r="5" fill="#14b8a6" /><circle cx="20" cy="12" r="5" fill="#14b8a6" /><circle cx="20" cy="28" r="5" fill="#14b8a6" />
          <circle cx="45" cy="10" r="5" fill="#0d9488" /><circle cx="40" cy="10" r="3" fill="#14b8a6" /><circle cx="50" cy="10" r="3" fill="#14b8a6" /><circle cx="45" cy="5" r="3" fill="#14b8a6" /><circle cx="45" cy="15" r="3" fill="#14b8a6" />
          <circle cx="10" cy="45" r="5" fill="#0d9488" /><circle cx="5" cy="45" r="3" fill="#14b8a6" /><circle cx="15" cy="45" r="3" fill="#14b8a6" /><circle cx="10" cy="40" r="3" fill="#14b8a6" /><circle cx="10" cy="50" r="3" fill="#14b8a6" />
          <path d="M5 35 Q15 30 10 20" stroke="#14b8a6" strokeWidth="1" fill="none" /><path d="M35 5 Q30 15 20 10" stroke="#14b8a6" strokeWidth="1" fill="none" />
        </svg>
        <svg className="absolute top-0 right-0 w-24 h-24 pointer-events-none scale-x-[-1]" viewBox="0 0 100 100" opacity={0.15}>
          <circle cx="20" cy="20" r="8" fill="#0d9488" /><circle cx="12" cy="20" r="5" fill="#14b8a6" /><circle cx="28" cy="20" r="5" fill="#14b8a6" /><circle cx="20" cy="12" r="5" fill="#14b8a6" /><circle cx="20" cy="28" r="5" fill="#14b8a6" />
          <circle cx="45" cy="10" r="5" fill="#0d9488" /><circle cx="40" cy="10" r="3" fill="#14b8a6" /><circle cx="50" cy="10" r="3" fill="#14b8a6" /><circle cx="45" cy="5" r="3" fill="#14b8a6" /><circle cx="45" cy="15" r="3" fill="#14b8a6" />
        </svg>
        <svg className="absolute bottom-0 left-0 w-24 h-24 pointer-events-none scale-y-[-1]" viewBox="0 0 100 100" opacity={0.15}>
          <circle cx="20" cy="20" r="8" fill="#0d9488" /><circle cx="12" cy="20" r="5" fill="#14b8a6" /><circle cx="28" cy="20" r="5" fill="#14b8a6" /><circle cx="20" cy="12" r="5" fill="#14b8a6" /><circle cx="20" cy="28" r="5" fill="#14b8a6" />
          <circle cx="10" cy="45" r="5" fill="#0d9488" /><circle cx="5" cy="45" r="3" fill="#14b8a6" /><circle cx="15" cy="45" r="3" fill="#14b8a6" /><circle cx="10" cy="40" r="3" fill="#14b8a6" /><circle cx="10" cy="50" r="3" fill="#14b8a6" />
        </svg>
        <svg className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none scale-[-1]" viewBox="0 0 100 100" opacity={0.15}>
          <circle cx="20" cy="20" r="8" fill="#0d9488" /><circle cx="12" cy="20" r="5" fill="#14b8a6" /><circle cx="28" cy="20" r="5" fill="#14b8a6" /><circle cx="20" cy="12" r="5" fill="#14b8a6" /><circle cx="20" cy="28" r="5" fill="#14b8a6" />
          <circle cx="45" cy="10" r="5" fill="#0d9488" /><circle cx="40" cy="10" r="3" fill="#14b8a6" /><circle cx="50" cy="10" r="3" fill="#14b8a6" /><circle cx="45" cy="5" r="3" fill="#14b8a6" /><circle cx="45" cy="15" r="3" fill="#14b8a6" />
        </svg>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Baby size={32} />
              <h1 className="text-2xl font-bold">Digital Partograph</h1>
            </div>
            <p className="text-teal-100 text-lg mb-1">ระบบติดตามการคลอดอัจฉริยะ — Smart Labour Room</p>
            <p className="text-teal-200 text-sm flex items-center gap-2">
              <Clock size={14} />
              {new Date().toLocaleDateString("th-TH", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <Button
            as={Link}
            to="/labour/cases/new"
            size="lg"
            startContent={<Plus size={20} />}
            className="font-bold bg-white text-teal-700 hover:bg-teal-50 min-h-14 text-base px-6"
          >
            สร้างเคสใหม่
          </Button>
        </div>
      </div>


      {/* ── Active Labour Cases as Cards ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <TrendingUp size={20} className="text-teal-700" />
            <h2 className="text-xl font-bold text-gray-900">
              เคสกำลังคลอด
            </h2>
            <div className="flex items-center gap-2">
              {([
                { key: "ทั้งหมด" as const, label: `ทั้งหมด (${totalCount})`, color: "bg-teal-600" },
                { key: "วิกฤต" as const, label: `วิกฤต (${criticalCount})`, color: "bg-red-600" },
                { key: "เฝ้าระวัง" as const, label: `เฝ้าระวัง (${watchCount})`, color: "bg-amber-500" },
                { key: "ปกติ" as const, label: `ปกติ (${normalCount})`, color: "bg-teal-600" },
              ]).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    filter === f.key
                      ? `${f.color} text-white shadow-sm`
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="relative" ref={notiRef}>
            <button
              onClick={() => setNotiOpen(!notiOpen)}
              className="relative p-2.5 rounded-xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <Bell size={20} className="text-gray-600" />
              {criticalPatients.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{criticalPatients.length}</span>
              )}
            </button>
            {notiOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 lg:w-80 max-w-[90vw] bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Bell size={16} className="text-gray-600" />
                  <span className="text-sm font-bold text-gray-900">การแจ้งเตือน</span>
                  {criticalPatients.length > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{criticalPatients.length}</span>
                  )}
                </div>
                {criticalPatients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <Bell size={24} className="mb-1" />
                    <p className="text-xs">ไม่มีการแจ้งเตือน</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                    {criticalPatients.map((p) => (
                      <Link key={p.id} to={`/labour/partograph/${p.id}`} onClick={() => setNotiOpen(false)} className="block px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-gray-900 text-sm">{p.name}</span>
                          <StatusDot status={p.status} />
                        </div>
                        <p className="text-xs text-gray-500 mb-1.5">HN {p.hn} · FHR {p.fhr} bpm · Cervix {p.dilation} cm</p>
                        <p className={`text-xs font-semibold ${p.status === "วิกฤต" ? "text-red-600" : "text-amber-600"}`}>{p.alert}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedPatients.map((patient) => {
            const borderClass =
              patient.status === "วิกฤต"
                ? "border-2 border-red-600"
                : patient.status === "เฝ้าระวัง"
                ? "border-2 border-amber-500"
                : "border-2 border-teal-600";
            const headerBg =
              patient.status === "วิกฤต"
                ? "bg-red-600"
                : patient.status === "เฝ้าระวัง"
                ? "bg-amber-500"
                : "bg-teal-600";
            const chipClass =
              patient.status === "วิกฤต"
                ? "bg-white text-red-700"
                : patient.status === "เฝ้าระวัง"
                ? "bg-white text-amber-700"
                : "bg-white text-teal-700";
            return (
              <Link key={patient.id} to={`/labour/partograph/${patient.id}`} className="block">
              <Card
                className={`shadow-sm hover:shadow-lg transition-all h-full cursor-pointer overflow-hidden! ${borderClass}`}
              >
                {/* Card Header: Name + Status */}
                <CardHeader className={`${headerBg} px-6 py-4 flex items-center justify-between rounded-none`}>
                  <div>
                    <div>
                      <p className="font-bold text-white text-lg leading-tight">{patient.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-white/80 font-mono">HN {patient.hn}</span>
                        <span className="text-sm text-white/60">·</span>
                        <span className="text-sm text-white/80 font-mono">AN {patient.an}</span>
                      </div>
                    </div>
                  </div>
                  <Chip
                    size="lg"
                    className={`font-bold text-base px-3 ${chipClass}`}
                    startContent={patient.status === "วิกฤต" ? <AlertTriangle size={16} /> : undefined}
                  >
                    {patient.status}
                  </Chip>
                </CardHeader>

                {/* Card Body: Clinical Data */}
                <CardBody className="px-6 py-5 flex flex-col flex-1">
                  <div className="space-y-4 flex-1">
                  {/* Status banner */}
                  <div className={`text-sm font-semibold px-4 py-3 rounded-lg ${
                    patient.status === "วิกฤต" ? "bg-red-600/10 text-red-700"
                    : patient.status === "เฝ้าระวัง" ? "bg-amber-500/10 text-amber-700"
                    : "bg-teal-600/10 text-teal-700"
                  }`}>
                    {patient.alert || "การคลอดดำเนินไปตามปกติ"}
                  </div>

                  {/* Clinical grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">อายุครรภ์ (GA)</p>
                      <p className="text-lg font-bold text-gray-900">{patient.ga} <span className="text-base font-normal text-gray-500">สัปดาห์</span></p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">ครรภ์ / คลอด (G/P)</p>
                      <p className="text-lg font-bold text-gray-900">G{patient.gravida}P{patient.parity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">ระยะเวลาคลอด</p>
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-gray-400" />
                        <span className="text-lg font-bold text-gray-900">{patient.timeInLabour}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">อัตราหัวใจทารก (FHR)</p>
                      <div className="flex items-center gap-2">
                        <Heart size={18} className={isFhrOutOfRange(patient.fhr) ? "text-red-600" : "text-emerald-600"} />
                        <span className={`text-xl font-bold ${isFhrOutOfRange(patient.fhr) ? "text-red-600" : "text-gray-900"}`}>
                          {patient.fhr}
                        </span>
                        <span className="text-sm text-gray-400">bpm</span>
                        {isFhrOutOfRange(patient.fhr) && (
                          <span className="text-xs font-bold text-white bg-red-600 px-2 py-0.5 rounded">ผิดปกติ</span>
                        )}
                      </div>
                    </div>
                  </div>

                  </div>

                  {/* Dilation bar — pinned to bottom */}
                  <div className="mt-auto pt-4">
                    <p className="text-sm text-gray-500 mb-1.5">ปากมดลูก (Cervix)</p>
                    <DilationBar value={patient.dilation} />
                  </div>
                </CardBody>
              </Card>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}
