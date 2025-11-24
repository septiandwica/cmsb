/* ================================
   VENDOR MENU MANAGEMENT — FINAL VERSION
   Dengan Filtering:
   - Tray tidak muncul jika sudah dipakai (hari + shift sama)
   - Type tidak muncul jika sudah dipakai (hari + shift sama)
   - Random hanya boleh tray cadangan
   - Create menu hanya valid untuk minggu depan (Senin–Jumat)
   - Styling + table + pagination mirip GA Menu Page
   ================================ */

import { useEffect, useState } from "react";
import { Plus, Pencil, Search, RefreshCcw, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationLink,
} from "@/components/ui/pagination";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

import { toast } from "sonner";
import moment from "moment";

const API_URL = "http://localhost:4000/api/menus";

interface Menu {
  id: number;
  service_date: string;
  tray_id: number;
  vendor_id: number;
  shift_id: number;
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
  tray?: { id: number; name: string; is_cadangan?: boolean };
  shift?: { id: number; name: string };
}

interface ApiResponse<T> {
  data: T[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function VendorMenuManagement() {
  const token = localStorage.getItem("token");

  const [menus, setMenus] = useState<Menu[]>([]);
  const [trays, setTrays] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);

  // pagination (GA-style)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // filters
  const [search, setSearch] = useState("");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);

