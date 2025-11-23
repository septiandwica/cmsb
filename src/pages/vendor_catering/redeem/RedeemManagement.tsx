import { useEffect, useState } from "react";
import axios from "@/api/axiosInstance";
import moment from "moment";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import {
  Filter,
  RefreshCcw,
  Download,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { toast } from "sonner";

// CHART
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

// =============================
// TYPES
// =============================
interface RedeemLog {
  tanggal: string; // "2024-01-31"
  user_name: string;
  shift: string; // "1" or shift name
  menu: string;
  status: string; // "Scanned" | "Unscanned"
  // optional fields if backend menambahkan:
  vendor_name?: string;
  location_name?: string;
  department_name?: string;
}

interface Vendor {
  id: number;
  name: string;
}

interface Location {
  id: number;
  name: string;
}

interface Shift {
  id: number;
  name: string;
}

interface ChartPoint {
  date: string; // e.g. "31 Jan"
  scanned: number;
  unscanned: number;
}

interface Filters {
  vendor_id: string;
  location_id: string;
  shift_id: string;
  start_date: string;
  end_date: string;
}

export default function RedeemManagement() {
  const [role, setRole] = useState<string>("");

  const [logs, setLogs] = useState<RedeemLog[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);

  const [filters, setFilters] = useState<Filters>({
    vendor_id: "",
    location_id: "",
    shift_id: "",
    start_date: "",
    end_date: "",
  });

  // Pagination dari server
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [totalPage, setTotalPage] = useState(1);
  const [totalData, setTotalData] = useState(0);

  const [loading, setLoading] = useState(false);

  // ==================================
  // ROLE
  // ==================================
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      setRole(parsed.role || "");
    } catch {
      // ignore
    }
  }, []);

  // ==================================
  // FETCH OPTION DATA (vendors, locations, shifts) + initial logs
  // ==================================
  useEffect(() => {
    if (!role) return;

    const init = async () => {
      try {
        // Lokasi hanya untuk admin
        if (role === "admin") {
          const locRes = await axios.get("/locations");
          setLocations(locRes.data.data || []);
        }

        // Vendor bisa dilihat admin & GA (vendor_catering tidak perlu pilih vendor)
        if (role !== "vendor_catering") {
          const venRes = await axios.get("/vendors");
          setVendors(venRes.data.data || []);
        }

        // Semua role yang pakai halaman ini butuh master shift
        const shiftRes = await axios.get("/shifts");
        setShifts(shiftRes.data.data || []);

        // Fetch logs awal (page 1)
        fetchLogs(1, filters);
      } catch (err: any) {
        console.error(err);
        toast.error("Failed to load initial data");
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, perPage]);

  // ==================================
  // FETCH LOGS (server-side pagination)
  // ==================================
  const fetchLogs = async (pageParam?: number, filterParam?: Filters) => {
    if (!role) return;

    const currentPage = pageParam || page;
    const appliedFilters = filterParam || filters;

    try {
      setLoading(true);

      const params: any = {
        page: currentPage,
        limit: perPage,
      };

      if (appliedFilters.shift_id) params.shift_id = appliedFilters.shift_id;
      if (appliedFilters.start_date) params.start_date = appliedFilters.start_date;
      if (appliedFilters.end_date) params.end_date = appliedFilters.end_date;

      // Vendor filter hanya untuk admin & GA
      if (role !== "vendor_catering" && appliedFilters.vendor_id) {
        params.vendor_id = appliedFilters.vendor_id;
      }

      // Location filter hanya untuk admin, GA pakai location dari JWT
      if (role === "admin" && appliedFilters.location_id) {
        params.location_id = appliedFilters.location_id;
      }

      const res = await axios.get("/redeem-logs", { params });

      const body = res.data;

      setLogs(body.data || []);
      setPage(body.page || currentPage);
      setTotalPage(body.total_page || 1);
      setTotalData(body.total_data || (body.data ? body.data.length : 0));

      generateChartData(body.data || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  // ==================================
  // GENERATE CHART DATA (Scanned vs Unscanned per hari)
  // ==================================
  const generateChartData = (data: RedeemLog[]) => {
    const grouped: Record<string, { scanned: number; unscanned: number }> = {};

    data.forEach((log) => {
      const dateKey = log.tanggal; // "YYYY-MM-DD"
      if (!grouped[dateKey]) {
        grouped[dateKey] = { scanned: 0, unscanned: 0 };
      }

      if (log.status === "Scanned") {
        grouped[dateKey].scanned += 1;
      } else {
        grouped[dateKey].unscanned += 1;
      }
    });

    const final: ChartPoint[] = Object.keys(grouped)
      .sort()
      .map((d) => ({
        date: moment(d).format("DD MMM"),
        scanned: grouped[d].scanned,
        unscanned: grouped[d].unscanned,
      }));

    setChartData(final);
  };

  // ==================================
  // FILTER HANDLERS
  // ==================================
  const applyFilters = () => {
    setPage(1);
    fetchLogs(1, { ...filters });
    toast.success("Filters applied");
  };

  const resetFilters = () => {
    const reset: Filters = {
      vendor_id: "",
      location_id: "",
      shift_id: "",
      start_date: "",
      end_date: "",
    };
    setFilters(reset);
    setPage(1);
    fetchLogs(1, reset);
  };

  // ==================================
  // PAGINATION HANDLERS
  // ==================================
  const handleNext = () => {
    if (page < totalPage) {
      const nextPage = page + 1;
      fetchLogs(nextPage);
    }
  };

  const handlePrev = () => {
    if (page > 1) {
      const prevPage = page - 1;
      fetchLogs(prevPage);
    }
  };

  const handlePerPageChange = (value: string) => {
    const newLimit = Number(value);
    setPerPage(newLimit);
    setPage(1);
    fetchLogs(1);
  };

  // ==================================
  // EXPORT CSV (current page)
  // ==================================
  const exportCSV = () => {
    if (logs.length === 0) return toast.error("No data to export");

    const header = ["Tanggal", "Employee", "Shift", "Menu", "Status"];

    const rows = logs.map((l) => [
      l.tanggal,
      l.user_name,
      l.shift,
      l.menu,
      l.status,
    ]);

    const csv =
      header.join(",") +
      "\n" +
      rows
        .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "redeem_report.csv";
    link.click();
  };

  // ==================================
  // UI SECTION
  // ==================================
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Redeem Management</h1>
            <p className="text-gray-600 text-sm">
              Report scanned & unscanned meals — role-aware.
            </p>
            {role && (
              <p className="text-[11px] text-gray-400 mt-1">
                Role: <span className="font-semibold uppercase">{role}</span>
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => fetchLogs(page)}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>

            <Button variant="outline" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* FILTER PANEL */}
        <Card className="p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Vendor (semua kecuali vendor_catering) */}
            {role !== "vendor_catering" && (
              <div>
                <p className="text-xs mb-1 text-gray-500">Vendor</p>
                <Select
                  value={filters.vendor_id || undefined}
                  onValueChange={(v) =>
                    setFilters((prev) => ({ ...prev, vendor_id: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Vendors</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Location (Admin only) */}
            {role === "admin" && (
              <div>
                <p className="text-xs mb-1 text-gray-500">Location</p>
                <Select
                  value={filters.location_id || undefined}
                  onValueChange={(v) =>
                    setFilters((prev) => ({ ...prev, location_id: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Locations</SelectItem>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={String(l.id)}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Shift */}
            <div>
              <p className="text-xs mb-1 text-gray-500">Shift</p>
              <Select
                value={filters.shift_id || undefined}
                onValueChange={(v) =>
                  setFilters((prev) => ({ ...prev, shift_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Shifts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Shifts</SelectItem>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div>
              <p className="text-xs mb-1 text-gray-500">Start Date</p>
              <Input
                type="date"
                value={filters.start_date}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    start_date: e.target.value,
                  }))
                }
              />
            </div>

            {/* End Date */}
            <div>
              <p className="text-xs mb-1 text-gray-500">End Date</p>
              <Input
                type="date"
                value={filters.end_date}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    end_date: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={applyFilters}>Apply</Button>
            <Button variant="outline" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </Card>

        {/* CHART ANALYTICS */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Redeem Trend (Scanned vs Unscanned)</h2>
          </div>

          {chartData.length === 0 ? (
            <p className="text-sm text-gray-500">No data for chart...</p>
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="scanned"
                    stroke="#16a34a"
                    strokeWidth={2}
                    name="Scanned"
                  />
                  <Line
                    type="monotone"
                    dataKey="unscanned"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Unscanned"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* LOG TABLE */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Redeem Logs</h2>
            <p className="text-xs text-gray-500">
              Total data: <b>{totalData}</b>
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-500">No logs...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="p-2 text-left">Tanggal</th>
                    <th className="p-2 text-left">Employee</th>
                    <th className="p-2 text-center">Shift</th>
                    <th className="p-2 text-center">Menu</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {logs.map((log, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        {moment(log.tanggal).format("DD MMM YYYY")}
                      </td>
                      <td className="p-2">{log.user_name}</td>
                      <td className="p-2 text-center">{log.shift}</td>
                      <td className="p-2 text-center">{log.menu}</td>
                      <td className="p-2 text-center">
                        <Badge
                          className={
                            log.status === "Scanned"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-200 text-gray-700"
                          }
                        >
                          {log.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={page <= 1 || loading}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <span className="text-sm">
                Page <b>{page}</b> / {totalPage || 1}
              </span>

              <Button
                variant="outline"
                onClick={handleNext}
                disabled={page >= totalPage || loading}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* PER PAGE */}
            <div className="flex items-center gap-2">
              <p className="text-sm">Rows:</p>
              <Select
                value={String(perPage)}
                onValueChange={handlePerPageChange}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
