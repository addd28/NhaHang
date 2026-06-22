import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  Clock, CheckCircle2, ChefHat, Sparkles, ArrowLeft, Shield, AlertTriangle, MessageSquare
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { orderApi } from "../../api/orderApi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customer/tracking")({
  component: CustomerTracking,
});

function CustomerTracking() {
  const sessionId = typeof window !== "undefined" ? sessionStorage.getItem("sessionId") : null;
  const [sessionClosed, setSessionClosed] = useState(false);

  // Poll backend for order items
  const { data: trackingItems = [], isLoading, error } = useQuery({
    queryKey: ["tracking", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      return orderApi.getOrdersBySession(Number(sessionId));
    },
    enabled: !!sessionId && !sessionClosed,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (error) {
      const axiosError = error as any;
      const msg = axiosError.response?.data?.message || "";
      if (msg.includes("Session is closed") || msg.includes("Session not found") || axiosError.response?.status === 400) {
        setSessionClosed(true);
      }
    }
  }, [error]);

  // Filter out wasted items from customer view
  const filteredItems = useMemo(() => {
    return trackingItems.filter((item: any) => item.status !== "WASTED");
  }, [trackingItems]);

  // Group identical items (same menuItemId, options, and note) to show consolidated quantities and status breakdowns
  const groupedItems = useMemo(() => {
    const groups: { [key: string]: any } = {};

    filteredItems.forEach((item: any) => {
      const optionsSig = (item.options || []).slice().sort().join(",");
      const key = `${item.menuItemId}_${optionsSig}_${item.note || ""}`;

      if (!groups[key]) {
        groups[key] = {
          key,
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          options: item.options || [],
          note: item.note || "",
          totalQuantity: 0,
          orderedTime: item.orderedTime,
          preparingQuantity: 0,
          doneQuantity: 0,
          servedQuantity: 0,
          cancelledQuantity: 0,
          items: [],
        };
      }

      const group = groups[key];
      const qty = item.quantity || 1;
      group.totalQuantity += qty;
      group.items.push(item);

      // Keep the earliest ordered time
      if (item.orderedTime && (!group.orderedTime || new Date(item.orderedTime) < new Date(group.orderedTime))) {
        group.orderedTime = item.orderedTime;
      }

      const status = item.status;
      if (status === "WAIT_CONFIRM" || status === "PENDING" || status === "PREPARING") {
        group.preparingQuantity += qty;
      } else if (status === "DONE" || status === "DELIVERING") {
        group.doneQuantity += qty;
      } else if (status === "SERVED") {
        group.servedQuantity += qty;
      } else if (status === "CANCELLED" || status === "WASTED") {
        group.cancelledQuantity += qty;
      }
    });

    return Object.values(groups);
  }, [filteredItems]);

  // Calculate overall progress percentage based on served items
  const progressPercent = useMemo(() => {
    const activeItems = filteredItems.filter((item: any) => item.status !== "CANCELLED");
    if (activeItems.length === 0) return 0;
    const deliveredCount = activeItems.filter((item: any) => item.status === "SERVED").length;
    return Math.round((deliveredCount / activeItems.length) * 100);
  }, [filteredItems]);

  // Determine active display status
  const currentStatus = useMemo(() => {
    if (filteredItems.length === 0) return "NONE";
    const allServedOrCancelled = filteredItems.every(
      (item: any) => item.status === "SERVED" || item.status === "CANCELLED"
    );
    return allServedOrCancelled ? "SERVED" : "IN_PROGRESS";
  }, [filteredItems]);

  // Customer status mapping helper
  const getCustomerStatus = (status: string) => {
    if (status === "WAIT_CONFIRM" || status === "PENDING" || status === "PREPARING") {
      return { label: "Đang chuẩn bị", color: "bg-warning/15 text-warning border-warning/30" };
    }
    if (status === "DONE") {
      return { label: "Chờ phục vụ", color: "bg-info/15 text-info border-info/30" };
    }
    if (status === "SERVED") {
      return { label: "Đã phục vụ", color: "bg-success/15 text-success border-success/30" };
    }
    if (status === "CANCELLED") {
      return { label: "Đã hủy", color: "bg-muted text-muted-foreground border-muted" };
    }
    return { label: "Đang chuẩn bị", color: "bg-warning/15 text-warning border-warning/30" };
  };

  // Nice time formatting helper
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "";
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-card rounded-3xl border border-border p-8 shadow-elegant space-y-6">
          <AlertTriangle className="h-12 w-12 text-warning mx-auto" />
          <h2 className="font-display text-xl font-bold">Không tìm thấy phiên</h2>
          <p className="text-sm text-muted-foreground">
            Bàn hiện chưa được mở hoặc phiên đã kết thúc. Vui lòng quét mã QR tại bàn để bắt đầu.
          </p>
          <Link to="/customer/menu">
            <Button className="rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-soft">
              Quay lại thực đơn
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (sessionClosed) {
    const handleResetSession = () => {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("sessionId");
      }
      window.location.href = "/customer/menu";
    };

    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col p-6 items-center justify-center relative overflow-hidden">
        {/* Glow effects */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-success/5 blur-3xl pointer-events-none" />

        <div className="max-w-md w-full bg-card rounded-3xl border border-border p-8 shadow-elegant text-center space-y-6 relative overflow-hidden">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-gradient-to-br from-success to-emerald-600 shadow-elegant">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-success">Thanh toán hoàn tất</h1>
            <p className="text-xs uppercase tracking-widest text-primary font-bold">Plateaux · Hudson St</p>
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
              Hóa đơn của bạn đã được thanh toán tại POS cashier và bàn đã được giải phóng. Cảm ơn bạn đã lựa chọn dùng bữa tại nhà hàng!
            </p>
          </div>

          <div className="border-t border-border/80 pt-6 flex flex-col gap-3">
            <Link to="/customer/review">
              <Button className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-elegant hover:opacity-95 cursor-pointer flex items-center justify-center gap-2 text-xs">
                <MessageSquare className="h-4 w-4" />
                Viết đánh giá dịch vụ
              </Button>
            </Link>

            <Button
              onClick={handleResetSession}
              variant="outline"
              className="w-full h-12 rounded-full border-border bg-accent/20 text-foreground font-bold hover:bg-accent/40 cursor-pointer text-xs"
            >
              Quay lại thực đơn (Tạo phiên mới)
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-12">
      <header className="sticky top-0 z-40 glass border-b border-border/60">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-6">
          <Link to="/customer/menu">
            <Button variant="ghost" size="icon" aria-label="Back to menu">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="font-display text-base font-bold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Theo dõi đơn hàng
          </h1>
          <Badge variant="secondary" className="ml-auto rounded-full bg-success/15 text-success border-0 font-bold">
            Live
          </Badge>
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full p-4 space-y-6">
        <div className="rounded-3xl border border-border bg-gradient-warm p-6 shadow-soft text-center md:text-left space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">TIẾN TRÌNH PHỤC VỤ</p>
            <h3 className="mt-1 font-display text-2xl font-bold">{progressPercent}% hoàn thành</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Tự động cập nhật trực tiếp từ hệ thống mỗi 5 giây</p>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-background border border-border/20">
            <div className="h-full rounded-full bg-gradient-primary transition-all duration-700" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-3xl space-y-3 shadow-soft">
            <ChefHat className="h-10 w-10 text-muted-foreground" />
            <p className="font-semibold text-base">Chưa có món ăn nào được gọi</p>
            <p className="text-xs text-muted-foreground">Các món ăn bạn gọi trong phiên này sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          <>
            <div className="bg-card border border-border rounded-3xl p-6 shadow-soft text-left space-y-4">
              <h2 className="font-display font-bold text-base border-b border-border pb-3">Tóm tắt tiến trình</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-accent/20 rounded-2xl">
                  <p className="text-xs text-muted-foreground">Tổng số món gọi</p>
                  <p className="text-xl font-bold text-foreground mt-1">
                    {filteredItems.filter((i: any) => i.status !== "CANCELLED").length} món
                  </p>
                </div>
                <div className="p-4 bg-accent/20 rounded-2xl">
                  <p className="text-xs text-muted-foreground">Đã phục vụ</p>
                  <p className="text-xl font-bold text-success mt-1">
                    {filteredItems.filter((i: any) => i.status === "SERVED").length} món
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-3xl p-5 shadow-soft space-y-4">
              <h2 className="font-display font-bold text-base border-b border-border pb-3 text-left">Lịch sử gọi món</h2>
              <ul className="space-y-3">
                {groupedItems.map((group: any) => {
                  return (
                    <li key={group.key} className="flex flex-col gap-3 rounded-2xl border border-border bg-accent/15 p-4 transition-smooth hover:bg-accent/25">
                      <div className="flex items-start justify-between gap-3 text-left">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">{group.menuItemName}</p>
                          {group.options && group.options.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {group.options.map((opt: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-[9px] bg-accent/40 text-muted-foreground border-0 px-1.5 py-0">
                                  {opt}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {group.note && (
                            <p className="text-xs text-muted-foreground italic mt-1">Ghi chú: {group.note}</p>
                          )}
                          <div className="text-[11px] text-muted-foreground mt-1">
                            Gọi lúc: {formatTime(group.orderedTime)}
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <Badge variant="outline" className="rounded-full text-[10px] font-bold border-primary/30 text-primary bg-primary/5">
                            Tổng số: x{group.totalQuantity}
                          </Badge>
                        </div>
                      </div>

                      {/* Status breakdown details */}
                      <div className="flex flex-wrap gap-2 border-t border-border/40 pt-2.5 mt-1">
                        {group.preparingQuantity > 0 && (
                          <Badge variant="outline" className="rounded-full text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 border bg-warning/15 text-warning border-warning/30">
                            Đang chuẩn bị x{group.preparingQuantity}
                          </Badge>
                        )}
                        {group.doneQuantity > 0 && (
                          <Badge variant="outline" className="rounded-full text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 border bg-info/15 text-info border-info/30">
                            Chờ phục vụ x{group.doneQuantity}
                          </Badge>
                        )}
                        {group.servedQuantity > 0 && (
                          <Badge variant="outline" className="rounded-full text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 border bg-success/15 text-success border-success/30">
                            Đã ra x{group.servedQuantity}
                          </Badge>
                        )}
                        {group.cancelledQuantity > 0 && (
                          <Badge variant="outline" className="rounded-full text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 border bg-muted text-muted-foreground border-muted">
                            Đã hủy x{group.cancelledQuantity}
                          </Badge>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {currentStatus === "SERVED" && (
              <div className="bg-card border border-border rounded-3xl p-5 shadow-soft text-center space-y-4">
                <MessageSquare className="h-8 w-8 text-primary mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-bold text-sm">Đánh giá trải nghiệm</h3>
                  <p className="text-xs text-muted-foreground">
                    Bữa ăn của bạn đã được phục vụ hoàn tất! Hãy để lại đánh giá để chúng tôi hoàn thiện hơn.
                  </p>
                </div>
                <Link to="/customer/review">
                  <Button className="w-full rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-soft">
                    Viết đánh giá
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}

        <div className="border-t border-border/60 pt-6 text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Shield className="h-3.5 w-3.5 text-success" /> Session an toàn · Tự động đóng sau khi thanh toán
        </div>
      </div>
    </div>
  );
}
