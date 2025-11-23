import { useEffect, useMemo, useState } from "react";
import axios from "@/api/axiosInstance";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import moment from "moment";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function EmployeeOrderHistory() {
  const [orders, setOrders] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // ===========================
  // DEFAULT: CURRENT WEEK RANGE
  // ===========================
  const loadDefaultWeek = () => {
    const monday = moment().startOf("isoWeek");
    const friday = moment().startOf("isoWeek").add(4, "days");
    setDateFrom(monday.format("YYYY-MM-DD"));
    setDateTo(friday.format("YYYY-MM-DD"));
  };

  // ===========================
  // FETCH MY ORDERS ONLY
  // ===========================
  const fetchOrders = async () => {
    try {
      const params: any = {};
      if (dateFrom) params.start_date = dateFrom;
      if (dateTo) params.end_date = dateTo;
      if (typeFilter !== "all") params.type = typeFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const res = await axios.get("/orders/list", { params });
      const list = res.data?.data || [];

      // Sort by date ASC
      list.sort((a: any, b: any) =>
        moment(a.date).diff(moment(b.date))
      );

      setOrders(list);
    } catch {
      toast.error("Failed to load orders");
    }
  };

  useEffect(loadDefaultWeek, []);
  useEffect(() => {
    if (dateFrom && dateTo) fetchOrders();
  }, [dateFrom, dateTo, typeFilter, statusFilter]);

  // ===========================
  // SEARCH
  // ===========================
  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter(
      (o: any) =>
        o.menu_name?.toLowerCase().includes(q) ||
        o.shift?.toLowerCase().includes(q)
    );
  }, [orders, search]);

  // ===========================
  // GROUP BY WEEK → THEN GROUP BY DATE
  // ===========================
  const groupedByWeek = useMemo(() => {
    const map: any = {};

    filtered.forEach((o: any) => {
      const m = moment(o.date);
      const week = m.isoWeek();
      const year = m.isoWeekYear();
      const weekKey = `${year}-W${week}`;

      if (!map[weekKey]) map[weekKey] = {};
      if (!map[weekKey][o.date]) map[weekKey][o.date] = [];

      map[weekKey][o.date].push(o);
    });

    return map;
  }, [filtered]);

  const renderStatus = (status: string) => {
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
  };

  // SORT WEEK DESC (Newest → Oldest)
  const sortedWeekKeys = Object.keys(groupedByWeek).sort((a, b) => {
    const [ay, aw] = a.split("-W").map(Number);
    const [by, bw] = b.split("-W").map(Number);
    if (ay !== by) return by - ay;
    return bw - aw;
  });

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen space-y-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link
          to="/employee/orders"
          className="inline-flex items-center text-blue-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Order Menu
        </Link>

        <h1 className="text-3xl font-bold">My Order History</h1>

        {/* FILTER BAR */}
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Date From */}
            <div>
              <p className="text-xs text-gray-500">Date From</p>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            {/* Date To */}
            <div>
              <p className="text-xs text-gray-500">Date To</p>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            {/* Type */}
            <div>
              <p className="text-xs text-gray-500">Type</p>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="ot">OT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="auto_random">Auto Random</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* SEARCH */}
          <Input
            placeholder="Search menu or shift..."
            className="max-w-md"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Card>

        {/* ===================== */}
        {/*  WEEKLY GROUP DISPLAY */}
        {/* ===================== */}

        {sortedWeekKeys.length === 0 ? (
          <p className="text-sm text-gray-500">No orders found.</p>
        ) : (
          sortedWeekKeys.map((weekKey) => {
            const weekObj = groupedByWeek[weekKey];
            const sortedDates = Object.keys(weekObj).sort(
              (a, b) => moment(a).unix() - moment(b).unix()
            );

            return (
              <Card key={weekKey} className="p-5 shadow-sm space-y-4">
                <h2 className="text-xl font-bold">
                  Week {weekKey} ({moment(sortedDates[0]).format("DD MMM")} -
                  {moment(sortedDates[sortedDates.length - 1]).format(" DD MMM YYYY")})
                </h2>

                {sortedDates.map((date) => (
                  <Card key={date} className="p-4 bg-white border">
                    <h3 className="font-semibold text-lg mb-3">
                      {moment(date).format("dddd, DD MMM YYYY")}
                    </h3>

                    <div className="space-y-3">
                      {weekObj[date].map((o: any) => (
                        <div
                          key={o.id}
                          className="border p-3 rounded-lg bg-gray-50 flex flex-col sm:flex-row justify-between gap-2"
                        >
                          <div>
                            <p className="font-semibold">{o.menu_name || "-"}</p>
                            <p className="text-sm text-gray-500">{o.shift}</p>
                            <p className="text-xs mt-1">
                              Vendor: <span className="font-medium">{o.vendor}</span>
                            </p>
                          </div>

                          <div className="text-right space-y-1">
                            {renderStatus(o.status)}
                            <Badge variant="outline">{o.type.toUpperCase()}</Badge>

                            {o.absent && (
                              <Badge className="bg-gray-200 text-gray-700">
                                Absent
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
