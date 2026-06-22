import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { CreditCard, Banknote, History, Clock, CheckCircle2, QrCode, Wallet, AlertCircle, Search, Calendar, Filter, RotateCcw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "../../hooks/useAuth";
import AdminLayout from "../../components/AdminLayout";
import { paymentApi, PaymentRequestItem } from "../../api/paymentApi";
import { orderApi } from "../../api/orderApi";
import { cn } from "@/lib/utils";

// Component to handle truncation & expansion of ordered items in payment history
function PaymentItemsCell({ items }: { items: any[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!items || items.length === 0) {
    return <span className="text-muted-foreground italic text-xs">Không có chi tiết</span>;
  }

  const limit = 2; // Show 2 items first
  const showExpand = items.length > limit;
  const displayedItems = expanded ? items : items.slice(0, limit);

  return (
    <div className="flex flex-col gap-1 max-w-[300px]">
      <div className="flex flex-col gap-1">
        {displayedItems.map((item: any, idx: number) => (
          <div
            key={idx}
            className="flex flex-col border-b border-border/10 pb-1 last:border-0 last:pb-0"
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium truncate mr-2">{item.menuItemName}</span>
              <span className="text-muted-foreground font-semibold">x{item.quantity}</span>
            </div>
            {item.options && item.options.length > 0 && (
              <span className="text-[9px] text-muted-foreground italic ml-1 mt-0.5">
                + {item.options.join(", ")}
              </span>
            )}
          </div>
        ))}
      </div>
      {showExpand && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-primary hover:underline font-semibold mt-1 self-start cursor-pointer transition-colors"
        >
          {expanded ? "Thu gọn" : `Xem thêm (+${items.length - limit} món)`}
        </button>
      )}
    </div>
  );
}

export const Route = createFileRoute("/admin/payments")({
  component: AdminPayments,
});

function AdminPayments() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"requests" | "history" | "active">("requests");

  // Route protection
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/admin/login" });
    } else if (user && user.role !== "ADMIN" && user.role !== "CASHIER" && user.role !== "BRANCH_MANAGER") {
      toast.error("Bạn không có quyền truy cập trang Thanh toán!");
      navigate({ to: "/" });
    }
  }, [user, isAuthenticated]);

  const { data: openSessions = [], isLoading: openLoading } = useQuery({
    queryKey: ["cashierSessions"],
    queryFn: paymentApi.getCashierSessions,
    refetchInterval: 5000,
    enabled: isAuthenticated && (user?.role === "ADMIN" || user?.role === "CASHIER" || user?.role === "BRANCH_MANAGER") && tab === "active",
  });

  const { data: pendingRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["pendingPaymentRequests"],
    queryFn: paymentApi.getPendingPaymentRequests,
    refetchInterval: 3000,
    enabled: isAuthenticated && (user?.role === "ADMIN" || user?.role === "CASHIER" || user?.role === "BRANCH_MANAGER"),
  });

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["paymentHistory"],
    queryFn: paymentApi.getPaymentHistory,
    enabled: isAuthenticated && (user?.role === "ADMIN" || user?.role === "CASHIER" || user?.role === "BRANCH_MANAGER") && tab === "history",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterMethod, setFilterMethod] = useState("ALL");

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate, filterMethod]);

  const filteredHistory = useMemo(() => {
    return history.filter((h: any) => {
      // 1. Search term matching
      if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase();
        const paymentIdStr = `txn-${h.paymentId}`.toLowerCase();
        const sessionIdStr = `ses-${h.sessionId}`.toLowerCase();
        const matchesId = paymentIdStr.includes(term) || 
                          sessionIdStr.includes(term) || 
                          String(h.paymentId).includes(term) ||
                          String(h.sessionId).includes(term);
                          
        const matchesItems = h.items && h.items.some((item: any) => 
          item.menuItemName && item.menuItemName.toLowerCase().includes(term)
        );
        
        if (!matchesId && !matchesItems) {
          return false;
        }
      }

      // 2. Filter by date range matching (local timezone comparison)
      if (startDate || endDate) {
        if (!h.paidAt) return false;
        const localPaidDate = new Date(h.paidAt);
        const year = localPaidDate.getFullYear();
        const month = String(localPaidDate.getMonth() + 1).padStart(2, '0');
        const day = String(localPaidDate.getDate()).padStart(2, '0');
        const localPaidDateStr = `${year}-${month}-${day}`;
        
        if (startDate && localPaidDateStr < startDate) {
          return false;
        }
        if (endDate && localPaidDateStr > endDate) {
          return false;
        }
      }

      // 3. Filter by payment method
      if (filterMethod !== "ALL") {
        const method = h.paymentMethod || "CASH";
        if (method !== filterMethod) {
          return false;
        }
      }

      return true;
    });
  }, [history, searchTerm, startDate, endDate, filterMethod]);

  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredHistory.slice(start, start + itemsPerPage);
  }, [filteredHistory, currentPage]);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

  const payMutation = useMutation({
    mutationFn: async ({ sessionId, paymentMethod }: { sessionId: number; paymentMethod: string }) => {
      return paymentApi.payment(sessionId, paymentMethod);
    },
    onSuccess: () => {
      toast.success("Thanh toán hóa đơn và giải phóng bàn thành công!");
      queryClient.invalidateQueries({ queryKey: ["cashierSessions"] });
      queryClient.invalidateQueries({ queryKey: ["paymentHistory"] });
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || err.message || "Thanh toán thất bại!";
      toast.error(errMsg);
    }
  });

  const confirmRequestMutation = useMutation({
    mutationFn: async (id: number) => {
      return paymentApi.confirmPaymentRequest(id);
    },
    onSuccess: () => {
      toast.success("✅ Xác nhận thành công! Bàn đã được giải phóng.");
      queryClient.invalidateQueries({ queryKey: ["pendingPaymentRequests"] });
      queryClient.invalidateQueries({ queryKey: ["cashierSessions"] });
      queryClient.invalidateQueries({ queryKey: ["paymentHistory"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Xác nhận thất bại!");
    }
  });

  const closeSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return paymentApi.closeSession(sessionId);
    },
    onSuccess: () => {
      toast.success("Đóng phiên và giải phóng bàn thành công!");
      queryClient.invalidateQueries({ queryKey: ["cashierSessions"] });
      queryClient.invalidateQueries({ queryKey: ["paymentHistory"] });
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || err.message || "Đóng phiên thất bại!";
      toast.error(errMsg);
    }
  });

  if (!isAuthenticated || (user && user.role !== "ADMIN" && user.role !== "CASHIER" && user.role !== "BRANCH_MANAGER")) {
    return null;
  }

  return (
    <AdminLayout title="Hóa đơn & Thanh toán (Cashier POS)">
      <div className="p-6 space-y-6">
        <div className="flex border-b border-border">
          <button
            onClick={() => setTab("requests")}
            className={`relative px-4 py-2 border-b-2 font-semibold text-sm transition-colors cursor-pointer ${tab === "requests" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Yêu cầu thanh toán
            {pendingRequests.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-extrabold px-1 animate-pulse">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("history")}
            className={`px-4 py-2 border-b-2 font-semibold text-sm transition-colors cursor-pointer ${tab === "history" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <span className="flex items-center gap-1"><History className="h-4 w-4" /> Lịch sử thanh toán</span>
          </button>
        </div>

        {tab === "requests" ? (
          requestsLoading ? (
            <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">Đang tải...</div>
          ) : pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-3xl space-y-3 shadow-soft">
              <CheckCircle2 className="h-10 w-10 text-success" />
              <p className="font-semibold text-lg">Không có yêu cầu đang chờ!</p>
              <p className="text-sm text-muted-foreground">Khi khách gửi yêu cầu thanh toán, thông tin sẽ hiển thị tại đây.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingRequests.map((req) => (
                <PaymentRequestCard
                  key={req.id}
                  request={req}
                  onConfirm={(id) => confirmRequestMutation.mutate(id)}
                  isConfirming={confirmRequestMutation.isPending}
                />
              ))}
            </div>
          )
        ) : tab === "history" ? (
          historyLoading ? (
            <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
              Đang tải lịch sử thanh toán...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search and Filters Bar */}
              <div className="flex flex-col lg:flex-row gap-3 items-end justify-between bg-card border border-border p-4 rounded-3xl shadow-sm text-left">
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full lg:w-auto flex-1 items-end">
                  {/* Search Input */}
                  <div className="flex flex-col gap-1 w-full sm:flex-1 max-w-md">
                    <span className="text-[10px] font-semibold text-muted-foreground ml-1">Từ khóa tìm kiếm</span>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Tìm hóa đơn (ID, Phiên, Tên món...)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-12 py-2 w-full text-xs bg-background border border-input rounded-2xl focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Start Date Filter */}
                  <div className="flex flex-col gap-1 w-full sm:w-40">
                    <span className="text-[10px] font-semibold text-muted-foreground ml-1">Từ ngày</span>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="pl-9 pr-4 py-2 w-full text-xs bg-background border border-input rounded-2xl focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* End Date Filter */}
                  <div className="flex flex-col gap-1 w-full sm:w-40">
                    <span className="text-[10px] font-semibold text-muted-foreground ml-1">Đến ngày</span>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="pl-9 pr-4 py-2 w-full text-xs bg-background border border-input rounded-2xl focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Payment Method Filter */}
                  <div className="flex flex-col gap-1 w-full sm:w-44">
                    <span className="text-[10px] font-semibold text-muted-foreground ml-1">Phương thức</span>
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <select
                        value={filterMethod}
                        onChange={(e) => setFilterMethod(e.target.value)}
                        className="pl-9 pr-8 py-2 w-full text-xs bg-background border border-input rounded-2xl focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer appearance-none"
                      >
                        <option value="ALL">Tất cả phương thức</option>
                        <option value="CASH">Tiền mặt (CASH)</option>
                        <option value="QR">Chuyển khoản QR</option>
                        <option value="PAYPAL">PayPal</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-[8px]">
                        ▼
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reset Filters Button */}
                {(searchTerm || startDate || endDate || filterMethod !== "ALL") && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSearchTerm("");
                      setStartDate("");
                      setEndDate("");
                      setFilterMethod("ALL");
                    }}
                    className="text-xs h-9 px-3 gap-1 rounded-2xl cursor-pointer hover:bg-accent mb-0.5"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Đặt lại
                  </Button>
                )}
              </div>

              {filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-3xl space-y-3 shadow-soft">
                  <AlertCircle className="h-10 w-10 text-muted-foreground" />
                  <p className="font-semibold text-lg">Không tìm thấy kết quả phù hợp</p>
                  <p className="text-sm text-muted-foreground">Thử thay đổi từ khóa tìm kiếm hoặc các bộ lọc của bạn.</p>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-soft text-left">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-accent/25 text-xs font-semibold text-muted-foreground">
                          <th className="p-4 text-left">ID Giao dịch</th>
                          <th className="p-4 text-left">Mã Phiên</th>
                          <th className="p-4 text-left">Món ăn đã gọi</th>
                          <th className="p-4 text-left">Phương thức</th>
                          <th className="p-4 text-left">Thời gian thanh toán</th>
                          <th className="p-4 text-right">Tổng thanh toán</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedHistory.map((h: any) => (
                          <tr key={h.paymentId} className="border-b border-border hover:bg-accent/10 transition-colors">
                            <td className="p-4 font-mono text-xs">TXN-{h.paymentId}</td>
                            <td className="p-4 font-mono text-xs">SES-{h.sessionId}</td>
                            <td className="p-4 text-xs">
                              <PaymentItemsCell items={h.items} />
                            </td>
                            <td className="p-4">
                              <Badge variant="secondary" className="bg-accent text-foreground border-0 text-[10px]">
                                {h.paymentMethod || "CASH"}
                              </Badge>
                            </td>
                            <td className="p-4 text-xs text-muted-foreground">
                              {h.paidAt ? new Date(h.paidAt).toLocaleString() : "Just now"}
                            </td>
                            <td className="p-4 text-right font-bold text-success">${h.amount ? h.amount.toFixed(2) : "0.00"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-card/50">
                      <div className="flex flex-1 justify-between sm:hidden">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="h-8 text-xs cursor-pointer"
                        >
                          Trước
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="h-8 text-xs cursor-pointer"
                        >
                          Sau
                        </Button>
                      </div>
                      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Hiển thị <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> đến{" "}
                            <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredHistory.length)}</span> trong số{" "}
                            <span className="font-semibold">{filteredHistory.length}</span> kết quả
                          </p>
                        </div>
                        <div>
                          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm gap-1" aria-label="Pagination">
                            <Button
                              variant="outline"
                              className="rounded-l-md px-2 py-1 h-8 text-xs cursor-pointer"
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                            >
                              Trước
                            </Button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <Button
                                key={page}
                                variant={currentPage === page ? "default" : "outline"}
                                className="px-3 py-1 h-8 text-xs cursor-pointer"
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </Button>
                            ))}
                            <Button
                              variant="outline"
                              className="rounded-r-md px-2 py-1 h-8 text-xs cursor-pointer"
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={currentPage === totalPages}
                            >
                              Sau
                            </Button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        ) : null}
      </div>
    </AdminLayout>
  );
}

