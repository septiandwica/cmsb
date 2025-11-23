// src/pages/orders/AdminDepartmentOrderManagement.tsx

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

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { Search, RefreshCcw, BellRing } from "lucide-react";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { toast } from "sonner";

export default function AdminDepartmentOrderManagement() {
  const [orders, setOrders] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [loadingNotif, setLoadingNotif] = useState(false);

  const [search, setSearch] = useState("");

  // ====== FILTERS ======
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "regular" | "ot">("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "confirmed" | "auto_random"
  >("all");
  const [shiftFilter, setShiftFilter] = useState<string>("all");
  const [shifts, setShifts] = useState<any[]>([]);

  const [page, setPage] = useState(1);
const [limit, setLimit] = useState(10);
const [totalItems, setTotalItems] = useState(0);
const [totalPages, setTotalPages] = useState(1);

const [loadingOrders, setLoadingOrders] = useState(false);
  // ============================================================
  // Normalize helper
  // ============================================================
  const normalize = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.reminders)) return data.reminders;
    return [];
  };

  // ============================================================
  // FETCH SHIFTS
  // ============================================================
  const fetchShifts = async () => {
    try {
      const res = await axios.get("/shifts");
      setShifts(normalize(res.data));
    } catch {}
  };

  // ============================================================
  // FETCH ORDERS
  // ============================================================
const fetchOrders = async () => {
  try {
    setLoadingOrders(true);

    const params: any = { page, limit };

    if (dateFrom) params.start_date = dateFrom;
    if (dateTo) params.end_date = dateTo;
    if (shiftFilter !== "all") params.shift_id = shiftFilter;
    if (typeFilter !== "all") params.type = typeFilter;
    if (statusFilter !== "all") params.status = statusFilter;

    const res = await axios.get("/orders/list", { params });

    setOrders(normalize(res.data.data));
    setTotalItems(res.data.pagination.total);
    setTotalPages(res.data.pagination.total_pages);
  } catch {
    toast.error("Failed to fetch orders");
  } finally {
    setLoadingOrders(false);
  }
};

  // ============================================================
  // GET SUMMARY (NO NOTIF)
  // ============================================================
  const getPendingSummary = async () => {
    try {
      const res = await axios.get("/orders/pending-department");
      setSummary(normalize(res.data));
    } catch {
      toast.error("Failed to load pending summary");
    }
  };

  // ============================================================
  // SEND NOTIFICATION
  // ============================================================
  const sendNotification = async () => {
    try {
      setLoadingNotif(true);
      const res = await axios.post("/orders/notify-pending");

      toast.success(res.data.message || "Notifications sent");

      // reload summary
      getPendingSummary();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed sending notification"
      );
    } finally {
      setLoadingNotif(false);
    }
  };

  // ============================================================
  // ON LOAD
  // ============================================================
  useEffect(() => {
    fetchShifts();
    fetchOrders();
    getPendingSummary(); // auto load summary
  }, []);


  
  // ============================================================
  // CLIENT-SIDE SEARCH
  // ============================================================
  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();

    return orders.filter(
      (o: any) =>
        o.user?.toLowerCase().includes(q) ||
        o.menu_name?.toLowerCase().includes(q)
    );
  }, [search, orders]);

  // ============================================================
  // CLEAR FILTERS
  // ============================================================
  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setTypeFilter("all");
    setStatusFilter("all");
    setShiftFilter("all");
    fetchOrders();
  };

  const handleChangePage = (newPage: number) => {
  if (newPage < 1 || newPage > totalPages) return;
  setPage(newPage);
  fetchOrders();
};

