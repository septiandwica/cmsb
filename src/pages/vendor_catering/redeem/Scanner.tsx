// ==========================
//  VendorRedeemScanner.tsx
//  FINAL LAYOUT VERSION
// ==========================
import { useEffect, useRef, useState } from "react";
import axios from "@/api/axiosInstance";
import moment from "moment";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import {
  QrCode,
  RefreshCcw,
  Camera,
  CheckCircle2,
  XCircle,
  User,
  Utensils,
  Clock,
} from "lucide-react";

import { toast } from "sonner";

// ===========================
// TYPES
// ===========================
interface PreviewResponse {
  user_name: string;
  department_id: number | null;
  menu_name: string;
  tray_name: string;
  shift_name: string;
  shift_time: string;
  already_redeemed: boolean;
  redeemed_at?: string | null;
}

interface RedeemData {
  user: string;
  menu: string;
  tray: string;
  shift: string;
  service_date: string;
  redeemed_at: string;
  remaining: number;
}

interface StockItem {
  menu_id: number;
  menu_name: string;
  tray_name: string;
  planned_qty: number;
  auto_random_qty: number;
  spare_qty: number;
  redeemed_qty: number;
  remaining: number;
}

// ===========================
// QR SANITIZER
// ===========================
function sanitizeQr(raw: string) {
  try {
    const url = new URL(raw);
    return url.searchParams.get("qr_code") || raw;
  } catch {
    return raw;
  }
}

