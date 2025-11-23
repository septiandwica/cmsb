import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export default function ProtectedRoute({ children }: { children: ReactElement }) {
  const token = useAuthStore((s) => s.token);

  if (!token) return <Navigate to="/" replace />;

  return children;
}
