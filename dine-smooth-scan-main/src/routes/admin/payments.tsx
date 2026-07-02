import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "../../hooks/useAuth";
import AdminLayout from "../../components/AdminLayout";
import { paymentApi } from "../../api/paymentApi";
import { orderApi } from "../../api/orderApi";

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
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleViewRequest = (req: any) => {
    setSelectedRequest(req);
    setShowDetailDialog(true);
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

  const { data: pendingRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["pendingPaymentRequests"],
    queryFn: paymentApi.getPendingPaymentRequests,
    refetchInterval: 3000,
    enabled: isAuthenticated && (user?.role === "ADMIN" || user?.role === "CASHIER"),
  });

  const { data: requestItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["selectedRequestOrders", selectedRequest?.sessionId],
    queryFn: () => selectedRequest ? orderApi.getOrdersBySession(selectedRequest.sessionId) : Promise.resolve([]),
    enabled: !!selectedRequest,
  });

  const confirmRequestMutation = useMutation({
    mutationFn: async (id: number) => {
      return paymentApi.confirmPaymentRequest(id);
    },
    onSuccess: () => {
      toast.success("✅ Xác nhận thành công! Bàn đã được giải phóng.");
      queryClient.invalidateQueries({ queryKey: ["pendingPaymentRequests"] });
      setShowConfirmModal(false);
      setShowDetailDialog(false);
      setSelectedRequest(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Xác nhận thất bại!");
    }
  });

  const cancelRequestMutation = useMutation({
    mutationFn: async (id: number) => {
      return paymentApi.cancelPaymentRequest(id);
    },
    onSuccess: () => {
      toast.success("❌ Đã hủy/từ chối yêu cầu thanh toán.");
      queryClient.invalidateQueries({ queryKey: ["pendingPaymentRequests"] });
      setShowDetailDialog(false);
      setSelectedRequest(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Hủy yêu cầu thất bại!");
    }
  });

  if (!isAuthenticated || (user && user.role !== "ADMIN" && user.role !== "CASHIER")) {
    return null;
  }

  return (
    <AdminLayout title="Hóa đơn & Thanh toán (Cashier POS)">
      <div className="p-6 space-y-6">
        {requestsLoading ? (
          <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">Đang tải...</div>
        ) : pendingRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-3xl space-y-3 shadow-soft">
            <CheckCircle2 className="h-10 w-10 text-success" />
            <p className="font-semibold text-lg">Không có yêu cầu đang chờ!</p>
            <p className="text-sm text-muted-foreground">Khi khách gửi yêu cầu thanh toán, thông tin sẽ hiển thị tại đây.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-soft text-left">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-accent/25 font-semibold text-muted-foreground">
                    <th className="p-4 text-left">Bàn</th>
                    <th className="p-4 text-left">Tổng tiền</th>
                    <th className="p-4 text-left">Mã GD</th>
                    <th className="p-4 text-left">Thời gian</th>
                    <th className="p-4 text-left">Trạng thái</th>
                    <th className="p-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map((req) => (
                    <tr key={req.id} className="border-b border-border hover:bg-accent/10 transition-colors">
                      <td className="p-4 font-bold text-sm">Bàn {req.tableNumber}</td>
                      <td className="p-4 font-bold text-success text-sm font-display">
                        {formatPrice(req.amount)}
                      </td>
                      <td className="p-4 font-mono font-bold text-primary">{req.transactionCode || `TXN-${req.id}`}</td>
                      <td className="p-4 text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {req.requestedAt ? new Date(req.requestedAt).toLocaleTimeString("vi-VN") : "Just now"}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-warning/10 text-warning border border-warning/20">
                          {req.paymentStatus || req.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button 
                          onClick={() => handleViewRequest(req)}
                          variant="outline"
                          className="h-8 text-[11px] font-bold rounded-lg px-3 cursor-pointer hover:bg-accent text-primary"
                        >
                          Xem
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Pending Request Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        {selectedRequest && (
          <DialogContent className="max-w-[360px] bg-card border border-border p-4 rounded-3xl text-left text-foreground">
            <DialogTitle className="font-display text-base font-bold flex items-center justify-between border-b border-border/60 pb-2">
              <span>Yêu cầu thanh toán Bàn {selectedRequest.tableNumber}</span>
              <Badge variant="outline" className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-warning/10 text-warning border border-warning/20">
                PENDING
              </Badge>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Chi tiết yêu cầu thanh toán chuyển khoản từ khách hàng.
            </DialogDescription>

            <div className="space-y-3 mt-3">
              {/* VietQR code if method is QR */}
              {selectedRequest.paymentMethod === "QR" && (
                <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-gray-100 shadow-soft">
                  {selectedRequest.qrUrl ? (
                    <img 
                      src={selectedRequest.qrUrl} 
                      alt="VietQR code" 
                      className="w-32 h-32 object-contain"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-accent/20 rounded-xl flex items-center justify-center text-[10px] text-muted-foreground animate-pulse">
                      Đang tạo QR...
                    </div>
                  )}
                  <p className="text-[9px] text-muted-foreground mt-1.5 font-mono">
                    Nội dung CK: <span className="font-bold text-primary">{selectedRequest.transferContent || selectedRequest.transactionCode}</span>
                  </p>
                </div>
              )}

              {/* Request Info */}
              <div className="bg-accent/10 border border-border/40 rounded-2xl p-3 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mã giao dịch:</span>
                  <span className="font-mono font-bold text-primary">{selectedRequest.transactionCode || `TXN-${selectedRequest.id}`}</span>
                </div>
                <div className="flex justify-between items-center border-t border-border/10 pt-1.5">
                  <span className="text-muted-foreground">Phương thức:</span>
                  <span className="font-bold">{selectedRequest.paymentMethod === "QR" ? "VietQR (Chuyển khoản)" : selectedRequest.paymentMethod === "CASH" ? "Tiền mặt" : selectedRequest.paymentMethod}</span>
                </div>
                <div className="flex justify-between items-center border-t border-border/10 pt-1.5">
                  <span className="text-muted-foreground">Tổng tiền:</span>
                  <span className="font-display font-bold text-success text-sm">
                    {formatPrice(selectedRequest.amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-border/10 pt-1.5">
                  <span className="text-muted-foreground">Thời gian gửi:</span>
                  <span>{selectedRequest.requestedAt ? new Date(selectedRequest.requestedAt).toLocaleString("vi-VN") : "—"}</span>
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Danh sách món đã gọi:</p>
                <div className="border border-border/60 rounded-2xl overflow-hidden max-h-[120px] overflow-y-auto space-y-1 p-2.5 bg-accent/5">
                  {itemsLoading ? (
                    <p className="text-xs text-muted-foreground animate-pulse text-center py-2">Đang tải món ăn...</p>
                  ) : requestItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-2">Chưa có món ăn nào</p>
                  ) : (
                    requestItems.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-start text-xs border-b border-border/30 last:border-b-0 pb-1 last:pb-0">
                        <div className="flex-1 truncate pr-2">
                          <p className="font-bold truncate">{item.menuItemName}</p>
                          {item.options && item.options.length > 0 && (
                            <p className="text-[9px] text-muted-foreground pl-1.5 mt-0.5">+ {item.options.join(", ")}</p>
                          )}
                        </div>
                        <span className="font-semibold text-muted-foreground shrink-0">x{item.quantity}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 pt-1.5">
                <Button
                  onClick={() => cancelRequestMutation.mutate(selectedRequest.id)}
                  disabled={cancelRequestMutation.isPending || confirmRequestMutation.isPending}
                  variant="outline"
                  className="flex-1 h-9 rounded-full border-border bg-accent/20 text-destructive font-bold hover:bg-destructive/10 cursor-pointer text-xs animate-button"
                >
                  {cancelRequestMutation.isPending ? "Đang hủy..." : "Hủy yêu cầu"}
                </Button>
                <Button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={confirmRequestMutation.isPending}
                  className="flex-1 h-9 rounded-full bg-success text-success-foreground font-bold shadow-elegant hover:opacity-95 cursor-pointer text-xs"
                >
                  Đã nhận tiền
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Cashier Confirm Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-sm bg-card border border-border p-6 rounded-3xl text-center text-foreground">
          <DialogTitle className="font-display text-lg font-bold text-warning flex items-center justify-center gap-1.5">
            <AlertTriangle className="h-5 w-5 text-warning animate-bounce" /> Xác nhận đã nhận tiền?
          </DialogTitle>
          <DialogDescription className="sr-only">
            Hộp thoại xác nhận thu ngân đã kiểm tra tiền vào tài khoản.
          </DialogDescription>
          <div className="space-y-4 mt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Bạn đã kiểm tra tiền đã vào tài khoản thực tế chưa? Sau khi xác nhận, hệ thống sẽ thực hiện các tác vụ sau:
            </p>
            <div className="bg-accent/10 border border-border/40 rounded-2xl p-4 text-left text-[11px] space-y-1.5 text-muted-foreground">
              <p className="flex items-center gap-1.5 font-semibold text-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Đóng bàn phục vụ</p>
              <p className="flex items-center gap-1.5 font-semibold text-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Sinh hóa đơn thanh toán</p>
              <p className="flex items-center gap-1.5 font-semibold text-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Không thể hoàn tác hành động này</p>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => setShowConfirmModal(false)}
                variant="outline"
                className="flex-1 h-10 rounded-full border-border bg-accent/25 text-foreground font-bold hover:bg-accent/40 cursor-pointer text-xs"
              >
                Hủy
              </Button>
              <Button
                onClick={() => confirmRequestMutation.mutate(selectedRequest?.id)}
                disabled={confirmRequestMutation.isPending}
                className="flex-1 h-10 rounded-full bg-success text-success-foreground font-bold shadow-elegant hover:opacity-95 cursor-pointer text-xs"
              >
                {confirmRequestMutation.isPending ? "Đang xử lý..." : "Xác nhận"}
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

          {!isPayPalPaid && (
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
            <span className="font-display text-xl font-bold text-primary">{formatPrice(session.totalAmount)}</span>
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
            {formatPrice(request.amount)}
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
