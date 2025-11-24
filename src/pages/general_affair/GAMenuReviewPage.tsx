import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogContent,
} from "@/components/ui/dialog";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent,
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

const API_BASE = "http://localhost:4000";

// ========================= TYPES ===========================

interface Vendor {
  id: number;
  name: string;
  location_id?: number;
}

interface Shift {
  id: number;
  name: string;
}

interface Tray {
  id: number;
  name: string;
}

interface Menu {
  id: number;
  vendor_id: number;
  shift_id: number;
  tray_id: number;
  service_date: string;

  type: string;
  nama_menu: string;

  karbohidrat?: string | null;
  pendamping1?: string | null;
  pendamping2?: string | null;
  pendamping3?: string | null;
  extrafood?: string | null;
  buah?: string | null;

  status: string;
  revision_note?: string | null;

  vendor?: Vendor;
  shift?: Shift;
  tray?: Tray;
}

// ========================= COMPONENT ===========================

export default function GAMenuReviewPage() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const gaLocationId = user?.location_id;

  // ====================== STATE =======================
  const [menus, setMenus] = useState<Menu[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const [loading, setLoading] = useState(false);

  // filter states
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // pagination (server-side)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // review modal
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "revision">(
    "approve"
  );
  const [reviewNote, setReviewNote] = useState("");
  const [reviewDialog, setReviewDialog] = useState(false);

  const authHeaders: HeadersInit = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // ====================== FETCH MENUS (SERVER PAGINATION) =======================

const fetchMenus = async () => {
  try {
    setLoading(true);

    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    if (gaLocationId) params.append("location_id", String(gaLocationId));

    if (vendorFilter !== "all") params.append("vendor_id", vendorFilter);
    if (shiftFilter !== "all") params.append("shift_id", shiftFilter);
    if (typeFilter !== "all") params.append("type", typeFilter);
    if (statusFilter !== "all") params.append("status", statusFilter);
    if (search.trim()) params.append("search", search.trim());
    if (dateFrom) params.append("start_date", dateFrom);
    if (dateTo) params.append("end_date", dateTo);

    const res = await fetch(`${API_BASE}/api/menus?${params.toString()}`, {
      headers: authHeaders,
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Failed loading menus");

    const list: Menu[] = Array.isArray(result.data) ? result.data : [];

    // ===========================================
    // GA FILTER → ONLY SHOW NON-DRAFT MENUS
    // ===========================================
    const allowedStatuses = [
      "submitted",
      "revision_required",
      "approved",
      "auto_approved",
    ];

    const listFilteredForGA = list.filter((m) =>
      allowedStatuses.includes(m.status)
    );

    // location-based (if needed)
    const filteredByLoc = listFilteredForGA.filter((m) => {
      if (!gaLocationId) return true;
      const menuLoc = (m as any).location_id ?? m.vendor?.location_id ?? null;
      return menuLoc === gaLocationId;
    });

    setMenus(filteredByLoc);

    const pagination = result.pagination || {};
    setTotalPages(pagination.totalPages || 1);
    setTotalItems(pagination.total || filteredByLoc.length);
  } catch (err) {
    console.error(err);
    toast.error("Failed loading menus");
  } finally {
    setLoading(false);
  }
};


  const fetchVendors = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/vendors`, {
        headers: authHeaders,
      });
      if (!res.ok) return;
      const result = await res.json();
      const list = Array.isArray(result) ? result : result.data ?? [];

      const filtered = gaLocationId
        ? list.filter((v: Vendor) => v.location_id === gaLocationId)
        : list;

      setVendors(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchShifts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/shifts`, {
        headers: authHeaders,
      });
      if (!res.ok) return;
      const result = await res.json();
      setShifts(result.data ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  // initial load
  useEffect(() => {
    fetchVendors();
    fetchShifts();
  }, []);

  // reload when filters / page / limit change
  useEffect(() => {
    fetchMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    limit,
    vendorFilter,
    shiftFilter,
    typeFilter,
    statusFilter,
    search,
    dateFrom,
    dateTo,
  ]);

  // ====================== STATS =======================

  const stats = useMemo(() => {
    return {
      total: menus.length,
      submitted: menus.filter((m) => m.status === "submitted").length,
      revision: menus.filter((m) => m.status === "revision_required").length,
      approved: menus.filter(
        (m) => m.status === "approved" || m.status === "auto_approved"
      ).length,
    };
  }, [menus, totalItems]);

  // ======================= GROUPING (date → vendor → shift → menus) =======================

  const grouped = useMemo(() => {
    const result: Record<string, Record<number, Record<number, Menu[]>>> = {};

    menus.forEach((m) => {
      const dateKey = m.service_date;

      if (!result[dateKey]) result[dateKey] = {};
      if (!result[dateKey][m.vendor_id]) result[dateKey][m.vendor_id] = {};
      if (!result[dateKey][m.vendor_id][m.shift_id])
        result[dateKey][m.vendor_id][m.shift_id] = [];

      result[dateKey][m.vendor_id][m.shift_id].push(m);
    });

    return result;
  }, [menus]);

  // ====================== ACTIONS =======================

  const openReviewDialog = (menu: Menu, action: "approve" | "revision") => {
    setSelectedMenu(menu);
    setReviewAction(action);
    setReviewNote(menu.revision_note ?? "");
    setReviewDialog(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedMenu) return;

    try {
      const url = `${API_BASE}/api/menus/${selectedMenu.id}/review`;
      const body =
        reviewAction === "approve"
          ? { status: "approved" }
          : { status: "revision_required", note: reviewNote };

      const res = await fetch(url, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      toast.success(
        reviewAction === "approve" ? "Menu approved" : "Revision requested"
      );

      setReviewDialog(false);
      fetchMenus();
    } catch (err: any) {
      toast.error(err.message ?? "Failed reviewing menu");
    }
  };

  const handleApproveAll = async () => {
    if (!confirm("Approve all submitted menus for your location?")) return;

    try {
      const params = new URLSearchParams();
      if (gaLocationId) params.append("location_id", String(gaLocationId));

      const res = await fetch(
        `${API_BASE}/api/menus/approve-all${
          params.toString() ? `?${params.toString()}` : ""
        }`,
        {
          method: "POST",
          headers: authHeaders,
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      toast.success(result.message ?? "All menus approved");
      fetchMenus();
    } catch (err: any) {
      toast.error(err.message ?? "Failed approve all");
    }
  };

  const handleChangePage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  const handleChangeLimit = (value: string) => {
    const num = Number(value);
    setLimit(num);
    setPage(1);
  };

  // ====================== JSX =======================

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between gap-3 md:items-center">
          <div>
            <h1 className="text-3xl font-bold">GA Menu Review</h1>
            <p className="text-gray-600 text-sm">
              Review vendor menus (grouped by date, vendor, and shift — filtered
              by your location).
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={fetchMenus}>
              <RefreshCcw className="w-4 h-4 mr-2" />{" "}
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button size="sm" onClick={handleApproveAll}>
              <CheckCircle2 className="w-4 h-4 mr-2" /> Approve All
            </Button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total" value={stats.total} />
          <Stat label="Submitted" value={stats.submitted} />
          <Stat label="Revision" value={stats.revision} />
          <Stat label="Approved" value={stats.approved} />
        </div>

        {/* FILTER BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {/* Vendor */}
          <Select
            value={vendorFilter}
            onValueChange={(v) => {
              setVendorFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Vendor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {vendors.map((v) => (
                <SelectItem key={v.id} value={String(v.id)}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Shift */}
          <Select
            value={shiftFilter}
            onValueChange={(v) => {
              setShiftFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Shift" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shifts</SelectItem>
              {shifts.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type */}
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
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="healthy">Healthy</SelectItem>
              <SelectItem value="special">Special</SelectItem>
              {/* random sengaja tidak ditampilkan di GA review */}
            </SelectContent>
          </Select>

          {/* Status */}
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
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="revision_required">Revision</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="auto_approved">Auto Approved</SelectItem>
            </SelectContent>
          </Select>

          {/* Date range */}
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* SEARCH */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search menu name..."
            className="pl-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <Separator />

        {/* TABLE */}
        <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-bold text-gray-700 w-[120px]">
                  Date
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[150px]">
                  Vendor
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[120px]">
                  Shift
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[120px]">
                  Tray Menu
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[120px]">
                  Menu Type
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[200px]">
                  Menu Name
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[320px]">
                  Description
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[200px]">
                  Status
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[180px]">
                  Notes
                </TableHead>
                <TableHead className="text-right font-bold text-gray-700 w-[150px]">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading && menus.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="py-6 text-center text-gray-500"
                  >
                    Loading menus...
                  </TableCell>
                </TableRow>
              )}

              {!loading && Object.keys(grouped).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="py-6 text-center text-gray-500"
                  >
                    No menus found
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                Object.entries(grouped).map(([date, vendorsGroup]) => {
                  // total rows for this date
                  const dateRowCount = Object.values(vendorsGroup).flatMap(
                    (shiftsGroup) => Object.values(shiftsGroup).flat()
                  ).length;

                  let datePrinted = false;

                  return Object.entries(vendorsGroup).map(
                    ([vendorId, shiftsGroup]) => {
                      const vendorName =
                        menus.find((x) => x.vendor_id === Number(vendorId))
                          ?.vendor?.name ?? "-";

                      const vendorRowCount = Object.values(shiftsGroup).flatMap(
                        (arr) => arr
                      ).length;

                      let vendorPrinted = false;

                      return Object.entries(shiftsGroup).map(([_, rows]) => {
                        const shiftName = rows[0].shift?.name ?? "-";
                        const shiftRowCount = rows.length;

                        let shiftPrinted = false;

                        return rows.map((m) => (
                          <TableRow key={m.id}>
                            {/* DATE (merged) */}
                            {!datePrinted && (
                              <TableCell
                                rowSpan={dateRowCount}
                                className="font-bold bg-gray-100"
                              >
                                {date}
                              </TableCell>
                            )}
                            {(datePrinted = true)}

                            {/* VENDOR (merged under date) */}
                            {!vendorPrinted && (
                              <TableCell
                                rowSpan={vendorRowCount}
                                className="font-semibold"
                              >
                                {vendorName}
                              </TableCell>
                            )}
                            {(vendorPrinted = true)}

                            {/* SHIFT (merged under vendor) */}
                            {!shiftPrinted && (
                              <TableCell rowSpan={shiftRowCount}>
                                {shiftName}
                              </TableCell>
                            )}
                            {(shiftPrinted = true)}

                            {/* MENU DETAILS */}
                            <TableCell>{m.tray?.name}</TableCell>
                            <TableCell className="capitalize">
                              {m.type}
                            </TableCell>
                            <TableCell>{m.nama_menu}</TableCell>
                            <TableCell>
                              {[
                                m.karbohidrat,
                                m.pendamping1,
                                m.pendamping2,
                                m.pendamping3,
                                m.extrafood,
                                m.buah,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </TableCell>
                            <TableCell>{renderStatus(m.status)}</TableCell>
                            <TableCell>{m.revision_note ?? "-"}</TableCell>

                            {/* ACTIONS */}
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-yellow-300 text-yellow-700"
                                  onClick={() =>
                                    openReviewDialog(m, "revision")
                                  }
                                >
                                  <AlertTriangle className="w-4 h-4 mr-1" />{" "}
                                  Revision
                                </Button>

                                <Button
                                  size="sm"
                                  onClick={() => openReviewDialog(m, "approve")}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />{" "}
                                  Approve
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ));
                      });
                    }
                  );
                })}
            </TableBody>
          </Table>

          {/* PAGINATION BAR */}
          <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <p className="text-sm text-gray-600">
              Showing <b>{menus.length}</b> of <b>{totalItems}</b> menus
            </p>

            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <Select value={String(limit)} onValueChange={handleChangeLimit}>
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

        {/* REVIEW MODAL */}
        <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {reviewAction === "approve"
                  ? "Approve Menu"
                  : "Request Revision"}
              </DialogTitle>
            </DialogHeader>

            {selectedMenu && (
              <div className="space-y-3">
                <div className="text-sm font-semibold">
                  {selectedMenu.nama_menu}
                </div>
                <div className="text-xs text-gray-500">
                  {selectedMenu.service_date} • {selectedMenu.vendor?.name}
                </div>

                {reviewAction === "revision" && (
                  <textarea
                    className="w-full rounded-md border p-2 text-sm h-28"
                    value={reviewNote}
                    placeholder="Write revision note..."
                    onChange={(e) => setReviewNote(e.target.value)}
                  />
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitReview}>
                {reviewAction === "approve" ? "Approve" : "Send Revision"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// ======================= SMALL COMPONENTS =========================

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 bg-white border rounded-lg shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function renderStatus(status: string) {
  switch (status) {
    case "submitted":
      return (
        <Badge className="bg-blue-100 text-blue-700">
          <Clock className="w-3 h-3 mr-1" /> Submitted
        </Badge>
      );
    case "revision_required":
      return (
        <Badge className="bg-yellow-100 text-yellow-700">
          <AlertTriangle className="w-3 h-3 mr-1" /> Revision
        </Badge>
      );
    case "approved":
      return (
        <Badge className="bg-green-100 text-green-700">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
        </Badge>
      );
    case "auto_approved":
      return (
        <Badge className="bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Auto Approved
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
}
