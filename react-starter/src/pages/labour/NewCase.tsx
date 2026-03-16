import { useState } from "react";
import { Link } from "react-router";
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Button,
  Select,
  SelectItem,
  Textarea,
  Divider,
} from "@heroui/react";
import { ArrowLeft, Search, FileText, Save, X } from "lucide-react";

/** Mock patient data returned after "fetching" from HOSxP */
const MOCK_PATIENT = {
  hn: "64-012345",
  name: "นางสาว สมหญิง ใจดี",
  age: "28 ปี",
};

export default function NewCase() {
  // HOSxP fetch state
  const [an, setAn] = useState("");
  const [fetched, setFetched] = useState(false);
  const [fetching, setFetching] = useState(false);

  // Pregnancy info
  const [ga, setGa] = useState("");
  const [gravida, setGravida] = useState("");
  const [parity, setParity] = useState("");
  const [diagnosis, setDiagnosis] = useState("");

  // Initial assessment
  const [cervicalDilation, setCervicalDilation] = useState(3);
  const [fhr, setFhr] = useState("");
  const [membraneStatus, setMembraneStatus] = useState<string>("");
  const [admissionTime, setAdmissionTime] = useState("");

  // Notes
  const [notes, setNotes] = useState("");

  const handleFetch = () => {
    if (!an.trim()) return;
    setFetching(true);
    // Simulate API call
    setTimeout(() => {
      setFetched(true);
      setFetching(false);
    }, 800);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Button
          as={Link}
          to="/labour"
          isIconOnly
          variant="light"
          radius="full"
          size="sm"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            สร้างเคสการคลอดใหม่
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            กรอก AN เพื่อดึงข้อมูลผู้ป่วยจากระบบ HOSxP
          </p>
        </div>
      </div>

      {/* ── Section 1: ข้อมูลจาก HOSxP ── */}
      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2 px-6 pt-5 pb-0">
          <FileText size={18} className="text-emerald-600" />
          <h2 className="text-base font-semibold text-gray-700">
            ข้อมูลจาก HOSxP
          </h2>
        </CardHeader>
        <CardBody className="px-6 pb-6 space-y-4">
          {/* AN input + fetch button */}
          <div className="flex gap-3 items-end">
            <Input
              label={<>AN (Admission Number) <span className="text-red-500">*</span></>}
              placeholder="เช่น 6701-00123"
              value={an}
              onValueChange={setAn}
              variant="bordered"
              className="flex-1"
              size="lg"
            />
            <Button
              color="primary"
              variant="flat"
              size="lg"
              className="shrink-0 bg-emerald-100 text-emerald-700 font-medium"
              startContent={<Search size={16} />}
              isLoading={fetching}
              onPress={handleFetch}
            >
              ดึงข้อมูล
            </Button>
          </div>

          {/* Auto-filled patient data */}
          {fetched && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <Input
                label="HN"
                value={MOCK_PATIENT.hn}
                isReadOnly
                variant="flat"
                classNames={{ input: "text-gray-600" }}
              />
              <Input
                label="ชื่อผู้ป่วย"
                value={MOCK_PATIENT.name}
                isReadOnly
                variant="flat"
                className="sm:col-span-2"
                classNames={{ input: "text-gray-600" }}
              />
              <Input
                label="อายุ"
                value={MOCK_PATIENT.age}
                isReadOnly
                variant="flat"
                classNames={{ input: "text-gray-600" }}
              />
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── Section 2: ข้อมูลการตั้งครรภ์ ── */}
      <Card shadow="sm">
        <CardHeader className="px-6 pt-5 pb-0">
          <h2 className="text-base font-semibold text-gray-700">
            ข้อมูลการตั้งครรภ์
          </h2>
        </CardHeader>
        <CardBody className="px-6 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={<>GA (อายุครรภ์) <span className="text-red-500">*</span></>}
              placeholder="สัปดาห์"
              type="number"
              inputMode="numeric"
              value={ga}
              onValueChange={setGa}
              variant="bordered"
              endContent={
                <span className="text-gray-400 text-sm">สัปดาห์</span>
              }
            />
            <Input
              label={<>Gravida (จำนวนครรภ์) <span className="text-red-500">*</span></>}
              placeholder="0"
              type="number"
              inputMode="numeric"
              value={gravida}
              onValueChange={setGravida}
              variant="bordered"
            />
            <Input
              label={<>Parity (จำนวนคลอด) <span className="text-red-500">*</span></>}
              placeholder="0"
              type="number"
              inputMode="numeric"
              value={parity}
              onValueChange={setParity}
              variant="bordered"
            />
            <Input
              label="Diagnosis"
              placeholder="เช่น G1P0 term pregnancy"
              value={diagnosis}
              onValueChange={setDiagnosis}
              variant="bordered"
            />
          </div>
        </CardBody>
      </Card>

      {/* ── Section 3: ข้อมูลเริ่มต้น ── */}
      <Card shadow="sm">
        <CardHeader className="px-6 pt-5 pb-0">
          <h2 className="text-base font-semibold text-gray-700">
            ข้อมูลเริ่มต้น
          </h2>
        </CardHeader>
        <CardBody className="px-6 pb-6 space-y-6">
          {/* Cervical dilation discrete buttons */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              ปากมดลูกเปิด (Cervical Dilation) <span className="text-red-500">*</span>
            </p>
            <p className="text-xs text-gray-400 mb-2">เลือกค่า (ซม.) — ปัจจุบัน: <strong>{cervicalDilation} ซม.</strong></p>
            <div className="grid grid-cols-7 sm:grid-cols-11 gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((cm) => (
                <button
                  key={cm}
                  type="button"
                  onClick={() => setCervicalDilation(cm)}
                  className={`h-10 rounded-lg text-sm font-semibold border active:scale-95 transition-colors ${
                    cervicalDilation === cm
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-emerald-400"
                  }`}
                >
                  {cm}
                </button>
              ))}
            </div>
          </div>

          <Divider />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={<>อัตราการเต้นของหัวใจทารก (FHR) <span className="text-red-500">*</span></>}
              placeholder="120-160"
              type="number"
              inputMode="numeric"
              value={fhr}
              onValueChange={setFhr}
              variant="bordered"
              endContent={
                <span className="text-gray-400 text-sm">bpm</span>
              }
            />
            <Select
              label={<>ถุงน้ำ (Membrane Status) <span className="text-red-500">*</span></>}
              placeholder="เลือกสถานะ"
              variant="bordered"
              selectedKeys={membraneStatus ? [membraneStatus] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0];
                setMembraneStatus(selected ? String(selected) : "");
              }}
            >
              <SelectItem key="intact">Intact (ถุงน้ำยังไม่แตก)</SelectItem>
              <SelectItem key="ruptured">
                Ruptured (ถุงน้ำแตกแล้ว)
              </SelectItem>
            </Select>
            <Input
              label={<>เวลารับเข้า (Time of Admission) <span className="text-red-500">*</span></>}
              type="time"
              value={admissionTime}
              onValueChange={setAdmissionTime}
              variant="bordered"
            />
          </div>
        </CardBody>
      </Card>

      {/* ── Section 4: หมายเหตุ ── */}
      <Card shadow="sm">
        <CardHeader className="px-6 pt-5 pb-0">
          <h2 className="text-base font-semibold text-gray-700">หมายเหตุ</h2>
        </CardHeader>
        <CardBody className="px-6 pb-6">
          <Textarea
            placeholder="บันทึกหมายเหตุเพิ่มเติม..."
            value={notes}
            onValueChange={setNotes}
            variant="bordered"
            minRows={3}
            maxRows={6}
          />
        </CardBody>
      </Card>

      {/* ── Action Buttons ── */}
      <div className="flex flex-col gap-3 pt-2">
        <Button
          color="success"
          size="lg"
          className="w-full bg-emerald-600 text-white font-semibold text-base h-14"
          startContent={<Save size={20} />}
          onPress={() => alert("สร้างเคสสำเร็จ!")}
        >
          สร้างเคส
        </Button>
        <Button
          as={Link}
          to="/labour"
          variant="bordered"
          size="lg"
          className="w-full font-medium text-base h-12"
          startContent={<X size={18} />}
        >
          ยกเลิก
        </Button>
      </div>
    </div>
  );
}
