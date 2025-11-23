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

interface PreviewResponse {
  user_name: string;
  department_id: number | null;
  menu_name: string;
  tray_name: string;
  shift_name: string;
  shift_time: string;
  already_redeemed: boolean;
  // 🟢 tambahan: waktu sudah pernah redeem (kalau ada)
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
// 🧼 QR SANITIZER
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

  // ============================
  // 📊 FETCH TODAY STOCK
  // ============================
  const fetchTodayStock = async () => {
    try {
      const res = await axios.get("/redeem/today-stock");
      setTodayStock(res.data.data || []);
    } catch (err: any) {
      console.error("Fetch stock failed:", err);
      // jangan spam toast kalau gagal terus, cukup log
    }
  };

  // ============================
  // 🎥 START CAMERA — SAFE VERSION
  // ============================
  const startScanner = async () => {
    try {
      if (!scannerRef.current) return;

      // Prevent multiple starts
      if (isStarting.current) {
        console.log("⛔ Start blocked — camera busy");
        return;
      }
      isStarting.current = true;

      // Already scanning → skip
      if (html5Qr.current?.getState() === Html5QrcodeScannerState.SCANNING) {
        console.log("⛔ Already scanning");
        isStarting.current = false;
        return;
      }

      // Init instance jika pertama kali
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
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded) => handleScan(decoded),
        () => {}
      );

