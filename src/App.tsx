import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/auth/LoginPage";
import ProtectedRoute from "./router/ProtectedRoute";

import EmployeeHomePage from "@/pages/employee/EmployeeHomePage";
import GAHomePage from "./pages/general_affair/GAHomePage";
import VendorHomePage from "./pages/vendor_catering/VendorHomePage";

import { Toaster } from "sonner";
import { useAuthStore } from "@/store/authStore";
import VendorManagement from "./pages/admin/VendorManagement";
import LocationManagement from "./pages/admin/LocationMagament";
import TrayManagement from "./pages/admin/TrayManagement";
import UserManagement from "./pages/admin/UserManagement";
import ShiftManagement from "./pages/admin/ShiftManagement";
import RoleManagement from "./pages/admin/RoleManagement";
import DepartmentManagement from "./pages/admin/DepartmentManagement";
import MenuManagement from "./pages/admin/MenuManagement";
import VendorMenuManagement from "./pages/vendor_catering/VendorMenuManagement";
import GAMenuReviewPage from "./pages/general_affair/GAMenuReviewPage";
import EmployeeOrderManagement from "./pages/employee/OrderManagement";
import VendorOrderManagement from "./pages/vendor_catering/OrderManagement";
import AdminOrderManagement from "./pages/admin/OrderManagement";
import GAOrderManagement from "./pages/general_affair/OrderManagement";
import AdminDeptOrderManagement from "./pages/admin_department/OrderManagement";
import RegularOrderForm from "./pages/employee/order/RegularOrder";
import OvertimeOrderForm from "./pages/employee/order/OvertimeOrder";
import SpareOrderForm from "./pages/admin_department/order/SpareOrder";
import GASpareOrderForm from "./pages/general_affair/order/SpareOrder";
import EmployeeOrderHistory from "./pages/employee/order/MyOrder";
import VendorRedeemScanner from "./pages/vendor_catering/redeem/Scanner";

export default function App() {
  const initAuth = useAuthStore((s) => s.initAuth);
  const token = useAuthStore((s) => s.token);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initAuth();
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton />

      <Routes>
        <Route
          path="/"
          element={
            token ? (
              <Navigate to="/employee" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route path="/login" element={<LoginPage />} />

        {/* Employee */}
        <Route
          path="/employee"
          element={
            <ProtectedRoute>
              <EmployeeHomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/orders"
          element={
            <ProtectedRoute>
              <EmployeeOrderManagement />
            </ProtectedRoute>
          }
        />
         <Route
          path="/employee/orders/history"
          element={
            <ProtectedRoute>
              <EmployeeOrderHistory />
            </ProtectedRoute>
          }
        />
         <Route
          path="/employee/orders/regular"
          element={
            <ProtectedRoute>
              <RegularOrderForm />
            </ProtectedRoute>
          }
        />
         <Route
          path="/employee/orders/overtime"
          element={
            <ProtectedRoute>
              <OvertimeOrderForm />
            </ProtectedRoute>
          }
        />

        {/* Vendor */}
        <Route
          path="/vendor"
          element={
            <ProtectedRoute>
              <VendorHomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/menus"
          element={
            <ProtectedRoute>
              <VendorMenuManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/orders"
          element={
            <ProtectedRoute>
              <VendorOrderManagement />
            </ProtectedRoute>
          }
        />
 <Route
          path="/vendor/redeems/scanner"
          element={
            <ProtectedRoute>
              <VendorRedeemScanner />
            </ProtectedRoute>
          }
        />
        {/* Admin Department */}
        <Route
          path="/admin_department/orders"
          element={
            <ProtectedRoute>
              <AdminDeptOrderManagement />
            </ProtectedRoute>
          }
        />
         <Route
          path="/admin_department/orders/spare"
          element={
            <ProtectedRoute>
              <SpareOrderForm />
            </ProtectedRoute>
          }
        />
        
        {/* GA */}
        <Route
          path="/ga"
          element={
            <ProtectedRoute>
              <GAHomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ga/menus"
          element={
            <ProtectedRoute>
              <GAMenuReviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ga/orders"
          element={
            <ProtectedRoute>
              <GAOrderManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ga/orders/spare"
          element={
            <ProtectedRoute>
              <GASpareOrderForm />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        {/* <Route path="/admin" element={
          <ProtectedRoute>
            <AdminDashboard/>
          </ProtectedRoute>
        } /> */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/vendors"
          element={
            <ProtectedRoute>
              <VendorManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/locations"
          element={
            <ProtectedRoute>
              <LocationManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/trays"
          element={
            <ProtectedRoute>
              <TrayManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/shifts"
          element={
            <ProtectedRoute>
              <ShiftManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/departments"
          element={
            <ProtectedRoute>
              <DepartmentManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/roles"
          element={
            <ProtectedRoute>
              <RoleManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/menus"
          element={
            <ProtectedRoute>
              <MenuManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute>
              <AdminOrderManagement />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
