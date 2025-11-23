import { useState, useEffect } from "react";
import axios from "@/api/axiosInstance";
import { getNextWeekDates } from "@/lib/dateHelper";

import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function RegularOrderForm() {
  const token = localStorage.getItem("token");

  const authHeaders = { Authorization: `Bearer ${token}` };

  // ================================
  // STATE
  // ================================
  const [dates, setDates] = useState<string[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);

  const [selectedShift, setSelectedShift] = useState<string>("");
  const [menus, setMenus] = useState<Record<string, any[]>>({}); // date => menus[]

  const [orders, setOrders] = useState<Record<string, any>>({}); // date => { absent, menu_id }

  // ================================
  // INIT
  // ================================
  useEffect(() => {
    setDates(getNextWeekDates());
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      const res = await axios.get("/shifts", { headers: authHeaders });
      setShifts(res.data.data || []);
    } catch {
      toast.error("Failed loading shifts");
    }
  };

  // ================================
  // FETCH MENUS
  // ================================
  const fetchMenusForAllDates = async (shift_id: string) => {
    const results: Record<string, any[]> = {};

    for (const d of dates) {
      try {
        const res = await axios.get("/menus/available", {
          headers: authHeaders,
          params: { service_date: d, shift_id },
        });
        results[d] = res.data.data || [];
      } catch {
        results[d] = [];
      }
    }

    setMenus(results);
  };

  // ================================
  // WHEN USER SELECT SHIFT
  // ================================
  const handleShiftSelect = async (shift: string) => {
    setSelectedShift(shift);
    await fetchMenusForAllDates(shift);

    // Initialize order rows
    const init: Record<string, any> = {};
    dates.forEach((d) => {
      init[d] = {
        menu_id: "",
        absent: false,
      };
    });
    setOrders(init);
  };

  // ================================
  // UPDATE ABSENT / MENU
  // ================================
  const setAbsent = (date: string, value: boolean) => {
    setOrders((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        absent: value,
        menu_id: value ? null : "", // reset menu when absent
      },
    }));
  };

  const setMenu = (date: string, menuId: string) => {
    setOrders((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        menu_id: menuId,
      },
    }));
  };

  // ================================
  // SUBMIT
  // ================================
  const handleSubmit = async () => {
    try {
      const payload = Object.entries(orders).map(([date, row]) => ({
        service_date: date,
        shift_id: Number(selectedShift),
        menu_id: row.absent ? null : Number(row.menu_id),
        absent_flag: row.absent ?? false,
      }));

      const res = await axios.post("/orders/regular/batch", payload, {
        headers: authHeaders,
      });

      toast.success(res.data.message);
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message);
    }
  };

  // ================================
  // RENDER UI
  // ================================
  return (
    <div className="space-y-6 p-4 md:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Regular Meal Order</h1>

      {/* ============================= SHIFT SELECT ============================= */}
      <div className="max-w-sm">
        <Select value={selectedShift} onValueChange={handleShiftSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Choose Shift" />
          </SelectTrigger>
          <SelectContent>
            {shifts.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ============================= MENU CARDS ============================= */}
      {selectedShift && (
        <div className="space-y-6 mt-6">
          {dates.map((d) => {
            const row = orders[d] || {};
            const menuList = menus[d] || [];

            return (
              <Card key={d} className="p-4 shadow-md border bg-white space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold">{d}</h2>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.absent ?? false}
                      onChange={(e) => setAbsent(d, e.target.checked)}
                    />
                    Absent
                  </label>
                </div>

                {/* Menu List */}
                {!row.absent && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {menuList.length === 0 && (
                      <p className="text-gray-500 text-sm col-span-2">
                        No menus available for this day.
                      </p>
                    )}

                    {menuList.map((m) => {
                      const active = String(row.menu_id ?? "") === String(m.id);

                      return (
                        <div
                          key={m.id}
                          className={`p-3 border rounded-lg cursor-pointer transition
                            ${active ? "border-primary bg-orange-100" : "hover:bg-gray-50"}
                          `}
                          onClick={() => setMenu(d, String(m.id))}
                        >
                          <p className="font-medium">{m.nama_menu}</p>
                          <p className="text-sm text-gray-600">{m.vendor?.name}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ============================= SUBMIT ============================= */}
      {selectedShift && (
        <Button className="w-full bg-primary text-white mt-4" onClick={handleSubmit}>
          Submit Regular Orders
        </Button>
      )}
    </div>
  );
}
