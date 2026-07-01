import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search, Calendar, CreditCard, Download, Printer,
  Clock, User, Phone, Info, ChevronLeft, ChevronRight, Receipt
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "../../hooks/useAuth";
import AdminLayout from "../../components/AdminLayout";
import { paymentApi } from "../../api/paymentApi";

const formatPrice = (val?: number | null) => {
  if (val === null || val === undefined) return "0 đ";
  return new Intl.NumberFormat("vi-VN").format(Math.round(val * 25000)) + " đ";
};

export const Route = createFileRoute("/admin/payments-history")({
  component: AdminPaymentsHistory,
});

function AdminPaymentsHistory() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // State for filters
  const [datePreset, setDatePreset] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("ALL");
  const [paymentStatus, setPaymentStatus] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Selected payment detail modal
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);

  // Route protection (Allow ADMIN & CASHIER, exclude WAITER/KITCHEN)
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/admin/login" });
    } else if (user && user.role !== "ADMIN" && user.role !== "CASHIER") {
      toast.error("Bạn không có quyền truy cập trang Lịch sử thanh toán!");
      navigate({ to: "/" });
    }
  }, [user, isAuthenticated]);

  // Adjust dates based on preset
  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split("T")[0];

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthAgoStr = monthAgo.toISOString().split("T")[0];

    if (datePreset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (datePreset === "yesterday") {
      setStartDate(yesterdayStr);
      setEndDate(yesterdayStr);
    } else if (datePreset === "7days") {
      setStartDate(weekAgoStr);
      setEndDate(todayStr);
    } else if (datePreset === "30days") {
      setStartDate(monthAgoStr);
      setEndDate(todayStr);
    } else if (datePreset === "all") {
      setStartDate("");
      setEndDate("");
    }
    setCurrentPage(1);
  }, [datePreset]);

  // Compile filters to send to API
  const apiFilters = useMemo(() => {
    return {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      paymentMethod: paymentMethod === "ALL" ? undefined : paymentMethod,
      paymentStatus: paymentStatus === "ALL" ? undefined : paymentStatus,
      search: search.trim() || undefined,
    };
  }, [startDate, endDate, paymentMethod, paymentStatus, search]);

  // Fetch payments list
  const { data: payments = [], isLoading: listLoading } = useQuery({
    queryKey: ["adminPaymentsHistory", apiFilters],
    queryFn: () => paymentApi.getPaymentHistoryFiltered(apiFilters),
    enabled: isAuthenticated && (user?.role === "ADMIN" || user?.role === "CASHIER"),
  });

  // Pagination calculations
  const totalPages = Math.ceil(payments.length / itemsPerPage);
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return payments.slice(start, start + itemsPerPage);
  }, [payments, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
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

  // View details handler
  const handleViewDetails = (p: any) => {
    setSelectedPayment(p);
    setDetailOpen(true);
  };

  // Print invoice directly using native browser print
  const handlePrint = () => {
    window.print();
  };

  if (!isAuthenticated || (user && user.role !== "ADMIN" && user.role !== "CASHIER")) {
    return null;
  }

  const getMethodBadgeColor = (method: string) => {
    switch (method) {
      case "QR":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "CASH":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "PAYPAL":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return "bg-success/10 text-success border-success/20";
      case "CANCELLED":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <AdminLayout title="Lịch sử thanh toán">
      {/* Printable Invoice Container (Only visible during print) */}
      {selectedPayment && (
        <div id="print-area" className="hidden print:block p-8 bg-white text-black font-sans w-full max-w-sm mx-auto">
          <div className="text-center space-y-2 mb-6">
            <h1 className="text-lg font-bold uppercase tracking-wider">HÓA ĐƠN THANH TOÁN</h1>
            <p className="text-xs">Dine Smooth Scan Restaurant</p>
            <p className="text-[10px] text-gray-500">Mã hóa đơn: INV-{selectedPayment.paymentId}</p>
            <p className="text-[10px] text-gray-500">Mã thanh toán: {selectedPayment.transactionCode || `TXN-${selectedPayment.paymentId}`}</p>
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
            {selectedPayment.customerPhone && (
              <div className="flex justify-between">
                <span>Số điện thoại:</span>
                <span>{selectedPayment.customerPhone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Phương thức:</span>
              <span className="font-semibold">{selectedPayment.paymentMethod === "QR" ? "VietQR" : selectedPayment.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span>Thời gian:</span>
              <span>{selectedPayment.paidAt ? new Date(selectedPayment.paidAt).toLocaleString("vi-VN") : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span>Thu ngân:</span>
              <span>{selectedPayment.confirmedBy || "System"}</span>
            </div>
          </div>

          <table className="w-full text-left text-xs mb-4">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-1">Món ăn</th>
                <th className="py-1 text-center">SL</th>
                <th className="py-1 text-right">Đơn giá</th>
                <th className="py-1 text-right">T.Tiền</th>
              </tr>
            </thead>
            <tbody>
              {selectedPayment.items?.map((item: any, index: number) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-1.5 max-w-[150px]">
                    <p className="font-semibold">{item.menuItemName}</p>
                    {item.options?.map((opt: string, i: number) => (
                      <p key={i} className="text-[10px] text-gray-500 pl-2">+ {opt}</p>
                    ))}
                    {item.note && (
                      <p className="text-[10px] text-amber-500 italic pl-2">Ghi chú: {item.note}</p>
                    )}
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
              <span>Tổng thanh toán:</span>
              <span>{formatPrice(selectedPayment.amount)}</span>
            </div>
          </div>

          <div className="text-center text-[10px] text-gray-500 mt-8 space-y-1">
            <p>Cảm ơn quý khách! Thank you!</p>
            <p>Hệ thống hỗ trợ bởi Dine Smooth Scan QR</p>
          </div>
        </div>
      )}

      {/* Main Screen Layout (Hidden during print) */}
      <div className="p-6 space-y-6 print:hidden">
        {/* Filter Section */}
        <Card className="rounded-3xl border-border shadow-soft text-left p-6 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm font-display text-primary uppercase tracking-wider">
            <Info className="h-4 w-4" /> Bộ lọc tra cứu hóa đơn
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Khoảng thời gian</label>
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-card text-xs focus:outline-none focus:border-primary font-semibold"
              >
                <option value="all">Tất cả thời gian</option>
                <option value="today">Hôm nay</option>
                <option value="7days">7 ngày qua</option>
                <option value="30days">30 ngày qua</option>
                <option value="custom">Tùy chọn khoảng ngày</option>
              </select>
            </div>

            {datePreset === "custom" && (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Từ ngày</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-card text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Đến ngày</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-card text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Phương thức</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-card text-xs focus:outline-none focus:border-primary"
              >
                <option value="ALL">Tất cả phương thức</option>
                <option value="QR">VietQR (Chuyển khoản)</option>
                <option value="CASH">Tiền mặt (Cash)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Trạng thái</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-card text-xs focus:outline-none focus:border-primary font-semibold"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="SUCCESS">Đã thanh toán</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4 items-end pt-2 border-t border-border/50">
            <div className="flex-1 space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Từ khóa tìm kiếm</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <input
                  type="text"
                  placeholder="Tìm theo Mã hóa đơn, Mã thanh toán, Tên khách hàng, Số điện thoại, Số bàn..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-card text-xs focus:outline-none focus:border-primary placeholder:text-muted-foreground/50 font-medium"
                />
              </div>
            </div>
            <Button
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setPaymentMethod("ALL");
                setPaymentStatus("ALL");
                setSearch("");
                setDatePreset("all");
              }}
              variant="outline"
              className="h-10 rounded-xl px-4 text-xs font-bold border-dashed border-muted-foreground/40 hover:bg-accent/40 cursor-pointer"
            >
              Reset bộ lọc
            </Button>
          </div>
        </Card>

        {/* Payments Table */}
        <Card className="rounded-3xl border-border shadow-soft text-left overflow-hidden">
          <div className="p-4 border-b border-border/60 bg-accent/5 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Danh sách hóa đơn ({payments.length})</span>
          </div>

          {listLoading ? (
            <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
              Đang tải danh sách lịch sử...
            </div>
          ) : payments.length === 0 ? (
            <div className="py-20 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Receipt className="h-10 w-10 text-muted-foreground/50" />
              <p className="font-bold">Không tìm thấy hóa đơn nào</p>
              <p className="text-xs text-muted-foreground/75">Vui lòng điều chỉnh lại từ khóa hoặc bộ lọc của bạn.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-accent/25 font-semibold text-muted-foreground">
                    <th className="p-4 text-left">Mã hóa đơn</th>
                    <th className="p-4 text-left">Mã thanh toán</th>
                    <th className="p-4 text-left">Bàn ăn</th>
                    <th className="p-4 text-left">Khách hàng</th>
                    <th className="p-4 text-left">Phương thức</th>
                    <th className="p-4 text-left">Tổng cộng</th>
                    <th className="p-4 text-left">Trạng thái</th>
                    <th className="p-4 text-left">Thời gian thanh toán</th>
                    <th className="p-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.map((p: any) => (
                    <tr key={p.paymentId} className="border-b border-border hover:bg-accent/10 transition-colors">
                      <td className="p-4 font-mono font-bold text-primary">INV-{p.paymentId}</td>
                      <td className="p-4 font-mono text-muted-foreground">{p.transactionCode || `TXN-${p.paymentId}`}</td>
                      <td className="p-4 font-bold">{p.tableNumber ? `Bàn ${p.tableNumber}` : "—"}</td>
                      <td className="p-4">
                        <p className="font-semibold">{p.customerName}</p>
                        {p.customerPhone && <p className="text-[10px] text-muted-foreground">{p.customerPhone}</p>}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className={cn("font-bold text-[9px] px-2 py-0.5 border", getMethodBadgeColor(p.paymentMethod))}>
                          {p.paymentMethod === "QR" ? "VIETQR" : p.paymentMethod}
                        </Badge>
                      </td>
                      <td className="p-4 font-bold font-display text-primary">{formatPrice(p.amount)}</td>
                      <td className="p-4">
                        <Badge variant="outline" className={cn("font-bold text-[9px] px-2 py-0.5 border", getStatusBadgeColor(p.paymentStatus))}>
                          {p.paymentStatus === "SUCCESS" ? "ĐÃ THANH TOÁN" : "ĐÃ HỦY"}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {p.paidAt ? new Date(p.paidAt).toLocaleString("vi-VN") : "—"}</span>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          onClick={() => handleViewDetails(p)}
                          variant="ghost"
                          className="h-8 text-[11px] font-bold rounded-lg px-2.5 cursor-pointer hover:bg-accent"
                        >
                          Chi tiết
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-card/50">
              <span className="text-xs text-muted-foreground">
                Hiển thị trang {currentPage} trên {totalPages} (Tổng {payments.length} hóa đơn)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {[...Array(totalPages)].map((_, i) => (
                  <Button
                    key={i}
                    variant={currentPage === i + 1 ? "default" : "outline"}
                    onClick={() => handlePageChange(i + 1)}
                    className="h-8 w-8 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Invoice Details Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        {selectedPayment && (
          <DialogContent className="max-w-md rounded-3xl p-6 bg-card border border-border shadow-elegant text-left space-y-4 max-h-[90vh] overflow-y-auto">
            <DialogTitle className="font-bold text-lg font-display flex items-center justify-between">
              <span>Chi tiết hóa đơn INV-{selectedPayment.paymentId}</span>
              <Badge variant="outline" className={cn("font-bold text-[9px] border", getStatusBadgeColor(selectedPayment.paymentStatus))}>
                {selectedPayment.paymentStatus === "SUCCESS" ? "Đã thanh toán" : "Đã hủy"}
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
                <span className="text-muted-foreground">Mã thanh toán:</span>
                <span className="font-mono">{selectedPayment.transactionCode || `TXN-${selectedPayment.paymentId}`}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Phương thức:</span>
                <Badge variant="outline" className={cn("font-bold text-[9px] border", getMethodBadgeColor(selectedPayment.paymentMethod))}>
                  {selectedPayment.paymentMethod === "QR" ? "VietQR" : selectedPayment.paymentMethod}
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

            {/* Reservation details */}
            {selectedPayment.reservationCode && (
              <div className="bg-accent/10 border border-border/40 rounded-2xl p-4 space-y-2 text-xs">
                <p className="font-bold text-muted-foreground uppercase text-[10px] pb-1 border-b border-border/20">Thông tin đặt trước (Reservation)</p>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mã đặt bàn:</span>
                  <Badge className="bg-primary/10 text-primary border-0 font-mono font-bold text-[10px]">
                    {selectedPayment.reservationCode}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Thời gian đặt:</span>
                  <span>{selectedPayment.sessionStartTime ? new Date(selectedPayment.sessionStartTime).toLocaleString("vi-VN") : "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Check-in lúc:</span>
                  <span>{selectedPayment.sessionStartTime ? new Date(selectedPayment.sessionStartTime).toLocaleTimeString("vi-VN") : "—"}</span>
                </div>
              </div>
            )}

            {/* VietQR Transaction details */}
            {selectedPayment.paymentMethod === "QR" && (
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 space-y-2 text-xs text-blue-600">
                <p className="font-bold uppercase text-[10px] pb-1 border-b border-blue-500/10">Thông tin VietQR</p>
                <div className="flex justify-between items-center">
                  <span>Nội dung chuyển khoản:</span>
                  <span className="font-mono font-bold">{selectedPayment.transactionCode || `INV ${selectedPayment.paymentId}`}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Mã giao dịch (Conf.):</span>
                  <span className="font-mono">{selectedPayment.transactionCode || `TXN-${selectedPayment.paymentId}`}</span>
                </div>
              </div>
            )}

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
                      {item.note && (
                        <p className="text-[10px] text-amber-500 italic pl-2">Ghi chú: {item.note}</p>
                      )}
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
                className="flex-1 rounded-full h-10 font-bold text-xs bg-primary text-primary-foreground hover:opacity-95 cursor-pointer gap-1.5 animate-bounce-subtle"
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