export default function VendorRedeemScanner() {
  const [qrInput, setQrInput] = useState("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [redeemResult, setRedeemResult] = useState<RedeemData | null>(null);

  const [highlight, setHighlight] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(true);

  const [todayStock, setTodayStock] = useState<StockItem[]>([]);

  const scannerRef = useRef<HTMLDivElement | null>(null);
  const html5Qr = useRef<Html5Qrcode | null>(null);

  const lastScan = useRef<string>("");
  const isStarting = useRef(false);
  const lastErrorTime = useRef<number>(0);

const [todayLogs, setTodayLogs] = useState<any[]>([]);


  // ============================
  // FETCH STOCK
  // ============================
  const fetchTodayStock = async () => {
    try {
      const res = await axios.get("/redeem/today-stock");
      setTodayStock(res.data.data || []);
    } catch {}
  };

  // ============================
  // START CAMERA — STABLE VERSION
  // ============================
  const startScanner = async () => {
    try {
      if (!scannerRef.current) return;

      if (isStarting.current) return;
      isStarting.current = true;

      if (html5Qr.current?.getState() === Html5QrcodeScannerState.SCANNING) {
        isStarting.current = false;
        return;
      }

      if (!html5Qr.current) {
        html5Qr.current = new Html5Qrcode("qr-reader");
      }

      const cameras = await Html5Qrcode.getCameras();
      if (cameras.length === 0) {
        toast.error("No camera found");
        setCameraAvailable(false);
        isStarting.current = false;
        return;
      }

      setCameraAvailable(true);

      const backCam =
        cameras.find((c) => c.label.toLowerCase().includes("back")) ||
        cameras[0];

      await html5Qr.current.start(
        backCam.id,
        { fps: 15, qrbox: { width: 250, height: 250 } },
        (decoded) => handleScan(decoded),
        () => {
          const now = Date.now();
          if (now - lastErrorTime.current > 1500) {
            lastErrorTime.current = now;
          }
        }
      );
    } catch {
      toast.error("Failed to start camera");
    } finally {
      isStarting.current = false;
    }
  };

  // ============================
  // STOP CAMERA
  // ============================
  const stopScanner = async () => {
    try {
      if (html5Qr.current?.isScanning) await html5Qr.current.stop();
    } catch {}
  };

  // ============================
  // HANDLE QR SCAN
  // ============================
  const handleScan = (raw: string) => {
    const cleaned = sanitizeQr(raw);
    if (cleaned === lastScan.current) return;

    lastScan.current = cleaned;
    setQrInput(cleaned);

    setHighlight(true);
    setTimeout(() => setHighlight(false), 300);

    handlePreview(cleaned);
  };

  // ============================
  // PREVIEW
  // ============================
  const handlePreview = async (value: string) => {
    try {
      const qr = sanitizeQr(value);

      const res = await axios.get("/redeem/preview", {
        params: { qr_code: qr },
      });

      setPreview(res.data);
      setRedeemResult(null);

      toast.success(
        res.data.already_redeemed
          ? "Already redeemed"
          : "QR valid — Ready to redeem"
      );
    } catch (err: any) {
      setPreview(null);
      setRedeemResult(null);
      toast.error(err?.response?.data?.message || "Preview failed");
    }
  };

  // ============================
  // REDEEM
  // ============================
  const handleRedeem = async () => {
    if (!qrInput) return toast.error("QR empty");
    if (!preview) return toast.error("Preview first");

    if (preview.already_redeemed) return toast.error("Already redeemed");

    try {
      const res = await axios.post(
        "/redeem/validate",
        {},
        { params: { qr_code: qrInput } }
      );

      setRedeemResult(res.data.data);

      setPreview({
        ...preview,
        already_redeemed: true,
        redeemed_at: res.data.data.redeemed_at,
      });

      fetchTodayStock();
      toast.success("Redeem success");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Redeem failed");
    }
  };

  const handleReset = () =>
    (() => {
      lastScan.current = "";
      setQrInput("");
      setPreview(null);
      setRedeemResult(null);
      setHighlight(false);
    })();

  // ============================
  // INIT CAMERA + STOCK
  // ============================
  useEffect(() => {
    startScanner();
    fetchTodayStock();

    const interval = setInterval(fetchTodayStock, 4000);

    return () => {
      stopScanner();
      clearInterval(interval);
    };
  }, []);

  // ============================
  // AUTO CONFIRM AFTER 2 SECONDS
  // ============================
  useEffect(() => {
    if (!preview) return;
    if (preview.already_redeemed) return;

    // ⏳ kalau ada QR baru, restart countdown
    const timer = setTimeout(() => {
      handleRedeem();
    }, 2000);

    return () => clearTimeout(timer);
  }, [preview]);


  /* ============================
    LAST REDEEM — REALTIME MERGED LOGS
============================ */

const fetchTodayLogs = async () => {
  try {
    const res = await axios.get("/redeem/today-redeem-logs");
    setTodayLogs(res.data.data || []);
  } catch (err) {
    console.error(err);
  }
};

// Auto refresh logs
useEffect(() => {
  fetchTodayLogs();
  const interval = setInterval(fetchTodayLogs, 4000);
  return () => clearInterval(interval);
}, []);

  // ============================
  // UI
  // ============================
  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Vendor — Redeem Scanner</h1>
            <p className="text-gray-600 text-sm">Scan QR to redeem meals.</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                await stopScanner();
                await startScanner();
              }}
            >
              <Camera className="w-4 h-4 mr-2" />
              Restart Camera
            </Button>

            <Button variant="outline" onClick={handleReset}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* ============================
            TODAY STOCK (FULL WIDTH)
        ============================ */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Utensils className="w-5 h-5" />
            Today's Menu Stock
          </h2>

          {todayStock.length === 0 ? (
            <p className="text-sm text-gray-500">No stock data...</p>
          ) : (
            <div className="space-y-3">
              {todayStock.map((item) => (
                <div
                  key={item.menu_id}
                  className="border rounded-lg p-3 bg-white shadow-sm"
                >
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">{item.menu_name}</p>
                      <p className="text-xs text-gray-500">
                        Tray: {item.tray_name}
                      </p>
                    </div>

                    <Badge
                      className={
                        item.remaining <= 0
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }
                    >
                      {item.remaining} left
                    </Badge>
                  </div>

                  <div className="grid grid-cols-4 text-xs mt-2 text-center">
                    <div>
                      <p className="font-bold">{item.planned_qty}</p>
                      <p className="text-gray-500 text-[11px]">Planned</p>
                    </div>
                    <div>
                      <p className="font-bold">{item.auto_random_qty}</p>
                      <p className="text-gray-500 text-[11px]">Random</p>
                    </div>
                    <div>
                      <p className="font-bold">{item.spare_qty}</p>
                      <p className="text-gray-500 text-[11px]">Spare</p>
                    </div>
                    <div>
                      <p className="font-bold">{item.redeemed_qty}</p>
                      <p className="text-gray-500 text-[11px]">Redeemed</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ============================
            GRID: SCANNER (LEFT) + PREVIEW (RIGHT)
        ============================ */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr,1fr] gap-6">
          {/* SCANNER LEFT */}
          <Card className="p-5 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <QrCode className="w-5 h-5" /> QR Scanner
            </h2>

            {!cameraAvailable ? (
              <p className="text-red-500">No camera available</p>
            ) : (
              <div
                className={`rounded-lg overflow-hidden border ${
                  highlight ? "border-green-500 shadow-lg" : "border-gray-300"
                }`}
              >
                <div id="qr-reader" ref={scannerRef} />
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs text-gray-500">Manual Input</p>
              <div className="flex gap-2">
                <Input
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder="Enter QR code..."
                />
                <Button onClick={() => handlePreview(sanitizeQr(qrInput))}>
                  Preview
                </Button>
              </div>
            </div>
          </Card>

          {/* PREVIEW RIGHT */}
          {preview && (
            <Card
              className={`p-5 border-2 ${
                preview.already_redeemed
                  ? "border-red-400 bg-red-50"
                  : "border-green-400 bg-green-50"
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                {preview.already_redeemed ? (
                  <XCircle className="w-6 h-6 text-red-600" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                )}

                {!preview.already_redeemed && (
                  <p className="text-xs text-gray-500 mb-2">
                    Auto confirming in 2 seconds…
                  </p>
                )}
                <p className="text-lg font-semibold">
                  {preview.already_redeemed
                    ? "ALREADY REDEEMED"
                    : "READY TO REDEEM"}
                </p>
              </div>

              <p className="text-2xl font-bold mb-1">{preview.user_name}</p>

              <p className="text-lg font-semibold text-gray-700 mb-3">
                Shift {preview.shift_name} — {preview.menu_name}
              </p>

              <div className="p-3 rounded-lg bg-white border shadow-sm mb-4">
                <p className="text-sm text-gray-500">Ambil di tray:</p>
                <p className="text-xl font-semibold">{preview.tray_name}</p>

                <p className="text-xs text-gray-500 mt-1">
                  Waktu shift: {preview.shift_time}
                </p>
              </div>

              {preview.already_redeemed && preview.redeemed_at && (
                <p className="text-xs text-gray-600 mb-3">
                  Redeemed at:{" "}
                  <b>
                    {moment(preview.redeemed_at).format("HH:mm:ss, DD MMM")}
                  </b>
                </p>
              )}

              {!preview.already_redeemed && (
                <Button className="w-full py-3 text-lg" onClick={handleRedeem}>
                  Confirm Redeem
                </Button>
              )}
            </Card>
          )}
        </div>

        {/* ============================
            LAST REDEEM — BOTTOM
        ============================ */}
       
<Card className="p-5">
  <h2 className="text-lg font-semibold mb-3">Last Redeem (Live)</h2>

  {todayLogs.length === 0 ? (
    <p className="text-sm text-gray-500">No redeem today...</p>
  ) : (
    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">

      {todayLogs.map((log, i) => (
        <div
          key={i}
          className={`
            p-3 border rounded-lg bg-white shadow-sm
            ${log.type === "spare" ? "border-purple-300 bg-purple-50" : ""}
          `}
        >
          <div className="flex justify-between items-center">
            <p className="font-bold text-md">{log.user?.name}</p>

            <Badge
              className={
                log.type === "spare"
                  ? "bg-purple-600 text-white"
                  : "bg-blue-600 text-white"
              }
            >
              {log.type.toUpperCase()}
            </Badge>
          </div>

          <p className="text-sm text-gray-700 mt-1">
            {log.menu?.nama_menu} — Tray {log.menu?.tray?.name}
          </p>

          <p className="text-xs text-gray-500">
            Shift: {log.shift?.name || "-"}
          </p>

          <p className="text-xs mt-1">
            Redeemed:{" "}
            <b>{moment(log.created_at).format("HH:mm:ss, DD MMM")}</b>
          </p>
        </div>
      ))}

    </div>
  )}
</Card>
      </div>
    </div>
  );
}
