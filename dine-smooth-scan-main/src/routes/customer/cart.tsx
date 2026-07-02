import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ShoppingBag, Trash2, Minus, Plus, ArrowLeft, Banknote, CreditCard, Wallet, ChefHat
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCart } from "../../hooks/useCart";
import { orderApi } from "../../api/orderApi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customer/cart")({
  component: CustomerCart,
});

const formatPrice = (val?: number | null) => {
  if (val === null || val === undefined) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(val);
};

function CustomerCart() {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeFromCart, clearCart, totals } = useCart();
  const [method, setMethod] = useState("cash");

  const sessionId = typeof window !== "undefined" ? sessionStorage.getItem("sessionId") : null;

  const paymentMethods = [
    { id: "cash", name: "Tiền mặt", icon: Banknote, note: "Thanh toán tại bàn" },
    { id: "vnpay", name: "VNPay", icon: CreditCard, note: "Quét mã QR" },
    { id: "momo", name: "MoMo", icon: Wallet, note: "Ví MoMo" },
  ];

  const placeOrderMutation = useMutation({
    mutationFn: async (items: { menuItemId: number; quantity: number; note: string }[]) => {
      const preorderId = typeof window !== "undefined" ? sessionStorage.getItem("preorderReservationId") : null;
      if (!sessionId && !preorderId) throw new Error("Chưa check-in. Vui lòng quay lại thực đơn.");
      return orderApi.createOrder({
        sessionId: sessionId ? Number(sessionId) : undefined,
        reservationId: preorderId ? Number(preorderId) : undefined,
        items,
      });
    },
    onSuccess: () => {
      toast.success("Đặt món thành công!");
      clearCart();
      const preorderId = typeof window !== "undefined" ? sessionStorage.getItem("preorderReservationId") : null;
      if (preorderId) {
        sessionStorage.removeItem("preorderReservationId");
        sessionStorage.removeItem("preorderTableNumber");
        sessionStorage.removeItem("preorderTime");
        navigate({ to: "/" });
      } else {
        navigate({ to: "/customer/tracking" });
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Lỗi đặt món. Vui lòng thử lại.");
    }
  });

  const handlePlaceOrder = () => {
    if (cart.length === 0) return;
    const items = cart.map(c => ({
      menuItemId: Number(c.item.id),
      quantity: c.quantity,
      note: c.notes || ""
    }));
    placeOrderMutation.mutate(items);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-12">
      <header className="sticky top-0 z-40 glass border-b border-border/60">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-6">
          <Link to="/customer/menu">
            <Button variant="ghost" size="icon" aria-label="Go back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="font-display text-base font-bold flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" /> Giỏ hàng của bạn
          </h1>
          <Badge variant="secondary" className="ml-auto rounded-full bg-primary/10 text-primary border-0">
            {cart.length} món
          </Badge>
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full p-4 space-y-6">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 bg-card border border-border rounded-3xl space-y-4 shadow-soft">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
              <ShoppingBag className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-semibold text-lg">Giỏ hàng trống</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Vui lòng quay lại trang thực đơn để chọn những món ăn bạn yêu thích.
            </p>
            <Link to="/customer/menu">
              <Button className="rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-soft">
                Xem thực đơn
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-card border border-border rounded-3xl p-5 shadow-soft space-y-4">
              <h2 className="font-display font-bold text-lg border-b border-border pb-3">Chi tiết món ăn</h2>
              <ul className="space-y-4">
                {cart.map((c) => (
                  <li key={c.uid} className="flex gap-4 p-1">
                    <img src={c.item.image} alt={c.item.name} className="h-16 w-16 shrink-0 rounded-xl object-cover border border-border/40" />
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm">{c.item.name}</p>
                        <button onClick={() => removeFromCart(c.uid)}
                          className="rounded-md p-1 text-muted-foreground hover:text-destructive cursor-pointer">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.size}{c.cook ? ` · ${c.cook}` : ""}{c.toppings.length ? ` · +${c.toppings.join(", ")}` : ""}
                      </p>
                      {c.notes && <p className="text-xs italic text-muted-foreground mt-1">"{c.notes}"</p>}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1 rounded-full border border-border p-0.5 bg-background">
                          <button onClick={() => updateQuantity(c.uid, -1)} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-accent cursor-pointer">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center text-xs font-semibold">{c.quantity}</span>
                          <button onClick={() => updateQuantity(c.uid, 1)} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-accent cursor-pointer">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-sm font-bold">{formatPrice(c.unitPrice * c.quantity)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-card border border-border rounded-3xl p-5 shadow-soft space-y-4">
              <h2 className="font-display font-bold text-lg border-b border-border pb-3">Phương thức thanh toán</h2>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((m) => (
                  <button key={m.id} onClick={() => setMethod(m.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border p-3 text-left transition-smooth cursor-pointer",
                      method === m.id ? "border-primary bg-primary/5 shadow-soft" : "border-border hover:border-primary/40"
                    )}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-primary">
                      <m.icon className="h-4 w-4" />
                    </span>
                    <span>
                      <p className="text-xs font-bold">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground">{m.note}</p>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-3xl p-5 shadow-soft space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tạm tính</span>
                <span className="font-semibold">{formatPrice(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phí phục vụ (5%)</span>
                <span className="font-semibold">{formatPrice(totals.service)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Thuế VAT (8%)</span>
                <span className="font-semibold">{formatPrice(totals.tax)}</span>
              </div>
              <div className="border-t border-border pt-3 flex items-baseline justify-between">
                <p className="text-sm font-semibold">Tổng cộng</p>
                <p className="font-display text-2xl font-bold text-primary">{formatPrice(totals.total)}</p>
              </div>
            </div>

            <Button
              onClick={handlePlaceOrder}
              disabled={placeOrderMutation.isPending}
              className={cn(
                "h-12 w-full rounded-full text-white shadow-elegant hover:opacity-95 font-bold cursor-pointer flex items-center justify-center gap-2",
                typeof window !== "undefined" && sessionStorage.getItem("preorderReservationId")
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "bg-gradient-primary text-primary-foreground"
              )}
            >
              <ChefHat className="h-4 w-4" />
              {placeOrderMutation.isPending 
                ? "Đang gửi đơn hàng..." 
                : typeof window !== "undefined" && sessionStorage.getItem("preorderReservationId")
                  ? "Xác nhận đặt món trước"
                  : "Gửi xác nhận gọi món"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
