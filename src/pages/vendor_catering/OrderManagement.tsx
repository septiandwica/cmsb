// src/pages/vendor_catering/OrderManagement.tsx

import { useEffect, useState } from "react";
import axios from "@/api/axiosInstance";
import moment from "moment";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { RefreshCcw, CalendarRange } from "lucide-react";
import { toast } from "sonner";

// ========= TYPES =========

interface SummaryMenu {
  vendor: string;
  menu: string;
  tray: string;
  is_cadangan: boolean;
  total_orders: number;
  total_auto_random: number;
  total_absent: number;
  total_spare: number;
}

interface SummaryShift {
  shift: string;
  menus: SummaryMenu[];
}

interface SummaryDay {
  service_date: string;
  shifts: SummaryShift[];
}

export default function VendorOrderManagement() {
  const [summary, setSummary] = useState<SummaryDay[]>([]);
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState<"next" | "current" | "custom">("next");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // ========= API CALL =========

  const fetchSummary = async () => {
    try {
      setLoading(true);

      let url = "/orders/summary";
      const params: string[] = [];

      if (mode === "current") {
        params.push("mode=current_week");
      }

      if (mode === "custom" && startDate && endDate) {
        params.push(`start_date=${startDate}`);
        params.push(`end_date=${endDate}`);
      }

      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }

      const res = await axios.get(url);

      const raw = res.data?.data || [];

      if (!Array.isArray(raw)) {
        toast.error("Invalid summary format from server");
        return;
      }

      // SORTING tanggal pakai moment
      const sorted = [...raw].sort((a, b) =>
        moment(a.service_date).diff(moment(b.service_date))
      );

      setSummary(sorted);

      toast.success("Vendor summary loaded");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed loading vendor summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [mode]);

  // ========= RENDER =========

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Vendor — Order Overview</h1>
            <p className="text-gray-600 text-sm">
              Rekap pesanan makan khusus untuk vendor Anda.
            </p>
          </div>

          <Button variant="outline" onClick={fetchSummary} disabled={loading}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>

        {/* FILTER BAR */}
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant={mode === "next" ? "default" : "outline"}
              onClick={() => setMode("next")}
            >
              Next Week
            </Button>

            <Button
              variant={mode === "current" ? "default" : "outline"}
              onClick={() => setMode("current")}
            >
              Current Week
            </Button>

            <Button
              variant={mode === "custom" ? "default" : "outline"}
              onClick={() => setMode("custom")}
            >
              <CalendarRange className="w-4 h-4 mr-1" />
              Custom Range
            </Button>
          </div>

          {mode === "custom" && (
            <div className="flex flex-col md:flex-row gap-3">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="md:w-40"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="md:w-40"
              />

              <Button onClick={fetchSummary} disabled={!startDate || !endDate}>
                Apply
              </Button>
            </div>
          )}
        </Card>

        {/* SUMMARY */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Summary —{" "}
              {mode === "next"
                ? "Next Week"
                : mode === "current"
                ? "Current Week"
                : "Custom Range"}
            </h2>

            <Badge variant="outline" className="text-[11px]">
              {summary.length} Days
            </Badge>
          </div>

          {summary.length === 0 ? (
            <p className="text-center text-sm text-gray-500">
              Tidak ada data tersedia.
            </p>
          ) : (
            <div className="space-y-6">
              {summary.map((day) => {
                // Merge shift → per menu
                const merged: Record<string, SummaryMenu> = {};

                day.shifts.forEach((shift) => {
                  shift.menus.forEach((m) => {
                    const key = `${m.menu}-${m.tray}`;

                    if (!merged[key]) {
                      merged[key] = {
                        ...m,
                        total_orders: 0,
                        total_auto_random: 0,
                        total_absent: 0,
                        total_spare: 0,
                      };
                    }

                    merged[key].total_orders += m.total_orders;
                    merged[key].total_auto_random += m.total_auto_random;
                    merged[key].total_absent += m.total_absent;
                    merged[key].total_spare += m.total_spare;
                  });
                });

                const menus = Object.values(merged);

                return (
                  <div
                    key={day.service_date}
                    className="border bg-white rounded-xl p-5 shadow-sm"
                  >
                    <h3 className="text-xl font-bold mb-4 border-b pb-2">
                      {moment(day.service_date).format("dddd, DD MMM YYYY")}
                    </h3>

                    {/* Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {menus.map((m, idx) => {
                        const total =
                          m.total_orders +
                          m.total_spare +
                          m.total_auto_random;

                        return (
                          <Card
                            key={idx}
                            className="p-4 shadow-sm bg-gray-50 hover:bg-gray-100 transition rounded-lg"
                          >
                            <h4 className="font-bold text-lg">{m.menu}</h4>
                            <p className="text-sm text-gray-600 mb-3">
                              Tray: {m.tray}
                            </p>

                            <p className="text-3xl font-extrabold text-gray-900">
                              {total}
                              <span className="text-sm ml-1 text-gray-600">
                                Orders
                              </span>
                            </p>

                            {m.is_cadangan && (
                              <Badge className="mt-3 bg-purple-200 text-purple-800">
                                Cadangan
                              </Badge>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
