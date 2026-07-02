import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Clock, CheckCircle2, CreditCard, Banknote, QrCode, Wallet, AlertCircle, X, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "../../hooks/useAuth";
import AdminLayout from "../../components/AdminLayout";
import { paymentApi } from "../../api/paymentApi";
import { orderApi } from "../../api/orderApi";
import { cn } from "@/lib/utils";


const formatPrice = (val?: number | null) => {
  if (val === null || val === undefined) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(val);
};

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

  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCashConfirmDialog, setShowCashConfirmDialog] = useState(false);
  const [pendingCashSession, setPendingCashSession] = useState<{ sessionId: number; paymentMethod: string } | null>(null);

  const { data: activeCalls = [], isLoading: callsLoading } = useQuery({
    queryKey: ["activeCalls"],
    queryFn: paymentApi.getCalls,
    refetchInterval: 3000,
    enabled: isAuthenticated && (user?.role === "ADMIN" || user?.role === "CASHIER"),
  });

  const clearCallMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return paymentApi.clearCall(sessionId);
    },
    onSuccess: () => {
      toast.success("Đã đánh dấu xử lý cuộc gọi!");
      queryClient.invalidateQueries({ queryKey: ["activeCalls"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Lỗi xử lý cuộc gọi");
    }
  });

  const payActiveSessionMutation = useMutation({
    mutationFn: async ({ sessionId, paymentMethod }: { sessionId: number; paymentMethod: string }) => {
      // Kiểm tra nếu đã có pending request thì dùng lại
      const pendingCheck = await paymentApi.checkPendingRequest(sessionId);
      if (pendingCheck?.hasPending && pendingCheck?.request) {
        return { request: pendingCheck.request, autoConfirmed: false, reused: true };
      }
      const request = await paymentApi.requestPayment(sessionId, paymentMethod);
      if (paymentMethod === "CASH") {
        await paymentApi.confirmPaymentRequest(request.id);
        return { request, autoConfirmed: true, reused: false };
      }
      return { request, autoConfirmed: false, reused: false };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["activeSessions"] });
      queryClient.invalidateQueries({ queryKey: ["activeCalls"] });
      queryClient.invalidateQueries({ queryKey: ["pendingPaymentRequests"] });
      if (data.autoConfirmed) {
        toast.success("Đã thanh toán tiền mặt trực tiếp và đóng bàn thành công!");
      } else {
        if (data.reused) {
          toast.info("Đã có yêu cầu thanh toán QR trước đó.");
        } else {
          toast.success("Đã tạo yêu cầu QR! Khách hàng có thể quét để thanh toán.");
        }
        setSelectedRequest(data.request);
        setShowDetailDialog(true);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Không thể thực hiện thanh toán!");
    }
  });

  const confirmQrPaymentMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return paymentApi.confirmPaymentRequest(requestId);
    },
    onSuccess: () => {
      toast.success("Đã xác nhận nhận tiền và đóng bàn thành công!");
      setShowDetailDialog(false);
      setSelectedRequest(null);
      queryClient.invalidateQueries({ queryKey: ["activeSessions"] });
      queryClient.invalidateQueries({ queryKey: ["activeCalls"] });
      queryClient.invalidateQueries({ queryKey: ["pendingPaymentRequests"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Lỗi xác nhận thanh toán!");
    }
  });

  const cancelQrRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return paymentApi.cancelPaymentRequest(requestId);
    },
    onSuccess: () => {
      toast.success("Đã hủy yêu cầu chuyển khoản QR!");
      setShowDetailDialog(false);
      setSelectedRequest(null);
      queryClient.invalidateQueries({ queryKey: ["activeCalls"] });
      queryClient.invalidateQueries({ queryKey: ["pendingPaymentRequests"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Lỗi hủy yêu cầu!");
    }
  });

  const confirmCashPaymentMutation = useMutation({
    mutationFn: async ({ sessionId }: { sessionId: number }) => {
      const request = await paymentApi.requestPayment(sessionId, "CASH");
      await paymentApi.confirmPaymentRequest(request.id);
      return request;
    },
    onSuccess: () => {
      toast.success("✅ Đã xác nhận nhận tiền mặt và đóng bàn thành công!");
      setShowCashConfirmDialog(false);
      setPendingCashSession(null);
      queryClient.invalidateQueries({ queryKey: ["activeSessions"] });
      queryClient.invalidateQueries({ queryKey: ["activeCalls"] });
      queryClient.invalidateQueries({ queryKey: ["pendingPaymentRequests"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Lỗi thanh toán tiền mặt!");
    }
  });

  const handleStartCheckout = async (sessionId: number, paymentMethod: string) => {
    try {
      const items = await orderApi.getOrdersBySession(sessionId);
      const hasUnserved = items.some((item: any) =>
        item.status !== "SERVED" &&
        item.status !== "CANCELLED" &&
        item.status !== "WASTED"
      );
      if (hasUnserved) {
        toast.error("Chưa thể thanh toán vì còn món chưa phục vụ.");
        return;
      }
      if (paymentMethod === "CASH") {
        // Hiện dialog xác nhận trước khi thanh toán tiền mặt
        setPendingCashSession({ sessionId, paymentMethod });
        setShowCashConfirmDialog(true);
      } else {
        payActiveSessionMutation.mutate({ sessionId, paymentMethod });
      }
    } catch (e: any) {
      toast.error("Lỗi kiểm tra trạng thái món: " + e.message);
    }
  };

  // Route protection
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/admin/login" });
    } else if (user && user.role !== "ADMIN" && user.role !== "CASHIER") {
      toast.error("Bạn không có quyền truy cập trang Thanh toán!");
      navigate({ to: "/" });
    }
  }, [user, isAuthenticated]);

  const { data: activeSessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["activeSessions"],
    queryFn: paymentApi.getCashierSessions,
    refetchInterval: 5000,
    enabled: isAuthenticated && (user?.role === "ADMIN" || user?.role === "CASHIER"),
  });

  const closeSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return paymentApi.closeSession(sessionId);
    },
    onSuccess: () => {
      toast.success("✅ Đã đóng phiên phục vụ thành công!");
      queryClient.invalidateQueries({ queryKey: ["activeSessions"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Lỗi đóng phiên!");
    }
  });

  if (!isAuthenticated || (user && user.role !== "ADMIN" && user.role !== "CASHIER")) {
    return null;
  }

  return (
    <AdminLayout title="Hóa đơn & Thanh toán (Cashier POS)">
      <div className="p-6 space-y-8">
        {/* SECTION 0: Active calls (Bàn đang gọi thu ngân) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold font-display text-destructive uppercase tracking-wider flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-destructive animate-ping" />
              Bàn đang gọi thu ngân ({activeCalls.length})
            </h2>
          </div>

          {callsLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground animate-pulse bg-card border border-border rounded-3xl">Đang tải...</div>
          ) : activeCalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-card/45 border border-border border-dashed rounded-3xl space-y-1">
              <p className="font-semibold text-xs text-muted-foreground">Không có bàn nào đang gọi</p>
              <p className="text-[10px] text-muted-foreground/75">Thông báo gọi thanh toán của khách hàng sẽ hiện ở đây.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeCalls.map((call: any) => (
                <div key={call.sessionId} className="bg-destructive/5 border border-destructive/20 rounded-3xl p-5 shadow-soft flex flex-col justify-between space-y-3 text-left">
                  <div>
                    <div className="flex justify-between items-center border-b border-destructive/10 pb-2 mb-2">
                      <span className="font-display font-bold text-sm text-destructive">Bàn {call.tableNumber}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {call.calledAt ? new Date(call.calledAt).toLocaleTimeString("vi-VN") : "Just now"}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Yêu cầu:</span>
                      <span className="font-bold text-destructive">Gọi thanh toán</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Hóa đơn hiện tại:</span>
                      <span className="font-bold text-success">{formatPrice(call.totalAmount)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => clearCallMutation.mutate(call.sessionId)}
                      disabled={clearCallMutation.isPending}
                      variant="outline"
                      className="flex-1 h-8 rounded-full border-border bg-accent/20 text-foreground font-bold hover:bg-accent/40 cursor-pointer text-[10px]"
                    >
                      Đã xử lý
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: Active dining tables */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-t border-border/40 pt-6">
            <h2 className="text-sm font-bold font-display text-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
              Bàn đang phục vụ / Thanh toán tại quầy ({activeSessions.length})
            </h2>
          </div>

          {sessionsLoading ? (
            <div className="py-20 text-center text-sm text-muted-foreground animate-pulse bg-card border border-border rounded-3xl">Đang tải danh sách bàn...</div>
          ) : activeSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-3xl space-y-2 shadow-soft">
              <p className="font-semibold text-sm">Hiện không có bàn nào đang ăn</p>
              <p className="text-xs text-muted-foreground">Khi khách check-in và mở bàn, thông tin sẽ xuất hiện tại đây.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeSessions.map((session) => (
                <SessionCard
                  key={session.sessionId}
                  session={session}
                  onPay={(sid, method) => handleStartCheckout(sid, method)}
                  isPaying={payActiveSessionMutation.isPending}
                  onCloseSession={(sid) => closeSessionMutation.mutate(sid)}
                  isClosing={closeSessionMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QR Payment Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="text-center text-lg font-bold">Yêu cầu thanh toán QR</DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            Khách hàng quét mã QR bên dưới để thanh toán
          </DialogDescription>
          {selectedRequest && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-white p-4 rounded-2xl shadow-soft border border-border">
                <img
                  src={`https://img.vietqr.io/image/${selectedRequest.bankCode || "VPB"}-${selectedRequest.bankAccount || "2232832868"}-compact.png?amount=${Math.round(selectedRequest.amount || 0)}&addInfo=Thanh+toan+ban+${selectedRequest.tableNumber || ""}&accountName=${encodeURIComponent(selectedRequest.bankOwner || "TRAN ANH DUC")}`}
                  alt="QR thanh toán"
                  className="w-64 h-64 object-contain"
                />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold">Số tiền: {formatPrice(selectedRequest.amount)}</p>
                <p className="text-xs text-muted-foreground">Mã yêu cầu: #{selectedRequest.id}</p>
                <p className="text-xs text-muted-foreground">Bàn: {selectedRequest.tableNumber || "N/A"}</p>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <Button
                  onClick={() => confirmQrPaymentMutation.mutate(selectedRequest.id)}
                  disabled={confirmQrPaymentMutation.isPending}
                  className="w-full h-10 rounded-full font-bold bg-success text-success-foreground hover:opacity-95"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {confirmQrPaymentMutation.isPending ? "Đang xử lý..." : "Xác nhận đã nhận tiền & Đóng bàn"}
                </Button>
                <Button
                  onClick={() => cancelQrRequestMutation.mutate(selectedRequest.id)}
                  disabled={cancelQrRequestMutation.isPending}
                  variant="outline"
                  className="w-full h-10 rounded-full font-bold border-destructive text-destructive hover:bg-destructive/10 hover:text-black"
                >
                  <X className="h-4 w-4 mr-1" />
                  {cancelQrRequestMutation.isPending ? "Đang hủy..." : "Hủy yêu cầu chuyển khoản QR"}
                </Button>
                <Button
                  onClick={() => setShowDetailDialog(false)}
                  variant="outline"
                  className="w-full h-10 rounded-full font-bold"
                >
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cash Confirm Dialog */}
      <Dialog open={showCashConfirmDialog} onOpenChange={setShowCashConfirmDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="text-center text-lg font-bold flex items-center justify-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Xác nhận thanh toán tiền mặt
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            Bạn đã chắc chắn nhận được tiền mặt từ khách?
          </DialogDescription>
          <div className="flex flex-col gap-3 py-4">
            <p className="text-center text-sm font-semibold">
              Bàn: {pendingCashSession?.sessionId ? `#${pendingCashSession.sessionId}` : "N/A"}
            </p>
            <div className="flex gap-3 w-full">
              <Button
                onClick={() => {
                  setShowCashConfirmDialog(false);
                  setPendingCashSession(null);
                }}
                variant="outline"
                className="flex-1 h-11 rounded-full font-bold"
              >
                Hủy
              </Button>
              <Button
                onClick={() => {
                  if (pendingCashSession) {
                    confirmCashPaymentMutation.mutate({ sessionId: pendingCashSession.sessionId });
                  }
                }}
                disabled={confirmCashPaymentMutation.isPending}
                className="flex-1 h-11 rounded-full font-bold bg-success text-success-foreground hover:opacity-95"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {confirmCashPaymentMutation.isPending ? "Đang xử lý..." : "Xác nhận đã nhận tiền"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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

  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "QR">("CASH");

  const isPayPalPaid = session.paymentStatus === "SUCCESS" && session.paymentMethod === "PAYPAL";

  const hasUnservedItems = useMemo(() => {
    return items.some((item: any) =>
      item.status !== "SERVED" &&
      item.status !== "CANCELLED" &&
      item.status !== "WASTED"
    );
  }, [items]);

  const totals = useMemo(() => {
    const subtotal = items
      .filter((item: any) => item.status === "SERVED")
      .reduce((sum: number, item: any) => sum + (item.price || 0) * item.quantity, 0);
    const service = subtotal * 0.05;
    const tax = subtotal * 0.08;
    return {
      subtotal,
      service,
      tax,
      total: subtotal + service + tax,
    };
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

          {!isPayPalPaid && (
            <div className="border-t border-border/60 pt-3 space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phương thức thanh toán:</h4>
              <div className="grid grid-cols-2 gap-2">
                {(["CASH", "QR"] as const).map((method) => (
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
                    {method === "CASH" ? "Tiền mặt" : "QR Chuyển khoản"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-dashed border-border/80 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Tạm tính:</span>
              <span>{formatPrice(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Phí dịch vụ (5%):</span>
              <span>{formatPrice(totals.service)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Thuế VAT (8%):</span>
              <span>{formatPrice(totals.tax)}</span>
            </div>
            <div className="flex justify-between items-baseline border-t border-border/20 pt-2">
              <span className="text-sm font-bold text-foreground">Tổng thanh toán:</span>
              <span className="font-display text-lg font-bold text-primary">{formatPrice(totals.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {isPayPalPaid ? (
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
          className={`w-full h-11 font-bold rounded-full shadow-elegant cursor-pointer text-xs flex items-center justify-center gap-1.5 transition-all ${hasUnservedItems
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