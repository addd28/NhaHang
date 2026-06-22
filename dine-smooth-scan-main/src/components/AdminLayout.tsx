import React, { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, TableProperties, ClipboardList, ChefHat, Banknote,
  FolderOpen, Users, LogOut, Shield, Compass, BookOpen, MapPin, FileText, KeyRound
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "../hooks/useAuth";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate({ to: "/admin/login" });
  };

  const navItems = [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "BRANCH_MANAGER"] },
    { to: "/admin/tables", label: "Bàn ăn", icon: TableProperties, roles: ["ADMIN", "BRANCH_MANAGER", "WAITER"] },
    { to: "/admin/checkin", label: "Xác nhận Check-in", icon: KeyRound, roles: ["ADMIN", "BRANCH_MANAGER", "WAITER"] },
    { to: "/admin/orders", label: "Waiter (Bưng bê)", icon: ClipboardList, roles: ["ADMIN", "WAITER", "BRANCH_MANAGER"] },
    { to: "/admin/kitchen", label: "Bếp (Kitchen)", icon: ChefHat, roles: ["ADMIN", "KITCHEN"] },
    { to: "/admin/payments", label: "Thu ngân (POS)", icon: Banknote, roles: ["ADMIN", "CASHIER", "BRANCH_MANAGER"] },
    { to: "/admin/categories", label: "Danh mục", icon: FolderOpen, roles: ["ADMIN"] },
    { to: "/admin/menu-management", label: "Thực đơn", icon: BookOpen, roles: ["ADMIN"] },
    { to: "/admin/posts", label: "Bài viết", icon: FileText, roles: ["ADMIN"] },
    { to: "/admin/users", label: "Tài khoản", icon: Users, roles: ["ADMIN"] },
    { to: "/admin/branches", label: "Chi nhánh", icon: MapPin, roles: ["ADMIN"] },
    { to: "/admin/provinces", label: "Tỉnh/Thành", icon: Compass, roles: ["ADMIN"] },
  ];

  const filteredNav = navItems.filter(item => !user || item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-card border-b lg:border-b-0 lg:border-r border-border/60 shrink-0 flex flex-col">
        <div className="p-5 flex items-center justify-between border-b border-border/60">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-base tracking-tight">Staff Panel</span>
          </div>
          {user && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-0 font-bold text-[10px]">
              {user.role}
            </Badge>
          )}
        </div>

        <nav className="flex-1 p-4 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all hover:bg-accent/40 hover:text-foreground shrink-0 [&.active]:bg-primary/10 [&.active]:text-primary"
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/60 flex items-center justify-between lg:block">
          {user && (
            <div className="mb-3 text-left lg:block hidden">
              <p className="text-xs font-bold truncate">@{user.username}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.role} Account</p>
            </div>
          )}
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full h-9 rounded-xl border-dashed text-destructive hover:bg-destructive/10 cursor-pointer text-xs font-bold gap-2 flex items-center justify-center"
          >
            <LogOut className="h-3.5 w-3.5" /> Đăng xuất
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border/60 bg-card/60 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
          <h2 className="font-display font-bold text-base">{title}</h2>
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" className="h-8 text-[11px] gap-1 hover:bg-accent/60">
                <Compass className="h-3.5 w-3.5" /> Portal chính
              </Button>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
