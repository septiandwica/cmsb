import { useState, useEffect, useMemo } from "react";
import axios from "@/api/axiosInstance";
import { getNextWeekDates } from "@/lib/dateHelper";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function SpareOrderAdmin() {
  const token = localStorage.getItem("token");
  const authHeaders = { Authorization: `Bearer ${token}` };

  // USER INFO
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const departmentId = user.department_id;
  const departmentName = user.department?.name || "Your Department";

  // STATE
  const [dates, setDates] = useState<string[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [menus, setMenus] = useState<any[]>([]);
  const [loadingMenus, setLoadingMenus] = useState(false);

  const [serviceDate, setServiceDate] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [menuId, setMenuId] = useState("");
  const [quantity, setQuantity] = useState(1);

  // INIT
  useEffect(() => {
    setDates(getNextWeekDates());
    loadShifts();
  }, []);

  const loadShifts = async () => {
    try {
      const r = await axios.get("/shifts", { headers: authHeaders });
      setShifts(r.data.data || []);
    } catch {
      toast.error("Failed loading shifts");
    }
  };

  // Auto load menus
  useEffect(() => {
    if (!serviceDate || !shiftId) {
      setMenus([]);
      setMenuId("");
      return;
    }
    fetchMenus(serviceDate, shiftId);
  }, [serviceDate, shiftId]);

  const fetchMenus = async (date: string, shift: string) => {
    try {
      setLoadingMenus(true);

      const r = await axios.get("/menus/available", {
        headers: authHeaders,
        params: { service_date: date, shift_id: shift },
      });

      const cleaned = (r.data.data || []).filter(
        (m: any) => m.tray?.is_cadangan !== true
      );

      setMenus(cleaned);
    } catch {
      toast.error("Failed loading menu list");
    } finally {
      setLoadingMenus(false);
    }
  };

  // MENU DESCRIPTION
  const getMenuDescription = (m: any) => {
    return [
      m.karbohidrat,
      m.pendamping1,
      m.pendamping2,
      m.pendamping3,
      m.extrafood,
      m.buah,
    ]
      .filter(Boolean)
      .join(" • ");
  };

  // SUBMIT
  const handleSubmit = async () => {
    if (!serviceDate || !shiftId || !menuId || quantity <= 0) {
      toast.error("Please complete all fields");
      return;
    }

    try {
      const payload = {
        department_id: departmentId,
        service_date: serviceDate,
        shift_id: Number(shiftId),
        menu_id: Number(menuId),
        quantity: Number(quantity),
      };

      const r = await axios.post("/spare-orders", payload, {
        headers: authHeaders,
      });

      toast.success(r.data.message);

      setServiceDate("");
      setShiftId("");
      setMenuId("");
      setQuantity(1);
      setMenus([]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const selectedMenu = useMemo(
    () => menus.find((m) => m.id === Number(menuId)),
    [menus, menuId]
  );

  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {/* HEADER */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Spare Order (Admin Department)
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Department: <span className="font-semibold">{departmentName}</span>
          </p>
        </div>

        {/* FORM CARD */}
        <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* GRID */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Date */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Service Date
                </p>
                <Select
                  value={serviceDate}
                  onValueChange={(v) => {
                    setServiceDate(v);
                    setShiftId("");
                    setMenuId("");
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select Date" />
                  </SelectTrigger>
                  <SelectContent>
                    {dates.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Shift */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Shift
                </p>
                <Select
                  value={shiftId}
                  onValueChange={(v) => {
                    setShiftId(v);
                    setMenuId("");
                  }}
                  disabled={!serviceDate}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select Shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {shifts.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground flex justify-between">
                  <span>Quantity</span>
                  <span className="text-[10px] text-muted-foreground/80">
                    Max 15
                  </span>
                </p>
                <Input
                  type="number"
                  min={1}
                  max={15}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(
                      Math.min(15, Math.max(1, Number(e.target.value) || 1))
                    )
                  }
                  className="h-9"
                  placeholder="Quantity"
                />
              </div>
            </div>

            {/* Selected Menu Preview */}
            {selectedMenu && (
              <div className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-3 text-xs md:text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="font-semibold">{selectedMenu.nama_menu}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {selectedMenu.vendor?.name} •{" "}
                      {selectedMenu.tray?.name ?? "No tray"}
                    </p>

                    {getMenuDescription(selectedMenu) && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {getMenuDescription(selectedMenu)}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end">
                    <Badge
                      variant="secondary"
                      className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide"
                    >
                      {selectedMenu.type}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      x {quantity} meals
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* MENU LIST */}
        <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between border-b px-4 py-3 md:px-6">
            <div>
              <p className="text-sm font-semibold">Available Menus</p>
              <p className="text-xs text-muted-foreground">
                Select an approved menu.
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              {serviceDate && shiftId
                ? loadingMenus
                  ? "Loading..."
                  : `${menus.length} menu(s)`
                : "Select date & shift"}
            </p>
          </div>

          <div className="px-4 pb-4 pt-3 md:px-6 md:pb-6 md:pt-4">
            {!serviceDate || !shiftId ? (
              <p className="py-6 text-center text-xs text-muted-foreground md:text-sm">
                Pick date and shift first.
              </p>
            ) : loadingMenus ? (
              <p className="py-6 text-center text-xs text-muted-foreground md:text-sm">
                Loading menus...
              </p>
            ) : menus.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground md:text-sm">
                No approved menus available.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {menus.map((m) => {
                  const active = Number(menuId) === m.id;
                  const desc = getMenuDescription(m);

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMenuId(String(m.id))}
                      className={[
                        "group flex h-full flex-col rounded-xl border text-left transition-shadow",
                        "border-border bg-card hover:shadow-sm hover:border-primary/60",
                        active
                          ? "border-primary/70 bg-primary/5 shadow-sm"
                          : "",
                      ].join(" ")}
                    >
                      <div className="flex flex-1 flex-col gap-2 px-3 py-3.5 md:px-3.5 md:py-4">
                        {/* TOP */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <p className="line-clamp-2 text-sm font-semibold leading-snug">
                              {m.nama_menu}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {m.vendor?.name}
                            </p>
                          </div>

                          <Badge
                            variant="secondary"
                            className="mt-0.5 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide"
                          >
                            {m.type}
                          </Badge>
                        </div>

                        {/* Tray */}
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="rounded-full bg-muted px-2 py-0.5">
                            Tray: {m.tray?.name}
                          </span>
                        </div>

                        {/* Desc */}
                        {desc && (
                          <p className="mt-1 line-clamp-3 text-[11px] text-muted-foreground leading-relaxed">
                            {desc}
                          </p>
                        )}

                        {/* Footer */}
                        <div className="mt-auto flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                          <span>
                            {serviceDate} •{" "}
                            {shifts.find((s) => s.id === m.shift_id)?.name ??
                              "-"}
                          </span>

                          {active && (
                            <span className="font-semibold text-primary">
                              Selected
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* SUBMIT BUTTON */}
        <div className="sticky bottom-0 bg-gradient-to-t from-background via-background/90 pt-2">
          <Button
            className="h-10 w-full text-sm font-semibold md:h-11"
            onClick={handleSubmit}
            disabled={!serviceDate || !shiftId || !menuId}
          >
            Submit Spare Order
          </Button>
        </div>
      </div>
    </div>
  );
}
