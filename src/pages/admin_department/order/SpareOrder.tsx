import { useState, useEffect } from "react";
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
import { toast } from "sonner";

export default function SpareOrderForm() {
  const token = localStorage.getItem("token");

  const authHeaders = { Authorization: `Bearer ${token}` };

  // STATE
  const [dates, setDates] = useState<string[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [menus, setMenus] = useState<any[]>([]);

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

  // Fetch menu ketika tanggal atau shift berubah
  useEffect(() => {
    if (!serviceDate || !shiftId) return;
    fetchMenus(serviceDate, shiftId);
  }, [serviceDate, shiftId]);

  const fetchMenus = async (date: string, shift: string) => {
    try {
      const r = await axios.get("/menus/available", {
        headers: authHeaders,
        params: { service_date: date, shift_id: shift },
      });

      // Hapus menu cadangan
      const cleaned = (r.data.data || []).filter(
        (m: any) => m.tray?.is_cadangan !== true
      );

      setMenus(cleaned);
    } catch (err) {
      console.error(err);
      toast.error("Failed loading menu list");
    }
  };

  const handleSubmit = async () => {
    if (!serviceDate || !shiftId || !menuId || quantity <= 0) {
      toast.error("Please complete all fields");
      return;
    }

    try {
      const payload = {
        service_date: serviceDate,
        shift_id: Number(shiftId),
        menu_id: Number(menuId),
        quantity: Number(quantity),
      };

      const r = await axios.post("/spare-orders", payload, {
        headers: authHeaders,
      });

      toast.success(r.data.message);

      // reset form
      setServiceDate("");
      setShiftId("");
      setMenuId("");
      setQuantity(1);
      setMenus([]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold">Spare Order</h1>

      <Card className="p-4 space-y-4 bg-white border shadow-sm">

        {/* DATE */}
        <Select value={serviceDate} onValueChange={setServiceDate}>
          <SelectTrigger>
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

        {/* SHIFT */}
        <Select value={shiftId} onValueChange={setShiftId}>
          <SelectTrigger>
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

        {/* QUANTITY */}
        <Input
          type="number"
          min={1}
          max={15}
          value={quantity}
onChange={(e) => setQuantity(Number(e.target.value))}
          placeholder="Quantity"
        />

        {/* MENU CARDS */}
        {serviceDate && shiftId && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {menus.map((m) => {
              const active = Number(menuId) === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setMenuId(String(m.id))}
                  className={`p-3 border rounded-lg cursor-pointer transition ${
                    active ? "border-primary bg-orange-100" : "hover:bg-gray-100"
                  }`}
                >
                  <p className="font-semibold">{m.nama_menu}</p>
                  <p className="text-gray-600 text-sm">{m.vendor?.name}</p>
                </div>
              );
            })}

            {menus.length === 0 && (
              <p className="text-sm text-gray-500">
                No approved menu for this date/shift.
              </p>
            )}
          </div>
        )}

      </Card>

      <Button className="w-full bg-primary text-white" onClick={handleSubmit}>
        Submit Spare Order
      </Button>
    </div>
  );
}
