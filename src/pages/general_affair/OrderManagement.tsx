// src/pages/orders/GAOrderManagement.tsx
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
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import { Search, RefreshCcw, PlayCircle } from "lucide-react";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationLink,
} from "@/components/ui/pagination";

import { toast } from "sonner";

export default function GAOrderManagement() {
  const [orders, setOrders] = useState<any[]>([]);
  const [spares, setSpares] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [search, setSearch] = useState("");

  // ====== FILTER STATES (sinkron dengan backend listOrders) ======
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "regular" | "ot">("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "confirmed" | "auto_random"
  >("all");
  const [shiftFilter, setShiftFilter] = useState<string>("all");
  const [shifts, setShifts] = useState<any[]>([]);

  // ====== SUMMARY FILTERS (khusus Weekly Summary) ======
  const [summaryMode, setSummaryMode] = useState<"next" | "current" | "custom">(
    "next"
  );
  const [summaryStartDate, setSummaryStartDate] = useState("");
  const [summaryEndDate, setSummaryEndDate] = useState("");
  const [summaryShift, setSummaryShift] = useState("all");

  // ====== PAGINATION (server-side) ======
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // ============================================================
  // HELPERS
  // ============================================================
  const normalize = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.data)) return data.data;
    return [];
  };

  // ============================================================
  // FETCH SHIFTS (untuk filter)
  // ============================================================
  const fetchShifts = async () => {
    try {
      const res = await axios.get("/shifts");
      const list = normalize(res.data);
      setShifts(list);
    } catch (err) {
      console.error(err);
      // optional: bisa tambahkan toast jika perlu
    }
  };

  // ============================================================
  // FETCH ORDERS (pakai filter + pagination → kirim ke backend)
  // ============================================================
  const fetchOrders = async (override?: { page?: number; limit?: number }) => {
    try {
      setLoadingOrders(true);

      const currentPage = override?.page ?? page;
      const currentLimit = override?.limit ?? limit;

      const params: any = {
        page: currentPage,
        limit: currentLimit,
      };

      if (dateFrom) params.start_date = dateFrom;
      if (dateTo) params.end_date = dateTo;

      if (typeFilter !== "all") params.type = typeFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      if (shiftFilter !== "all") params.shift_id = shiftFilter;

      const res = await axios.get("/orders/list", { params });

      const result = res.data || {};
      const rows = normalize(result); // akan baca result.data

      setOrders(rows);

      const pagination = result.pagination || {};
      setTotalItems(pagination.total ?? rows.length);
      setTotalPages(pagination.total_pages ?? 1);
      setPage(pagination.page ?? currentPage);
      setLimit(pagination.limit ?? currentLimit);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch GA orders");
    } finally {
      setLoadingOrders(false);
    }
  };

  // ============================================================
  // FETCH SPARE ORDERS
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
  // RUN AUTO RANDOM
  // ============================================================
  const runAutoRandom = async () => {
    try {
      await axios.post("/orders/auto-random-lock");
      toast.success("Auto-random executed");
      fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error("Failed running auto-random");
    }
  };

  // ============================================================
  // LOAD WEEKLY SUMMARY (pakai filter summary)
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
      const list = normalize(res.data); // ambil res.data.data kalau ada
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
    fetchOrders({ page: 1, limit });
    fetchSpares();
    loadSummary(); // auto-load summary saat pertama kali buka
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  // FILTERED ORDERS (by search) — client-side (dari page saat ini)
  // ============================================================
  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;

    const q = search.toLowerCase();
    return orders.filter((o: any) => {
      return (
        o.user?.toLowerCase().includes(q) ||
        o.menu_name?.toLowerCase().includes(q) ||
        o.department?.toLowerCase().includes(q)
      );
    });
  }, [orders, search]);

  // ============================================================
  // GROUPING: Employee → Date → Shift
  // ============================================================
  // GROUPING: Department → Date → Shift → Employee
  const groupedOrders = useMemo(() => {
    const tree: Record<
      string,
      Record<string, Record<string, Record<string, any[]>>>
    > = {};

    filteredOrders.forEach((o: any) => {
      const dept = o.department || "-";
      const date = o.date || "-";
      const shift = o.shift || "-";
      const employee = o.user || "-";

      if (!tree[dept]) tree[dept] = {};
      if (!tree[dept][date]) tree[dept][date] = {};
      if (!tree[dept][date][shift]) tree[dept][date][shift] = {};
      if (!tree[dept][date][shift][employee]) {
        tree[dept][date][shift][employee] = [];
      }

      tree[dept][date][shift][employee].push(o);
    });

    return tree;
  }, [filteredOrders]);

  // ============================================================
  // PAGINATION HANDLERS
  // ============================================================
  const handleChangeRowsPerPage = (value: string) => {
    const num = Number(value);
    if (!num || num <= 0) return;
    setPage(1);
    setLimit(num);
    fetchOrders({ page: 1, limit: num });
  };

  const handleChangePage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    fetchOrders({ page: newPage });
  };

  // ============================================================
  // CLEAR FILTERS
  // ============================================================
  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setTypeFilter("all");
    setStatusFilter("all");
    setShiftFilter("all");
    setPage(1);
    fetchOrders({ page: 1 });
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">
              General Affair — Order Management
            </h1>
            <p className="text-gray-600 text-sm">
              Monitor regular & OT orders, spare meals, dan weekly summary di
              lokasi Anda.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                fetchOrders();
                fetchSpares();
                loadSummary();
              }}
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh All
            </Button>

            <Button onClick={runAutoRandom}>
              <PlayCircle className="w-4 h-4 mr-2" />
              Run Auto-Random
            </Button>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search orders by employee, menu, or department..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* FILTER BAR (sinkron dengan backend listOrders) */}
        <Card className="p-4 space-y-3">
          <div className="text-sm font-semibold text-gray-700">Filters</div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* Date From */}
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Date From</p>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            {/* Date To */}
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Date To</p>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            {/* Type */}
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Type</p>
              <Select
                value={typeFilter}
                onValueChange={(v: any) => setTypeFilter(v)}
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
                onValueChange={(v: any) => setStatusFilter(v)}
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
                onValueChange={(v) => setShiftFilter(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Shifts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {shifts.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>
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
            <Button size="sm" onClick={() => fetchOrders({ page: 1 })}>
              Apply Filters
            </Button>
          </div>
        </Card>

        <Separator />

        {/* ======================================================== */}
        {/* ORDERS TABLE — GROUPED + PAGINATION (Employee → Date → Shift) */}
        {/* ======================================================== */}
        <Card className="p-4 space-y-4">
          {/* HEADER */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Orders (Your Location)</h2>
            <span className="text-xs text-gray-500">
              {filteredOrders.length} records on this page
            </span>
          </div>

          {/* TABLE WRAPPER */}
          <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
            <Table className="min-w-[1100px]">
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="w-[180px] font-bold">
                    Employee
                  </TableHead>
                  <TableHead className="w-[140px] font-bold">Date</TableHead>
                  <TableHead className="w-[110px] font-bold">Shift</TableHead>
                  <TableHead className="w-[220px] font-bold">Menu</TableHead>
                  <TableHead className="w-[120px] font-bold">Type</TableHead>
                  <TableHead className="w-[140px] font-bold">Status</TableHead>
                  <TableHead className="w-[110px] font-bold">Absent</TableHead>
                  <TableHead className="w-[200px] font-bold">
                    Department
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {/* LOADING STATE */}
                {loadingOrders && orders.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-6 text-center text-gray-500"
                    >
                      Loading orders...
                    </TableCell>
                  </TableRow>
                )}

                {/* EMPTY STATE */}
                {!loadingOrders && Object.keys(groupedOrders).length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-6 text-center text-gray-500"
                    >
                      No orders found.
                    </TableCell>
                  </TableRow>
                )}

                {/* GROUPED RENDERING */}
                {/* GROUPED RENDERING */}
                {!loadingOrders &&
                  Object.entries(groupedOrders).map(([dept, dateGroup]) => {
                    const deptRowCount = Object.values(dateGroup).flatMap(
                      (shiftGroup: any) =>
                        Object.values(shiftGroup).flatMap((empGroup: any) =>
                          Object.values(empGroup).flat()
                        )
                    ).length;

                    let deptPrinted = false;

                    return Object.entries(dateGroup).map(
                      ([date, shiftGroup]) => {
                        const dateRowCount = Object.values(shiftGroup).flatMap(
                          (empGroup: any) => Object.values(empGroup).flat()
                        ).length;

                        let datePrinted = false;

                        return Object.entries(shiftGroup).map(
                          ([shift, employeeGroup]) => {
                            const shiftRowCount =
                              Object.values(employeeGroup).flat().length;

                            let shiftPrinted = false;

                            return Object.entries(employeeGroup).map(
                              ([employee, rows]) => {
                                const empRowCount = rows.length;
                                let employeePrinted = false;

                                return rows.map((o: any) => (
                                  <TableRow
                                    key={o.id}
                                    className="align-top hover:bg-gray-50"
                                  >
                                    {/* DEPARTMENT */}
                                    {!deptPrinted && (
                                      <TableCell
                                        rowSpan={deptRowCount}
                                        className="font-semibold bg-gray-50"
                                      >
                                        {dept}
                                      </TableCell>
                                    )}
                                    {(deptPrinted = true)}

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
                                    {!employeePrinted && (
                                      <TableCell rowSpan={empRowCount}>
                                        {employee}
                                      </TableCell>
                                    )}
                                    {(employeePrinted = true)}

                                    {/* MENU */}
                                    <TableCell>{o.menu_name || "-"}</TableCell>

                                    {/* TYPE */}
                                    <TableCell>
                                      <Badge variant="outline">
                                        {(o.type || "").toUpperCase()}
                                      </Badge>
                                    </TableCell>

                                    {/* STATUS */}
                                    <TableCell>
                                      {renderOrderStatus(o.status)}
                                    </TableCell>

                                    {/* ABSENT */}
                                    <TableCell>
                                      {o.absent ? (
                                        <Badge className="bg-gray-200 text-gray-800">
                                          Yes
                                        </Badge>
                                      ) : (
                                        <span className="text-xs text-gray-500">
                                          -
                                        </span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ));
                              }
                            );
                          }
                        );
                      }
                    );
                  })}
              </TableBody>
            </Table>

            {/* PAGINATION BAR */}
            <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <p className="text-sm text-gray-600">
                Showing <b>{filteredOrders.length}</b> of <b>{totalItems}</b>{" "}
                orders
              </p>

              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <Select
                  value={String(limit)}
                  onValueChange={handleChangeRowsPerPage}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Rows per page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 / page</SelectItem>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="20">20 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                  </SelectContent>
                </Select>

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
          </div>
        </Card>

        {/* ======================================================== */}
        {/* SPARE ORDERS - CARDS (UNCHANGED) */}
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
        {/* WEEKLY SUMMARY – CARD VIEW LIKE VENDOR (UNCHANGED) */}
        {/* ======================================================== */}
        <Card className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold">Weekly Summary</h2>
              <p className="text-xs text-gray-500">
                Rekap total pesanan per menu per hari di lokasi Anda.
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

                    // hitung absent hanya untuk display internal, tidak untuk total
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
// SMALL HELPERS
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
