import { Outlet } from "react-router-dom";
// import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function MobileLayout() {
//   useAuthGuard(["employee"]);

  return (
    <div className="min-h-screen bg-orange-100">
      {/* NAVBAR */}
      <div className="bg-orange-500 text-white p-4">Employee</div>

      <Outlet />
    </div>
  );
}
