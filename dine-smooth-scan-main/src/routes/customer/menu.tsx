import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { z } from "zod";
import {
  Bell, ShoppingBag, Shield, Minus, Plus, Star, X,
  ChefHat, Clock, Soup, Sparkles, Sun, Moon, ChevronRight,
  Flame, UtensilsCrossed, QrCode, Trash2, Banknote, CreditCard, Wallet,
  CheckCircle2, MessageSquare, Search, AlertTriangle, Lock, Copy, AlertCircle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCart } from "../../hooks/useCart";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { tableApi } from "../../api/tableApi";
import { categoryApi } from "../../api/categoryApi";
import { menuApi } from "../../api/menuApi";
import { orderApi } from "../../api/orderApi";
import { paymentApi } from "../../api/paymentApi";
import { MenuItem, CartItem, OrderItem, OptionGroup, ItemOption } from "../../types";
import axiosInstance from "../../api/axiosInstance";
import logoImg from "../../assets/logo.png";

const formatPrice = (val?: number | null) => {
  if (val === null || val === undefined) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(val);
};

const menuSearchSchema = z.object({
  tableKey: z.string().optional(),
  table: z.string().optional(),
  token: z.string().optional(),
  preorder: z.boolean().optional(),
  payment: z.string().optional(),
  key: z.string().optional(),
});

export const Route = createFileRoute("/customer/menu")({
  validateSearch: (search) => menuSearchSchema.parse(search),
  component: CustomerMenu,
});

const SIZE_DELTA = { Small: -2, Medium: 0, Large: 4 } as const;
const TOPPINGS = ["Cheese", "Bacon", "Egg", "Mushroom"];

const getMenuItemImage = (imageKey: string) => {
  if (!imageKey) return "css-gradient-placeholder";
  if (imageKey.startsWith("http") || imageKey.startsWith("/")) return imageKey;
  return "css-gradient-placeholder";
};

function MenuItemImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const isPlaceholder = !src || src === "css-gradient-placeholder" || (!src.startsWith("http") && !src.startsWith("/"));

  if (isPlaceholder) {
    return (
      <div className={cn("w-full h-full bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-red-500/20 flex items-center justify-center border border-border/40 relative overflow-hidden", className)}>
        <div className="absolute -right-6 -bottom-6 h-16 w-16 rounded-full bg-primary/10 blur-xl" />
        <div className="absolute -left-6 -top-6 h-16 w-16 rounded-full bg-orange-500/10 blur-xl" />
        <UtensilsCrossed className="h-8 w-8 text-primary/40 animate-pulse" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
        const parent = (e.target as HTMLImageElement).parentElement;
        if (parent && !parent.querySelector(".fallback-block")) {
          const fallback = document.createElement("div");
          fallback.className = "fallback-block w-full h-full bg-gradient-to-br from-amber-500/20 to-red-500/20 flex items-center justify-center";
          fallback.innerHTML = `<svg class="h-6 w-6 text-primary/40 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
          parent.appendChild(fallback);
        }
      }}
    />
  );
}

const getMenuItemExtraDetails = (name: string) => {
  const norm = name.toLowerCase();
  if (norm.includes("margherita")) {
    return {
      ingredients: ["San Marzano tomato", "Fior di latte", "Basil", "Olive oil"],
      calories: 720,
      allergens: ["Gluten", "Dairy"],
      rating: 4.9,
      tag: "Chef's Pick" as const
    };
  }
  if (norm.includes("truffle")) {
    return {
      ingredients: ["Wild mushrooms", "Mozzarella", "Truffle oil", "Thyme"],
      calories: 810,
      allergens: ["Gluten", "Dairy"],
      rating: 4.8,
    };
  }
  if (norm.includes("wagyu smash")) {
    return {
      ingredients: ["Wagyu beef", "Aged cheddar", "Brioche bun", "House sauce"],
      calories: 920,
      allergens: ["Gluten", "Dairy", "Egg"],
      rating: 4.9,
      tag: "Popular" as const
    };
  }
  if (norm.includes("smoky")) {
    return {
      ingredients: ["Beef", "Bacon", "Smoked gouda", "BBQ sauce"],
      calories: 980,
      allergens: ["Gluten", "Dairy"],
      rating: 4.7,
    };
  }
  if (norm.includes("mojito")) {
    return {
      ingredients: ["Rum", "Mint", "Lime", "Sugar", "Soda"],
      calories: 180,
      allergens: [] as string[],
      rating: 4.8,
      tag: "New" as const
    };
  }
  return {
    ingredients: [] as string[],
    calories: undefined as number | undefined,
    allergens: [] as string[],
    rating: 4.5,
  };
};

function CustomerMenu() {
  const { tableKey: searchTableKey, table: tableParam, token, payment, key } = Route.useSearch();
  const tableKey = searchTableKey || key;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart, totals } = useCart();
  const [dark, setDark] = useState(true);
  const [activeCat, setActiveCat] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAvailableOnly, setFilterAvailableOnly] = useState(false);
  const [filterSpecialOnly, setFilterSpecialOnly] = useState(false);
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [selectedOrderItem, setSelectedOrderItem] = useState<OrderItem | null>(null);
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [showOrderConfirm, setShowOrderConfirm] = useState(false);
  const [sessionClosed, setSessionClosed] = useState(false);
  const [cartTab, setCartTab] = useState<"new" | "ordered">("new");
  const [showCartSheet, setShowCartSheet] = useState(false);
  const [showOrderedItemsSheet, setShowOrderedItemsSheet] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [reserveName, setReserveName] = useState("");
  const [reservePhone, setReservePhone] = useState("");
  const [reserveGuests, setReserveGuests] = useState(2);

  const cartRef = useRef<HTMLDivElement | null>(null);
  const scrollToCart = () => {
    cartRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDirectAddToCart = (item: MenuItem) => {
    if (!item.available) return;

    // Check if the item has any required option groups
    const hasRequired = (item.optionGroups || []).some(g => g.required);

    if (hasRequired) {
      setDetailItem(item);
    } else {
      const existing = cart.find(
        c => c.item.id === item.id &&
          c.size === "Medium" &&
          (!c.optionIds || c.optionIds.length === 0) &&
          c.notes === ""
      );

      if (existing) {
        updateQuantity(existing.uid, 1);
      } else {
        addToCart({
          uid: crypto.randomUUID(),
          item,
          quantity: 1,
          size: "Medium",
          toppings: [],
          optionIds: [],
          notes: "",
          unitPrice: item.price,
        });
      }
      toast.success(`Đã thêm ${item.name} vào giỏ hàng!`);
    }
  };

  const handleIncrement = (item: MenuItem) => {
    const existing = cart.find(c => c.item.id === item.id);
    if (existing) {
      updateQuantity(existing.uid, 1);
    } else {
      handleDirectAddToCart(item);
    }
  };

  const handleDecrement = (item: MenuItem) => {
    const itemCartItems = cart.filter(c => c.item.id === item.id);
    if (itemCartItems.length === 0) return;
    const target = itemCartItems[itemCartItems.length - 1];
    if (target.quantity > 1) {
      updateQuantity(target.uid, -1);
    } else {
      removeFromCart(target.uid);
    }
  };


  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);

  const updateSessionId = (id: string | null) => {
    setSessionId(id);
    if (typeof window !== "undefined") {
      if (id) sessionStorage.setItem("sessionId", id);
      else sessionStorage.removeItem("sessionId");
    }
  };

  const { data: activeSessionData, isLoading: activeSessionLoading, error: activeSessionError } = useQuery({
    queryKey: ["currentSession", tableKey],
    queryFn: async () => {
      if (!tableKey) return null;
      const res = await axiosInstance.get(`/tables/current-session`, {
        params: { tableKey }
      });
      return res.data;
    },
    enabled: !!tableKey,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (activeSessionData && activeSessionData.active && activeSessionData.sessionId) {
      setSessionId(String(activeSessionData.sessionId));
      if (typeof window !== "undefined") {
        sessionStorage.setItem("sessionId", String(activeSessionData.sessionId));
      }
    } else {
      setSessionId(null);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("sessionId");
      }
    }
  }, [activeSessionData]);

  const { data: orderedItems = [], error: ordersError } = useQuery({
    queryKey: ["customerOrders", sessionId],
    queryFn: () => orderApi.getOrdersBySession(Number(sessionId)),
    enabled: !!sessionId && !sessionClosed,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (ordersError) {
      const axiosError = ordersError as any;
      const msg = axiosError.response?.data?.message || "";
      if (msg.includes("Session is closed") || msg.includes("Session not found") || axiosError.response?.status === 400) {
        setSessionClosed(true);
        setShowCheckoutSuccess(true);
      }
    }
  }, [ordersError]);

  useEffect(() => {
    if (payment === "success") {
      setShowCheckoutSuccess(true);
    }
  }, [payment]);

  // Automatically switch tabs if one of them is empty
  useEffect(() => {
    if (cart.length > 0 && cartTab === "ordered" && orderedItems.length === 0) {
      setCartTab("new");
    } else if (orderedItems.length > 0 && cartTab === "new" && cart.length === 0) {
      setCartTab("ordered");
    }
  }, [cart.length, orderedItems.length, cartTab]);

  const handleCloseSuccessPopup = () => {
    setShowCheckoutSuccess(false);
    updateSessionId(null);
    clearCart();
    setSessionClosed(false);
  };

  const progressSummary = useMemo(() => {
    if (orderedItems.length === 0) return { served: 0, total: 0, percent: 0 };
    const served = orderedItems.filter(item => item.status === "SERVED").length;
    const total = orderedItems.length;
    const percent = Math.round((served / total) * 100);
    return { served, total, percent };
  }, [orderedItems]);

  const groupedOrderedItems = useMemo(() => {
    const groups: Record<string, any> = {};

    orderedItems
      .filter((item: any) => item.status !== "WASTED")
      .forEach((item: any) => {
        const optionsSig = (item.options || []).slice().sort().join(",");
        const key = `${item.menuItemId}_${optionsSig}_${item.note || ""}`;

        if (!groups[key]) {
          groups[key] = {
            key,
            menuItemId: item.menuItemId,
            menuItemName: item.menuItemName,
            options: item.options || [],
            note: item.note || "",
            price: item.price || 0,
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
        } else if (status === "CANCELLED") {
          group.cancelledQuantity += qty;
        }
      });

    return Object.values(groups).sort((a: any, b: any) => {
      const getPriority = (g: any) => {
        if (g.preparingQuantity > 0) return 0;
        if (g.doneQuantity > 0) return 1;
        if (g.servedQuantity > 0) return 2;
        return 3;
      };
      return getPriority(a) - getPriority(b);
    });
  }, [orderedItems]);

  const orderedTotals = useMemo(() => {
    const subtotal = orderedItems
      .filter((item: any) => item.status === "SERVED")
      .reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    const service = subtotal * 0.05;
    const tax = subtotal * 0.08;
    return {
      subtotal,
      service,
      tax,
      total: subtotal + service + tax,
    };
  }, [orderedItems]);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"CASH" | "QR" | "PAYPAL">("CASH");
  const [paymentRequestSent, setPaymentRequestSent] = useState(false);
  const [showVietQRDialog, setShowVietQRDialog] = useState(false);
  const [showUnservedAlert, setShowUnservedAlert] = useState(false);

  const handleCopy = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  // Kiểm tra xem session đã có PENDING payment request chưa
  const { data: pendingStatus, refetch: refetchPending } = useQuery({
    queryKey: ["pendingPaymentRequest", sessionId],
    queryFn: () => paymentApi.checkPendingRequest(Number(sessionId)),
    enabled: !!sessionId && !sessionClosed,
    refetchInterval: 5000,
  });

  const hasPendingRequest = pendingStatus?.hasPending || paymentRequestSent;
  const activePaymentRequest = pendingStatus?.request;

  // Mutation: gửi yêu cầu thanh toán (KHÔNG đóng session)
  const customerCheckoutMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error("Không tìm thấy phiên.");
      return paymentApi.requestPayment(Number(sessionId), selectedPaymentMethod);
    },
    onSuccess: (data: any) => {
      setPaymentRequestSent(true);
      setShowCheckoutConfirm(false);
      refetchPending();
      if (selectedPaymentMethod === "QR") {
        setShowVietQRDialog(true);
      } else {
        toast.success("✅ Yêu cầu thanh toán đã được gửi! Thu ngân sẽ xác nhận sớm.");
      }
    },
    onError: (error: any) => {
      const errData = error.response?.data;
      const errMsg = errData?.message || error.message || "Không thể gửi yêu cầu thanh toán.";
      if (errData && errData.error === "ORDER_NOT_COMPLETED") {
        setShowUnservedAlert(true);
      } else if (errMsg.includes("PENDING_ALREADY_EXISTS")) {
        toast.info("Yêu cầu thanh toán đã được gửi trước đó. Vui lòng chờ thu ngân xác nhận.");
        setPaymentRequestSent(true);
      } else {
        toast.error(errMsg);
      }
      setShowCheckoutConfirm(false);
    }
  });

  const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
    WAIT_CONFIRM: { label: "Đang chuẩn bị", bg: "bg-warning/15 text-warning border-warning/30", text: "text-warning", border: "border-warning/30" },
    PENDING: { label: "Đang chuẩn bị", bg: "bg-warning/15 text-warning border-warning/30", text: "text-warning", border: "border-warning/30" },
    PREPARING: { label: "Đang chuẩn bị", bg: "bg-warning/15 text-warning border-warning/30", text: "text-warning", border: "border-warning/30" },
    DONE: { label: "Chờ phục vụ", bg: "bg-info/15 text-info border-info/30", text: "text-info", border: "border-info/30" },
    SERVED: { label: "Đã phục vụ", bg: "bg-success/15 text-success border-success/30", text: "text-success", border: "border-success/30" },
    CANCELLED: { label: "Đã hủy", bg: "bg-muted text-muted-foreground border-muted", text: "text-muted-foreground", border: "border-muted" },
    WASTED: { label: "Đã hủy", bg: "bg-muted text-muted-foreground border-muted", text: "text-muted-foreground", border: "border-muted" },
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "--:--";
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch (e) {
      return "--:--";
    }
  };
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const paymentMethods = [
    { id: "cash", name: "Tiền mặt", icon: Banknote, note: "Thanh toán tại bàn" },
    { id: "vnpay", name: "VNPay", icon: CreditCard, note: "Quét mã QR" },
    { id: "momo", name: "MoMo", icon: Wallet, note: "Ví MoMo" },
  ];



  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [searchQuery, filterAvailableOnly, filterSpecialOnly]);

  // Query tables
  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ["tables"],
    queryFn: () => tableApi.getTables(),
    refetchInterval: 5000,
  });

  // Query categories
  const { data: dbCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: categoryApi.getCategories,
  });

  // Query menu items
  const { data: dbMenuItems = [] } = useQuery({
    queryKey: ["menuItems"],
    queryFn: menuApi.getMenuItems,
  });

  // Resolve current table from QR token or fallback to Table 8
  // Resolve current table from tableKey, preorder, or fallback to Table 8
  const matchedTable = useMemo(() => {
    const preorderTableNum = typeof window !== "undefined" ? sessionStorage.getItem("preorderTableNumber") : null;
    if (preorderTableNum) {
      return tables.find((t) => t.tableNumber === Number(preorderTableNum));
    }
    if (tableKey) {
      return tables.find((t) => t.tableKey === tableKey);
    }
    return tables.find((t) => t.tableNumber === 8);
  }, [tables, tableKey]);

  // Place Order Mutation
  const placeOrderMutation = useMutation({
    mutationFn: async (items: { menuItemId: number; quantity: number; note: string; optionIds?: number[] }[]) => {
      const preorderId = typeof window !== "undefined" ? sessionStorage.getItem("preorderReservationId") : null;
      if (!sessionId && !preorderId) throw new Error("Chưa xác định bàn. Vui lòng quét mã QR để bắt đầu.");
      return orderApi.createOrder({
        sessionId: sessionId ? Number(sessionId) : undefined,
        reservationId: preorderId ? Number(preorderId) : undefined,
        items,
      });
    },
    onSuccess: () => {
      toast.success("✓ Đã gửi yêu cầu gọi món. Nhân viên sẽ xác nhận đơn của bạn trong giây lát.");
      clearCart();
      const preorderId = typeof window !== "undefined" ? sessionStorage.getItem("preorderReservationId") : null;
      if (preorderId) {
        sessionStorage.removeItem("preorderReservationId");
        sessionStorage.removeItem("preorderTableNumber");
        sessionStorage.removeItem("preorderTime");
        navigate({ to: "/" });
      } else {
        scrollToCart();
      }
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || error.message || "Lỗi đặt món. Vui lòng thử lại.";
      toast.error(errMsg);
      if (errMsg.includes("Session not found or closed") || error.response?.status === 400) {
        updateSessionId(null);
        clearCart();
      }
    }
  });

  const handlePlaceOrder = () => {
    if (cart.length === 0) return;
    const items = cart.map(c => ({
      menuItemId: Number(c.item.id),
      quantity: c.quantity,
      note: c.notes || "",
      optionIds: c.optionIds || []
    }));
    placeOrderMutation.mutate(items);
  };

  // Reset Table Admin shortcut
  const resetTableMutation = useMutation({
    mutationFn: async (tableId: number) => {
      return tableApi.resetTable(tableId);
    },
    onSuccess: () => {
      toast.success("Giải phóng bàn thành công!");
      updateSessionId(null);
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reset table");
    }
  });

  // Mapping backend categories
  const categoriesList = useMemo(() => {
    const list = dbCategories.map((c: any) => {
      let icon = Soup;
      const norm = c.name.toLowerCase();
      if (norm.includes("pizza")) icon = Soup;
      else if (norm.includes("burger")) icon = Flame;
      else if (norm.includes("drink")) icon = Sparkles;
      else if (norm.includes("coffee")) icon = Clock;
      else if (norm.includes("dessert")) icon = Clock;

      return {
        id: c.name.toLowerCase(),
        name: c.name,
        icon
      };
    });

    if (list.length > 0) {
      return [
        { id: "all", name: "Tất cả", icon: UtensilsCrossed },
        ...list
      ];
    }
    return list;
  }, [dbCategories]);

  // Mapping backend menu items
  const menuList = useMemo(() => {
    return dbMenuItems.map((f: any) => {
      const extra = getMenuItemExtraDetails(f.name);
      return {
        id: String(f.id),
        name: f.name,
        category: f.categoryName.toLowerCase(),
        description: f.description || "",
        price: f.price,
        available: f.available,
        image: getMenuItemImage(f.image || f.imageUrl),
        optionGroups: f.optionGroups || [],
        ...extra
      } as MenuItem;
    });
  }, [dbMenuItems]);

  const searchFilteredMenuList = useMemo(() => {
    let items = menuList;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q)
      );
    }
    if (filterAvailableOnly) {
      items = items.filter((m) => m.available);
    }
    if (filterSpecialOnly) {
      items = items.filter((m) => m.tag !== undefined);
    }
    return items;
  }, [menuList, searchQuery, filterAvailableOnly, filterSpecialOnly]);

  const filteredMenuList = useMemo(() => {
    let items = searchFilteredMenuList;
    if (activeCat && activeCat !== "all") {
      items = items.filter((m) => m.category === activeCat);
    }
    return items;
  }, [searchFilteredMenuList, activeCat]);

  // Sync active category
  useEffect(() => {
    if (categoriesList.length > 0 && !categoriesList.find(c => c.id === activeCat)) {
      setActiveCat(categoriesList[0].id);
    }
  }, [categoriesList, activeCat]);

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const scrollToCat = (id: string) => {
    setActiveCat(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderNewCart = () => {
    return (
      <div className="flex flex-col h-full text-left justify-between">
        <div className="flex flex-col flex-1 overflow-y-auto min-h-[300px]">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              Đơn hàng mới
            </h3>
            {cart.length > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground px-1.5 text-[10px] font-extrabold">
                {cart.length}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 lg:scrollbar-thin">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/40 border border-border/40">
                  <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="font-bold text-sm text-foreground">Giỏ hàng trống</p>
                <p className="text-[11px] text-muted-foreground max-w-[200px] leading-relaxed">
                  Hãy chọn thêm các món ăn ngon lành từ thực đơn phía bên nhé!
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {cart.map((c) => (
                  <li key={c.uid} className="flex gap-3 p-3 rounded-2xl bg-accent/10 border border-border/40 hover:bg-accent/20 transition-all">
                    <MenuItemImage src={c.item.image} alt={c.item.name} className="h-14 w-14 shrink-0 rounded-xl object-cover border border-border/40" />
                    <div className="min-w-0 flex-1 text-left flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-xs leading-snug truncate">{c.item.name}</p>
                          <Badge variant="outline" className="mt-1 text-[8px] font-extrabold px-1.5 py-0 border-primary/20 text-primary bg-primary/5">
                            {c.size === "Small" ? "Cỡ Nhỏ (S)" : c.size === "Medium" ? "Cỡ Vừa (M)" : "Cỡ Lớn (L)"}
                          </Badge>
                          {c.toppings.length > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">
                              + {c.toppings.join(", ")}
                            </p>
                          )}
                        </div>
                        <button onClick={() => removeFromCart(c.uid)}
                          className="rounded-md p-1 text-muted-foreground hover:text-destructive cursor-pointer transition-colors shrink-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 rounded-full border border-border p-0.5 bg-background">
                          <button onClick={() => updateQuantity(c.uid, -1)} className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-accent cursor-pointer">
                            <Minus className="h-2 w-2" />
                          </button>
                          <span className="w-4 text-center text-[10px] font-semibold">{c.quantity}</span>
                          <button onClick={() => updateQuantity(c.uid, 1)} className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-accent cursor-pointer">
                            <Plus className="h-2 w-2" />
                          </button>
                        </div>
                        <p className="text-xs font-bold text-foreground">{formatPrice(c.unitPrice * c.quantity)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-border/60 mt-4 flex flex-col gap-3">
          {cart.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-baseline text-xs px-1">
                <span className="text-muted-foreground font-semibold">Tạm tính:</span>
                <span className="font-display font-bold text-lg text-primary">{formatPrice(totals.subtotal)}</span>
              </div>
              <Button
                onClick={() => {
                  handlePlaceOrder();
                  setShowCartSheet(false);
                }}
                disabled={placeOrderMutation.isPending}
                className={cn(
                  "h-12 w-full rounded-full text-white shadow-elegant font-bold cursor-pointer flex items-center justify-center gap-2 text-sm transition-all",
                  typeof window !== "undefined" && sessionStorage.getItem("preorderReservationId")
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                    : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                )}
              >
                <ChefHat className="h-4 w-4" />
                {placeOrderMutation.isPending
                  ? "Đang gửi đơn..."
                  : typeof window !== "undefined" && sessionStorage.getItem("preorderReservationId")
                    ? "Xác nhận đặt món trước"
                    : "Gửi yêu cầu gọi món"}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderOrderedItems = () => {
    return (
      <div className="flex flex-col h-full text-left justify-between">
        <div className="flex flex-col flex-1 overflow-y-auto min-h-[300px]">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-success" />
              Món đã đặt
            </h3>
            {orderedItems.length > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-success text-white px-1.5 text-[10px] font-extrabold">
                {orderedItems.length}
              </span>
            )}
          </div>

          {orderedItems.length > 0 && progressSummary.total > 0 && (
            <div className="mb-4 bg-accent/20 border border-border/40 p-3 rounded-2xl">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-muted-foreground">Tiến độ phục vụ:</span>
                <span className="font-bold text-success">{progressSummary.served}/{progressSummary.total} món</span>
              </div>
              <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                <div
                  className="h-full bg-success transition-all duration-500"
                  style={{ width: `${progressSummary.percent}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 lg:scrollbar-thin">
            {orderedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/40 border border-border/40">
                  <ChefHat className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="font-bold text-sm text-foreground">Chưa có đơn đã gọi</p>
                <p className="text-[11px] text-muted-foreground max-w-[200px] leading-relaxed">
                  Bạn chưa gửi bếp món nào. Hãy chọn món và bấm "Đặt ngay" ở tab bên nhé!
                </p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {groupedOrderedItems.map((group: any) => {
                  return (
                    <li
                      key={group.key}
                      onClick={() => {
                        setSelectedOrderItem({
                          ...group.items[0],
                          quantity: group.totalQuantity,
                          price: group.price,
                        });
                        setShowOrderedItemsSheet(false);
                      }}
                      className="flex flex-col gap-2 p-3 rounded-2xl bg-accent/10 border border-border/40 hover:bg-accent/20 transition-all cursor-pointer"
                    >
                      <div className="flex gap-3">
                        <MenuItemImage src={getMenuItemImageById(group.menuItemId)} alt={group.menuItemName} className="h-14 w-14 shrink-0 rounded-xl object-cover border border-border/40" />
                        <div className="min-w-0 flex-1 text-left flex flex-col justify-between">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-bold text-xs leading-snug truncate">{group.menuItemName}</p>
                              {group.options && group.options.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {group.options.map((opt: string, idx: number) => (
                                    <Badge key={idx} variant="secondary" className="text-[8px] bg-accent/40 text-muted-foreground border-0 px-1 py-0">
                                      {opt}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {group.note && (
                                <p className="text-[9px] text-muted-foreground italic truncate mt-1">Ghi chú: {group.note}</p>
                              )}
                            </div>
                            <Badge variant="outline" className="rounded-full text-[9px] font-extrabold px-2 py-0.5 shrink-0 border-primary/30 text-primary bg-primary/5">
                              x{group.totalQuantity}
                            </Badge>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                            <p className="font-bold text-foreground">{formatPrice((group.price || 0) * group.totalQuantity)}</p>
                            <span>{formatTime(group.orderedTime)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status breakdown badges */}
                      <div className="flex flex-wrap gap-1.5 border-t border-border/20 pt-2 mt-1">
                        {group.preparingQuantity > 0 && (
                          <Badge variant="outline" className="rounded-full text-[8px] uppercase font-extrabold px-2 py-0.5 border bg-warning/15 text-warning border-warning/30">
                            Chuẩn bị x{group.preparingQuantity}
                          </Badge>
                        )}
                        {group.doneQuantity > 0 && (
                          <Badge variant="outline" className="rounded-full text-[8px] uppercase font-extrabold px-2 py-0.5 border bg-info/15 text-info border-info/30">
                            Chờ phục vụ x{group.doneQuantity}
                          </Badge>
                        )}
                        {group.servedQuantity > 0 && (
                          <Badge variant="outline" className="rounded-full text-[8px] uppercase font-extrabold px-2 py-0.5 border bg-success/15 text-success border-success/30">
                            Đã ra x{group.servedQuantity}
                          </Badge>
                        )}
                        {group.cancelledQuantity > 0 && (
                          <Badge variant="outline" className="rounded-full text-[8px] uppercase font-extrabold px-2 py-0.5 border bg-muted text-muted-foreground border-muted">
                            Đã hủy x{group.cancelledQuantity}
                          </Badge>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-border/60 mt-4 flex flex-col gap-3">
          {orderedItems.length > 0 && (
            <div className="space-y-3">
              <div className="space-y-1.5 text-xs px-1 border-b border-border/40 pb-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Tạm tính món ăn:</span>
                  <span>{formatPrice(orderedTotals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-[10px]">
                  <span>Phí dịch vụ (5%) + Thuế (8%):</span>
                  <span>{formatPrice(orderedTotals.service + orderedTotals.tax)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="font-semibold text-foreground">Tổng cộng hóa đơn:</span>
                  <span className="font-display font-bold text-lg text-success">{formatPrice(orderedTotals.total)}</span>
                </div>
              </div>

              {hasPendingRequest ? (
                <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
                    <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
                  </div>
                  <p className="text-xs font-bold text-amber-600">Yêu cầu thanh toán đã được gửi</p>
                  <p className="text-[10px] text-amber-500/80">Vui lòng chờ thu ngân xác nhận và đóng bàn</p>
                  {activePaymentRequest?.paymentMethod === "QR" && (
                    <Button
                      onClick={() => {
                        setShowVietQRDialog(true);
                        setShowOrderedItemsSheet(false);
                      }}
                      className="mt-2 h-9 px-4 rounded-full bg-primary hover:text-black hover:bg-primary/90 text-primary-foreground font-bold text-xs cursor-pointer shadow-soft border-none"
                    >
                      Xem mã QR thanh toán
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  onClick={() => {
                    const hasUnserved = orderedItems.some(
                      (item: any) =>
                        item.status === "WAIT_CONFIRM" ||
                        item.status === "PENDING" ||
                        item.status === "PREPARING" ||
                        item.status === "DONE"
                    );
                    if (hasUnserved) {
                      setShowUnservedAlert(true);
                    } else {
                      setShowCheckoutConfirm(true);
                    }
                    setShowOrderedItemsSheet(false);
                  }}
                  disabled={customerCheckoutMutation.isPending}
                  className="h-12 w-full rounded-full bg-gradient-to-r from-success to-emerald-600 hover:opacity-95 text-white shadow-elegant font-bold cursor-pointer flex items-center justify-center gap-2 text-sm transition-all"
                >
                  <CreditCard className="h-4 w-4" />
                  Yêu cầu thanh toán
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleAddToCart = (ci: CartItem) => {
    addToCart(ci);
  };

  const getMenuItemImageById = (menuItemId: number) => {
    const menuItem = menuList.find(m => Number(m.id) === menuItemId);
    return menuItem ? menuItem.image : "css-gradient-placeholder";
  };

  const handleDirectAddWithSize = (item: MenuItem, size: "Small" | "Medium" | "Large") => {
    if (!item.available) return;

    const sizeGroup = (item.optionGroups || []).find(g => g.type === "SIZE" || g.name.toLowerCase() === "size");
    const otherRequiredGroups = (item.optionGroups || []).filter(g => g.required && g !== sizeGroup);

    if (otherRequiredGroups.length > 0) {
      setDetailItem(item);
      return;
    }

    let selectedOptIds: number[] = [];
    let optionPrice = 0;
    let toppings: string[] = [];

    if (sizeGroup) {
      const matchedOpt = sizeGroup.options.find(o => o.name === size);
      if (matchedOpt) {
        selectedOptIds = [matchedOpt.id];
        optionPrice = matchedOpt.price;
        toppings = [matchedOpt.price > 0 ? `${matchedOpt.name} (+${formatPrice(matchedOpt.price)})` : matchedOpt.name];
      }
    }

    const unitPrice = item.price + optionPrice;

    const existing = cart.find(
      c => c.item.id === item.id &&
        c.size === size &&
        c.optionIds?.length === selectedOptIds.length &&
        c.optionIds?.every(id => selectedOptIds.includes(id)) &&
        c.notes === ""
    );

    if (existing) {
      updateQuantity(existing.uid, 1);
    } else {
      addToCart({
        uid: crypto.randomUUID(),
        item,
        quantity: 1,
        size,
        toppings,
        optionIds: selectedOptIds,
        notes: "",
        unitPrice,
      });
    }
    const sizeLabel = size === "Small" ? "Cỡ Nhỏ (S)" : size === "Medium" ? "Cỡ Vừa (M)" : "Cỡ Lớn (L)";
    toast.success(`Đã thêm ${item.name} (${sizeLabel}) vào giỏ hàng!`);
  };

  if (tablesLoading || (activeSessionLoading && !sessionId && matchedTable?.tableNumber)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <UtensilsCrossed className="h-10 w-10 text-primary animate-pulse mx-auto" />
          <p className="text-sm text-muted-foreground">Đang tải thông tin bàn và thực đơn...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-12">
      {!sessionId && !(typeof window !== "undefined" && sessionStorage.getItem("preorderReservationId")) ? (
        /* Customer Table Not Active View */
        <div className="flex-1 flex items-center justify-center p-4 min-h-[80vh]">
          <div className="max-w-md w-full bg-card/60 backdrop-blur-md rounded-3xl border border-border p-8 shadow-elegant text-center space-y-6">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 shadow-soft">
              <AlertTriangle className="h-8 w-8 text-amber-500 animate-pulse" />
            </div>
            <div className="space-y-2">
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-0 font-semibold px-3 py-1 text-sm">
                BÀN {matchedTable ? matchedTable.tableNumber : "--"}
              </Badge>
              <h2 className="font-display text-2xl font-bold tracking-tight">Bàn Chưa Được Mở</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Bàn hiện chưa được mở. Vui lòng liên hệ nhân viên.
              </p>
            </div>
            <div className="pt-2">
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["currentSession", tableKey] })}
                className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-elegant hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                Kiểm tra lại
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Customer Main Menu & Ordering */
        <>
          <header className="sticky top-0 z-40 glass border-b border-border/60">
            <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 md:px-6">
              <div className="flex items-center gap-3.5">
                <div className="flex h-14 w-14 items-center justify-center shrink-0">
                  <img src={logoImg} alt="Chill Club Logo" className="h-full w-full object-contain" />
                </div>
                <div className="leading-tight text-left">
                  <p className="font-display text-base font-bold tracking-tight">Chill Club</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Bia Hơi Ngon · Est. 2024</p>
                </div>
              </div>

              <div className="ml-2 hidden items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 sm:flex">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-success/60 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                <span className="text-xs font-medium">Bàn {matchedTable ? matchedTable.tableNumber : "--"}</span>
              </div>

              <div className="ml-auto flex items-center gap-2">
                {/* Mobile Cart Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCartSheet(true)}
                  className="relative lg:hidden cursor-pointer h-9 w-9"
                  aria-label="View Cart"
                >
                  <ShoppingBag className="h-4 w-4" />
                  {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-extrabold text-primary-foreground">
                      {cartCount}
                    </span>
                  )}
                </Button>

                {/* Ordered Items Button */}
                {orderedItems.length > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowOrderedItemsSheet(true)}
                    className="h-9 rounded-full bg-success hover:bg-success/90 text-black text-xs font-bold gap-1.5 cursor-pointer px-3 border-none shadow-sm"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>Đã đặt ({orderedItems.length})</span>
                  </Button>
                )}

                <Button variant="ghost" size="icon" onClick={() => setDark(!dark)} aria-label="Toggle theme" className="h-9 w-9">
                  {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </header>

          {typeof window !== "undefined" && sessionStorage.getItem("preorderReservationId") && (
            <div className="w-full bg-primary text-primary-foreground px-4 py-3 text-xs font-bold flex items-center justify-between shadow-md animate-in slide-in-from-top duration-300">
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-white/70 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                </span>
                Bạn đang chọn món trước cho Bàn {sessionStorage.getItem("preorderTableNumber")} · Đặt trước vào lúc: {sessionStorage.getItem("preorderTime")}
              </span>
              <button
                onClick={() => {
                  sessionStorage.removeItem("preorderReservationId");
                  sessionStorage.removeItem("preorderTableNumber");
                  sessionStorage.removeItem("preorderTime");
                  window.location.reload();
                }}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded px-2.5 py-1 font-bold cursor-pointer transition-colors"
              >
                Hủy chọn trước
              </button>
            </div>
          )}

          <div className="mx-auto max-w-7xl px-4 pb-32 pt-4 md:px-6 grid grid-cols-1 lg:grid-cols-[200px_1fr_360px] xl:grid-cols-[220px_1fr_400px] gap-6 xl:gap-8 lg:pt-8">
            {/* Category sidebar */}
            <aside className="sticky top-[70px] z-30 -mx-4 mb-4 bg-background/80 backdrop-blur-xl md:-mx-6 lg:sticky lg:top-[90px] lg:h-[calc(100vh-120px)] lg:overflow-y-auto lg:mx-0 lg:mb-0 lg:bg-transparent lg:backdrop-blur-none lg:pr-2">
              <div className="flex gap-2 overflow-x-auto px-4 py-3 md:px-6 lg:flex-col lg:overflow-visible lg:px-0">
                {categoriesList.map((c) => {
                  const count = c.id === "all"
                    ? searchFilteredMenuList.length
                    : searchFilteredMenuList.filter((m) => m.category === c.id).length;
                  const active = activeCat === c.id;
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      onClick={() => scrollToCat(c.id)}
                      className={cn(
                        "group flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-smooth lg:w-full cursor-pointer",
                        active
                          ? "border-transparent bg-gradient-primary text-primary-foreground shadow-elegant"
                          : "border-border bg-card hover:border-primary/30 hover:bg-accent/30"
                      )}
                    >
                      <span className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl transition-smooth",
                        active ? "bg-white/20" : "bg-accent/50 text-primary"
                      )}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex flex-1 flex-col">
                        <span className="text-sm font-semibold leading-none">{c.name}</span>
                        <span className={cn("mt-1 text-xs", active ? "text-white/80" : "text-muted-foreground")}>
                          {count} món
                        </span>
                      </span>
                      <ChevronRight className={cn("h-4 w-4 opacity-0 transition-smooth lg:opacity-100", active ? "opacity-100" : "text-muted-foreground")} />
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Menu grid */}
            <main className="min-w-0">


              {/* Search & Filter Bar */}
              <div className="mb-6 space-y-3">
                <div className="relative flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Tìm món ăn"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-12 pl-11 pr-10 rounded-full border border-border bg-card/60 backdrop-blur-md focus:border-primary/50 focus:outline-none text-sm shadow-soft transition-smooth"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {categoriesList.map((c) => {
                if (c.id === "all") return null;
                const items = filteredMenuList.filter((m) => m.category === c.id);
                if (items.length === 0) return null;
                return (
                  <section
                    key={c.id}
                    ref={(el) => { sectionRefs.current[c.id] = el; }}
                    className="scroll-mt-32 pt-8 first:pt-4"
                  >
                    <div className="mb-4 flex items-end justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-widest text-primary">{c.name}</p>
                        <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
                          {c.name === "Pizza" ? "Wood-fired pies" : c.name === "Burger" ? "Stacked & smashed" : "Tuyển chọn đặc biệt"}
                        </h2>
                      </div>
                      <span className="text-xs text-muted-foreground">{items.length} món</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:gap-4">
                      {items.map((m) => (
                        <article
                          key={m.id}
                          className="group overflow-hidden rounded-2xl sm:rounded-3xl border border-border bg-card shadow-soft transition-smooth hover:-translate-y-1 hover:shadow-elegant flex flex-col justify-between"
                        >
                          <button onClick={() => setDetailItem(m)} className="relative block aspect-[4/3] w-full overflow-hidden cursor-pointer">
                            <MenuItemImage
                              src={m.image} alt={m.name}
                              className="h-full w-full object-cover transition-smooth group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
                            {!m.available && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs sm:text-sm font-semibold uppercase tracking-wider text-white">
                                Hết món
                              </div>
                            )}
                          </button>

                          <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between">
                            <div className="min-w-0">
                              <h3 className="truncate font-display text-sm sm:text-base font-bold text-foreground">{m.name}</h3>
                              <p className="mt-1 line-clamp-2 text-[10px] sm:text-xs text-muted-foreground min-h-[30px] sm:min-h-[32px]">{m.description}</p>
                            </div>

                            {/* Price & Quantity Adjuster */}
                            <div className="mt-3 sm:mt-4 flex items-center justify-between border-t border-border/40 pt-2 sm:pt-3">
                              <span className="text-sm sm:text-base font-bold text-foreground">{formatPrice(m.price)}</span>
                              {(() => {
                                const itemCartQty = cart.filter(c => c.item.id === m.id).reduce((sum, c) => sum + c.quantity, 0);
                                return itemCartQty > 0 ? (
                                  <div className="flex items-center gap-0.5 sm:gap-1 rounded-full border border-border p-0.5 sm:p-1 bg-card">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 sm:h-7 sm:w-7 rounded-full hover:bg-accent cursor-pointer flex items-center justify-center p-0"
                                      onClick={() => handleDecrement(m)}
                                    >
                                      <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                    </Button>
                                    <span className="w-4 sm:w-5 text-center text-[10px] sm:text-xs font-semibold">{itemCartQty}</span>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 sm:h-7 sm:w-7 rounded-full hover:bg-accent cursor-pointer flex items-center justify-center p-0"
                                      onClick={() => handleIncrement(m)}
                                    >
                                      <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    disabled={!m.available}
                                    onClick={() => handleIncrement(m)}
                                    className="h-8 sm:h-9 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-3 sm:px-4 cursor-pointer text-[10px] sm:text-xs"
                                  >
                                    Thêm món
                                  </Button>
                                );
                              })()}
                            </div>

                            <button
                              onClick={() => setDetailItem(m)}
                              className="w-full text-center text-[10px] text-primary hover:underline font-semibold mt-3 block cursor-pointer"
                            >
                              Tùy chọn topping & ghi chú →
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })}

              {filteredMenuList.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center py-12 space-y-4 rounded-3xl border border-dashed border-border bg-card/40 p-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-muted-foreground">
                    <UtensilsCrossed className="h-6 w-6" />
                  </div>
                  <p className="font-semibold text-sm">Không tìm thấy món ăn phù hợp</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Thử tìm kiếm bằng từ khóa khác hoặc xóa bộ lọc xem sao nhé!
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterAvailableOnly(false);
                      setFilterSpecialOnly(false);
                      setActiveCat("all");
                    }}
                    className="rounded-full text-xs font-semibold px-4 cursor-pointer"
                  >
                    Xóa tìm kiếm & bộ lọc
                  </Button>
                </div>
              )}


            </main>

            {/* Cart Panel (Haidilao style, tabbed & detailed card lists with images) */}
            <div ref={cartRef} className="col-span-1 hidden lg:flex lg:sticky lg:top-[90px] lg:h-[calc(100vh-120px)] lg:overflow-y-auto bg-card border border-border rounded-3xl p-5 shadow-elegant flex-col text-left justify-between min-h-[450px]">
              {renderNewCart()}
            </div>
          </div>

          {detailItem && (
            <MenuItemDetail
              item={detailItem}
              onClose={() => setDetailItem(null)}
              onAdd={(ci) => { handleAddToCart(ci); setDetailItem(null); }}
            />
          )}



          {/* Payment Request Dialog — chọn hình thức thanh toán */}
          <Dialog open={showCheckoutConfirm} onOpenChange={setShowCheckoutConfirm}>
            <DialogContent className="max-w-md bg-card border border-border p-6 rounded-3xl text-left">
              <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-success" /> Yêu cầu thanh toán
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Chọn hình thức thanh toán và gửi yêu cầu — Thu ngân sẽ xác nhận và đóng bàn cho bạn
              </DialogDescription>

              <div className="space-y-5 mt-4">
                {/* Tóm tắt hóa đơn */}
                <div className="p-4 rounded-2xl bg-accent/20 border border-border/40 space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tạm tính:</span>
                    <span className="font-semibold">{formatPrice(orderedTotals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Phí dịch vụ + Thuế:</span>
                    <span className="font-semibold">{formatPrice(orderedTotals.service + orderedTotals.tax)}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1 border-t border-border/40">
                    <span className="font-bold text-sm text-foreground">Tổng thanh toán:</span>
                    <span className="font-display text-xl font-bold text-success">{formatPrice(orderedTotals.total)}</span>
                  </div>
                </div>

                {/* Chọn hình thức thanh toán */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Chọn hình thức thanh toán</p>
                  <div className="grid grid-cols-1 gap-2">
                    {([
                      { id: "CASH", label: "Tiền mặt", desc: "Trả tiền mặt cho thu ngân", icon: Banknote },
                      { id: "QR", label: "Chuyển khoản QR", desc: "Chuyển khoản qua mã QR", icon: QrCode },
                    ] as const).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedPaymentMethod(m.id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer",
                          selectedPaymentMethod === m.id
                            ? "border-primary bg-primary/10 shadow-soft"
                            : "border-border bg-accent/10 hover:bg-accent/20"
                        )}
                      >
                        <div className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl shrink-0",
                          selectedPaymentMethod === m.id ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground"
                        )}>
                          <m.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className={cn("text-sm font-bold", selectedPaymentMethod === m.id ? "text-primary" : "text-foreground")}>
                            {m.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                        </div>
                        {selectedPaymentMethod === m.id && (
                          <CheckCircle2 className="ml-auto h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCheckoutConfirm(false)}
                    className="flex-1 h-11 rounded-full border-border bg-accent/20 text-foreground font-bold hover:bg-accent/40 cursor-pointer text-xs"
                  >
                    Quay lại
                  </Button>
                  <Button
                    onClick={() => customerCheckoutMutation.mutate()}
                    disabled={customerCheckoutMutation.isPending}
                    className="flex-1 h-11 rounded-full bg-gradient-to-r from-success to-emerald-600 text-white font-bold shadow-elegant hover:opacity-95 cursor-pointer text-xs flex items-center justify-center gap-1.5"
                  >
                    {customerCheckoutMutation.isPending ? "Đang gửi..." : "Gửi yêu cầu"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Checkout Success Popup Dialog */}
          <Dialog open={showCheckoutSuccess} onOpenChange={handleCloseSuccessPopup}>
            <DialogContent className="max-w-md bg-card border border-border p-6 rounded-3xl text-center">
              <DialogTitle className="sr-only">Thanh toán hoàn tất</DialogTitle>
              <DialogDescription className="sr-only">Hóa đơn đã thanh toán thành công</DialogDescription>
              <div className="space-y-6">
                <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-gradient-to-br from-success to-emerald-600 shadow-elegant animate-bounce">
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </div>

                <div className="space-y-2">
                  <h1 className="font-display text-2xl font-bold tracking-tight text-success">Thanh toán hoàn tất</h1>
                  <p className="text-xs uppercase tracking-widest text-primary font-bold">Chill Club · Bia Hơi Ngon</p>
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
                    onClick={handleCloseSuccessPopup}
                    variant="outline"
                    className="w-full h-12 rounded-full border-border bg-accent/20 text-foreground font-bold hover:bg-accent/40 cursor-pointer text-xs"
                  >
                    Đóng & Quay lại trang chủ
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Unserved Items Alert Dialog */}
          <Dialog open={showUnservedAlert} onOpenChange={setShowUnservedAlert}>
            <DialogContent className="max-w-xs rounded-3xl p-6 text-center space-y-4">
              <DialogTitle className="text-center font-display font-bold text-base flex flex-col items-center gap-2">
                <span className="text-3xl">❌</span> Chưa thể thanh toán
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-muted-foreground pt-1 leading-relaxed">
                Một số món ăn vẫn đang được chuẩn bị hoặc chưa được phục vụ. Vui lòng đợi nhân viên mang món đầy đủ trước khi yêu cầu thanh toán.
              </DialogDescription>
              <div className="pt-2">
                <Button onClick={() => setShowUnservedAlert(false)} className="w-full rounded-full h-10 font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                  Đồng ý
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* VietQR Payment Details Dialog */}
          <Dialog open={showVietQRDialog} onOpenChange={setShowVietQRDialog}>
            <DialogContent className="max-w-[340px] w-[90vw] bg-card border border-border p-4 rounded-3xl text-left text-foreground">
              <DialogTitle className="font-display text-sm sm:text-base font-bold flex items-center gap-2 border-b border-border/60 pb-2">
                <QrCode className="h-4 w-4 text-primary animate-pulse" /> Thanh toán VietQR
              </DialogTitle>
              <DialogDescription className="sr-only">
                Thông tin thanh toán chuyển khoản VietQR cho hóa đơn của bạn.
              </DialogDescription>
              {activePaymentRequest && (
                <div className="space-y-3 mt-3">
                  {/* QR Image */}
                  <div className="flex flex-col items-center justify-center p-2 bg-white rounded-2xl border border-gray-100 shadow-soft">
                    {activePaymentRequest.qrUrl ? (
                      <img
                        src={activePaymentRequest.qrUrl}
                        alt="Mã QR thanh toán VietQR"
                        className="w-32 h-32 object-contain"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-accent/20 rounded-xl flex items-center justify-center text-[10px] text-muted-foreground animate-pulse">
                        Đang tạo mã QR...
                      </div>
                    )}
                    <span className="text-[9px] text-muted-foreground mt-1 font-mono flex items-center gap-1">
                      <Lock className="h-2.5 w-2.5 text-success" /> Giao dịch bảo mật bằng VietQR
                    </span>
                  </div>

                  {/* Total Amount */}
                  <div className="text-center bg-primary/5 border border-primary/10 rounded-2xl p-2">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Tổng tiền thanh toán</p>
                    <p className="font-display text-base font-bold text-primary mt-0.5">
                      {formatPrice(activePaymentRequest.amount)}
                    </p>
                  </div>

                  {/* Transfer Details */}
                  <div className="bg-accent/25 border border-border/40 rounded-2xl p-2.5 space-y-2 text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Ngân hàng:</span>
                      <span className="font-bold">{activePaymentRequest.bankName || "MB Bank"}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-border/10 pt-1.5">
                      <span className="text-muted-foreground">Chủ tài khoản:</span>
                      <span className="font-bold">{activePaymentRequest.accountName || "CHILL CLUB"}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-border/10 pt-1.5">
                      <span className="text-muted-foreground">Số tài khoản:</span>
                      <div className="flex items-center gap-1 font-bold">
                        <span className="font-mono">{activePaymentRequest.bankAccount || "0123456789"}</span>
                        <button
                          onClick={() => handleCopy(activePaymentRequest.bankAccount || "0123456789", "Đã sao chép số tài khoản!")}
                          className="p-0.5 hover:bg-accent rounded text-primary cursor-pointer transition-colors"
                          title="Sao chép số tài khoản"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center border-t border-border/10 pt-1.5">
                      <span className="text-muted-foreground">Nội dung CK:</span>
                      <div className="flex items-center gap-1 font-bold text-primary">
                        <span className="font-mono">{activePaymentRequest.transferContent || activePaymentRequest.transactionCode}</span>
                        <button
                          onClick={() => handleCopy(activePaymentRequest.transferContent || activePaymentRequest.transactionCode || "", "Đã sao chép nội dung chuyển khoản!")}
                          className="p-0.5 hover:bg-accent rounded text-primary cursor-pointer transition-colors"
                          title="Sao chép nội dung chuyển khoản"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="bg-warning/10 border border-warning/20 text-warning rounded-2xl p-2.5 text-[10px] leading-relaxed flex gap-2 items-start">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <p>
                      <strong>Lưu ý:</strong> Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống đối chiếu. Sau khi chuyển khoản hãy chờ nhân viên xác nhận.
                    </p>
                  </div>

                  {/* Footer Action */}
                  <Button
                    onClick={() => setShowVietQRDialog(false)}
                    className="w-full h-9 rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-elegant hover:opacity-95 cursor-pointer text-xs flex items-center justify-center gap-1.5"
                  >
                    Tôi đã chuyển khoản
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Ordered Item Timeline Modal */}
          <Dialog open={!!selectedOrderItem} onOpenChange={() => setSelectedOrderItem(null)}>
            <DialogContent className="max-w-md bg-card border border-border p-6 rounded-3xl text-left">
              <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
                Chi tiết món ăn
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Thông tin thời gian chuẩn bị và phục vụ của món ăn
              </DialogDescription>
              {selectedOrderItem && (
                <div className="space-y-4 mt-2">
                  <div className="pb-3 border-b border-border">
                    <h3 className="font-bold text-lg">{selectedOrderItem.menuItemName}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Phân loại: {selectedOrderItem.type === "KITCHEN" ? "Chế biến tại bếp" : "Món ăn liền"}</p>
                    {selectedOrderItem.note && (
                      <p className="text-xs italic text-warning mt-2 bg-warning/5 border border-warning/10 p-2 rounded-xl">
                        Ghi chú: "{selectedOrderItem.note}"
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Số lượng:</span>
                      <span className="font-semibold">{selectedOrderItem.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Đơn giá:</span>
                      <span className="font-semibold">{formatPrice(selectedOrderItem.price)}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/40 pb-3">
                      <span className="text-muted-foreground">Tổng cộng:</span>
                      <span className="font-bold text-primary">{formatPrice((selectedOrderItem.price || 0) * selectedOrderItem.quantity)}</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 text-xs">
                    <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">Mốc thời gian (Timeline)</h4>

                    <div className="relative border-l border-border pl-4 ml-2 space-y-4">
                      <div className="relative">
                        <span className="absolute -left-[21px] top-1 flex h-2 w-2 rounded-full bg-muted-foreground" />
                        <p className="font-semibold text-muted-foreground">Đã đặt món</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatTime(selectedOrderItem.orderedTime)}</p>
                      </div>

                      <div className="relative">
                        <span className={cn("absolute -left-[21px] top-1 flex h-2 w-2 rounded-full", selectedOrderItem.preparingTime ? "bg-orange-500" : "bg-border")} />
                        <p className={cn("font-semibold", selectedOrderItem.preparingTime ? "text-orange-500" : "text-muted-foreground/50")}>Đang chuẩn bị</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatTime(selectedOrderItem.preparingTime)}</p>
                      </div>

                      <div className="relative">
                        <span className={cn("absolute -left-[21px] top-1 flex h-2 w-2 rounded-full", selectedOrderItem.doneTime ? "bg-blue-500" : "bg-border")} />
                        <p className={cn("font-semibold", selectedOrderItem.doneTime ? "text-blue-500" : "text-muted-foreground/50")}>Đã nấu xong (Ready)</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatTime(selectedOrderItem.doneTime)}</p>
                      </div>

                      {selectedOrderItem.deliveringTime && (
                        <div className="relative">
                          <span className="absolute -left-[21px] top-1 flex h-2 w-2 rounded-full bg-purple-500" />
                          <p className="font-semibold text-purple-500">Đang giao món (On the way)</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{formatTime(selectedOrderItem.deliveringTime)}</p>
                        </div>
                      )}

                      <div className="relative">
                        <span className={cn("absolute -left-[21px] top-1 flex h-2 w-2 rounded-full", selectedOrderItem.servedTime ? "bg-green-500" : "bg-border")} />
                        <p className={cn("font-semibold", selectedOrderItem.servedTime ? "text-green-500" : "text-muted-foreground/50")}>Đã phục vụ</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatTime(selectedOrderItem.servedTime)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Tổng thời gian chế biến:</span>
                    <span className="font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{selectedOrderItem.totalPreparationDuration || "N/A"}</span>
                  </div>

                  <Button onClick={() => setSelectedOrderItem(null)} className="w-full rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-soft mt-2">
                    Đóng
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
          {/* Floating Cart Button for Mobile */}
          {cart.length > 0 && (
            <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden animate-in fade-in slide-in-from-bottom duration-300">
              <Button
                onClick={() => setShowCartSheet(true)}
                className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-elegant flex items-center justify-between px-6 cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  <span>Giỏ hàng ({cartCount})</span>
                </div>
                <span className="font-display font-bold text-sm">{formatPrice(totals.subtotal)}</span>
              </Button>
            </div>
          )}

          {/* Mobile Cart Sheet */}
          <Sheet open={showCartSheet} onOpenChange={setShowCartSheet}>
            <SheetContent side="right" className="w-[90%] sm:max-w-[400px] p-6 bg-card border-l border-border flex flex-col justify-between h-full">
              <SheetTitle className="sr-only">Giỏ hàng</SheetTitle>
              <SheetDescription className="sr-only">Chi tiết đơn hàng mới của bạn</SheetDescription>
              {renderNewCart()}
            </SheetContent>
          </Sheet>

          {/* Ordered History Sheet */}
          <Sheet open={showOrderedItemsSheet} onOpenChange={setShowOrderedItemsSheet}>
            <SheetContent side="right" className="w-[90%] sm:max-w-[400px] p-6 bg-card border-l border-border flex flex-col justify-between h-full">
              <SheetTitle className="sr-only">Món đã đặt</SheetTitle>
              <SheetDescription className="sr-only">Danh sách món đã đặt và trạng thái phục vụ</SheetDescription>
              {renderOrderedItems()}
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}

function MenuItemDetail({
  item, onClose, onAdd,
}: {
  item: MenuItem; onClose: () => void;
  onAdd: (ci: CartItem) => void;
}) {
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number[]>>(() => {
    const initial: Record<number, number[]> = {};
    if (item && item.optionGroups) {
      item.optionGroups.forEach((group) => {
        const gId = Number(group.id);
        const isSingle = group.selectionType === "SINGLE" || String(group.selectionType).toUpperCase() === "SINGLE";
        if (group.required && isSingle && group.options.length > 0) {
          initial[gId] = [Number(group.options[0].id)];
        } else {
          initial[gId] = [];
        }
      });
    }
    return initial;
  });
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState(1);

  const toggleOption = (group: OptionGroup, option: ItemOption) => {
    const groupId = Number(group.id);
    const optionId = Number(option.id);
    const isSingle = group.selectionType === "SINGLE" || String(group.selectionType).toUpperCase() === "SINGLE";

    setSelectedOptions((prev) => {
      const current = prev[groupId] || [];
      if (isSingle) {
        if (current.includes(optionId)) {
          return group.required ? prev : { ...prev, [groupId]: [] };
        }
        return { ...prev, [groupId]: [optionId] };
      } else {
        if (current.includes(optionId)) {
          return { ...prev, [groupId]: current.filter((id) => Number(id) !== optionId) };
        } else {
          const maxSelect = group.maxSelect ? Number(group.maxSelect) : 0;
          if (maxSelect > 0 && current.length >= maxSelect) {
            toast.warning(`Chỉ được chọn tối đa ${group.maxSelect} tùy chọn cho nhóm ${group.name}`);
            return prev;
          }
          return { ...prev, [groupId]: [...current, optionId] };
        }
      }
    });
  };

  const optionsPrice = (item.optionGroups || []).reduce((sum, group) => {
    const selectedIds = selectedOptions[Number(group.id)] || [];
    const groupPrice = group.options
      .filter((opt) => selectedIds.includes(Number(opt.id)))
      .reduce((s, opt) => s + opt.price, 0);
    return sum + groupPrice;
  }, 0);

  const unitPrice = item.price + optionsPrice;

  const sizeGroup = (item.optionGroups || []).find(
    (g) => g.type === "SIZE" || g.name.toLowerCase() === "size"
  );
  let selectedSize: "Small" | "Medium" | "Large" = "Medium";
  if (sizeGroup) {
    const selectedIds = selectedOptions[Number(sizeGroup.id)] || [];
    if (selectedIds.length > 0) {
      const opt = sizeGroup.options.find((o) => Number(o.id) === selectedIds[0]);
      if (opt && (opt.name === "Small" || opt.name === "Medium" || opt.name === "Large")) {
        selectedSize = opt.name as any;
      }
    }
  }

  const cookGroup = (item.optionGroups || []).find(
    (g) => g.type === "COOKING_LEVEL" || g.name.toLowerCase().includes("cook")
  );
  let selectedCook: "Rare" | "Medium" | "Well Done" | undefined = undefined;
  if (cookGroup) {
    const selectedIds = selectedOptions[Number(cookGroup.id)] || [];
    if (selectedIds.length > 0) {
      const opt = cookGroup.options.find((o) => Number(o.id) === selectedIds[0]);
      if (opt && (opt.name === "Rare" || opt.name === "Medium" || opt.name === "Well Done")) {
        selectedCook = opt.name as any;
      }
    }
  }

  const handleAdd = () => {
    const missingRequiredGroup = (item.optionGroups || []).find((group) => {
      if (group.required) {
        const selected = selectedOptions[Number(group.id)] || [];
        return selected.length === 0;
      }
      return false;
    });

    if (missingRequiredGroup) {
      toast.error(`Vui lòng chọn ít nhất một tùy chọn cho nhóm "${missingRequiredGroup.name}"`);
      return;
    }

    for (const group of item.optionGroups || []) {
      const selected = selectedOptions[Number(group.id)] || [];
      const isMultiple = group.selectionType === "MULTIPLE" || String(group.selectionType).toUpperCase() === "MULTIPLE";
      if (isMultiple) {
        const minSelect = group.minSelect ? Number(group.minSelect) : 0;
        const maxSelect = group.maxSelect ? Number(group.maxSelect) : 0;
        if (minSelect > 0 && selected.length < minSelect) {
          toast.error(`Nhóm "${group.name}" yêu cầu chọn tối thiểu ${group.minSelect} tùy chọn`);
          return;
        }
        if (maxSelect > 0 && selected.length > maxSelect) {
          toast.error(`Nhóm "${group.name}" cho phép chọn tối đa ${group.maxSelect} tùy chọn`);
          return;
        }
      }
    }

    const optionIds = Object.values(selectedOptions).flat().map((id) => Number(id));

    const toppings: string[] = [];
    (item.optionGroups || []).forEach((g) => {
      const selected = selectedOptions[Number(g.id)] || [];
      g.options.forEach((o) => {
        if (selected.includes(Number(o.id))) {
          const label = o.price > 0 ? `${o.name} (+${formatPrice(o.price)})` : o.name;
          toppings.push(label);
        }
      });
    });

    onAdd({
      uid: crypto.randomUUID(),
      item,
      quantity: qty,
      size: selectedSize,
      toppings,
      optionIds,
      cook: selectedCook,
      notes,
      unitPrice,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-32px)] sm:w-full max-w-3xl gap-0 overflow-hidden p-0 rounded-2xl sm:rounded-3xl max-h-[85vh] sm:max-h-[90vh] flex flex-col">
        <DialogTitle className="sr-only">{item.name}</DialogTitle>
        <DialogDescription className="sr-only">{item.description}</DialogDescription>
        <div className="flex flex-col md:grid md:grid-cols-2 flex-1 min-h-0 overflow-hidden">
          <div className="relative h-32 md:h-auto shrink-0">
            <MenuItemImage src={item.image} alt={item.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent md:bg-gradient-to-r" />
          </div>

          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 text-left space-y-5">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight">{item.name}</h2>
                {item.calories && (
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{item.calories} cal</span>
                  </div>
                )}
              </div>

              <p className="mt-3 text-sm text-muted-foreground">{item.description}</p>

              {item.ingredients && item.ingredients.length > 0 && (
                <Section label="Thành phần">
                  <div className="flex flex-wrap gap-1.5">
                    {item.ingredients.map((i) => (
                      <span key={i} className="rounded-full bg-accent px-2.5 py-1 text-xs">{i}</span>
                    ))}
                  </div>
                </Section>
              )}

              {item.allergens && item.allergens.length > 0 && (
                <Section label="Dị ứng ứng">
                  <div className="flex flex-wrap gap-1.5">
                    {item.allergens.map((a) => (
                      <span key={a} className="rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs text-destructive">{a}</span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Dynamic Option Groups */}
              {(item.optionGroups || []).map((group) => (
                <Section
                  key={group.id}
                  label={`${group.name} ${group.required ? "(Bắt buộc)" : "(Tùy chọn)"}`}
                >
                  {(group.selectionType === "MULTIPLE" || String(group.selectionType).toUpperCase() === "MULTIPLE") && (group.minSelect || group.maxSelect) && (
                    <p className="text-[10px] text-muted-foreground mb-2">
                      {group.minSelect ? `Chọn tối thiểu ${group.minSelect} ` : ""}
                      {group.maxSelect ? `Chọn tối đa ${group.maxSelect} ` : ""}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    {group.options.map((opt) => {
                      const isSelected = (selectedOptions[Number(group.id)] || []).includes(Number(opt.id));
                      return (
                        <OptionChip
                          key={opt.id}
                          active={isSelected}
                          onClick={() => toggleOption(group, opt)}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-0.5 sm:gap-2 text-left min-w-0">
                            <span className="font-semibold text-[10px] sm:text-xs leading-tight break-words">{opt.name}</span>
                            <span className="text-[9px] sm:text-[11px] text-muted-foreground shrink-0">
                              {opt.price > 0 ? `+${formatPrice(opt.price)}` : "Miễn phí"}
                            </span>
                          </div>
                        </OptionChip>
                      );
                    })}
                  </div>
                </Section>
              ))}

              <Section label="Ghi chú đặc biệt">
                <Textarea
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ít cay, không hành, nhiều sốt…"
                  className="resize-none rounded-2xl text-left"
                  rows={3}
                />
              </Section>
            </div>

            {/* Sticky Pinned Bottom Actions Bar */}
            <div className="p-4 sm:px-6 border-t border-border/60 bg-card shrink-0 flex items-center gap-3 mt-auto">
              <div className="flex items-center gap-1 rounded-full border border-border p-1 bg-background shrink-0">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent cursor-pointer">
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent cursor-pointer">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <Button
                disabled={!item.available}
                onClick={handleAdd}
                className="ml-auto h-12 flex-1 gap-2 rounded-full bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-95 cursor-pointer font-bold text-xs"
              >
                Thêm · {formatPrice(unitPrice * qty)}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function OptionChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      className={cn(
        "flex flex-col items-start justify-center gap-0.5 rounded-xl border p-1.5 sm:p-2.5 text-xs sm:text-sm transition-smooth cursor-pointer w-full min-w-0",
        active
          ? "border-primary bg-primary/10 text-foreground shadow-soft"
          : "border-border bg-card hover:border-primary/40 hover:bg-accent/40"
      )}
    >
      {children}
    </button>
  );
}