interface SessionCardProps {
  session: any;
  onPay: (sessionId: number, paymentMethod: string) => void;
  isPaying: boolean;
  onCloseSession: (sessionId: number) => void;
  isClosing: boolean;
}

function SessionCard({ session, onPay, isPaying, onCloseSession, isClosing }: SessionCardProps) {
  const { user } = useAuth();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["sessionOrders", session.sessionId],
    queryFn: () => orderApi.getOrdersBySession(session.sessionId),
    refetchInterval: 5000,
  });

  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "QR" | "PAYPAL">("CASH");

  const isPayPalPaid = session.paymentStatus === "SUCCESS" && session.paymentMethod === "PAYPAL";

  const hasUnservedItems = useMemo(() => {
    return items.some((item: any) => 
      item.status !== "SERVED" && 
      item.status !== "CANCELLED" && 
      item.status !== "WASTED"
    );
  }, [items]);

  const statusStyles: Record<string, string> = {
    PENDING: "bg-muted text-muted-foreground border-muted",
    PREPARING: "bg-warning/15 text-warning border-warning/30",
    DONE: "bg-success/15 text-success border-success/30",
    SERVED: "bg-primary/15 text-primary border-primary/30",
    CANCELLED: "bg-destructive/15 text-destructive border-destructive/30",
    WASTED: "bg-destructive/15 text-destructive border-destructive/30",
  };

  const statusLabels: Record<string, string> = {
    PENDING: "Chờ bếp",
    PREPARING: "Đang nấu",
    DONE: "Chờ phục vụ",
    SERVED: "Đã phục vụ",
    CANCELLED: "Đã hủy",
    WASTED: "Hỏng",
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-6 shadow-elegant flex flex-col justify-between space-y-5 text-left transition-smooth hover:shadow-soft">
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground font-bold text-xs shadow-soft">
              {session.tableNumber}
            </span>
            <h3 className="font-bold font-display text-sm">Bàn {session.tableNumber}</h3>
          </div>
          <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground border-border bg-accent/30">
            ID #{session.sessionId}
          </Badge>
        </div>

        <div className="space-y-2.5 text-sm">
          {isPayPalPaid && (
            <div className="p-3 rounded-2xl bg-success/15 text-success border border-success/30 text-xs font-bold flex items-center justify-center gap-1.5 animate-pulse">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              Đã thanh toán qua PayPal
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-muted-foreground">Khách hàng:</span>
            <span className="font-semibold">{session.customerName || "Khách tại bàn"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bắt đầu lúc:</span>
            <span className="font-medium text-xs">
              {session.startTime ? new Date(session.startTime).toLocaleTimeString() : "Just now"}
            </span>
          </div>

          <div className="border-t border-border/60 pt-3 space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Chi tiết món ăn:</h4>
            {isLoading ? (
              <p className="text-xs text-muted-foreground animate-pulse">Đang tải món ăn...</p>
            ) : items.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Chưa gọi món nào</p>
            ) : (
              <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {items.map((item: any) => (
                  <li key={item.itemId} className="flex justify-between items-center text-xs border-b border-border/20 pb-1 last:border-0 last:pb-0">
                    <span className="font-medium flex-1 truncate pr-2">
                      {item.menuItemName} <span className="text-muted-foreground">x{item.quantity}</span>
                    </span>
                    <Badge variant="outline" className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${statusStyles[item.status] || ""}`}>
                      {statusLabels[item.status] || item.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {hasUnservedItems && (
            <div className="p-3 rounded-2xl bg-warning/10 border border-warning/20 text-warning text-xs leading-normal flex items-start gap-2">
              <span className="font-bold mt-0.5">⚠️</span>
              <div>
                <p className="font-bold">Chưa hoàn tất phục vụ</p>
                <p className="text-[11px] opacity-90">Có món đang chế biến hoặc chờ phục vụ. Vui lòng phục vụ hết trước khi thanh toán.</p>
              </div>
            </div>
          )}

          {!isPayPalPaid && user?.role !== "BRANCH_MANAGER" && (
            <div className="border-t border-border/60 pt-3 space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phương thức thanh toán:</h4>
              <div className="grid grid-cols-3 gap-2">
                {(["CASH", "QR", "PAYPAL"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    disabled={hasUnservedItems || isPaying}
                    className={cn(
                      "py-2 px-1 rounded-xl text-center font-bold text-xs border transition-all cursor-pointer",
                      paymentMethod === method
                        ? "bg-primary text-primary-foreground border-primary shadow-soft"
                        : "bg-accent/40 text-muted-foreground border-border/40 hover:bg-accent/80"
                    )}
                  >
                    {method === "CASH" ? "Tiền mặt" : method === "QR" ? "QR Chuyển khoản" : "Paypal"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-baseline border-t border-dashed border-border/80 pt-3">
            <span className="text-base font-semibold">Tạm tính:</span>
            <span className="font-display text-xl font-bold text-primary">${session.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {user?.role === "BRANCH_MANAGER" ? (
        <div className="p-3 bg-accent/30 rounded-2xl border border-border/50 text-center text-xs font-bold text-muted-foreground">
          Chi nhánh: {session.branchName || "Chưa xác định"} (Chỉ xem)
        </div>
      ) : isPayPalPaid ? (
        <Button
          onClick={() => onCloseSession(session.sessionId)}
          disabled={isClosing}
          className="w-full h-11 font-bold rounded-full shadow-elegant cursor-pointer text-xs flex items-center justify-center gap-1.5 transition-all bg-primary text-primary-foreground hover:opacity-95"
        >
          <CreditCard className="h-4 w-4" />
          {isClosing ? "Đang xử lý..." : "Đóng bàn (Close Session)"}
        </Button>
      ) : (
        <Button
          onClick={() => onPay(session.sessionId, paymentMethod)}
          disabled={isPaying || hasUnservedItems}
          className={`w-full h-11 font-bold rounded-full shadow-elegant cursor-pointer text-xs flex items-center justify-center gap-1.5 transition-all ${
            hasUnservedItems
              ? "bg-muted text-muted-foreground cursor-not-allowed border-0"
              : "bg-success text-success-foreground hover:opacity-95"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          {isPaying ? "Đang xử lý..." : hasUnservedItems ? "Chưa thể thanh toán" : "Xác nhận thanh toán (POS Success)"}
        </Button>
      )}
    </div>
  );
}

// ─── PaymentRequestCard ───────────────────────────────────────────────────────

interface PaymentRequestCardProps {
  request: PaymentRequestItem;
  onConfirm: (id: number) => void;
  isConfirming: boolean;
}

function PaymentRequestCard({ request, onConfirm, isConfirming }: PaymentRequestCardProps) {
  const methodIcons: Record<string, React.ReactNode> = {
    CASH: <Banknote className="h-4 w-4" />,
    QR: <QrCode className="h-4 w-4" />,
    PAYPAL: <Wallet className="h-4 w-4" />,
  };

  const methodLabels: Record<string, string> = {
    CASH: "Tiền mặt",
    QR: "Chuyển khoản QR",
    PAYPAL: "PayPal",
  };

  const statusStyles: Record<string, string> = {
    PENDING: "bg-muted text-muted-foreground border-muted",
    PREPARING: "bg-warning/15 text-warning border-warning/30",
    DONE: "bg-success/15 text-success border-success/30",
    SERVED: "bg-primary/15 text-primary border-primary/30",
    CANCELLED: "bg-destructive/15 text-destructive border-destructive/30",
    WASTED: "bg-destructive/15 text-destructive border-destructive/30",
  };

  const statusLabels: Record<string, string> = {
    PENDING: "Chờ bếp",
    PREPARING: "Đang nấu",
    DONE: "Chờ phục vụ",
    SERVED: "Đã phục vụ",
    CANCELLED: "Đã hủy",
    WASTED: "Hỏng",
  };

  const elapsed = request.requestedAt
    ? Math.floor((Date.now() - new Date(request.requestedAt).getTime()) / 60000)
    : 0;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["sessionOrders", request.sessionId],
    queryFn: () => orderApi.getOrdersBySession(request.sessionId),
    refetchInterval: 5000,
  });

  return (
    <div className="bg-card border border-border rounded-3xl p-6 shadow-elegant flex flex-col justify-between space-y-5 text-left transition-smooth hover:shadow-soft">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground font-bold text-xs shadow-soft">
              {request.tableNumber}
            </span>
            <h3 className="font-bold font-display text-sm">Bàn {request.tableNumber}</h3>
          </div>
          <div className="flex items-center gap-1.5">
            {request.alreadyPaid && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30">
                ĐÃ TT PAYPAL
              </span>
            )}
            <span className="text-[9px] font-mono text-muted-foreground">#{request.id}</span>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Chi nhánh:</span>
            <span className="font-semibold text-xs">{request.branchName || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gửi lúc:</span>
            <span className="font-medium text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {request.requestedAt ? new Date(request.requestedAt).toLocaleTimeString() : "Just now"}
              {elapsed > 0 && <span className="text-muted-foreground">({elapsed}p trước)</span>}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Hình thức:</span>
            <span className="flex items-center gap-1 font-bold text-xs">
              {methodIcons[request.paymentMethod] || null}
              {methodLabels[request.paymentMethod] || request.paymentMethod}
            </span>
          </div>
        </div>

        {/* Chi tiết món ăn */}
        <div className="border-t border-border/60 pt-3 space-y-2">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Danh sách món ăn:</h4>
          {isLoading ? (
            <p className="text-xs text-muted-foreground animate-pulse">Đang tải món ăn...</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Chưa gọi món nào</p>
          ) : (
            <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {items.map((item: any) => (
                <li key={item.itemId} className="flex justify-between items-center text-xs border-b border-border/20 pb-1 last:border-0 last:pb-0">
                  <span className="font-medium flex-1 truncate pr-2">
                    {item.menuItemName} <span className="text-muted-foreground">x{item.quantity}</span>
                  </span>
                  <Badge variant="outline" className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${statusStyles[item.status] || ""}`}>
                    {statusLabels[item.status] || item.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Cảnh báo nếu PayPal đã thanh toán */}
        {request.alreadyPaid && (
          <div className="p-3 rounded-2xl bg-success/10 border border-success/20 text-success text-xs flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <p>Khách đã thanh toán qua PayPal. Chỉ cần xác nhận để giải phóng bàn.</p>
          </div>
        )}

        {!request.alreadyPaid && (
          <div className="p-3 rounded-2xl bg-warning/10 border border-warning/20 text-warning text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>Thu tiền trực tiếp từ khách trước khi bấm Xác nhận.</p>
          </div>
        )}

        {/* Tổng tiền */}
        <div className="flex justify-between items-baseline border-t border-dashed border-border/80 pt-3">
          <span className="text-base font-semibold">Tổng hóa đơn:</span>
          <span className="font-display text-xl font-bold text-primary">
            ${request.amount ? Number(request.amount).toFixed(2) : "0.00"}
          </span>
        </div>
      </div>

      {/* Action */}
      <Button
        onClick={() => onConfirm(request.id)}
        disabled={isConfirming}
        className="w-full h-11 font-bold rounded-full shadow-elegant cursor-pointer text-xs flex items-center justify-center gap-1.5 transition-all bg-success text-success-foreground hover:opacity-95"
      >
        <CheckCircle2 className="h-4 w-4" />
        {isConfirming ? "Đang xử lý..." : request.alreadyPaid ? "Xác nhận & Đóng bàn" : "Xác nhận đã nhận tiền"}
      </Button>
    </div>
  );
}