      console.log("📸 Scanner started");
    } catch (error) {
      console.error("Camera start error:", error);
      toast.error("Failed to start camera");
    } finally {
      isStarting.current = false;
    }
  };

  // ============================
  // 🛑 STOP CAMERA — SAFE VERSION
  // ============================
  const stopScanner = async () => {
    try {
      if (html5Qr.current?.isScanning) {
        await html5Qr.current.stop();
        console.log("🛑 Scanner stopped");
      }
    } catch (error: any) {
      console.warn("Stop scanner error:", error?.message);
    }
  };

  // ============================
  // 📡 HANDLE QR SCAN
  // ============================
  const handleScan = (raw: string) => {
    const cleaned = sanitizeQr(raw);

    if (cleaned === lastScan.current) return; // Avoid spam
    lastScan.current = cleaned;

    setQrInput(cleaned);

    setHighlight(true);
    setTimeout(() => setHighlight(false), 500);

    handlePreview(cleaned);
  };

  // ============================
  // 🔍 PREVIEW API
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
  // ✅ REDEEM API
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

      // update preview (flag sudah redeemed)
      setPreview({
        ...preview,
        already_redeemed: true,
        redeemed_at: res.data.data.redeemed_at,
      });

      // 🔁 refresh stok setelah redeem
      fetchTodayStock();

      toast.success("Redeem success");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Redeem failed");
    }
  };

  const handleReset = () => {
    lastScan.current = "";
    setQrInput("");
    setPreview(null);
    setRedeemResult(null);
    setHighlight(false);
  };

  // ============================
  // 🎬 INIT CAMERA + STOCK ON MOUNT
  // ============================
  useEffect(() => {
    startScanner();
    fetchTodayStock();

    // auto refresh stok tiap 5 detik
    const interval = setInterval(fetchTodayStock, 5000);

    return () => {
      stopScanner();
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <p className="text-gray-600 text-sm">Scan QR untuk redeem meal.</p>
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
  {/* TODAY STOCK PANEL */}
            <Card className="p-5">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Utensils className="w-5 h-5" />
                Today’s Menu Stock
              </h2>

              {todayStock.length === 0 ? (
                <p className="text-sm text-gray-500">No stock data...</p>
              ) : (
                <div className="space-y-3">
                  {todayStock.map((item, idx) => (
                    <div
                      key={idx}
                      className="border rounded-lg p-3 bg-white shadow-sm"
                    >
                      <div className="flex justify-between items-center">
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
                          <p className="font-bold">
                            {item.auto_random_qty}
                          </p>
                          <p className="text-gray-500 text-[11px]">
                            Random
                          </p>
                        </div>

                        <div>
                          <p className="font-bold">{item.spare_qty}</p>
                          <p className="text-gray-500 text-[11px]">Spare</p>
                        </div>

                        <div>
                          <p className="font-bold">
                            {item.redeemed_qty}
                          </p>
                          <p className="text-gray-500 text-[11px]">
                            Redeemed
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
        {/* CAMERA SECTION */}
        <Card className="p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <QrCode className="w-5 h-5" /> QR Scanner
          </h2>

          {!cameraAvailable ? (
            <p className="text-red-500 text-sm">No camera available</p>
          ) : (
            <div
              className={`rounded-lg overflow-hidden border ${
                highlight ? "border-green-500 shadow-lg" : "border-gray-300"
              }`}
            >
              <div id="qr-reader" ref={scannerRef} />
            </div>
          )}

          {/* Manual Input */}
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

          {/* PREVIEW STATUS BUBBLE */}
          {preview && (
            <div
              className={`p-3 rounded-lg ${
                preview.already_redeemed
                  ? "bg-red-100 border border-red-300"
                  : "bg-green-100 border border-green-300"
              }`}
            >
              <div className="flex gap-2 items-center">
                {preview.already_redeemed ? (
                  <XCircle className="w-5 h-5 text-red-600" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
                <p className="text-sm font-semibold">
                  {preview.already_redeemed
                    ? "Already Redeemed"
                    : "Valid — Not Redeemed"}
                </p>
              </div>

              {/* 🟢 Tampilkan waktu redeemed kalau sudah pernah redeem */}
              {preview.already_redeemed && preview.redeemed_at && (
                <p className="text-xs text-gray-600 pl-7 mt-1">
                  Redeemed at:{" "}
                  {moment(preview.redeemed_at).format("HH:mm:ss, DD MMM")}
                </p>
              )}

              {!preview.already_redeemed && (
                <Button className="mt-3" onClick={handleRedeem}>
                  Confirm Redeem
                </Button>
              )}
            </div>
          )}
        </Card>

        {/* RIGHT PANEL */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr,1fr] gap-6">
          {/* PREVIEW DETAILS */}
          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-3">Preview Details</h2>

            {!preview ? (
              <p className="text-sm text-gray-500">No preview...</p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-semibold">{preview.user_name}</p>
                    <p className="text-xs text-gray-500">
                      Department: {preview.department_id || "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Utensils className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-semibold">{preview.menu_name}</p>
                    <p className="text-xs text-gray-500">
                      Tray: {preview.tray_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-semibold">Shift {preview.shift_name}</p>
                    <p className="text-xs text-gray-500">
                      {preview.shift_time}
                    </p>
                  </div>
                </div>

                <Badge
                  className={
                    preview.already_redeemed
                      ? "bg-red-100 text-red-800"
                      : "bg-blue-100 text-blue-800"
                  }
                >
                  {preview.already_redeemed
                    ? "Already Redeemed"
                    : "Not Redeemed"}
                </Badge>

                {/* 🟢 Tampilkan redeemed_at juga di detail */}
                {preview.redeemed_at && (
                  <p className="text-xs text-gray-600 mt-1">
                    Redeemed at:{" "}
                    {moment(preview.redeemed_at).format("HH:mm:ss, DD MMM")}
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* LAST REDEEM DETAILS + TODAY STOCK */}
          <div className="space-y-4">
            {/* LAST REDEEM DETAILS */}
            <Card className="p-5">
              <h2 className="text-lg font-semibold mb-3">Last Redeem</h2>

              {!redeemResult ? (
                <p className="text-sm text-gray-500">
                  Belum ada redeem di sesi ini...
                </p>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Employee</span>
                    <span className="font-semibold">
                      {redeemResult.user}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Menu</span>
                    <span className="font-semibold">
                      {redeemResult.menu}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Tray</span>
                    <span className="font-semibold">
                      {redeemResult.tray}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Shift</span>
                    <span className="font-semibold">
                      {redeemResult.shift}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Date</span>
                    <span className="font-semibold">
                      {moment(redeemResult.service_date).format(
                        "dddd, DD MMM YYYY"
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Redeemed At</span>
                    <span className="font-semibold">
                      {moment(redeemResult.redeemed_at).format(
                        "HH:mm:ss, DD MMM"
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between pt-2">
                    <span>Remaining</span>
                    <Badge
                      className={
                        redeemResult.remaining <= 0
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }
                    >
                      {redeemResult.remaining}
                    </Badge>
                  </div>
                </div>
              )}
            </Card>

          
          </div>
        </div>
      </div>
    </div>
  );
}
