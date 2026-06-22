import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Banknote, TableProperties, ClipboardList, Trash2, CalendarCheck, TrendingUp, Calendar, ShoppingBag, CreditCard
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";
import AdminLayout from "../../components/AdminLayout";
import axiosInstance from "../../api/axiosInstance";
import { branchApi } from "../../api/branchApi";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboard,
});

interface DashboardResponse {
  revenueToday: number;
  revenueMonth: number;
  emptyTables: number;
  reservedTables: number;
  occupiedTables: number;
  wastedItems: number;
  totalPayments: number;
}

interface BranchReportResponse {
  branchId: number;
  branchName: string;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  totalOrders: number;
  totalReservations: number;
  reservationsToday: number;
  activeSessions: number;
  ordersToday: number;
  occupiedTables: number;
  emptyTables: number;
  cashRevenue: number;
  qrRevenue: number;
  paypalRevenue: number;
}

function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  const todayStr = new Date().toISOString().split("T")[0];
  const lastWeekStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [optFrom, setOptFrom] = useState(lastWeekStr);
  const [optTo, setOptTo] = useState(todayStr);

  const { data: optionsReport = [], isLoading: optionsReportLoading } = useQuery<any[]>({
    queryKey: ["dashboardOptionsReport", optFrom, optTo, selectedBranch],
    queryFn: async () => {
      const params: any = {};
      if (optFrom) params.from = optFrom;
      if (optTo) params.to = optTo;
      if (selectedBranch !== "all") params.branchId = selectedBranch;
      
      const res = await axiosInstance.get<any[]>("/dashboard/options-report", { params });
      return res.data;
    },
    enabled: isAuthenticated && (user?.role === "ADMIN" || user?.role === "BRANCH_MANAGER"),
  });

  const sortedOptionsReport = useMemo(() => {
    return [...optionsReport].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
  }, [optionsReport]);

  // Route protection
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/admin/login" });
    } else if (user && user.role !== "ADMIN" && user.role !== "BRANCH_MANAGER") {
      toast.error("Bạn không có quyền truy cập trang Quản trị!");
      
      // Redirect staff to their portals
      if (user.role === "KITCHEN") navigate({ to: "/admin/kitchen" });
      else if (user.role === "WAITER") navigate({ to: "/admin/orders" });
      else if (user.role === "CASHIER") navigate({ to: "/admin/payments" });
      else navigate({ to: "/" });
    }
  }, [user, isAuthenticated]);

  // Set default branch for Branch Managers
  useEffect(() => {
    if (user && user.role === "BRANCH_MANAGER" && user.branchId) {
      setSelectedBranch(String(user.branchId));
    }
  }, [user]);

  // Fetch branches list for ADMIN
  const { data: branches = [] } = useQuery({
    queryKey: ["adminBranches"],
    queryFn: branchApi.getBranches,
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  // Fetch metrics based on branch filter
  const { data: metrics, isLoading } = useQuery<any>({
    queryKey: ["dashboardMetrics", selectedBranch],
    queryFn: async () => {
      if (selectedBranch === "all") {
        const res = await axiosInstance.get<DashboardResponse>("/dashboard");
        return res.data;
      } else {
        const res = await axiosInstance.get<BranchReportResponse>(`/reports/branch/${selectedBranch}`);
        return res.data;
      }
    },
    enabled: isAuthenticated && (user?.role === "ADMIN" || user?.role === "BRANCH_MANAGER"),
    refetchInterval: 5000,
  });

  if (!isAuthenticated || (user && user.role !== "ADMIN" && user.role !== "BRANCH_MANAGER")) {
    return null;
  }

  const isGlobal = selectedBranch === "all";

  return (
    <AdminLayout title={user?.role === "BRANCH_MANAGER" ? `Báo cáo chi nhánh: ${user.branchName || "Chi nhánh của tôi"}` : "Hệ thống Quản trị & Báo cáo"}>
      <div className="p-6 space-y-6">
        {/* Branch Filter Selector for Admin */}
        {user?.role === "ADMIN" && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-4 rounded-3xl shadow-soft">
            <div className="text-left">
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">Chọn Chi nhánh Xem Báo cáo</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="h-10 px-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-primary cursor-pointer min-w-[250px]"
              >
                <option value="all">Tất cả chi nhánh (Tổng quan hệ thống)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
            Đang tải dữ liệu thống kê...
          </div>
        ) : isGlobal ? (
          /* GLOBAL DASHBOARD */
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-3xl p-6 shadow-soft flex items-center gap-4 text-left">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success">
                  <Banknote className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Doanh thu hôm nay</p>
                  <h3 className="font-display text-2xl font-bold mt-1">
                    ${metrics?.revenueToday ? metrics.revenueToday.toFixed(2) : "0.00"}
                  </h3>
                </div>
              </div>

              <div className="bg-card border border-border rounded-3xl p-6 shadow-soft flex items-center gap-4 text-left">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-500">
                  <TrendingUp className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Doanh thu tháng này</p>
                  <h3 className="font-display text-2xl font-bold mt-1">
                    ${metrics?.revenueMonth ? metrics.revenueMonth.toFixed(2) : "0.00"}
                  </h3>
                </div>
              </div>

              <div className="bg-card border border-border rounded-3xl p-6 shadow-soft flex items-center gap-4 text-left">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/10 text-warning">
                  <TableProperties className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Bàn đang hoạt động</p>
                  <h3 className="font-display text-2xl font-bold mt-1">
                    {metrics?.occupiedTables || 0} bàn bận
                  </h3>
                </div>
              </div>

              <div className="bg-card border border-border rounded-3xl p-6 shadow-soft flex items-center gap-4 text-left">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                  <Trash2 className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Món ăn bị hủy bỏ</p>
                  <h3 className="font-display text-2xl font-bold mt-1">
                    {metrics?.wastedItems || 0} món hủy
                  </h3>
                </div>
              </div>
            </div>

            {/* Extra summary section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-card border border-border rounded-3xl p-6 shadow-soft space-y-4 text-left lg:col-span-2">
                <h3 className="font-display font-bold text-base border-b border-border pb-3 flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-primary" /> Trạng thái bàn hiện tại
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-success/5 border border-success/15 rounded-2xl">
                    <p className="text-2xl font-bold text-success">{metrics?.emptyTables || 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Bàn trống</p>
                  </div>
                  <div className="p-4 bg-cyan-500/5 border border-cyan-500/15 rounded-2xl">
                    <p className="text-2xl font-bold text-cyan-500">{metrics?.reservedTables || 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Bàn đặt trước</p>
                  </div>
                  <div className="p-4 bg-warning/5 border border-warning/15 rounded-2xl">
                    <p className="text-2xl font-bold text-warning">{metrics?.occupiedTables || 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Bàn đang ăn</p>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-3xl p-6 shadow-soft space-y-4 text-left">
                <h3 className="font-display font-bold text-base border-b border-border pb-3 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" /> Hoạt động hóa đơn
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Tổng số thanh toán:</span>
                    <span className="font-bold">{metrics?.totalPayments || 0} giao dịch</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Ước tính trung bình:</span>
                    <span className="font-bold text-primary">
                      ${metrics?.totalPayments ? (metrics.revenueToday / metrics.totalPayments || 0).toFixed(2) : "0.00"} / hóa đơn
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* BRANCH SPECIFIC DASHBOARD */
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-3xl p-6 shadow-soft flex items-center gap-4 text-left">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success">
                  <Banknote className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Doanh thu hôm nay</p>
                  <h3 className="font-display text-2xl font-bold mt-1">
                    ${metrics?.todayRevenue ? metrics.todayRevenue.toFixed(2) : "0.00"}
                  </h3>
                </div>
              </div>

              <div className="bg-card border border-border rounded-3xl p-6 shadow-soft flex items-center gap-4 text-left">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <TrendingUp className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Doanh thu tuần này</p>
                  <h3 className="font-display text-2xl font-bold mt-1">
                    ${metrics?.weekRevenue ? metrics.weekRevenue.toFixed(2) : "0.00"}
                  </h3>
                </div>
              </div>

              <div className="bg-card border border-border rounded-3xl p-6 shadow-soft flex items-center gap-4 text-left">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-500">
                  <TrendingUp className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Doanh thu tháng này</p>
                  <h3 className="font-display text-2xl font-bold mt-1">
                    ${metrics?.monthRevenue ? metrics.monthRevenue.toFixed(2) : "0.00"}
                  </h3>
                </div>
              </div>

              <div className="bg-card border border-border rounded-3xl p-6 shadow-soft flex items-center gap-4 text-left">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/10 text-warning">
                  <TableProperties className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Phiên hoạt động</p>
                  <h3 className="font-display text-2xl font-bold mt-1">
                    {metrics?.activeSessions || 0} phiên bận
                  </h3>
                </div>
              </div>
            </div>

            {/* Middle Section: Tables and Operations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tables Status */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-soft space-y-4 text-left lg:col-span-2">
                <h3 className="font-display font-bold text-base border-b border-border pb-3 flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-primary" /> Trạng thái bàn tại chi nhánh
                </h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-success/5 border border-success/15 rounded-2xl">
                    <p className="text-2xl font-bold text-success">{metrics?.emptyTables || 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Bàn trống</p>
                  </div>
                  <div className="p-4 bg-warning/5 border border-warning/15 rounded-2xl">
                    <p className="text-2xl font-bold text-warning">{metrics?.occupiedTables || 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Bàn đang ăn</p>
                  </div>
                </div>
              </div>

              {/* Operations Stats */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-soft space-y-4 text-left">
                <h3 className="font-display font-bold text-base border-b border-border pb-3 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" /> Hoạt động chi nhánh hôm nay
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Đơn đặt bàn hôm nay:</span>
                    <span className="font-bold">{metrics?.reservationsToday || 0} lượt</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5" /> Yêu cầu gọi món hôm nay:</span>
                    <span className="font-bold">{metrics?.ordersToday || 0} đơn</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-border/40">
                    <span className="text-xs text-muted-foreground">Lịch sử tổng đặt bàn:</span>
                    <span className="text-xs font-bold">{metrics?.totalReservations || 0} lượt</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-xs text-muted-foreground">Lịch sử tổng gọi món:</span>
                    <span className="text-xs font-bold">{metrics?.totalOrders || 0} đơn</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: Payments Breakdown */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-soft space-y-4 text-left">
              <h3 className="font-display font-bold text-base border-b border-border pb-3 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" /> Phân tích doanh thu hôm nay theo phương thức
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-accent/25 border border-border/50 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Tiền mặt (CASH)</p>
                    <p className="text-xl font-bold mt-1 text-foreground">${metrics?.cashRevenue ? metrics.cashRevenue.toFixed(2) : "0.00"}</p>
                  </div>
                  <span className="h-10 w-10 flex items-center justify-center rounded-xl bg-success/10 text-success">
                    $
                  </span>
                </div>
                <div className="p-4 bg-accent/25 border border-border/50 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">QR Chuyển khoản (QR)</p>
                    <p className="text-xl font-bold mt-1 text-foreground">${metrics?.qrRevenue ? metrics.qrRevenue.toFixed(2) : "0.00"}</p>
                  </div>
                  <span className="h-10 w-10 flex items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500 font-bold text-xs">
                    QR
                  </span>
                </div>
                <div className="p-4 bg-accent/25 border border-border/50 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">PayPal (USD)</p>
                    <p className="text-xl font-bold mt-1 text-foreground">${metrics?.paypalRevenue ? metrics.paypalRevenue.toFixed(2) : "0.00"}</p>
                  </div>
                  <span className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs">
                    PP
                  </span>
                </div>
              </div>
            </div>
            
            {/* Options Sales Report Section */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-soft text-left space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
                <h3 className="font-display font-bold text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" /> Báo cáo Doanh số Tùy chọn món ăn
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Từ:</span>
                    <input
                      type="date"
                      value={optFrom}
                      onChange={(e) => setOptFrom(e.target.value)}
                      className="h-8 px-2 rounded-lg border border-border bg-card text-xs focus:outline-none focus:border-primary cursor-pointer text-foreground"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Đến:</span>
                    <input
                      type="date"
                      value={optTo}
                      onChange={(e) => setOptTo(e.target.value)}
                      className="h-8 px-2 rounded-lg border border-border bg-card text-xs focus:outline-none focus:border-primary cursor-pointer text-foreground"
                    />
                  </div>
                </div>
              </div>

              {optionsReportLoading ? (
                <div className="py-10 text-center text-xs text-muted-foreground animate-pulse">
                  Đang tải báo cáo tùy chọn...
                </div>
              ) : sortedOptionsReport.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-10 italic">
                  Không có dữ liệu tùy chọn được bán trong khoảng thời gian này.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] font-semibold text-muted-foreground border-b border-border bg-accent/15">
                        <th className="p-3 text-left">Nhóm tùy chọn</th>
                        <th className="p-3 text-left">Loại nhóm</th>
                        <th className="p-3 text-left">Tên tùy chọn</th>
                        <th className="p-3 text-center">Số lượng bán</th>
                        <th className="p-3 text-right">Doanh thu ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedOptionsReport.map((row: any, idx: number) => (
                        <tr key={row.itemOptionId || idx} className="border-b border-border/40 hover:bg-accent/5 transition-colors">
                          <td className="p-3 font-semibold text-foreground">{row.optionGroupName}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-[9px] font-extrabold px-1.5 py-0 border-primary/20 text-primary bg-primary/5">
                              {row.optionGroupType}
                            </Badge>
                          </td>
                          <td className="p-3 font-bold text-foreground">{row.optionName}</td>
                          <td className="p-3 text-center font-semibold">{row.salesCount}</td>
                          <td className="p-3 text-right font-mono font-bold text-success">
                            ${row.revenue ? row.revenue.toFixed(2) : "0.00"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
