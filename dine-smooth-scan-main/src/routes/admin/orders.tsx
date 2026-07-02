import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClipboardList, CheckCircle2, AlertOctagon, HelpCircle, Clock, Edit2, XCircle, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "../../hooks/useAuth";
import AdminLayout from "../../components/AdminLayout";
import { orderApi } from "../../api/orderApi";
import { menuApi } from "../../api/menuApi";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const formatPrice = (val?: number | null) => {
  if (val === null || val === undefined) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(val);
};

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

function AdminOrders() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"new" | "serve">("new");
  
  // Edit dialog state
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editMenuItemId, setEditMenuItemId] = useState<number>(0);

  // Route protection
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/admin/login" });
    } else if (user && user.role !== "ADMIN" && user.role !== "WAITER") {
      toast.error("Bạn không có quyền truy cập trang Phục vụ!");
      navigate({ to: "/" });
    }
  }, [user, isAuthenticated]);

  // Query service tables (DONE items for serve screen)
  const { data: serviceTables = [], isLoading: isTablesLoading } = useQuery({
    queryKey: ["serviceTables"],
    queryFn: orderApi.getServiceTables,
    refetchInterval: 5000,
    enabled: isAuthenticated && (user?.role === "ADMIN" || user?.role === "WAITER"),
  });

  // Query new order requests (WAIT_CONFIRM items)
  const { data: newRequests = [], isLoading: isRequestsLoading } = useQuery({
    queryKey: ["newRequests"],
    queryFn: orderApi.getNewRequests,
    refetchInterval: 5000,
    enabled: isAuthenticated && (user?.role === "ADMIN" || user?.role === "WAITER"),
  });

  // Query all menu items for replacement options
  const { data: menuItems = [] } = useQuery({
    queryKey: ["replacementMenuItems"],
    queryFn: menuApi.getMenuItems,
    enabled: isAuthenticated && (user?.role === "ADMIN" || user?.role === "WAITER"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: number; status: string }) => {
      return orderApi.updateOrderItemStatus(itemId, status);
    },
    onSuccess: () => {
      toast.success("Cập nhật trạng thái thành công!");
      queryClient.invalidateQueries({ queryKey: ["serviceTables"] });
      queryClient.invalidateQueries({ queryKey: ["newRequests"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update item status");
    }
  });

  const confirmOrderMutation = useMutation({
    mutationFn: async ({ itemId, quantity, menuItemId }: { itemId: number; quantity?: number; menuItemId?: number }) => {
      return orderApi.confirmOrder(itemId, quantity, menuItemId);
    },
    onSuccess: () => {
      toast.success("Xác nhận món ăn thành công!");
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["newRequests"] });
      queryClient.invalidateQueries({ queryKey: ["serviceTables"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Xác nhận món ăn thất bại");
    }
  });

  if (!isAuthenticated || (user && user.role !== "ADMIN" && user.role !== "WAITER")) {
    return null;
  }

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setEditQuantity(item.quantity);
    setEditMenuItemId(item.menuItemId);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    confirmOrderMutation.mutate({
      itemId: editingItem.itemId,
      quantity: editQuantity,
      menuItemId: editMenuItemId,
    });
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "--:--";
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "--:--";
    }
  };

  return (
    <AdminLayout title="Điều phối phục vụ (Waiter Screen)">
      <div className="p-6 space-y-6">
        {/* Tab Selection */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("new")}
            className={cn(
              "px-6 py-3 font-display font-bold text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2",
              activeTab === "new"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Yêu cầu mới
            {newRequests.length > 0 && (
              <Badge className="bg-primary text-primary-foreground ml-1">
                {newRequests.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab("serve")}
            className={cn(
              "px-6 py-3 font-display font-bold text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2",
              activeTab === "serve"
                ? "border-success text-success"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Chờ phục vụ (Sẵn sàng)
            {serviceTables.length > 0 && (
              <Badge className="bg-success text-white ml-1">
                {serviceTables.reduce((acc: number, t: any) => acc + (t.items ? t.items.length : 0), 0)}
              </Badge>
            )}
          </button>
        </div>

        {activeTab === "new" ? (
          /* Tab 1: New Requests */
          isRequestsLoading ? (
            <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
              Đang tải danh sách yêu cầu mới...
            </div>
          ) : newRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-3xl space-y-3 shadow-soft">
              <CheckCircle2 className="h-10 w-10 text-success" />
              <p className="font-semibold text-lg">Không có yêu cầu gọi món mới!</p>
              <p className="text-sm text-muted-foreground">Khi khách hàng gửi yêu cầu gọi món, thông tin sẽ hiện ở đây.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              {newRequests.map((item: any) => (
                <div key={item.itemId} className="bg-card border border-border rounded-3xl p-5 shadow-soft flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground font-bold text-sm shadow-soft">
                        {item.tableNumber || "--"}
                      </span>
                      <Badge className="bg-warning/10 text-warning border-0 text-[10px] font-bold uppercase tracking-wider">
                        Chờ xác nhận
                      </Badge>
                    </div>
                    <div>
                      <h4 className="font-bold text-base">{item.menuItemName}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Số lượng: <span className="font-bold text-foreground">x{item.quantity}</span></p>
                      {item.options && item.options.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Tùy chọn: <span className="font-semibold text-foreground">{item.options.join(", ")}</span>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" /> Gửi lúc: {formatTime(item.orderedTime)}
                      </p>
                      {item.note && (
                        <p className="text-xs text-destructive italic mt-2 bg-destructive/5 p-2 rounded-xl border border-destructive/10">
                          Ghi chú: "{item.note}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 border-t border-border/60 pt-4">
                    <Button
                      onClick={() => confirmOrderMutation.mutate({ itemId: item.itemId })}
                      disabled={confirmOrderMutation.isPending}
                      className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90 rounded-full h-9 font-bold text-xs cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Check className="h-3.5 w-3.5" /> Xác nhận
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleOpenEdit(item)}
                      className="rounded-full h-9 text-xs cursor-pointer px-3 border-border hover:bg-accent/40"
                    >
                      Sửa
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => updateStatusMutation.mutate({ itemId: item.itemId, status: "CANCELLED" })}
                      disabled={updateStatusMutation.isPending}
                      className="text-destructive hover:bg-destructive/10 rounded-full h-9 text-xs cursor-pointer px-3"
                    >
                      Hủy
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Tab 2: Ready to Serve (DONE items) */
          isTablesLoading ? (
            <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
              Đang tải danh sách chờ phục vụ...
            </div>
          ) : serviceTables.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-3xl space-y-3 shadow-soft">
              <CheckCircle2 className="h-10 w-10 text-success" />
              <p className="font-semibold text-lg">Không có món ăn nào chờ phục vụ!</p>
              <p className="text-sm text-muted-foreground">Khi bếp nấu xong hoặc nước pha chế xong, bàn sẽ hiện ở đây.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {serviceTables.map((table: any) => (
                <div key={table.tableId} className="bg-card border border-border rounded-3xl p-6 shadow-soft space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground font-bold text-sm shadow-soft">
                        {table.tableNumber}
                      </span>
                      <div>
                        <h3 className="font-bold font-display text-lg">Bàn {table.tableNumber}</h3>
                        <p className="text-xs text-muted-foreground">Phiên: #{table.sessionId}</p>
                      </div>
                    </div>
                    <Badge className="bg-success/15 text-success border-0 font-bold uppercase tracking-wider text-xs">
                      Sẵn sàng phục vụ
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {table.items.map((item: any) => (
                      <div key={item.itemId} className="p-4 bg-accent/30 border border-border rounded-2xl flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-sm">{item.menuItemName}</h4>
                            <Badge className="text-[9px] font-bold bg-primary/10 text-primary border-0">
                              Nấu xong (DONE)
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Loại: <span className="font-semibold">{item.type}</span></p>
                          {item.options && item.options.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Tùy chọn: <span className="font-semibold text-foreground">{item.options.join(", ")}</span>
                            </p>
                          )}
                          {item.note && (
                            <p className="text-xs text-destructive italic mt-1.5 font-medium bg-destructive/5 p-1 rounded-md border border-destructive/10">
                              📌 Ghi chú: "{item.note}"
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2 border-t border-border/60 pt-3">
                          <Button
                            onClick={() => updateStatusMutation.mutate({ itemId: item.itemId, status: "SERVED" })}
                            disabled={updateStatusMutation.isPending}
                            className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90 rounded-full h-8 font-bold cursor-pointer text-xs"
                          >
                            Đã phục vụ
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Edit Requested Item Dialog */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6 bg-card border border-border text-left space-y-4">
            <DialogTitle className="font-bold text-lg font-display">Chỉnh sửa yêu cầu gọi món</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Thay đổi số lượng hoặc chọn món ăn khác thay thế
            </DialogDescription>
            <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Món ăn ban đầu</label>
                <p className="text-sm font-bold bg-accent/40 p-2.5 rounded-xl border border-border/30">
                  {editingItem.menuItemName}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Số lượng</label>
                <input
                  type="number"
                  min={1}
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(Number(e.target.value))}
                  className="w-full h-10 px-4 rounded-xl border border-border bg-accent/25 focus:outline-none focus:border-primary text-sm font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Món ăn thay thế (nếu hết món)</label>
                <select
                  value={editMenuItemId}
                  onChange={(e) => setEditMenuItemId(Number(e.target.value))}
                  className="w-full h-10 px-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-primary cursor-pointer font-medium"
                >
                  {menuItems.map((f: any) => (
                    <option key={f.id} value={f.id} disabled={!f.available}>
                      {f.name} {f.available ? "" : "(Hết hàng)"} - {formatPrice(f.price)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingItem(null)}
                  className="h-9 rounded-full text-xs cursor-pointer"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={confirmOrderMutation.isPending}
                  className="h-9 rounded-full bg-primary text-primary-foreground font-bold text-xs px-4 cursor-pointer"
                >
                  Lưu thay đổi & Xác nhận
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