  // constraints tray & type
  const [usedTrayIds, setUsedTrayIds] = useState<number[]>([]);
  const [usedTypes, setUsedTypes] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    tray_id: "",
    shift_id: "",
    service_date: "",
    type: "",
    nama_menu: "",
    karbohidrat: "",
    pendamping1: "",
    pendamping2: "",
    pendamping3: "",
    extrafood: "",
    buah: "",
  });

  const authHeaders: HeadersInit = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  /* ============================
     VALIDATE ONLY NEXT WEEK
     ============================ */
  const isValidNextWeekDate = (date: string) => {
    if (!date) return false;

    const d = moment(date).startOf("day");
    const nextMonday = moment().startOf("day").isoWeekday(8); // Monday next week
    const nextFriday = moment(nextMonday).add(4, "days");

    return d.isBetween(nextMonday, nextFriday, undefined, "[]");
  };

  /* ============================================
     Hitung tray & type yang sudah dipakai per date+shift
     ============================================ */
  const updateUsedConstraints = (
    allMenus: Menu[],
    date: string,
    shiftId: string
  ) => {
    if (!date || !shiftId) {
      setUsedTrayIds([]);
      setUsedTypes([]);
      return;
    }

    const filtered = allMenus.filter(
      (m) => m.service_date === date && String(m.shift_id) === String(shiftId)
    );

    const trays = filtered.map((m) => m.tray_id);
    const types = filtered.map((m) => m.type);

    setUsedTrayIds(trays);
    setUsedTypes(types);
  };

  /* ============================
     FETCH MENUS (server-side pagination + filters)
     ============================ */
  const fetchMenus = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (search.trim()) params.append("search", search.trim());
      if (shiftFilter !== "all") params.append("shift_id", shiftFilter);
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (dateFrom) params.append("start_date", dateFrom);
      if (dateTo) params.append("end_date", dateTo);

      const res = await fetch(`${API_URL}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result: ApiResponse<Menu> = await res.json();
      if (!res.ok) throw new Error((result as any).message || "Failed loading menus");

      const list = Array.isArray(result.data) ? result.data : [];

      setMenus(list);

      const pagination = result.pagination || {
        total: list.length,
        page,
        limit,
        totalPages: 1,
      };

      setTotalItems(pagination.total ?? list.length);
      setTotalPages(pagination.totalPages ?? 1);

      // update constraints sesuai form saat ini
      updateUsedConstraints(list, formData.service_date, formData.shift_id);
    } catch (err) {
      console.error(err);
      toast.error("Failed loading menus");
    }
  };

  const fetchTrays = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/trays", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      setTrays(result.data ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchShifts = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/shifts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      setShifts(result.data ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  // init
  useEffect(() => {
    fetchTrays();
    fetchShifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reload menus when pagination / filters / search change
  useEffect(() => {
    fetchMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search, shiftFilter, typeFilter, statusFilter, dateFrom, dateTo]);

  /* ============================
     CREATE MENU
     ============================ */
  const handleCreate = async () => {
    const required = ["tray_id", "shift_id", "service_date", "nama_menu"];

    for (const f of required) {
      // @ts-ignore
      if (!formData[f]) {
        return toast.warning(`Field '${f}' is required`);
      }
    }

    if (!isValidNextWeekDate(formData.service_date)) {
      return toast.error(
        "Menu hanya dapat dibuat untuk minggu depan (Senin–Jumat)."
      );
    }

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          ...formData,
          tray_id: Number(formData.tray_id),
          shift_id: Number(formData.shift_id),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed creating menu");

      toast.success("Menu created");
      setIsModalOpen(false);
      fetchMenus();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  /* ============================
     REVISE MENU
     ============================ */
  const handleRevise = async () => {
    if (!selectedMenu) return;

    try {
      const res = await fetch(`${API_URL}/${selectedMenu.id}/revise`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          nama_menu: formData.nama_menu,
          karbohidrat: formData.karbohidrat,
          pendamping1: formData.pendamping1,
          pendamping2: formData.pendamping2,
          pendamping3: formData.pendamping3,
          extrafood: formData.extrafood,
          buah: formData.buah,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed revising menu");

      toast.success("Menu revised");
      setIsModalOpen(false);
      fetchMenus();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  /* ============================
     SUBMIT ALL
     ============================ */
  const handleSubmitAll = async () => {
    try {
      const res = await fetch(`${API_URL}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed submitting menus");

      toast.success(result.message || "Menus submitted");
      fetchMenus();
    } catch (err: any) {
      toast.error(err.message || "Failed submitting menus");
    }
  };

  /* ============================
     PAGINATION HANDLERS
     ============================ */
  const handleChangePage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  const handleChangeLimit = (value: string) => {
    const num = Number(value);
    setLimit(num);
    setPage(1);
  };

  /* ============================
     BADGE STATUS
     ============================ */
  const renderStatus = (s: string) => {
    switch (s) {
      case "draft":
        return <Badge className="bg-gray-300 text-black">Draft</Badge>;
      case "submitted":
        return <Badge className="bg-blue-100 text-blue-700">Submitted</Badge>;
      case "revision_required":
        return (
          <Badge className="bg-yellow-100 text-yellow-700">Revision</Badge>
        );
      case "approved":
        return <Badge className="bg-green-100 text-green-700">Approved</Badge>;
      case "auto_approved":
        return (
          <Badge className="bg-emerald-100 text-emerald-700">
            Auto Approved
          </Badge>
        );
      default:
        return <Badge>{s}</Badge>;
    }
  };

  /* ============================
     GROUPING (Date → Shift)
     ============================ */
  const grouped = menus.reduce((acc: any, m: Menu) => {
    if (!acc[m.service_date]) acc[m.service_date] = {};
    const shiftName = m.shift?.name || "-";
    if (!acc[m.service_date][shiftName]) acc[m.service_date][shiftName] = [];
    acc[m.service_date][shiftName].push(m);
    return acc;
  }, {});

  /* ============================
     UI
     ============================ */
  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between gap-3 md:items-center">
          <div>
            <h1 className="text-3xl font-bold">Vendor Menu Management</h1>
            <p className="text-gray-600 text-sm">
              Create draft menus & submit for GA review.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={fetchMenus}>
              <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button size="sm" onClick={handleSubmitAll}>
              <Send className="w-4 h-4 mr-2" /> Submit All
            </Button>
          </div>
        </div>

        {/* FILTER BAR (mirip GA, versi vendor) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
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
              <SelectItem value="random">Random</SelectItem>
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
              <SelectItem value="draft">Draft</SelectItem>
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

          {/* Add Menu button (extra on filter row for easier access on mobile) */}
          <Button
            variant="outline"
            onClick={() => {
              setSelectedMenu(null);
              setFormData({
                tray_id: "",
                shift_id: "",
                service_date: "",
                type: "",
                nama_menu: "",
                karbohidrat: "",
                pendamping1: "",
                pendamping2: "",
                pendamping3: "",
                extrafood: "",
                buah: "",
              });
              setUsedTrayIds([]);
              setUsedTypes([]);
              setIsModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Menu
          </Button>
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

        {/* ======================================================== */}
        {/* VENDOR MENU TABLE — SAME THEME AS GA MENU PAGE */}
        {/* ======================================================== */}

        <Card className="p-4 space-y-4">
          {/* HEADER */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Vendor Menus</h2>
            <span className="text-xs text-gray-500">
              Showing {menus.length} records on this page
            </span>
          </div>

          {/* TABLE WRAPPER */}
          <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-bold text-gray-700 w-[140px]">
                    Date
                  </TableHead>
                  <TableHead className="font-bold text-gray-700 w-[120px]">
                    Shift
                  </TableHead>
                  <TableHead className="font-bold text-gray-700 w-[200px]">
                    Tray
                  </TableHead>
                  <TableHead className="font-bold text-gray-700 w-[220px]">
                    Menu Name
                  </TableHead>
                  <TableHead className="font-bold text-gray-700 w-[110px]">
                    Type
                  </TableHead>
                  <TableHead className="font-bold text-gray-700 w-[140px]">
                    Status
                  </TableHead>
                  <TableHead className="font-bold text-gray-700 w-[220px]">
                    Revision Note
                  </TableHead>
                  <TableHead className="text-right font-bold text-gray-700 w-[150px]">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {/* EMPTY */}
                {menus.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-6 text-center text-gray-500"
                    >
                      No menus found.
                    </TableCell>
                  </TableRow>
                )}

                {/* GROUPED BY DATE → SHIFT */}
                {Object.keys(grouped).length > 0 &&
                  Object.entries(grouped).map(([date, shiftGroup]: any) => {
                    const dateRowCount = Object.values(shiftGroup)
                      .flat()
                      .length;
                    let datePrinted = false;

                    return Object.entries(shiftGroup).map(
                      ([shiftName, rows]: any) => {
                        const shiftRowCount = rows.length;
                        let shiftPrinted = false;

                        return rows.map((m: Menu) => (
                          <TableRow
                            key={m.id}
                            className="align-top hover:bg-gray-50"
                          >
                            {/* DATE MERGED */}
                            {!datePrinted && (
                              <TableCell
                                rowSpan={dateRowCount}
                                className="font-bold bg-gray-50"
                              >
                                {date}
                              </TableCell>
                            )}
                            {(datePrinted = true)}

                            {/* SHIFT MERGED */}
                            {!shiftPrinted && (
                              <TableCell
                                rowSpan={shiftRowCount}
                                className="font-medium"
                              >
                                {shiftName}
                              </TableCell>
                            )}
                            {(shiftPrinted = true)}

                            {/* TRAY */}
                            <TableCell>{m.tray?.name}</TableCell>

                            {/* MENU NAME */}
                            <TableCell>{m.nama_menu}</TableCell>

                            {/* TYPE */}
                            <TableCell>
                              <Badge variant="outline">{m.type}</Badge>
                            </TableCell>

                            {/* STATUS */}
                            <TableCell>{renderStatus(m.status)}</TableCell>

                            {/* REVISION NOTE */}
                            <TableCell>{m.revision_note ?? "-"}</TableCell>

                            {/* ACTION */}
                            <TableCell className="text-right">
                              {m.status === "revision_required" ? (
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedMenu(m);
                                    setFormData({
                                      tray_id: String(m.tray_id),
                                      shift_id: String(m.shift_id),
                                      service_date: m.service_date,
                                      type: m.type,
                                      nama_menu: m.nama_menu,
                                      karbohidrat: m.karbohidrat ?? "",
                                      pendamping1: m.pendamping1 ?? "",
                                      pendamping2: m.pendamping2 ?? "",
                                      pendamping3: m.pendamping3 ?? "",
                                      extrafood: m.extrafood ?? "",
                                      buah: m.buah ?? "",
                                    });

                                    updateUsedConstraints(
                                      menus,
                                      m.service_date,
                                      String(m.shift_id)
                                    );
                                    setIsModalOpen(true);
                                  }}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              ) : (
                                <span className="text-gray-400 text-xs">
                                  Locked
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ));
                      }
                    );
                  })}
              </TableBody>
            </Table>

            {/* PAGINATION BAR — MIRROR GA MENU PAGE */}
            <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <p className="text-sm text-gray-600">
                Showing <b>{menus.length}</b> of <b>{totalItems}</b> menus
              </p>

              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                {/* ROWS PER PAGE SELECT */}
                <Select
                  value={String(limit)}
                  onValueChange={handleChangeLimit}
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

                {/* PAGINATION BUTTONS */}
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

        {/* MODAL CREATE / REVISE */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedMenu ? "Revise Menu" : "Create Menu"}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-3">
              {/* DATE */}
              <Input
                type="date"
                value={formData.service_date}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setFormData({ ...formData, service_date: newDate });
                  updateUsedConstraints(menus, newDate, formData.shift_id);
                }}
              />

              {/* SHIFT */}
              <Select
                value={formData.shift_id}
                onValueChange={(v) => {
                  setFormData({ ...formData, shift_id: v });
                  updateUsedConstraints(menus, formData.service_date, v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Shift" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* TYPE FILTERING (REMOVE USED TYPES) */}
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>

                <SelectContent>
                  {!usedTypes.includes("regular") && (
                    <SelectItem value="regular">Regular</SelectItem>
                  )}
                  {!usedTypes.includes("healthy") && (
                    <SelectItem value="healthy">Healthy</SelectItem>
                  )}
                  {!usedTypes.includes("special") && (
                    <SelectItem value="special">Special</SelectItem>
                  )}
                  {!usedTypes.includes("random") && (
                    <SelectItem value="random">
                      Random (Tray Cadangan)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {/* TRAY FILTERING */}
              <Select
                value={formData.tray_id}
                onValueChange={(v) => setFormData({ ...formData, tray_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Tray" />
                </SelectTrigger>

                <SelectContent>
                  {trays
                    .filter((t) =>
                      formData.type === "random"
                        ? t.is_cadangan
                        : !t.is_cadangan
                    )
                    .filter((t) => !usedTrayIds.includes(t.id))
                    .map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name} {t.is_cadangan ? "(Cadangan)" : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {/* MENU NAME */}
              <Input
                placeholder="Menu Name"
                value={formData.nama_menu}
                onChange={(e) =>
                  setFormData({ ...formData, nama_menu: e.target.value })
                }
              />

              {/* DETAIL */}
              <Input
                placeholder="Karbohidrat"
                value={formData.karbohidrat}
                onChange={(e) =>
                  setFormData({ ...formData, karbohidrat: e.target.value })
                }
              />
              <Input
                placeholder="Pendamping 1"
                value={formData.pendamping1}
                onChange={(e) =>
                  setFormData({ ...formData, pendamping1: e.target.value })
                }
              />
              <Input
                placeholder="Pendamping 2"
                value={formData.pendamping2}
                onChange={(e) =>
                  setFormData({ ...formData, pendamping2: e.target.value })
                }
              />
              <Input
                placeholder="Pendamping 3"
                value={formData.pendamping3}
                onChange={(e) =>
                  setFormData({ ...formData, pendamping3: e.target.value })
                }
              />
              <Input
                placeholder="Extrafood"
                value={formData.extrafood}
                onChange={(e) =>
                  setFormData({ ...formData, extrafood: e.target.value })
                }
              />
              <Input
                placeholder="Buah"
                value={formData.buah}
                onChange={(e) =>
                  setFormData({ ...formData, buah: e.target.value })
                }
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={selectedMenu ? handleRevise : handleCreate}>
                {selectedMenu ? "Save Revision" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
