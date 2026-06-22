import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, Lock, User, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Vui lòng nhập đầy đủ tài khoản và mật khẩu!");
      return;
    }

    setLoading(true);
    try {
      const user = await login({ username, password });
      toast.success(`Đăng nhập thành công! Vai trò: ${user.role}`);
      
      // Role-based redirects
      if (user.role === "ADMIN") {
        navigate({ to: "/admin/dashboard" });
      } else if (user.role === "KITCHEN") {
        navigate({ to: "/admin/kitchen" });
      } else if (user.role === "WAITER") {
        navigate({ to: "/admin/orders" });
      } else if (user.role === "CASHIER") {
        navigate({ to: "/admin/payments" });
      } else {
        navigate({ to: "/" });
      }
    } catch (error: any) {
      toast.error(error.message || "Tài khoản hoặc mật khẩu không chính xác.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-6 items-center justify-center">
      <div className="max-w-md w-full bg-card rounded-3xl border border-border p-8 shadow-elegant space-y-6">
        <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-gradient-primary shadow-soft">
          <Shield className="h-6 w-6 text-primary-foreground" />
        </div>
        
        <div className="space-y-1 text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight">Staff Portal</h2>
          <p className="text-sm text-muted-foreground">Đăng nhập cổng thông tin nhân viên & quản trị</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tên đăng nhập</label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/60" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin, kitchen, waiter..."
                className="w-full h-11 pl-10 pr-4 rounded-2xl border border-border bg-accent/20 text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/60" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 pl-10 pr-4 rounded-2xl border border-border bg-accent/20 text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-soft cursor-pointer"
          >
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </Button>
        </form>

        <div className="border-t border-border pt-4 flex justify-between items-center text-xs">
          <Link to="/">
            <Button variant="ghost" className="h-8 gap-1 text-[11px] hover:bg-accent/40">
              <ArrowLeft className="h-3 w-3" /> Quay lại Portal
            </Button>
          </Link>
          <span className="text-muted-foreground">Secured via BCrypt JWT</span>
        </div>
      </div>
    </div>
  );
}
