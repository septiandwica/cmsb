/* ================================
   VENDOR MENU MANAGEMENT — FINAL VERSION
   Dengan Filtering:
   - Tray tidak muncul jika sudah dipakai (hari + shift sama)
   - Type tidak muncul jika sudah dipakai (hari + shift sama)
   - Random hanya boleh tray cadangan
   - Create menu hanya valid untuk minggu depan (Senin–Jumat)
   ================================ */

import { useEffect, useState } from "react";
import { Plus, Pencil, Search, RefreshCcw, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import moment from "moment";

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
import { toast } from "sonner";

const API_URL = "http://localhost:4000/api/menus";

interface Menu {
  id: number;
  service_date: string;
  tray_id: number;
  vendor_id: number;
  shift_id: number;
  type: string;
  nama_menu: string;
  karbohidrat?: string;
  pendamping1?: string;
  pendamping2?: string;
  pendamping3?: string;
  extrafood?: string;
  buah?: string;
  status: string;
  revision_note?: string | null;
  tray?: { id: number; name: string; is_cadangan?: boolean };
  shift?: { id: number; name: string };
}

interface PaginationType {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ApiResponse<T> {
  data: T[];
  pagination: PaginationType;
}

export default function VendorMenuManagement() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [search, setSearch] = useState("");
  const [limit] = useState(10);

  const [trays, setTrays] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);

  /* 🔥 PATCH: Track tray & type constraints */
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

  const token = localStorage.getItem("token");

  /* ============================
     VALIDATE ONLY NEXT WEEK
     ============================ */
  const isValidNextWeekDate = (date: string) => {
    if (!date) return false;

    const d = moment(date).startOf("day");

    const nextMonday = moment().startOf("day").isoWeekday(8);
    const nextFriday = moment(nextMonday).add(4, "days");

    return d.isBetween(nextMonday, nextFriday, undefined, "[]");
  };
  /* ============================================
     PATCH: Hitung tray & type yang sudah dipakai
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
     FETCH MENUS
     ============================ */
  const fetchMenus = async (page = 1, newLimit = limit) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(newLimit),
        search,
      });

      const res = await fetch(`${API_URL}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result: ApiResponse<Menu> = await res.json();
      setMenus(result.data);
      setPagination(result.pagination);

      // update constraints
      updateUsedConstraints(
        result.data,
        formData.service_date,
        formData.shift_id
      );
    } catch {
      toast.error("Failed loading menus");
    }
  };

  /* ============================
     FETCH TRAYS & SHIFTS
     ============================ */
  const fetchTrays = async () => {
    const res = await fetch("http://localhost:4000/api/trays", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();
    setTrays(result.data);
  };

  const fetchShifts = async () => {
    const res = await fetch("http://localhost:4000/api/shifts", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();
    setShifts(result.data);
  };

  useEffect(() => {
    fetchMenus();
    fetchTrays();
    fetchShifts();
  }, []);

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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          tray_id: Number(formData.tray_id),
          shift_id: Number(formData.shift_id),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
      if (!res.ok) throw new Error(data.message);

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
      toast.success(result.message);
      fetchMenus();
    } catch {
      toast.error("Failed submitting menus");
    }
  };

  /* ============================
     BADGE STATUS
     ============================ */
  const renderStatus = (s: string) => {
    switch (s) {
      case "draft":
        return <Badge className="bg-gray-300 text-black">Draft</Badge>;
      case "submitted":
        return <Badge className="bg-blue-200 text-blue-800">Submitted</Badge>;
      case "revision_required":
        return (
          <Badge className="bg-yellow-200 text-yellow-800">Revision</Badge>
        );
      case "approved":
        return <Badge className="bg-green-200 text-green-800">Approved</Badge>;
      case "auto_approved":
        return (
          <Badge className="bg-teal-200 text-teal-800">Auto Approved</Badge>
        );
      default:
        return <Badge>{s}</Badge>;
    }
  };

  /* ============================
     UI
     ============================ */
  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* TITLE */}
        <div>
          <h1 className="text-3xl font-bold">Vendor Menu Management</h1>
          <p className="text-gray-600">
            Create draft menus & submit for GA review.
          </p>
        </div>

        {/* SEARCH + ACTION */}
        <div className="flex flex-col md:flex-row gap-3 justify-between">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              className="pl-10"
              placeholder="Search menu name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
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

            <Button variant="outline" onClick={handleSubmitAll}>
              <Send className="w-4 h-4 mr-2" /> Submit All
            </Button>
          </div>
        </div>

        <Separator />

        {/* TABLE */}
        <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Tray</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Revision Note</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {menus.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6">
                    No menus found
                  </TableCell>
                </TableRow>
              )}

              {menus.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.service_date}</TableCell>
                  <TableCell>{m.tray?.name}</TableCell>
                  <TableCell>{m.shift?.name}</TableCell>
                  <TableCell>{m.nama_menu}</TableCell>
                  <TableCell className="capitalize">{m.type}</TableCell>
                  <TableCell>{renderStatus(m.status)}</TableCell>
                  <TableCell>{m.revision_note ?? "-"}</TableCell>

                  <TableCell className="text-right">
                    {m.status === "draft" ||
                    m.status === "revision_required" ? (
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
                      <span className="text-gray-400 text-xs">Locked</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* PAGINATION */}
        <div className="p-4 flex justify-between">
          <p className="text-sm text-gray-600">
            Showing <b>{menus.length}</b> of <b>{pagination.total}</b>
          </p>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    pagination.page > 1 &&
                    fetchMenus(pagination.page - 1, limit)
                  }
                />
              </PaginationItem>

              {Array.from({ length: pagination.totalPages }).map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    isActive={pagination.page === i + 1}
                    onClick={() => fetchMenus(i + 1, limit)}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    pagination.page < pagination.totalPages &&
                    fetchMenus(pagination.page + 1, limit)
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>

          <Button
            size="icon"
            variant="outline"
            onClick={() => fetchMenus(pagination.page, limit)}
          >
            <RefreshCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* MODAL */}
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
                    // ❌ 1. HIDE tray cadangan jika type bukan "random"
                    .filter((t) =>
                      formData.type === "random"
                        ? t.is_cadangan
                        : !t.is_cadangan
                    )

                    // ❌ 2. HIDE tray yang sudah digunakan di hari + shift sama
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
