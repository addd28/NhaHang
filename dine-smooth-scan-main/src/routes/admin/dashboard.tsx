import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Banknote, TableProperties, ClipboardList, TrendingUp, Calendar, 
  ShoppingBag, CreditCard, Clock, User, Phone, MessageSquare, 
  Star, ChevronLeft, ChevronRight, LayoutDashboard, Printer, Download, Receipt,
  ArrowUpRight, ArrowDownRight, Percent, Utensils, Users
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import AdminLayout from "../../components/AdminLayout";
import axiosInstance from "../../api/axiosInstance";
import { paymentApi } from "../../api/paymentApi";
import { tableApi } from "../../api/tableApi";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar, AreaChart, Area
} from "recharts";

const formatPrice = (val?: number | null) => {
  if (val === null || val === undefined) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(val);
};

const PIE_COLORS = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B"];

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Active revenue range filter: "today", "7d", "30d", "month", "year", "custom"
  const [revenueRange, setRevenueRange] = useState<string>("today");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Selected payment details state
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [resChartRange, setResChartRange] = useState<"7d" | "30d">("7d");

  // Fetch reservation dashboard stats
  const { data: resStats, isLoading: resStatsLoading } = useQuery<any>({
    queryKey: ["reservationDashboardStats"],
    queryFn: tableApi.getDashboardStats,
    enabled: isAuthenticated && user?.role === "ADMIN",
    refetchInterval: 30000,
  });

  // Route protection
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/admin/login" });
    } else if (user && user.role !== "ADMIN") {
      toast.error("Bạn không có quyền truy cập trang Quản trị!");
      
      // Redirect staff to their portals
      if (user.role === "KITCHEN") navigate({ to: "/admin/kitchen" });
      else if (user.role === "WAITER") navigate({ to: "/admin/orders" });
      else if (user.role === "CASHIER") navigate({ to: "/admin/payments" });
      else navigate({ to: "/" });
    }
  }, [user, isAuthenticated]);

  // 1. Fetch Summary KPIs
  const { data: summary, isLoading: summaryLoading } = useQuery<any>({
    queryKey: ["dashboardSummary"],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/summary");
      const d = res.data;
      if (!d) return d;
      return {
        ...d,
        todayRevenue: d.todayRevenue,
      };
    },
    enabled: isAuthenticated && user?.role === "ADMIN",
    refetchInterval: 30000, // cache and refresh every 30s
  });

  const queryParams = useMemo(() => {
    return {
      range: revenueRange,
      startDate: revenueRange === "custom" && customStartDate ? customStartDate : undefined,
      endDate: revenueRange === "custom" && customEndDate ? customEndDate : undefined,
    };
  }, [revenueRange, customStartDate, customEndDate]);

  // 2. Fetch Revenue Summary
  const { data: revSummary, isLoading: revSummaryLoading } = useQuery<any>({
    queryKey: ["revenueSummary", queryParams],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/revenue-summary", { params: queryParams });
      const d = res.data;
      if (!d) return d;
      return {
        ...d,
        totalRevenue: d.totalRevenue,
        aov: d.aov,
      };
    },
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  // 2b. Fetch Revenue Chart Data
  const { data: revenueData = [], isLoading: revenueLoading } = useQuery<any[]>({
    queryKey: ["revenueChart", queryParams],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/revenue-chart", { params: queryParams });
      if (!res.data) return [];
      return res.data.map((d: any) => ({
        ...d,
        revenue: d.revenue,
      }));
    },
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  // 2c. Fetch Payment Methods
  const { data: paymentMethodsData = [], isLoading: paymentMethodsLoading } = useQuery<any[]>({
    queryKey: ["paymentMethods", queryParams],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/payment-methods", { params: queryParams });
      return res.data;
    },
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  // 2d. Fetch Revenue Comparison
  const { data: revComparison, isLoading: revComparisonLoading } = useQuery<any>({
    queryKey: ["revenueComparison", queryParams],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/revenue-comparison", { params: queryParams });
      const d = res.data;
      if (!d) return d;
      return {
        ...d,
        currentRevenue: d.currentRevenue,
        previousRevenue: d.previousRevenue,
      };
    },
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  // 2e. Fetch Revenue Hours
  const { data: revHoursData = [], isLoading: revHoursLoading } = useQuery<any[]>({
    queryKey: ["revenueHours", queryParams],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/revenue-hours", { params: queryParams });
      if (!res.data) return [];
      return res.data.map((d: any) => ({
        ...d,
        revenue: d.revenue,
      }));
    },
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  // 2f. Fetch Highest Invoice
  const { data: highestInvoice, isLoading: highestInvoiceLoading } = useQuery<any>({
    queryKey: ["highestInvoice", queryParams],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/highest-invoice", { params: queryParams });
      const d = res.data;
      if (!d) return d;
      return {
        ...d,
        amount: d.amount,
      };
    },
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  // 2g. Fetch Lowest Invoice
  const { data: lowestInvoice, isLoading: lowestInvoiceLoading } = useQuery<any>({
    queryKey: ["lowestInvoice", queryParams],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/lowest-invoice", { params: queryParams });
      const d = res.data;
      if (!d) return d;
      return {
        ...d,
        amount: d.amount,
      };
    },
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  // 2h. Fetch Revenue Trend
  const { data: revTrend, isLoading: revTrendLoading } = useQuery<any>({
    queryKey: ["revenueTrend", queryParams],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/revenue-trend", { params: queryParams });
      const d = res.data;
      if (!d) return d;
      return {
        ...d,
        currentRevenue: d.currentRevenue,
        previousRevenue: d.previousRevenue,
      };
    },
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  // 3. Fetch Table Status Data
  const { data: tableStatus, isLoading: tableStatusLoading } = useQuery<any>({
    queryKey: ["dashboardTableStatus"],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/table-status");
      return res.data;
    },
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  // 4. Fetch Top Foods
  const { data: topFoods = [], isLoading: topFoodsLoading } = useQuery<any[]>({
    queryKey: ["dashboardTopFoods"],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/top-foods");
      if (!res.data) return [];
      return res.data.map((d: any) => ({
        ...d,
        revenue: d.revenue,
      }));
    },
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  // 5. Fetch Recent Payments
  const { data: recentPayments = [], isLoading: paymentsLoading } = useQuery<any[]>({
    queryKey: ["dashboardRecentPayments"],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/recent-payments");
      if (!res.data) return [];
      return res.data.map((p: any) => ({
        ...p,
        amount: p.amount,
      }));
    },
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  // 6. Fetch Recent Reservations
  const { data: recentReservations = [], isLoading: reservationsLoading } = useQuery<any[]>({
    queryKey: ["dashboardRecentReservations"],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/recent-reservations");
      return res.data;
    },
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  // 7. Fetch Recent Feedback
  const { data: recentFeedback = [], isLoading: feedbackLoading } = useQuery<any[]>({
    queryKey: ["dashboardRecentFeedback"],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/recent-feedback");
      return res.data;
    },
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  // 8. Fetch Payment Details dynamically on selection
  const { data: selectedPayment, isLoading: detailLoading } = useQuery<any>({
    queryKey: ["dashboardPaymentDetail", selectedPaymentId],
    queryFn: async () => {
      if (!selectedPaymentId) return null;
      const res = await axiosInstance.get(`/payments/${selectedPaymentId}`);
      return res.data;
    },
    enabled: !!selectedPaymentId && detailOpen,
  });

  // Open Invoice detail handler
  const handleOpenDetail = (id: number) => {
    setSelectedPaymentId(id);
    setDetailOpen(true);
  };

  const handleDownloadInvoice = async (paymentId: number) => {
    try {
      const blob = await paymentApi.getInvoicePdf(paymentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice_INV-${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Đã tải xuống hóa đơn PDF!");
    } catch (e) {
      toast.error("Lỗi tải hóa đơn PDF!");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Donut chart colors & mapping
  const tableChartData = useMemo(() => {
    if (!tableStatus) return [];
    return [
      { name: "Trống", value: tableStatus.empty, color: "#10b981" },
      { name: "Đang dùng", value: tableStatus.occupied, color: "#f59e0b" },
      { name: "Đặt trước", value: tableStatus.reserved, color: "#3b82f6" },
      { name: "Đang dọn", value: tableStatus.cleaning, color: "#9ca3af" },
    ].filter(item => item.value > 0);
  }, [tableStatus]);

  if (!isAuthenticated || (user && user.role !== "ADMIN")) {
    return null;
  }

  const getMethodBadgeColor = (method: string) => {
    switch (method) {
      case "QR": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "CASH": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "PAYPAL": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getReservationStatusColor = (status: string) => {
    switch (status) {
      case "BOOKED": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "WAITLIST": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "SEATED": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "COMPLETED": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "CANCELLED": return "bg-destructive/10 text-destructive border-destructive/20";
      case "CANCELLED_NO_SHOW": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getReservationStatusLabel = (status: string) => {
    switch (status) {
      case "BOOKED": return "Đã đặt";
      case "WAITLIST": return "Danh sách chờ";
      case "SEATED": return "Đang dùng";
      case "COMPLETED": return "Đã về";
      case "CANCELLED": return "Đã hủy";
      case "CANCELLED_NO_SHOW": return "No Show";
      default: return status;
    }
  };

  return (
    <AdminLayout title="Hệ thống Quản trị & Báo cáo">
      {/* Printable Invoice Container (Only visible during browser print) */}
      {selectedPayment && (
        <div id="print-area" className="hidden print:block p-8 bg-white text-black font-sans w-full max-w-sm mx-auto">
          <div className="text-center space-y-2 mb-6">
            <h1 className="text-lg font-bold uppercase tracking-wider">HÓA ĐƠN THANH TOÁN</h1>
            <p className="text-xs">Dine Smooth Scan Restaurant</p>
            <p className="text-[10px] text-gray-500">Mã hóa đơn: INV-{selectedPayment.paymentId}</p>
          </div>
          <div className="text-xs space-y-1 border-b border-dashed border-gray-300 pb-4 mb-4">
            <div className="flex justify-between">
              <span>Bàn:</span>
              <span className="font-bold">{selectedPayment.tableNumber ? `Bàn ${selectedPayment.tableNumber}` : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span>Khách hàng:</span>
              <span>{selectedPayment.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span>Phương thức:</span>
              <span className="font-semibold">{selectedPayment.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span>Thời gian:</span>
              <span>{selectedPayment.paidAt ? new Date(selectedPayment.paidAt).toLocaleString("vi-VN") : "—"}</span>
            </div>
          </div>

          <table className="w-full text-left text-xs mb-4">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-1">Món</th>
                <th className="py-1 text-center">SL</th>
                <th className="py-1 text-right">Đơn giá</th>
                <th className="py-1 text-right">T.Tiền</th>
              </tr>
            </thead>
            <tbody>
              {selectedPayment.items?.map((item: any, index: number) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-1.5">
                    <p className="font-semibold">{item.menuItemName}</p>
                    {item.options?.map((opt: string, i: number) => (
                      <p key={i} className="text-[9px] text-gray-500 pl-1">+ {opt}</p>
                    ))}
                  </td>
                  <td className="py-1.5 text-center">{item.quantity}</td>
                  <td className="py-1.5 text-right">{formatPrice(item.unitPrice)}</td>
                  <td className="py-1.5 text-right">{formatPrice(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-xs space-y-1.5 text-right border-t border-dashed border-gray-300 pt-4">
            <div className="flex justify-between">
              <span>Tạm tính:</span>
              <span>{formatPrice(selectedPayment.subtotal || selectedPayment.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Phí dịch vụ (5%):</span>
              <span>{formatPrice(selectedPayment.serviceCharge)}</span>
            </div>
            <div className="flex justify-between">
              <span>Thuế VAT (8%):</span>
              <span>{formatPrice(selectedPayment.taxAmount)}</span>
            </div>
            {selectedPayment.discountAmount > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Giảm giá:</span>
                <span>-{formatPrice(selectedPayment.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2">
              <span>Tổng cộng:</span>
              <span>{formatPrice(selectedPayment.amount)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard UI (Hidden during print) */}
      <div className="p-6 space-y-6 print:hidden">
        {summaryLoading ? (
          <div className="py-20 text-center text-sm text-muted-foreground animate-pulse flex flex-col items-center justify-center gap-2">
            <LayoutDashboard className="h-10 w-10 text-muted-foreground/40 animate-spin" />
            <p>Đang tải dữ liệu Dashboard...</p>
          </div>
        ) : (
          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Doanh thu */}
              <Card className="rounded-3xl border-border shadow-soft text-left p-5 relative overflow-hidden bg-card transition-all hover:scale-[1.01]">
                <div className="flex items-center justify-between pb-3">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Doanh thu hôm nay</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/10 text-success">
                    <Banknote className="h-5 w-5" />
                  </span>
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold">{formatPrice(summary?.todayRevenue)}</h3>
                  <p className="text-[10px] mt-1.5 flex items-center gap-1 font-semibold">
                    {summary?.revenueChangePercentage >= 0 ? (
                      <>
                        <span className="text-success">+{summary?.revenueChangePercentage?.toFixed(1) || "0.0"}%</span>
                        <span className="text-muted-foreground">so với hôm qua</span>
                      </>
                    ) : (
                      <>
                        <span className="text-destructive">{summary?.revenueChangePercentage?.toFixed(1) || "0.0"}%</span>
                        <span className="text-muted-foreground">so với hôm qua</span>
                      </>
                    )}
                  </p>
                </div>
              </Card>

              {/* Đơn hàng */}
              <Card className="rounded-3xl border-border shadow-soft text-left p-5 relative overflow-hidden bg-card transition-all hover:scale-[1.01]">
                <div className="flex items-center justify-between pb-3">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Đơn hàng hôm nay</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
                    <ShoppingBag className="h-5 w-5" />
                  </span>
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold">{summary?.todayOrdersCount || 0} đơn</h3>
                  <div className="text-[10px] text-muted-foreground mt-1.5 space-x-2 font-medium">
                    <span>Đã TT: <strong className="text-foreground">{summary?.paidInvoicesToday || 0}</strong></span>
                    <span>•</span>
                    <span>TB: <strong className="text-primary">${summary?.todayAov?.toFixed(2) || "0.00"}</strong></span>
                  </div>
                </div>
              </Card>

              {/* Bàn */}
              <Card className="rounded-3xl border-border shadow-soft text-left p-5 relative overflow-hidden bg-card transition-all hover:scale-[1.01]">
                <div className="flex items-center justify-between pb-3">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Hiện trạng bàn</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                    <TableProperties className="h-5 w-5" />
                  </span>
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold">{summary?.occupiedTables || 0} / { (summary?.occupiedTables || 0) + (summary?.emptyTables || 0) + (summary?.reservedTables || 0) } đang dùng</h3>
                  <div className="text-[10px] text-muted-foreground mt-1.5 flex gap-2 font-medium">
                    <span className="text-success">Trống: {summary?.emptyTables || 0}</span>
                    <span>•</span>
                    <span className="text-blue-500">Đặt: {summary?.reservedTables || 0}</span>
                  </div>
                </div>
              </Card>

              {/* Đặt bàn */}
              <Card className="rounded-3xl border-border shadow-soft text-left p-5 relative overflow-hidden bg-card transition-all hover:scale-[1.01]">
                <div className="flex items-center justify-between pb-3">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Đặt bàn hôm nay</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-[#C89B3C]">
                    <Calendar className="h-5 w-5" />
                  </span>
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold">{resStats?.totalToday || 0} lượt đặt</h3>
                  <div className="text-[10px] text-muted-foreground mt-1.5 flex gap-1.5 font-medium flex-wrap">
                    <span className="text-amber-550">Chờ: {resStats?.bookedToday || 0}</span>
                    <span>•</span>
                    <span className="text-cyan-500">Ăn: {resStats?.seatedToday || 0}</span>
                    <span>•</span>
                    <span className="text-emerald-500">Xong: {resStats?.completedToday || 0}</span>
                    <span>•</span>
                    <span className="text-rose-500">Vắng: {resStats?.noShowToday || 0}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Tỷ lệ check-in: <strong className="text-foreground">{resStats?.successRate || 0}%</strong>
                  </div>
                </div>
              </Card>

              {/* Khách hàng */}
              <Card className="rounded-3xl border-border shadow-soft text-left p-5 relative overflow-hidden bg-card transition-all hover:scale-[1.01]">
                <div className="flex items-center justify-between pb-3">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Khách hàng & Đánh giá</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                    <User className="h-5 w-5" />
                  </span>
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold flex items-center gap-1">
                    {summary?.averageRating > 0 ? (
                      <>
                        <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                        <span>{summary.averageRating.toFixed(1)} / 5</span>
                      </>
                    ) : (
                      "N/A"
                    )}
                  </h3>
                  <div className="text-[10px] text-muted-foreground mt-1.5 flex gap-2 font-medium">
                    <span>Tổng khách: <strong className="text-foreground">{summary?.todayGuestsCount || 0}</strong></span>
                    <span>•</span>
                    <span>Phản hồi: <strong className="text-foreground">{summary?.totalFeedbackCount || 0}</strong></span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Quick Actions Bar */}
            <Card className="rounded-3xl border-border shadow-soft text-left p-5 space-y-3 bg-card">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Thao tác nhanh</h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Button onClick={() => navigate({ to: "/admin/tables" })} variant="outline" className="h-10 rounded-xl text-xs font-bold gap-1.5 cursor-pointer">
                  <TableProperties className="h-4 w-4 text-amber-500" /> Quản lý bàn
                </Button>
                <Button onClick={() => navigate({ to: "/admin/menu-management" })} variant="outline" className="h-10 rounded-xl text-xs font-bold gap-1.5 cursor-pointer">
                  <ShoppingBag className="h-4 w-4 text-blue-500" /> Quản lý thực đơn
                </Button>
                <Button onClick={() => navigate({ to: "/admin/reservations" })} variant="outline" className="h-10 rounded-xl text-xs font-bold gap-1.5 cursor-pointer">
                  <Calendar className="h-4 w-4 text-green-500" /> Đặt bàn
                </Button>
                <Button onClick={() => navigate({ to: "/admin/payments-history" })} variant="outline" className="h-10 rounded-xl text-xs font-bold gap-1.5 cursor-pointer">
                  <CreditCard className="h-4 w-4 text-purple-500" /> Lịch sử thanh toán
                </Button>
                <Button onClick={() => navigate({ to: "/admin/users" })} variant="outline" className="h-10 rounded-xl text-xs font-bold gap-1.5 cursor-pointer col-span-2 sm:col-span-1">
                  <User className="h-4 w-4 text-pink-500" /> Nhân viên
                </Button>
              </div>
            </Card>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Chart */}
              <Card className="rounded-3xl border-border shadow-soft text-left p-6 lg:col-span-2 space-y-6 bg-card">
                {/* 1. Header controls */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
                  <div>
                    <CardTitle className="text-base font-bold font-display">Trung tâm phân tích doanh thu</CardTitle>
                    <CardDescription className="text-xs">Theo dõi doanh thu, hóa đơn và hành vi thanh toán thời gian thực</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-1 border border-border rounded-xl p-1 bg-muted/30">
                    {[
                      { key: "today", label: "Hôm nay" },
                      { key: "7d", label: "7 ngày" },
                      { key: "30d", label: "30 ngày" },
                      { key: "month", label: "Tháng này" },
                      { key: "year", label: "Năm nay" },
                      { key: "custom", label: "Tùy chọn" }
                    ].map((item) => (
                      <button
                        key={item.key}
                        onClick={() => setRevenueRange(item.key)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                          revenueRange === item.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Custom Date Pickers */}
                {revenueRange === "custom" && (
                  <div className="flex flex-wrap items-center gap-4 bg-muted/10 border border-dashed border-border rounded-2xl p-4 transition-all">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">Từ ngày:</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="bg-card border border-border rounded-xl px-3 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">Đến ngày:</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="bg-card border border-border rounded-xl px-3 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                )}

                {/* 3. Revenue Summary Cards (5 columns) */}
                {revSummaryLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-pulse">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-muted rounded-2xl" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-3 text-left">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Tổng doanh thu</span>
                      <h4 className="text-base font-bold text-primary mt-1">
                        {revSummary?.totalRevenue ? `${revSummary.totalRevenue.toLocaleString()}đ` : "0đ"}
                      </h4>
                    </div>
                    <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-2xl p-3 text-left">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Hóa đơn</span>
                      <h4 className="text-base font-bold text-cyan-600 mt-1">
                        {revSummary?.totalInvoices || 0} HĐ
                      </h4>
                    </div>
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-3 text-left">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">AOV</span>
                      <h4 className="text-base font-bold text-amber-600 mt-1">
                        {revSummary?.aov ? `${Math.round(revSummary.aov).toLocaleString()}đ` : "0đ"}
                      </h4>
                    </div>
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-3 text-left">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Món đã bán</span>
                      <h4 className="text-base font-bold text-emerald-600 mt-1">
                        {revSummary?.itemsSold || 0} món
                      </h4>
                    </div>
                    <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-3 text-left">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Khách phục vụ</span>
                      <h4 className="text-base font-bold text-purple-600 mt-1">
                        {revSummary?.customersServed || 0} khách
                      </h4>
                    </div>
                  </div>
                )}

                {/* 4. Chart body sub-grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                  {/* Left part: Line Chart & Hourly Bar Chart */}
                  <div className="lg:col-span-2 space-y-6">
                    <div>
                      <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Biểu đồ biến động doanh thu</h5>
                      <div className="h-[250px]">
                        {revenueLoading ? (
                          <div className="h-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                            Đang tải biểu đồ...
                          </div>
                        ) : revenueData.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                            Không có dữ liệu trong kỳ này
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#F97316" stopOpacity={0.0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                              <XAxis
                                dataKey="timeLabel"
                                tickLine={false}
                                axisLine={false}
                                style={{ fontSize: "9px", fill: "hsl(var(--muted-foreground))" }}
                                tickFormatter={(tick) => {
                                  if (revenueRange === "today") return tick;
                                  const parts = tick.split("-");
                                  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : tick;
                                }}
                              />
                              <YAxis
                                tickLine={false}
                                axisLine={false}
                                style={{ fontSize: "9px", fill: "hsl(var(--muted-foreground))" }}
                                tickFormatter={(val) => `${val.toLocaleString()}đ`}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "hsl(var(--card))",
                                  borderColor: "hsl(var(--border))",
                                  borderRadius: "16px",
                                  fontSize: "11px",
                                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
                                }}
                                formatter={(value: any, name: string) => {
                                  if (name === "revenue") return [`${value.toLocaleString()}đ`, "Doanh thu"];
                                  if (name === "invoicesCount") return [value, "Số hóa đơn"];
                                  return [value, name];
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="#F97316"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                                dot={{ r: 3, strokeWidth: 1 }}
                                activeDot={{ r: 5 }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    {/* Hourly distribution bar chart (Today or short duration) */}
                    {(revenueRange === "today" || (revenueRange === "custom" && revenueData.length <= 1)) && (
                      <div>
                        <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Doanh thu chi tiết theo khung giờ</h5>
                        <div className="h-[150px]">
                          {revHoursLoading ? (
                            <div className="h-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                              Đang tải dữ liệu giờ cao điểm...
                            </div>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={revHoursData.filter(d => d.revenue > 0)} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis
                                  dataKey="hour"
                                  tickLine={false}
                                  axisLine={false}
                                  style={{ fontSize: "9px", fill: "hsl(var(--muted-foreground))" }}
                                />
                                <YAxis
                                  tickLine={false}
                                  axisLine={false}
                                  style={{ fontSize: "9px", fill: "hsl(var(--muted-foreground))" }}
                                  tickFormatter={(val) => `${val.toLocaleString()}đ`}
                                />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: "hsl(var(--card))",
                                    borderColor: "hsl(var(--border))",
                                    borderRadius: "12px",
                                    fontSize: "10px",
                                  }}
                                  formatter={(value: any) => [`${value.toLocaleString()}đ`, "Doanh thu"]}
                                />
                                <Bar dataKey="revenue" fill="#F97316" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right part: comparison, payment methods pie, details */}
                  <div className="space-y-5 border-t lg:border-t-0 lg:border-l border-border pt-5 lg:pt-0 lg:pl-6">
                    {/* Trend & Comparison */}
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">So với kỳ trước</h5>
                      {revComparisonLoading ? (
                        <div className="h-12 bg-muted rounded-2xl animate-pulse" />
                      ) : (
                        <div className="flex items-center justify-between bg-muted/20 border border-border rounded-2xl p-3">
                          <div>
                            <p className="text-[10px] text-muted-foreground font-bold">KỲ TRƯỚC</p>
                            <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                              {revComparison?.previousRevenue ? `${Math.round(revComparison.previousRevenue).toLocaleString()}đ` : "0đ"}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-xl text-xs font-black ${
                              revComparison?.trend === "UP" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                            }`}>
                              {revComparison?.trend === "UP" ? (
                                <>
                                  <ArrowUpRight className="h-3 w-3" />
                                  +{revComparison?.percentageChange}%
                                </>
                              ) : (
                                <>
                                  <ArrowDownRight className="h-3 w-3" />
                                  {revComparison?.percentageChange}%
                                </>
                              )}
                            </span>
                            <p className="text-[9px] text-muted-foreground mt-1">
                              {revComparison?.trend === "UP" ? "↑ Tăng trưởng" : "↓ Giảm sút"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>



                    {/* Peak Hours & Record Invoices */}
                    <div className="space-y-3 pt-2 border-t border-dashed border-border">
                      {/* Busiest Hour */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          <span>Giờ đông khách nhất:</span>
                        </div>
                        <span className="font-bold text-foreground">
                          {(() => {
                            if (revHoursData.length === 0) return "N/A";
                            const peak = [...revHoursData].sort((a, b) => b.revenue - a.revenue)[0];
                            if (!peak || peak.revenue === 0) return "N/A";
                            const hourInt = parseInt(peak.hour.split(":")[0]);
                            return `${peak.hour} - ${String(hourInt + 1).padStart(2, "0")}:00`;
                          })()}
                        </span>
                      </div>

                      {/* Highest invoice */}
                      {highestInvoice && (
                        <div
                          onClick={() => {
                            setSelectedPaymentId(highestInvoice.paymentId);
                            setDetailOpen(true);
                          }}
                          className="group flex items-center justify-between text-xs bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 rounded-xl p-2 cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-1.5 text-emerald-600">
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            <span className="font-medium">Hóa đơn lớn nhất:</span>
                          </div>
                          <span className="font-bold text-emerald-700 group-hover:underline">
                            {highestInvoice.amount.toLocaleString()}đ
                          </span>
                        </div>
                      )}

                      {/* Lowest invoice */}
                      {lowestInvoice && (
                        <div
                          onClick={() => {
                            setSelectedPaymentId(lowestInvoice.paymentId);
                            setDetailOpen(true);
                          }}
                          className="group flex items-center justify-between text-xs bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 rounded-xl p-2 cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-1.5 text-amber-600">
                            <ArrowDownRight className="h-3.5 w-3.5" />
                            <span className="font-medium">Hóa đơn nhỏ nhất:</span>
                          </div>
                          <span className="font-bold text-amber-700 group-hover:underline">
                            {lowestInvoice.amount.toLocaleString()}đ
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Table Status Donut */}
              <Card className="rounded-3xl border-border shadow-soft text-left p-6 space-y-4 bg-card flex flex-col justify-between">
                <div>
                  <CardTitle className="text-base font-bold font-display">Tình trạng bàn ăn</CardTitle>
                  <CardDescription className="text-xs">Cơ cấu trạng thái bàn ăn hiện tại</CardDescription>
                </div>

                <div className="h-[180px] relative flex items-center justify-center">
                  {tableStatusLoading ? (
                    <div className="text-xs text-muted-foreground animate-pulse">Đang tải biểu đồ bàn...</div>
                  ) : tableChartData.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic">Không có bàn nào</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={tableChartData}
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {tableChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "12px",
                            fontSize: "10px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  {tableStatus && (
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-xl font-bold font-display">
                        {tableStatus.occupied} / {tableStatus.empty + tableStatus.occupied + tableStatus.reserved}
                      </span>
                      <span className="text-[9px] text-muted-foreground font-semibold uppercase">Đang bận</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-border pt-4">
                  {tableStatus ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#10b981]" />
                        <span className="text-muted-foreground">Trống:</span>
                        <strong className="font-bold ml-auto">{tableStatus.empty} bàn ({tableStatus.emptyPercentage?.toFixed(0)}%)</strong>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
                        <span className="text-muted-foreground">Bận:</span>
                        <strong className="font-bold ml-auto">{tableStatus.occupied} bàn ({tableStatus.occupiedPercentage?.toFixed(0)}%)</strong>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
                        <span className="text-muted-foreground">Đặt:</span>
                        <strong className="font-bold ml-auto">{tableStatus.reserved} bàn ({tableStatus.reservedPercentage?.toFixed(0)}%)</strong>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#9ca3af]" />
                        <span className="text-muted-foreground">Dọn:</span>
                        <strong className="font-bold ml-auto">{tableStatus.cleaning} bàn ({tableStatus.cleaningPercentage?.toFixed(0)}%)</strong>
                      </div>
                    </>
                  ) : (
                    <p className="text-[10px] text-muted-foreground col-span-2 text-center">N/A</p>
                  )}
                </div>
              </Card>
            </div>

            {/* Reservation Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Reservation Chart */}
              <Card className="rounded-3xl border-border shadow-soft text-left p-6 lg:col-span-2 space-y-6 bg-card">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
                  <div>
                    <CardTitle className="text-base font-bold font-display">Phân tích xu hướng đặt bàn</CardTitle>
                    <CardDescription className="text-xs">Theo dõi lượng đặt bàn trước, hàng chờ và vắng mặt</CardDescription>
                  </div>
                  <div className="flex gap-1 border border-border rounded-xl p-1 bg-muted/30">
                    <button
                      onClick={() => setResChartRange("7d")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                        resChartRange === "7d" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      7 ngày
                    </button>
                    <button
                      onClick={() => setResChartRange("30d")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                        resChartRange === "30d" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      30 ngày
                    </button>
                  </div>
                </div>

                <div className="h-[250px]">
                  {resStatsLoading ? (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                      Đang tải biểu đồ đặt bàn...
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={resChartRange === "7d" ? resStats?.chart7Days || [] : resStats?.chart30Days || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          style={{ fontSize: "9px", fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(tick) => {
                            const parts = tick.split("-");
                            return parts.length === 3 ? `${parts[2]}/${parts[1]}` : tick;
                          }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          style={{ fontSize: "9px", fill: "hsl(var(--muted-foreground))" }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "16px",
                            fontSize: "11px",
                          }}
                          formatter={(value: any, name: string) => {
                            if (name === "booked") return [value, "Chờ Check-in (BOOKED)"];
                            if (name === "seated") return [value, "Khách đang ăn (SEATED)"];
                            if (name === "completed") return [value, "Đã hoàn thành (COMPLETED)"];
                            if (name === "noShow") return [value, "Vắng mặt (NO SHOW)"];
                            if (name === "cancelled") return [value, "Đã hủy (CANCELLED)"];
                            return [value, name];
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "10px", marginTop: "10px" }} />
                        <Bar name="Chờ Check-in" dataKey="booked" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                        <Bar name="Đang ăn" dataKey="seated" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                        <Bar name="Đã hoàn thành" dataKey="completed" fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Bar name="Vắng mặt" dataKey="noShow" fill="#6B7280" radius={[4, 4, 0, 0]} />
                        <Bar name="Đã hủy" dataKey="cancelled" fill="#EF4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>

              {/* Reservation Conversion Rate */}
              <Card className="rounded-3xl border-border shadow-soft text-left p-6 space-y-4 bg-card flex flex-col justify-between">
                <div>
                  <CardTitle className="text-base font-bold font-display">Tỉ lệ check-in hôm nay</CardTitle>
                  <CardDescription className="text-xs">Tỉ lệ hoàn thành của các lượt đặt chỗ hôm nay</CardDescription>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center p-4">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="72"
                        cy="72"
                        r="60"
                        className="stroke-muted/20"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      <circle
                        cx="72"
                        cy="72"
                        r="60"
                        className="stroke-[#C89B3C] transition-all duration-500"
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray={376.9}
                        strokeDashoffset={376.9 - (376.9 * (resStats?.successRate || 0)) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-3xl font-black text-foreground">{resStats?.successRate ? resStats.successRate.toFixed(0) : 0}%</span>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">Thành công</p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-3 text-center text-[11px] text-muted-foreground">
                  Đã check-in <strong className="text-foreground">{(resStats?.seatedToday || 0) + (resStats?.completedToday || 0)}</strong> trên tổng số <strong className="text-foreground">{resStats?.totalToday || 0}</strong> lượt đặt chỗ hôm nay.
                </div>
              </Card>
            </div>

            {/* Tables & Lists Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Selling Foods (Column 1) */}
              <Card className="rounded-3xl border-border shadow-soft text-left p-6 space-y-4 bg-card lg:col-span-2 flex flex-col justify-between">
                <div className="space-y-1 border-b border-border pb-3">
                  <CardTitle className="text-base font-bold font-display">Top 10 Món bán chạy</CardTitle>
                  <CardDescription className="text-xs">Sắp xếp theo số lượng bán ra</CardDescription>
                </div>

                <div className="overflow-x-auto flex-1">
                  {topFoodsLoading ? (
                    <div className="py-10 text-center text-xs text-muted-foreground animate-pulse">Đang tải món ăn...</div>
                  ) : topFoods.length === 0 ? (
                    <p className="py-12 text-center text-xs text-muted-foreground italic">Chưa có dữ liệu món ăn được bán</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground font-semibold bg-accent/25">
                          <th className="p-3 text-left">Món ăn</th>
                          <th className="p-3 text-center">Đã bán</th>
                          <th className="p-3 text-right">Doanh thu (đ)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topFoods.map((food, idx) => (
                          <tr key={idx} className="border-b border-border/40 last:border-0 hover:bg-accent/10 transition-colors">
                            <td className="p-3 font-semibold text-foreground flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[9px] shrink-0">
                                {idx + 1}
                              </span>
                              <span className="truncate max-w-[200px]">{food.menuItemName}</span>
                            </td>
                            <td className="p-3 text-center font-bold">{food.quantitySold}</td>
                             <td className="p-3 text-right font-mono font-bold text-success">{formatPrice(food.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>

              {/* Feedback (Column 2) */}
              <Card className="rounded-3xl border-border shadow-soft text-left p-6 space-y-4 bg-card flex flex-col justify-between">
                <div className="space-y-1 border-b border-border pb-3">
                  <CardTitle className="text-base font-bold font-display">Phản hồi khách hàng</CardTitle>
                  <CardDescription className="text-xs">Đánh giá và phản hồi gần đây</CardDescription>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                  {/* Average summary */}
                  {summary && summary.totalFeedbackCount > 0 ? (
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex items-center justify-between shrink-0">
                      <div>
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Điểm đánh giá</p>
                        <h4 className="text-2xl font-black font-display text-amber-500 mt-0.5">{summary.averageRating.toFixed(1)} / 5.0</h4>
                      </div>
                      <div className="flex gap-0.5 text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-5 w-5 ${
                              i < Math.round(summary.averageRating) ? "fill-amber-400" : "text-amber-200"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Feedback list */}
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 flex-1">
                    {feedbackLoading ? (
                      <div className="py-10 text-center text-xs text-muted-foreground animate-pulse">Đang tải phản hồi...</div>
                    ) : recentFeedback.length === 0 ? (
                      <div className="py-20 text-center text-xs text-muted-foreground italic flex flex-col items-center gap-2 justify-center">
                        <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
                        <p className="font-bold">Chưa có phản hồi</p>
                      </div>
                    ) : (
                      recentFeedback.map((fb, idx) => (
                        <div key={idx} className="border border-border/60 rounded-2xl p-3 bg-accent/5 text-xs space-y-1.5 text-left">
                          <div className="flex justify-between items-center">
                            <span className="font-bold">{fb.customerName || "Ẩn danh"}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString("vi-VN") : "—"}
                            </span>
                          </div>
                          <div className="flex gap-0.5 text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${i < fb.rating ? "fill-amber-400" : "text-amber-200"}`}
                              />
                            ))}
                          </div>
                          {fb.comment && <p className="text-muted-foreground font-medium leading-relaxed italic">"{fb.comment}"</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Recent Payments & Reservations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Payments */}
              <Card className="rounded-3xl border-border shadow-soft text-left p-6 space-y-4 bg-card">
                <div className="space-y-1 border-b border-border pb-3">
                  <CardTitle className="text-base font-bold font-display">Hóa đơn mới nhất</CardTitle>
                  <CardDescription className="text-xs">10 giao dịch thanh toán thành công gần nhất</CardDescription>
                </div>

                <div className="overflow-x-auto">
                  {paymentsLoading ? (
                    <div className="py-10 text-center text-xs text-muted-foreground animate-pulse">Đang tải...</div>
                  ) : recentPayments.length === 0 ? (
                    <p className="py-10 text-center text-xs text-muted-foreground italic">Chưa có hóa đơn nào</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground font-semibold bg-accent/25">
                          <th className="p-3 text-left">Mã hóa đơn</th>
                          <th className="p-3 text-left">Bàn</th>
                          <th className="p-3 text-left">Khách</th>
                          <th className="p-3 text-left">Phương thức</th>
                          <th className="p-3 text-right">Tổng tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentPayments.map((p) => (
                          <tr
                            key={p.paymentId}
                            onClick={() => handleOpenDetail(p.paymentId)}
                            className="border-b border-border/40 hover:bg-accent/10 transition-colors cursor-pointer"
                          >
                            <td className="p-3 font-mono font-bold text-primary">INV-{p.paymentId}</td>
                            <td className="p-3 font-bold">{p.tableNumber ? `Bàn ${p.tableNumber}` : "—"}</td>
                            <td className="p-3 font-medium truncate max-w-[100px]">{p.customerName}</td>
                            <td className="p-3">
                              <Badge variant="outline" className={getMethodBadgeColor(p.paymentMethod)}>
                                {p.paymentMethod}
                              </Badge>
                            </td>
                             <td className="p-3 text-right font-bold text-success">{formatPrice(p.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>

              {/* Recent Reservations */}
              <Card className="rounded-3xl border-border shadow-soft text-left p-6 space-y-4 bg-card">
                <div className="space-y-1 border-b border-border pb-3">
                  <CardTitle className="text-base font-bold font-display">Đặt bàn mới nhất</CardTitle>
                  <CardDescription className="text-xs">10 lượt đặt bàn gần nhất trong hệ thống</CardDescription>
                </div>

                <div className="overflow-x-auto">
                  {reservationsLoading ? (
                    <div className="py-10 text-center text-xs text-muted-foreground animate-pulse">Đang tải...</div>
                  ) : recentReservations.length === 0 ? (
                    <p className="py-10 text-center text-xs text-muted-foreground italic">Chưa có lượt đặt bàn nào</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground font-semibold bg-accent/25">
                          <th className="p-3 text-left">Mã đặt bàn</th>
                          <th className="p-3 text-left">Khách</th>
                          <th className="p-3 text-center">SL khách</th>
                          <th className="p-3 text-left">Thời gian</th>
                          <th className="p-3 text-right">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentReservations.map((r, idx) => (
                          <tr key={idx} className="border-b border-border/40 hover:bg-accent/5 transition-colors">
                            <td className="p-3 font-mono font-bold">{r.reservationCode}</td>
                            <td className="p-3">
                              <p className="font-semibold">{r.customerName}</p>
                              <p className="text-[10px] text-muted-foreground">{r.phone}</p>
                            </td>
                            <td className="p-3 text-center font-bold">{r.guestCount}</td>
                            <td className="p-3 text-muted-foreground">
                              {r.reservationTime ? new Date(r.reservationTime).toLocaleString("vi-VN") : "—"}
                            </td>
                            <td className="p-3 text-right">
                              <Badge variant="outline" className={getReservationStatusColor(r.status)}>
                                {getReservationStatusLabel(r.status)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Invoice Details Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        {selectedPayment && (
          <DialogContent className="max-w-md rounded-3xl p-6 bg-card border border-border shadow-elegant text-left space-y-4 max-h-[90vh] overflow-y-auto">
            <DialogTitle className="font-bold text-lg font-display flex items-center justify-between">
              <span>Chi tiết hóa đơn INV-{selectedPayment.paymentId}</span>
              <Badge variant="outline" className="bg-success/15 text-success border-success/30 font-bold text-[9px] px-2 py-0.5 border">
                Đã thanh toán
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Thông tin chi tiết giao dịch thu ngân.
            </DialogDescription>

            {/* Thông tin khách hàng & Bàn */}
            <div className="bg-accent/10 border border-border/40 rounded-2xl p-4 space-y-2 text-xs">
              <p className="font-bold text-muted-foreground uppercase text-[10px] pb-1 border-b border-border/20">Thông tin khách hàng & Bàn</p>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Khách hàng:</span>
                <span className="font-semibold">{selectedPayment.customerName}</span>
              </div>
              {selectedPayment.customerPhone && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Số điện thoại:</span>
                  <span className="font-mono">{selectedPayment.customerPhone}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Bàn phục vụ:</span>
                <span className="font-bold">{selectedPayment.tableNumber ? `Bàn số ${selectedPayment.tableNumber}` : "Bàn đã giải phóng"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Session ID:</span>
                <span className="font-mono text-muted-foreground">SES-{selectedPayment.sessionId || "—"}</span>
              </div>
            </div>

            {/* Thông tin thanh toán */}
            <div className="bg-accent/10 border border-border/40 rounded-2xl p-4 space-y-2 text-xs">
              <p className="font-bold text-muted-foreground uppercase text-[10px] pb-1 border-b border-border/20">Thông tin thanh toán</p>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Mã hóa đơn:</span>
                <span className="font-mono font-bold text-primary">INV-{selectedPayment.paymentId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Phương thức:</span>
                <Badge variant="outline" className={getMethodBadgeColor(selectedPayment.paymentMethod)}>
                  {selectedPayment.paymentMethod}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Thời gian:</span>
                <span>{selectedPayment.paidAt ? new Date(selectedPayment.paidAt).toLocaleString("vi-VN") : "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Nhân viên xác nhận:</span>
                <span className="font-semibold">@{selectedPayment.confirmedBy || "System"}</span>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs font-display text-muted-foreground uppercase tracking-wider">Danh sách món ăn:</h4>
              <div className="border border-border/60 rounded-2xl overflow-hidden max-h-[200px] overflow-y-auto space-y-1 p-2 bg-accent/5">
                {selectedPayment.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start text-xs border-b border-border/30 last:border-b-0 py-2 px-1">
                    <div className="space-y-0.5">
                      <p className="font-bold">{item.menuItemName}</p>
                      {item.options?.map((opt: string, oIdx: number) => (
                        <p key={oIdx} className="text-[10px] text-muted-foreground pl-2">+ {opt}</p>
                      ))}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold">x{item.quantity}</p>
                      <p className="font-mono text-muted-foreground">{formatPrice(item.subtotal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="border-t border-border/60 pt-3 space-y-1.5 text-xs text-left">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tạm tính:</span>
                <span>{formatPrice(selectedPayment.subtotal || selectedPayment.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phí phục vụ (Service Charge 5%):</span>
                <span>{formatPrice(selectedPayment.serviceCharge)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Thuế VAT (8%):</span>
                <span>{formatPrice(selectedPayment.taxAmount)}</span>
              </div>
              {selectedPayment.discountAmount > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Giảm giá khuyến mại:</span>
                  <span>-{formatPrice(selectedPayment.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline font-bold text-sm border-t border-dashed border-border/80 pt-2">
                <span>Tổng tiền hóa đơn:</span>
                <span className="text-primary font-display text-base">{formatPrice(selectedPayment.amount)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t border-border/60">
              <Button
                onClick={handlePrint}
                className="flex-1 rounded-full h-10 font-bold text-xs bg-primary text-primary-foreground hover:opacity-95 cursor-pointer gap-1.5"
              >
                <Printer className="h-4 w-4" /> In hóa đơn POS
              </Button>
              <Button
                onClick={() => handleDownloadInvoice(selectedPayment.paymentId)}
                variant="outline"
                className="rounded-full h-10 font-bold text-xs border-border cursor-pointer gap-1.5 hover:bg-accent/40"
              >
                <Download className="h-4 w-4" /> Xuất PDF
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </AdminLayout>
  );
}
