import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Pencil,
  Plus,
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
  DialogDescription,
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

export default function AdminMenuManagementPage() {
  const token = localStorage.getItem("token");

  // ====================== STATE =======================
  const [menus, setMenus] = useState<Menu[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [trays, setTrays] = useState<Tray[]>([]);

  const [loading, setLoading] = useState(false);

  // server-side filter states
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // server-side pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // form / modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);

  const [formData, setFormData] = useState({
    vendor_id: "",
    shift_id: "",
    tray_id: "",
    service_date: "",
    type: "regular",
    nama_menu: "",
    karbohidrat: "",
    pendamping1: "",
    pendamping2: "",
    pendamping3: "",
    extrafood: "",
    buah: "",
    status: "draft", // dipakai saat edit, create tetap pakai "draft"
  });

  const authHeaders: HeadersInit = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // ====================== FETCH DATA (SERVER-SIDE PAGINATION) =======================

  const fetchMenus = async () => {
    try {
      setLoading(true);

     const params = new URLSearchParams({
  page: String(page),
  limit: String(limit),
});

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

      const list: Menu[] = result.data ?? [];
      const pagination = result.pagination ?? {
        total: list.length,
        page: 1,
        limit,
        totalPages: 1,
      };

      setMenus(list);
      setTotalItems(pagination.total);
      setTotalPages(pagination.totalPages || 1);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Failed loading menus");
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
      setVendors(list);
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

  const fetchTrays = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/trays`, {
        headers: authHeaders,
      });
      if (!res.ok) return;

      const result = await res.json();
      const list = Array.isArray(result) ? result : result.data ?? [];
      setTrays(list);
    } catch (err) {
      console.error(err);
    }
  };

  // init: fetch master data
  useEffect(() => {
    fetchVendors();
    fetchShifts();
    fetchTrays();
  }, []);

  // refetch menus whenever filter / sort / pagination berubah
  useEffect(() => {
    fetchMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    vendorFilter,
    shiftFilter,
    typeFilter,
    statusFilter,
    search,
    dateFrom,
    dateTo,
    page,
    limit,
  ]);

  // ====================== STATS (dinamis + ikut filter & pagination) =======================

  const stats = useMemo(() => {
    return {
      // total sesuai jumlah row di halaman ini
      total: menus.length,

      submitted: menus.filter((m) => m.status === "submitted").length,
      revision: menus.filter((m) => m.status === "revision_required").length,
      approved: menus.filter(
        (m) => m.status === "approved" || m.status === "auto_approved"
      ).length,
    };
  }, [menus]);

  // ====================== GROUPING (Date → Vendor → Shift) =======================

  const grouped = useMemo(() => {
    const result: Record<string, Record<number, Record<number, Menu[]>>> = {};

    menus.forEach((m) => {
      const dateKey = m.service_date;

      if (!result[dateKey]) result[dateKey] = {};
      if (!result[dateKey][m.vendor_id]) result[dateKey][m.vendor_id] = {};
      if (!result[dateKey][m.vendor_id][m.shift_id]) {
        result[dateKey][m.vendor_id][m.shift_id] = [];
      }

      result[dateKey][m.vendor_id][m.shift_id].push(m);
    });

    return result;
  }, [menus]);


  // ====================== PAGINATION HANDLER =======================

  const handleChangeRowsPerPage = (value: string) => {
    const num = Number(value);
    if (!num || num <= 0) return;
    setLimit(num);
    setPage(1);
  };

  const handleChangePage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  // ====================== FORM HELPERS =======================

  const resetForm = () => {
    setSelectedMenu(null);
    setFormData({
      vendor_id: "",
      shift_id: "",
      tray_id: "",
      service_date: "",
      type: "regular",
      nama_menu: "",
      karbohidrat: "",
      pendamping1: "",
      pendamping2: "",
      pendamping3: "",
      extrafood: "",
      buah: "",
      status: "draft",
    });
  };

  const openCreateModal = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditModal = (menu: Menu) => {
    setSelectedMenu(menu);
    setFormData({
      vendor_id: String(menu.vendor_id),
      shift_id: String(menu.shift_id),
      tray_id: String(menu.tray_id),
      service_date: menu.service_date,
      type: menu.type,
      nama_menu: menu.nama_menu,
      karbohidrat: menu.karbohidrat ?? "",
      pendamping1: menu.pendamping1 ?? "",
      pendamping2: menu.pendamping2 ?? "",
      pendamping3: menu.pendamping3 ?? "",
      extrafood: menu.extrafood ?? "",
      buah: menu.buah ?? "",
      status: menu.status,
    });
    setIsFormOpen(true);
  };

  // ====================== CRUD ACTIONS =======================

  const handleSubmitForm = async () => {
    if (
      !formData.vendor_id ||
      !formData.shift_id ||
      !formData.tray_id ||
      !formData.service_date ||
      !formData.nama_menu
    ) {
      toast.warning("Vendor, shift, tray, date & name are required");
      return;
    }

    const isEdit = !!selectedMenu;
    const url = isEdit
      ? `${API_BASE}/api/menus/${selectedMenu!.id}`
      : `${API_BASE}/api/menus`;
    const method = isEdit ? "PUT" : "POST";

    const payload: any = {
      vendor_id: Number(formData.vendor_id),
      shift_id: Number(formData.shift_id),
      tray_id: Number(formData.tray_id),
      service_date: formData.service_date,
      type: formData.type,
      nama_menu: formData.nama_menu,
      karbohidrat: formData.karbohidrat || null,
      pendamping1: formData.pendamping1 || null,
      pendamping2: formData.pendamping2 || null,
      pendamping3: formData.pendamping3 || null,
      extrafood: formData.extrafood || null,
      buah: formData.buah || null,
      // RULE: create -> selalu draft, edit -> boleh ubah status
      status: isEdit ? formData.status : "draft",
    };

    try {
      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(result.message || "Failed saving menu");
      }

      toast.success(isEdit ? "Menu updated" : "Menu created");
      setIsFormOpen(false);
      resetForm();
      setPage(1);
      fetchMenus();
    } catch (err: any) {
      toast.error(err.message ?? "Failed saving menu");
    }
  };

  const handleDeleteMenu = async () => {
    if (!selectedMenu) return;

    try {
      const res = await fetch(`${API_BASE}/api/menus/${selectedMenu.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(result.message || "Failed deleting menu");
      }

      toast.success("Menu deleted");
      setIsDeleteOpen(false);
      setSelectedMenu(null);

      if (menus.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        fetchMenus();
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed deleting menu");
    }
  };

  const handleExportCsv = () => {
    if (menus.length === 0) {
      toast.warning("No data to export");
      return;
    }

    const header = [
      "Date",
      "Vendor",
      "Shift",
      "Tray",
      "Name",
      "Type",
      "Status",
      "Karbohidrat",
      "Pendamping1",
      "Pendamping2",
      "Pendamping3",
      "Extrafood",
      "Buah",
      "Revision Note",
    ];

    const rows = menus.map((m) => [
      m.service_date,
      m.vendor?.name ?? "",
      m.shift?.name ?? "",
      m.tray?.name ?? "",
      m.nama_menu,
      m.type,
      m.status,
      m.karbohidrat ?? "",
      m.pendamping1 ?? "",
      m.pendamping2 ?? "",
      m.pendamping3 ?? "",
      m.extrafood ?? "",
      m.buah ?? "",
      m.revision_note ?? "",
    ]);

    const csvContent = [header, ...rows]
      .map((row) =>
        row
          .map((val) => {
            const s = String(val ?? "");
            return `"${s.replace(/"/g, '""')}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-menu-management-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ====================== JSX =======================

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between gap-3 md:items-center">
          <div>
            <h1 className="text-3xl font-bold">Admin Menu Management</h1>
            <p className="text-gray-600 text-sm">
              Full CRUD & monitoring semua menu. Tabel dikelompokkan per{" "}
              <b>tanggal → vendor → shift</b> agar lebih mudah dibaca.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={menus.length === 0}
            >
              Export CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchMenus}
              disabled={loading}
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              {loading ? "Refreshing..." : "Refresh"}
            </Button>

            <Button size="sm" onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" /> Create Menu
            </Button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total " value={stats.total} />
          <Stat label="Submitted " value={stats.submitted} />
          <Stat label="Revision" value={stats.revision} />
          <Stat label="Approved" value={stats.approved} />
        </div>

        {/* FILTER BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {/* vendor */}
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

          {/* shift */}
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

          {/* type */}
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
            </SelectContent>
          </Select>

          {/* status */}
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
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="revision_required">Revision</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="auto_approved">Auto Approved</SelectItem>
            </SelectContent>
          </Select>

          {/* date filters */}
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

        <Separator className="my-4" />

        {/* TABLE */}
        <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="w-[120px]">Date
                </TableHead>
                <TableHead className="w-[120px]">Vendor
                </TableHead>
                <TableHead className="w-[110px]">Shift</TableHead>
                <TableHead className="w-[140px]">Tray Menu</TableHead>
                <TableHead className="w-[120px]">Type
                </TableHead>
                <TableHead className="w-[200px]">Menu Name
                </TableHead>
                <TableHead className="w-[320px]">Description</TableHead>
                <TableHead className="w-[120px]"> Status
                </TableHead>
                <TableHead className="w-[200px]">Revision Note</TableHead>
                <TableHead className="text-right w-[140px]">Actions</TableHead>
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
                          <TableRow key={m.id} className="align-top">
                            {/* DATE (merged) */}
                            {!datePrinted && (
                              <TableCell
                                rowSpan={dateRowCount}
                                className="font-semibold bg-gray-50"
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
                                  size="icon"
                                  variant="outline"
                                  onClick={() => openEditModal(m)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>

                                <Button
                                  size="icon"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedMenu(m);
                                    setIsDeleteOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
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

        {/* FORM MODAL (CREATE / EDIT) */}
        <Dialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>
                {selectedMenu ? "Edit Menu" : "Create Menu"}
              </DialogTitle>
              <DialogDescription>
                {selectedMenu
                  ? "Update existing menu data."
                  : "Create new menu. Status will be set to draft."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3">
              {/* Vendor */}
              <Select
                value={formData.vendor_id}
                onValueChange={(v) =>
                  setFormData((f) => ({ ...f, vendor_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Shift */}
              <Select
                value={formData.shift_id}
                onValueChange={(v) =>
                  setFormData((f) => ({ ...f, shift_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Tray */}
              <Select
                value={formData.tray_id}
                onValueChange={(v) =>
                  setFormData((f) => ({ ...f, tray_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tray" />
                </SelectTrigger>
                <SelectContent>
                  {trays.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date + Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  type="date"
                  value={formData.service_date}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      service_date: e.target.value,
                    }))
                  }
                />

                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData((f) => ({ ...f, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="healthy">Healthy</SelectItem>
                    <SelectItem value="special">Special</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Name */}
              <Input
                placeholder="Menu name"
                value={formData.nama_menu}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    nama_menu: e.target.value,
                  }))
                }
              />

              {/* Detail komponen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Karbohidrat"
                  value={formData.karbohidrat}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      karbohidrat: e.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Pendamping 1"
                  value={formData.pendamping1}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      pendamping1: e.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Pendamping 2"
                  value={formData.pendamping2}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      pendamping2: e.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Pendamping 3"
                  value={formData.pendamping3}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      pendamping3: e.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Extrafood"
                  value={formData.extrafood}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      extrafood: e.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Buah"
                  value={formData.buah}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      buah: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Status hanya saat EDIT */}
              {selectedMenu && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">
                    Status (admin can override)
                  </p>
                  <Select
                    value={formData.status}
                    onValueChange={(v) =>
                      setFormData((f) => ({ ...f, status: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="revision_required">
                        Revision Required
                      </SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="auto_approved">
                        Auto Approved
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsFormOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitForm}>
                {selectedMenu ? "Update" : "Create (Draft)"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DELETE CONFIRM */}
        <Dialog
          open={isDeleteOpen}
          onOpenChange={(open) => {
            setIsDeleteOpen(open);
            if (!open) setSelectedMenu(null);
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Menu</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete the
                menu.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteMenu}>
                Delete
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
    case "draft":
      return (
        <Badge className="bg-gray-100 text-gray-700">
          <Clock className="w-3 h-3 mr-1" /> Draft
        </Badge>
      );
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