// CHANGE ROWS PER PAGE
const handleChangeRowsPerPage = (value: string) => {
  const newLimit = Number(value);
  setLimit(newLimit);
  setPage(1);
  fetchOrders();
};

  const groupedOrders = useMemo(() => {
  const tree: Record<
    string,
    Record<string, Record<string, any[]>>
  > = {};

  filteredOrders.forEach((o: any) => {
    const date = o.date || "-";
    const shift = o.shift || "-";
    const employee = o.user || "-";

    if (!tree[date]) tree[date] = {};
    if (!tree[date][shift]) tree[date][shift] = {};
    if (!tree[date][shift][employee]) tree[date][shift][employee] = [];

    tree[date][shift][employee].push(o);
  });

  return tree;
}, [filteredOrders]);

const departmentStats = useMemo(() => {
  // struktur: { [department]: { totalOrders, totalOT, employees: Set } }
  const map: Record<
    string,
    {
      totalOrders: number;
      totalOT: number;
      employees: Set<string>;
    }
  > = {};

  filteredOrders.forEach((o: any) => {
    const dept = o.department || "Unknown Dept";
    const empName = o.user || "-";
    const type = o.type || "";

    if (!map[dept]) {
      map[dept] = {
        totalOrders: 0,
        totalOT: 0,
        employees: new Set<string>(),
      };
    }

    map[dept].totalOrders += 1;
    if (type === "ot") {
      map[dept].totalOT += 1;
    }
    if (empName !== "-") {
      map[dept].employees.add(empName);
    }
  });

  // convert ke array biar gampang di-render
  return Object.entries(map).map(([department, v]) => ({
    department,
    totalOrders: v.totalOrders,
    totalOT: v.totalOT,
    totalEmployees: v.employees.size,
  }));
}, [filteredOrders]);

  // ============================================================
  // RENDER UI
  // ============================================================
  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">
              Admin Department — Order Management
            </h1>
            <p className="text-gray-600 text-sm">
              Manage and monitor orders for your department.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchOrders}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh Orders
            </Button>

            <Button onClick={sendNotification} disabled={loadingNotif}>
              <BellRing className="w-4 h-4 mr-2" />
              {loadingNotif ? "Sending..." : "Notify Pending Users"}
            </Button>
          </div>
        </div>


        {/* SEARCH */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            className="pl-10"
            placeholder="Search employee or menu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {/* STATS PER DEPARTMENT */}
{departmentStats.length > 0 && (
  <Card className="p-4 bg-white border shadow-sm">
    <h2 className="text-sm font-semibold mb-3 text-gray-700">
      Department Order Stats (filtered)
    </h2>

    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {departmentStats.map((s) => (
        <div
          key={s.department}
          className="border rounded-lg p-3 bg-gray-50 flex flex-col gap-1"
        >
          <p className="text-xs font-semibold text-gray-700 truncate">
            {s.department}
          </p>

          <p className="text-xs text-gray-500">Total Orders</p>
          <p className="text-lg font-bold text-gray-900">
            {s.totalOrders}
          </p>

          <div className="flex justify-between text-xs mt-1">
            <span className="text-gray-500">OT Employees</span>
            <span className="font-semibold">{s.totalOT}</span>
          </div>

          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Unique Employees</span>
            <span className="font-semibold">{s.totalEmployees}</span>
          </div>
        </div>
      ))}
    </div>
  </Card>
)}


        {/* FILTER BAR */}
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <p className="text-xs text-gray-500">Date From</p>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <p className="text-xs text-gray-500">Date To</p>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div>
              <p className="text-xs text-gray-500">Type</p>
              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="ot">OT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-xs text-gray-500">Status</p>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="auto_random">Auto Random</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-xs text-gray-500">Shift</p>
              <Select
                value={shiftFilter}
                onValueChange={(v) => setShiftFilter(v)}
              >
                <SelectTrigger>
                  <SelectValue />
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
              Clear
            </Button>
            <Button size="sm" onClick={fetchOrders}>
              Apply
            </Button>
          </div>
        </Card>

        <Separator />

        {/* ORDERS TABLE */}
        {/* TABLE WRAPPER */}
<div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
  <Table className="min-w-[1100px]">
    <TableHeader>
      <TableRow className="bg-gray-100">
        <TableHead className="w-[200px] font-bold">Department</TableHead>
        <TableHead className="w-[140px] font-bold">Date</TableHead>
        <TableHead className="w-[110px] font-bold">Shift</TableHead>
        <TableHead className="w-[180px] font-bold">Employee</TableHead>
        <TableHead className="w-[220px] font-bold">Menu</TableHead>
        <TableHead className="w-[120px] font-bold">Type</TableHead>
        <TableHead className="w-[140px] font-bold">Status</TableHead>
        <TableHead className="w-[110px] font-bold">Absent</TableHead>
      </TableRow>
    </TableHeader>

    <TableBody>
      {/* LOADING */}
      {loadingOrders && orders.length === 0 && (
        <TableRow>
          <TableCell colSpan={8} className="py-6 text-center text-gray-500">
            Loading orders...
          </TableCell>
        </TableRow>
      )}

      {/* EMPTY */}
      {!loadingOrders && Object.keys(groupedOrders).length === 0 && (
        <TableRow>
          <TableCell colSpan={8} className="py-6 text-center text-gray-500">
            No orders found.
          </TableCell>
        </TableRow>
      )}

     {/* GROUPED RENDERING */}
{!loadingOrders &&
  Object.entries(groupedOrders).map(([date, shiftGroup]) => {
    const dateRowCount = Object.values(shiftGroup).flatMap((empGroup: any) =>
      Object.values(empGroup).flat()
    ).length;

    let datePrinted = false;

    return Object.entries(shiftGroup).map(([shift, employeeGroup]) => {
      const shiftRowCount = Object.values(employeeGroup).flat().length;
      let shiftPrinted = false;

      return Object.entries(employeeGroup).map(([employee, rows]) => {
        const empRowCount = rows.length;
        let employeePrinted = false;

        return rows.map((o: any) => (
          <TableRow key={o.id} className="align-top hover:bg-gray-50">

            {/* DATE */}
            {!datePrinted && (
              <TableCell rowSpan={dateRowCount} className="font-medium">
                {date}
              </TableCell>
            )}
            {(datePrinted = true)}

            {/* SHIFT */}
            {!shiftPrinted && (
              <TableCell rowSpan={shiftRowCount}>{shift}</TableCell>
            )}
            {(shiftPrinted = true)}

            {/* EMPLOYEE */}
            {!employeePrinted && (
              <TableCell rowSpan={empRowCount}>{employee}</TableCell>
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
            <TableCell>{renderStatus(o.status)}</TableCell>

            {/* ABSENT */}
            <TableCell>
              {o.absent ? (
                <Badge className="bg-gray-200 text-gray-800">Yes</Badge>
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

  {/* PAGINATION */}
  <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
    <p className="text-sm text-gray-600">
      Showing <b>{filteredOrders.length}</b> of <b>{totalItems}</b> orders
    </p>

    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
      <Select value={String(limit)} onValueChange={handleChangeRowsPerPage}>
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

        {/* SUMMARY */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">
            Employees Who Haven't Ordered Next Week
          </h2>

          {summary.length === 0 ? (
            <p className="text-sm text-gray-500">
              Everyone in your department has ordered.
            </p>
          ) : (
            summary.map((item: any, idx: number) => (
              <div
                key={item.department ?? idx}
                className="space-y-2 border rounded-md p-3 bg-white"
              >
                <div className="font-semibold text-gray-700">
                  {item.department || "Your Department"} — {item.pending_count}{" "}
                  pending
                </div>

                <div className="space-y-1">
                  {item.pending_users.map((u: any, uIdx: number) => (
                    <p key={u.id ?? uIdx} className="text-sm text-gray-600">
                      • {u.name} — {u.email}
                    </p>
                  ))}
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}

function renderStatus(status: string) {
  switch (status) {
    case "confirmed":
      return (
        <Badge className="bg-green-100 text-green-700 border-none">
          Confirmed
        </Badge>
      );
    case "auto_random":
      return (
        <Badge className="bg-amber-100 text-amber-700 border-none">
          Auto Random
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
