import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { ChefHat, CheckCircle2, UtensilsCrossed } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "../../hooks/useAuth";
import AdminLayout from "../../components/AdminLayout";
import { orderApi } from "../../api/orderApi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/kitchen")({
  component: AdminKitchen,
});

function AdminKitchen() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Route protection
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/admin/login" });
    } else if (user && user.role !== "ADMIN" && user.role !== "KITCHEN") {
      toast.error("Bạn không có quyền truy cập trang Nhà bếp!");
      navigate({ to: "/" });
    }
  }, [user, isAuthenticated]);

  const { data: kitchenOrders = [], isLoading } = useQuery({
    queryKey: ["kitchenOrders"],
    queryFn: orderApi.getKitchenOrders,
    refetchInterval: 5000,
    enabled: isAuthenticated && (user?.role === "ADMIN" || user?.role === "KITCHEN"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: number; status: string }) => {
      return orderApi.updateOrderItemStatus(itemId, status);
    },
    onSuccess: () => {
      toast.success("Cập nhật trạng thái món ăn thành công!");
      queryClient.invalidateQueries({ queryKey: ["kitchenOrders"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update status");
    }
  });

  // Sort: newest order ID first (descending)
  const sortedOrders = useMemo(() => {
    return [...kitchenOrders].sort((a, b) => b.orderId - a.orderId);
  }, [kitchenOrders]);

  if (!isAuthenticated || (user && user.role !== "ADMIN" && user.role !== "KITCHEN")) {
    return null;
  }

  return (
    <AdminLayout title="Hàng đợi chế biến (Kitchen Queue)">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="text-left">
            <p className="text-xs text-muted-foreground">Chỉ hiển thị các món thuộc bếp (KITCHEN) có trạng thái PENDING hoặc PREPARING. Mới nhất xếp trước.</p>
          </div>
          <Badge className="bg-primary text-primary-foreground text-sm font-bold px-3 py-1">
            {sortedOrders.length} món cần chế biến
          </Badge>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
            Đang tải hàng đợi bếp...
          </div>
        ) : sortedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-3xl space-y-3 shadow-soft">
            <UtensilsCrossed className="h-10 w-10 text-muted-foreground animate-bounce" />
            <p className="font-semibold text-lg">Bếp hiện đang trống đơn!</p>
            <p className="text-sm text-muted-foreground">Các món ăn cần nấu do khách gọi sẽ xuất hiện tại đây tức thì.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedOrders.map((item) => (
              <div key={item.itemId} className="bg-card border border-border rounded-3xl p-5 shadow-soft flex flex-col justify-between space-y-4 text-left">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-border bg-accent/40">
                      Đơn hàng #{item.orderId}
                    </Badge>
                    <Badge className={cn("text-xs font-bold uppercase", item.status === "PENDING" ? "bg-muted text-muted-foreground" : "bg-warning text-warning-foreground")}>
                      {item.status}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{item.menuItemName}</h4>
                    <p className="text-xs text-muted-foreground">ID món: #{item.itemId} · Số lượng: {item.quantity}</p>
                  </div>
                  {item.options && item.options.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.options.map((opt: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-[10px] font-semibold border-primary/20 text-primary bg-primary/5">
                          {opt}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {item.note && (
                    <div className="p-3 bg-destructive/5 text-destructive rounded-2xl text-xs font-medium italic border border-destructive/10">
                      📌 Lưu ý: "{item.note}"
                    </div>
                  )}
                </div>

                <div className="flex gap-2 border-t border-border pt-4">
                  {item.status === "PENDING" ? (
                    <Button
                      onClick={() => updateStatusMutation.mutate({ itemId: item.itemId, status: "PREPARING" })}
                      disabled={updateStatusMutation.isPending}
                      className="w-full bg-warning text-warning-foreground hover:opacity-90 rounded-full h-10 font-bold cursor-pointer text-xs"
                    >
                      Bắt đầu nấu
                    </Button>
                  ) : (
                    <Button
                      onClick={() => updateStatusMutation.mutate({ itemId: item.itemId, status: "DONE" })}
                      disabled={updateStatusMutation.isPending}
                      className="w-full bg-success text-success-foreground hover:opacity-90 rounded-full h-10 font-bold cursor-pointer text-xs"
                    >
                      Hoàn thành (Done)
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
