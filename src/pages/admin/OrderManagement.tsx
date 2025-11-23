// src/pages/orders/AdminOrderManagement.tsx
import { useEffect, useMemo, useState } from "react";
import axios from "@/api/axiosInstance";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

import {
  Select,
  SelectTrigger,
  SelectItem,
  SelectValue,
  SelectContent,
} from "@/components/ui/select";

import { Search, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function AdminOrderManagement() {
  const [orders, setOrders] = useState<any[]>([]);
  const [spares, setSpares] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // filters (tidak disentuh behaviour-nya)
  const [search, setSearch] = useState("");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all"); // ← dipakai ke params.shift (shift name)

  // master shifts (untuk filter + summary shift)
  const [shifts, setShifts] = useState<any[]>([]);

  // summary filters (weekly summary)
  const [summaryMode, setSummaryMode] = useState<"next" | "current" | "custom">(
    "next"
  );
  const [summaryShift, setSummaryShift] = useState("all"); // ← dipakai ke params.shift_id (id)
  const [summaryStartDate, setSummaryStartDate] = useState("");
  const [summaryEndDate, setSummaryEndDate] = useState("");

  // helper normalizer
  const normalize = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.data)) return data.data;
    return [];
  };

  // ============================================================
  // FETCH SHIFTS
  // ============================================================
  const fetchShifts = async () => {
    try {
      const res = await axios.get("/shifts");
      const list = normalize(res.data);
      setShifts(list);
    } catch (err) {
      console.error(err);
    }
  };

  // ============================================================
  // FETCH ORDERS (ADMIN) with pagination + filters
  // ============================================================
  const fetchOrders = async () => {
    try {
      const params: any = {
        page,
        limit,
      };

      if (dateFrom) params.start_date = dateFrom;
      if (dateTo) params.end_date = dateTo;
      if (typeFilter !== "all") params.type = typeFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      if (shiftFilter !== "all") params.shift = shiftFilter; // NOTE: sesuai code awal (tidak disentuh)
      if (search.trim()) params.search = search.trim();

      const res = await axios.get("/orders/list", { params });
      const data = res.data;

      setOrders(data.data || []);
      setTotalItems(data.pagination?.total || 0);
      setTotalPages(data.pagination?.total_pages || 1);
    } catch (e) {
      console.error(e);
      toast.error("Failed fetching orders");
    }
  };

  // ============================================================
  // FETCH SPARES (same style with GA)
  // ============================================================
  const fetchSpares = async () => {
    try {
      const res = await axios.get("/spare-orders");
      const rows = normalize(res.data);
      setSpares(rows);
    } catch (err) {
      console.error(err);
      toast.error("Failed loading spare orders");
    }
  };

  // ============================================================
  // LOAD WEEKLY SUMMARY (same style with GA)
  // ============================================================
  const loadSummary = async () => {
    setLoadingSummary(true);
    try {
      const params: any = {};

      if (summaryShift !== "all") params.shift_id = summaryShift;

      if (summaryMode === "current") {
        params.mode = "current_week";
      } else if (
        summaryMode === "custom" &&
        summaryStartDate &&
        summaryEndDate
      ) {
        params.start_date = summaryStartDate;
        params.end_date = summaryEndDate;
      }
      // default "next" → BE pakai next week

      const res = await axios.get("/orders/summary", { params });
      const list = normalize(res.data);
      setSummary(list);
    } catch (err) {
      console.error(err);
      toast.error("Failed loading summary");
    } finally {
      setLoadingSummary(false);
    }
  };

  // ============================================================
  // EFFECTS
  // ============================================================
  useEffect(() => {
    fetchShifts();
    fetchOrders();
    fetchSpares();
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    limit,
    dateFrom,
    dateTo,
    typeFilter,
    statusFilter,
    shiftFilter,
    search,
  ]);

  // reload summary ketika mode atau shift berubah
  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryMode, summaryShift]);

  // untuk custom range, hanya kalau kedua tanggal terisi
  useEffect(() => {
    if (summaryMode === "custom" && summaryStartDate && summaryEndDate) {
      loadSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryStartDate, summaryEndDate]);

  // ============================================================
  // GROUPING: Location → Date → Shift → Employee → rows
  // ============================================================
  const grouped = useMemo(() => {
    const tree: Record<string, Record<string, Record<string, any[]>>> = {};

    orders.forEach((o) => {
      const location = o.location || "-";
      const date = o.date;
      const shift = o.shift || "-";

      if (!tree[location]) tree[location] = {};
      if (!tree[location][date]) tree[location][date] = {};
      if (!tree[location][date][shift]) tree[location][date][shift] = [];

      tree[location][date][shift].push(o);
    });

    return tree;
  }, [orders]);

  // ============================================================
  // HANDLERS: pagination + rows per page + clear filters
  // ============================================================
  const handleChangePage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleChangeRowsPerPage = (value: string) => {
    const num = Number(value);
    if (num > 0) {
      setLimit(num);
      setPage(1);
    }
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setTypeFilter("all");
    setStatusFilter("all");
    setShiftFilter("all");
    setSearch("");
    setPage(1);
    fetchOrders();
  };
  const exportCSV = async () => {
    try {
      // Ambil semua data sesuai filter (limit besar)
      const params: any = {
        page: 1,
        limit: 99999,
      };

      if (dateFrom) params.start_date = dateFrom;
      if (dateTo) params.end_date = dateTo;
      if (typeFilter !== "all") params.type = typeFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      if (shiftFilter !== "all") params.shift = shiftFilter;
      if (search.trim()) params.search = search.trim();

      const res = await axios.get("/orders/list", { params });
      const rows = res.data.data || [];

      // Format CSV header
      const header = [
        "Location",
        "Date",
        "Shift",
        "Employee",
        "Department",
        "Menu",
        "Vendor",
        "Type",
        "Status",
        "Absent",
      ];

      // Convert row to CSV lines
      const csvRows = rows.map((o: any) => [
        o.location || "-",
        o.date || "-",
        o.shift || "-",
        o.user || "-",
        o.department || "-",
        o.menu_name || "-",
        o.vendor || "-",
        o.type?.toUpperCase() || "-",
        o.status || "-",
        o.absent ? "Yes" : "No",
      ]);

      // Generate CSV string
      const csvContent = [header, ...csvRows]
        .map((r: string[]) =>
          r
            .map(
              (v: string | number | boolean | null | undefined) =>
                `"${String(v ?? "").replace(/"/g, '""')}"`
            )
            .join(",")
        )
        .join("\n");

      // Create downloadable file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `orders_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();

      URL.revokeObjectURL(url);

      toast.success("CSV exported successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export CSV");
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex justify-between flex-col md:flex-row gap-3">
          <div>
            <h1 className="text-3xl font-bold">Admin — Order Management</h1>
            <p className="text-gray-600 text-sm">
              Grouped by <b>Location → Date → Shift → Employee</b>
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV}>
              Export CSV
            </Button>

            <Button onClick={fetchOrders} variant="outline">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* SEARCH */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search employee, menu, department..."
            className="pl-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* FILTER BAR (GA style, behavior sama) */}
        <Card className="p-4 space-y-3">
          <div className="text-sm font-semibold text-gray-700">Filters</div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* Date From */}
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Date From</p>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* Date To */}
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Date To</p>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* Type */}
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Type</p>
              <Select
                value={typeFilter}
                onValueChange={(v) => {
                  setTypeFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="ot">OT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Status</p>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="auto_random">Auto Random</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Shift */}
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Shift</p>
              <Select
                value={shiftFilter}
                onValueChange={(v) => {
                  setShiftFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Shifts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {shifts.map((s: any) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
            <Button size="sm" onClick={fetchOrders}>
              Apply Filters
            </Button>
          </div>
        </Card>

        <Separator />

        {/* ======================= ORDERS TABLE (ADMIN) ======================= */}
        <Card className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Orders (All Locations)</h2>
            <span className="text-xs text-gray-500">
              Showing {orders.length} / {totalItems} records
            </span>
          </div>

          <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
            <Table className="min-w-[1100px]">
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="w-[160px] font-bold">
                    Location
                  </TableHead>
                  <TableHead className="w-[120px] font-bold">Date</TableHead>
                  <TableHead className="w-[100px] font-bold">Shift</TableHead>
                  <TableHead className="w-[180px] font-bold">
                    Employee
                  </TableHead>
                  <TableHead className="w-[200px] font-bold">
                    Department
                  </TableHead>
                  <TableHead className="w-[160px] font-bold">Vendor</TableHead>
                  <TableHead className="w-[180px] font-bold">Menu</TableHead>
                  <TableHead className="w-[100px] font-bold">Type</TableHead>
                  <TableHead className="w-[120px] font-bold">Status</TableHead>
                  <TableHead className="w-[80px] font-bold">Absent</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {/* Empty state */}
                {totalItems === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-6 text-center text-gray-500"
                    >
                      No orders found.
                    </TableCell>
                  </TableRow>
                )}

                {/* Grouped rendering */}
                {Object.entries(grouped).map(([location, byDate]) => {
                  const locationRowCount = Object.values(byDate).flatMap(
                    (shiftGroup) => Object.values(shiftGroup).flat()
                  ).length;

                  let locationPrinted = false;

                  return Object.entries(byDate).map(([date, byShift]) => {
                    const dateRowCount = Object.values(byShift).flat().length;
                    let datePrinted = false;

                    return Object.entries(byShift).map(([shift, rows]) => {
                      const shiftRowCount = rows.length;
                      let shiftPrinted = false;

                      return rows.map((o: any) => (
                        <TableRow key={o.id} className="align-top">
                          {/* LOCATION */}
                          {!locationPrinted && (
                            <TableCell
                              rowSpan={locationRowCount}
                              className="font-semibold bg-gray-50"
                            >
                              {location}
                            </TableCell>
                          )}
                          {(locationPrinted = true)}

                          {/* DATE */}
                          {!datePrinted && (
                            <TableCell
                              rowSpan={dateRowCount}
                              className="font-medium"
                            >
                              {date}
                            </TableCell>
                          )}
                          {(datePrinted = true)}

                          {/* SHIFT */}
                          {!shiftPrinted && (
                            <TableCell rowSpan={shiftRowCount}>
                              {shift}
                            </TableCell>
                          )}
                          {(shiftPrinted = true)}

                          {/* EMPLOYEE */}
                          <TableCell>{o.user || "-"}</TableCell>

                          {/* DEPARTMENT */}
                          <TableCell>{o.department || "-"}</TableCell>

                          <TableCell>{o.vendor || "-"}</TableCell>
                          {/* MENU */}
                          <TableCell>{o.menu_name || "-"}</TableCell>

                          {/* TYPE */}
                          <TableCell>
                            <Badge variant="outline">
                              {(o.type || "").toUpperCase()}
                            </Badge>
                          </TableCell>

                          {/* STATUS */}
                          <TableCell>{renderOrderStatus(o.status)}</TableCell>

                          {/* ABSENT */}
                          <TableCell>
                            {o.absent ? (
                              <Badge className="bg-gray-200 text-gray-800">
                                Yes
                              </Badge>
                            ) : (
                              <span className="text-xs text-gray-500">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ));
                    });
                  });
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination bar */}
          <div className="p-4 flex flex-col md:flex-row justify-between gap-4">
            <p className="text-sm text-gray-600">
              Showing <b>{orders.length}</b> of <b>{totalItems}</b> orders
            </p>

            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              {/* Rows per page */}
              <Select
                value={String(limit)}
                onValueChange={handleChangeRowsPerPage}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Rows per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>

              {/* Pagination */}
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      aria-label="Previous page"
                      onClick={() => handleChangePage(page - 1)}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        isActive={page === i + 1}
                        onClick={() => handleChangePage(i + 1)}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      aria-label="Next page"
                      onClick={() => handleChangePage(page + 1)}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </Card>

        {/* ======================================================== */}
        {/* SPARE ORDERS - CARDS (same as GA, jangan disentuh behaviour) */}
        {/* ======================================================== */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">
            Spare Orders (Next Week)
          </h2>

          {spares.length === 0 ? (
            <p className="text-gray-500 text-sm">No spare orders.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {spares.map((s: any) => (
                <div
                  key={s.id}
                  className="border rounded-lg p-3 bg-white shadow-sm flex flex-col gap-1"
                >
                  <div className="text-xs text-gray-500">
                    {s.service_date} • Shift {s.shift_id}
                  </div>
                  <div className="font-semibold text-sm">
                    {s.menu_name || "-"}
                  </div>
                  <div className="text-xs text-gray-600">
                    Quantity:{" "}
                    <span className="font-semibold">{s.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ======================================================== */}
        {/* WEEKLY SUMMARY – CARD VIEW (same style as GA) */}
        {/* ======================================================== */}
        <Card className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold">Weekly Summary</h2>
              <p className="text-xs text-gray-500">
                Rekap total pesanan per menu per hari (all locations).
              </p>
            </div>

            {loadingSummary && (
              <span className="text-xs text-gray-500 animate-pulse">
                Loading summary…
              </span>
            )}
          </div>

          {/* SUMMARY FILTER BAR */}
          <div className="bg-gray-50 border rounded-lg p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={summaryMode === "next" ? "default" : "outline"}
                size="sm"
                onClick={() => setSummaryMode("next")}
              >
                Next Week
              </Button>

              <Button
                variant={summaryMode === "current" ? "default" : "outline"}
                size="sm"
                onClick={() => setSummaryMode("current")}
              >
                Current Week
              </Button>

              <Button
                variant={summaryMode === "custom" ? "default" : "outline"}
                size="sm"
                onClick={() => setSummaryMode("custom")}
              >
                Custom Range
              </Button>
            </div>

            {summaryMode === "custom" && (
              <div className="flex flex-col md:flex-row gap-3">
                <Input
                  type="date"
                  className="md:w-48"
                  value={summaryStartDate}
                  onChange={(e) => setSummaryStartDate(e.target.value)}
                />
                <Input
                  type="date"
                  className="md:w-48"
                  value={summaryEndDate}
                  onChange={(e) => setSummaryEndDate(e.target.value)}
                />
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Select
                value={summaryShift}
                onValueChange={(v) => setSummaryShift(v)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Shift Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shifts</SelectItem>
                  {shifts.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Badge variant="outline" className="text-[10px]">
                {summary.length} days
              </Badge>
            </div>
          </div>

          {/* SUMMARY CARD VIEW */}
          {summary.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No summary data available for this period.
            </p>
          ) : (
            <div className="space-y-8">
              {summary.map((day: any) => {
                // Gabungkan semua shift menjadi satu list menu per hari
                const mergedMenus: Record<string, any> = {};

                day.shifts.forEach((shift: any) => {
                  shift.menus.forEach((m: any) => {
                    // Kalau absent, skip
                    if (m.is_absent === true || m.is_absent === 1) {
                      return;
                    }

                    const key = `${m.vendor}-${m.menu}-${m.tray}`;

                    if (!mergedMenus[key]) {
                      mergedMenus[key] = {
                        vendor: m.vendor,
                        menu: m.menu,
                        tray: m.tray,
                        is_cadangan: m.is_cadangan,
                        total_orders: 0,
                        total_auto_random: 0,
                        total_absent: 0,
                        total_spare: 0,
                      };
                    }

                    mergedMenus[key].total_orders += m.total_orders;
                    mergedMenus[key].total_auto_random += m.total_auto_random;
                    mergedMenus[key].total_spare += m.total_spare;

                    if (m.is_absent === true || m.is_absent === 1) {
                      mergedMenus[key].total_absent += 1;
                    }
                  });
                });

                const menus = Object.values(mergedMenus);

                return (
                  <div
                    key={day.service_date}
                    className="border bg-white rounded-xl p-5 shadow-sm"
                  >
                    <h3 className="text-2xl font-bold mb-4 border-b pb-2">
                      {day.service_date}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {menus.map((m: any, idx: number) => {
                        const total =
                          m.total_orders + m.total_spare + m.total_auto_random;

                        return (
                          <div
                            key={idx}
                            className="border rounded-lg p-4 bg-gray-50 shadow-sm hover:shadow-md transition"
                          >
                            <p className="text-xs text-gray-500 mb-1">
                              {m.vendor}
                            </p>

                            <h4 className="font-bold text-lg">{m.menu}</h4>

                            <p className="text-sm text-gray-600 mb-3">
                              {m.tray}
                            </p>

                            <p className="text-3xl font-extrabold text-gray-900">
                              {total}
                              <span className="text-sm font-medium text-gray-500 ml-1">
                                orders
                              </span>
                            </p>

                            {m.is_cadangan && (
                              <Badge className="bg-purple-100 text-purple-700 border-none mt-3">
                                Cadangan
                              </Badge>
                            )}
                          </div>
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

// ============================================================
// helpers
// ============================================================
function renderOrderStatus(status: string) {
  switch (status) {
    case "pending":
      return (
        <Badge className="bg-blue-100 text-blue-700 border-none text-xs">
          Pending
        </Badge>
      );
    case "confirmed":
      return (
        <Badge className="bg-green-100 text-green-700 border-none text-xs">
          Confirmed
        </Badge>
      );
    case "auto_random":
      return (
        <Badge className="bg-amber-100 text-amber-700 border-none text-xs">
          Auto Random
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {status}
        </Badge>
      );
  }
}
