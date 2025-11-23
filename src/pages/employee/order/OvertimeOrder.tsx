import { useState, useEffect } from "react";
import axios from "@/api/axiosInstance";
import { getNextWeekDates } from "@/lib/dateHelper";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function OvertimeOrderForm() {
  const token = localStorage.getItem("token");

  const authHeaders = { Authorization: `Bearer ${token}` };

  const [dates, setDates] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [menuOptions, setMenuOptions] = useState<Record<number, any[]>>({}); // index => menus[]

  // ============================================================
  // INIT
  // ============================================================
  useEffect(() => {
    setDates(getNextWeekDates());
  }, []);

  // ============================================================
  // ADD ROW
  // ============================================================
  const addRow = () => {
    setRows([
      ...rows,
      {
        service_date: "",
        shift_id: "",
        menu_id: "",
      },
    ]);
  };

  // ============================================================
  // FETCH MENU FOR A ROW
  // ============================================================
  const fetchMenuChoices = async (index: number) => {
    const r = rows[index];
    if (!r.service_date || !r.shift_id) return;

    try {
      const res = await axios.get("/menus/available", {
        headers: authHeaders,
        params: {
          service_date: r.service_date,
          shift_id: r.shift_id,
        },
      });

      setMenuOptions((prev) => ({
        ...prev,
        [index]: res.data.data || [],
      }));
    } catch (err) {
      console.error(err);
      toast.error("Failed load OT menus");
    }
  };

  // ============================================================
  // UPDATE ROW VALUE
  // ============================================================
  const updateRow = async (i: number, field: string, value: any) => {
    const updated = [...rows];
    updated[i][field] = value;

    // reset menu on change date / shift
    if (field === "service_date" || field === "shift_id") {
      updated[i].menu_id = "";
      await fetchMenuChoices(i);
    }

    setRows(updated);
  };

  // ============================================================
  // SUBMIT
  // ============================================================
  const submit = async () => {
    try {
      const payload = {
        items: rows.map((r) => ({
          service_date: r.service_date,
          shift_id: Number(r.shift_id),
          menu_id: Number(r.menu_id),
        })),
      };

      const res = await axios.post("/orders/ot/batch", payload, {
        headers: authHeaders,
      });

      toast.success(res.data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6 p-4 md:p-8 bg-gray-50 min-h-screen">

      <h1 className="text-2xl font-bold">Overtime Meal Order</h1>

      {rows.map((row, i) => (
        <Card key={i} className="p-4 border rounded-lg shadow-sm bg-white space-y-4">

          {/* Date */}
          <Select value={row.service_date} onValueChange={(v) => updateRow(i, "service_date", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Date" />
            </SelectTrigger>
            <SelectContent>
              {dates.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* OT Shift */}
          <Select value={row.shift_id} onValueChange={(v) => updateRow(i, "shift_id", v)}>
            <SelectTrigger>
              <SelectValue placeholder="OT Shift" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Morning</SelectItem>
              <SelectItem value="2">Evening</SelectItem>
            </SelectContent>
          </Select>

          {/* Menu */}
          {row.service_date && row.shift_id && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(menuOptions[i] || []).length === 0 && (
                <p className="text-sm text-gray-500 col-span-2">No OT menu available</p>
              )}

              {(menuOptions[i] || []).map((m) => {
                const active = String(row.menu_id) === String(m.id);

                return (
                  <div
                    key={m.id}
                    className={`p-3 border rounded-lg cursor-pointer transition ${
                      active ? "border-primary bg-orange-100" : "hover:bg-gray-50"
                    }`}
                    onClick={() => updateRow(i, "menu_id", String(m.id))}
                  >
                    <p className="font-medium">{m.nama_menu}</p>
                    <p className="text-gray-600 text-sm">{m.vendor?.name}</p>
                  </div>
                );
              })}
            </div>
          )}

        </Card>
      ))}

      <Button className="w-full" onClick={addRow}>+ Add OT Row</Button>

      <Button className="w-full bg-primary text-white mt-4" onClick={submit}>
        Submit OT Order
      </Button>
    </div>
  );
}
