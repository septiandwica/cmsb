import { useState } from "react";
import axios from "@/api/axiosInstance";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { setAuth } = useAuthStore();
  const nav = useNavigate();

  const handleLogin = async () => {
    try {
      setLoading(true);

      const res = await axios.post("/auth/login", { email, password });

      setAuth(res.data.token, res.data.user);

      toast.success("Berhasil Login ", {
        description: "Selamat datang kembali!",
      });

      const role = res.data.user.role;

      if (role === "employee") nav("/employee", { replace: true });
      else if (role === "vendor_catering") nav("/vendor", { replace: true });
      else if (role === "admin_department") nav("/admin_department", { replace: true });
      else if (role === "general_affair") nav("/ga", { replace: true });
      else nav("/admin", { replace: true });

    } catch (err: any) {
      toast.error("Login gagal", {
        description: err.response?.data?.message || "Terjadi kesalahan.",
      });

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      <Card className="p-6 w-[90%] max-w-sm border border-border shadow-sm">
        <h2 className="font-bold text-xl mb-4 text-center">
          CMS Catering Login
        </h2>

        <div className="space-y-3">
          <Input
            placeholder="Email"
            type="email"
            className="bg-input"
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            placeholder="Password"
            type="password"
            className="bg-input"
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Memproses..." : "Masuk"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
