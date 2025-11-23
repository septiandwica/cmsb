import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import axios from "@/api/axiosInstance";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function EmployeeOrderManagement() {
  const [orderWindow, setOrderWindow] = useState<"OPEN" | "CLOSED" | "PENDING" | "">("");
  const [canOT, setCanOT] = useState<boolean>(false);
  const [hasRegular, setHasRegular] = useState<boolean>(false);
  const navigate = useNavigate();

  // ============================================================
  // FETCH ORDER WINDOW
  // ============================================================
  const fetchOrderWindow = async () => {
    try {
      const res = await axios.get("/orders/window-status");
      setOrderWindow(res.data.status || "");
    } catch (err) {
      console.log(err);
    }
  };

  // ============================================================
  // FETCH OT ELIGIBILITY (department check)
  // ============================================================
  const fetchOTEligibility = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      if (!user.department_id) return;

      const res = await axios.get(`/departments/${user.department_id}`);
      setCanOT(res.data?.is_ot_eligible || false);
    } catch (err) {
      console.log(err);
    }
  };

  // ============================================================
  // CHECK IF USER HAS REGULAR ORDER (required before ordering OT)
  // ============================================================
  const checkRegularNextWeek = async () => {
    try {
      const res = await axios.get("/orders/list");

      const nextWeekRegular = res.data.data?.filter(
        (o: any) => o.type === "regular"
      );

      setHasRegular(nextWeekRegular.length > 0);
    } catch (err) {
      console.log(err);
    }
  };

  // ============================================================
  // BLOCK REGULAR PAGE IF WINDOW CLOSED
  // ============================================================
  const goToRegularOrder = () => {
    if (orderWindow !== "OPEN") {
      toast.error("Order window sedang ditutup. Hanya dapat order Jumat–Sabtu 12:00.");
      return;
    }
    navigate("/employee/orders/regular");
  };

  // ============================================================
  // BLOCK OT PAGE: must satisfy 3 conditions
  // ============================================================
  const goToOTOrder = () => {
    if (orderWindow !== "OPEN") {
      toast.error("Order window sedang ditutup. Tidak bisa membuat OT order.");
      return;
    }

    if (!canOT) {
      toast.error("Departemen Anda tidak memiliki akses OT.");
      return;
    }

    if (!hasRegular) {
      toast.error("Harus membuat Regular Order terlebih dahulu sebelum membuat OT Order.");
      return;
    }

    navigate("/employee/orders/overtime");
  };

  useEffect(() => {
    fetchOrderWindow();
    fetchOTEligibility();
    checkRegularNextWeek();
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-bold">Order Management</h1>
          <p className="text-gray-600 mt-1">
            Pilih dan kelola pesanan makan Anda untuk minggu depan.
          </p>
        </div>

        {/* ORDER WINDOW INFO */}
        {orderWindow && (
          <Card
            className={`p-4 border 
              ${
                orderWindow === "OPEN"
                  ? "border-green-300 bg-green-50"
                  : orderWindow === "PENDING"
                  ? "border-amber-300 bg-amber-50"
                  : "border-red-300 bg-red-50"
              }`}
          >
            <p className="font-medium">
              🔔 Status Order Window:{" "}
              <span
                className={
                  orderWindow === "OPEN"
                    ? "text-green-700"
                    : orderWindow === "PENDING"
                    ? "text-amber-700"
                    : "text-red-700"
                }
              >
                {orderWindow}
              </span>
            </p>
          </Card>
        )}

        {/* REGULAR ORDER */}
        <Card className="p-5 bg-white shadow-sm">
          <h2 className="text-xl font-semibold">Regular Order</h2>
          <p className="text-sm text-gray-600">
            Pesan menu makan untuk minggu depan (Senin–Jumat).
          </p>

          <button
            onClick={goToRegularOrder}
            className="inline-flex items-center mt-3 text-blue-600 font-medium hover:underline"
          >
            Buat Regular Order
            <ArrowRight className="ml-1 w-4 h-4" />
          </button>
        </Card>

        {/* OT ORDER */}
        <Card className="p-5 bg-white shadow-sm">
          <h2 className="text-xl font-semibold">Overtime Order</h2>
          <p className="text-sm text-gray-600">
            Khusus untuk departemen yang eligible OT.
          </p>

          <button
            onClick={goToOTOrder}
            className="inline-flex items-center mt-3 text-blue-600 font-medium hover:underline"
          >
            Buat OT Order
            <ArrowRight className="ml-1 w-4 h-4" />
          </button>
        </Card>

        {/* MY ORDERS */}
        <Card className="p-4 bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-2">My Orders</h2>
          <p className="text-sm text-gray-600">
            Lihat seluruh pesanan Anda (regular & OT) dalam satu halaman khusus.
          </p>

          <Link
            to="/employee/orders/history"
            className="inline-flex items-center mt-3 text-blue-600 font-medium hover:underline"
          >
            Lihat Riwayat Order Saya
            <ArrowRight className="ml-1 w-4 h-4" />
          </Link>
        </Card>

      </div>
    </div>
  );
}
