import { createFileRoute, Link } from "@tanstack/react-router";
import { Soup, UtensilsCrossed, Shield, Info, Mail, Calendar, Users, QrCode, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tableApi } from "@/api/tableApi";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import logoImg from "../assets/logo.png";

export const Route = createFileRoute("/")({
  component: EntrancePortal,
});

function EntrancePortal() {
  const queryClient = useQueryClient();
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [reserveName, setReserveName] = useState("");
  const [reservePhone, setReservePhone] = useState("");
  const [reserveGuests, setReserveGuests] = useState(2);

  // Fetch tables to find empty ones
  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ["entranceTables"],
    queryFn: () => tableApi.getTables(),
    refetchInterval: 5000,
  });

  const emptyTables = useMemo(() => {
    return tables.filter(t => t.status === "EMPTY").sort((a, b) => a.tableNumber - b.tableNumber);
  }, [tables]);

  const reserveMutation = useMutation({
    mutationFn: async (req: { tableId: number; customerName: string; phone: string; guestCount: number }) => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const localTimeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      
      return tableApi.reserveTable(req.tableId, {
        customerName: req.customerName,
        phone: req.phone,
        guestCount: req.guestCount,
        reservationTime: localTimeStr,
        note: "Đặt trước online từ Trang chủ"
      });
    },
    onSuccess: (_, variables) => {
      const table = tables.find(t => t.id === variables.tableId);
      const tableNum = table ? `0${table.tableNumber}` : "";
      toast.success(`Đặt trước bàn số ${tableNum} thành công!`);
      setShowReserveModal(false);
      setSelectedTableId(null);
      setReserveName("");
      setReservePhone("");
      setReserveGuests(2);
      queryClient.invalidateQueries({ queryKey: ["entranceTables"] });
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || error.message || "Lỗi đặt bàn.";
      toast.error(errMsg);
    }
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-6 items-center justify-center relative">
      {/* Glow effects */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-primary-glow/10 blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-card rounded-3xl border border-border p-8 shadow-elegant text-center space-y-8 relative overflow-hidden">
        <div className="space-y-4">
          <div className="flex h-24 w-24 mx-auto items-center justify-center shrink-0">
            <img src={logoImg} alt="Chill Club Logo" className="h-full w-full object-contain" />
          </div>
          
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-bold tracking-tight">Chill Club</h1>
            <p className="text-xs uppercase tracking-widest text-primary font-bold">Bia Hơi Ngon · Est. 2024</p>
            <p className="text-sm text-muted-foreground mt-2">
              Chào mừng đến với hệ thống đặt món QR & quản lý nhà hàng thông minh Chill Club.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Link to="/customer/menu">
            <Button className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-elegant hover:opacity-95 cursor-pointer flex items-center justify-center gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              Khách hàng gọi món (Bàn số 08)
            </Button>
          </Link>

          <Link to="/customer/reserve" className="w-full">
            <Button
              variant="outline"
              className="w-full h-12 rounded-full border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 font-bold cursor-pointer flex items-center justify-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Đặt trước bàn (Giữ chỗ 10 phút)
            </Button>
          </Link>

          <Link to="/admin/login">
            <Button variant="outline" className="w-full h-12 rounded-full border-border bg-accent/10 text-foreground font-bold hover:bg-accent/20 cursor-pointer flex items-center justify-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Cổng thông tin nhân viên
            </Button>
          </Link>
        </div>

        <div className="border-t border-border pt-6 flex justify-center gap-6 text-xs text-muted-foreground">
          <Link to="/posts" className="hover:text-primary transition-colors flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Tin tức & Sự kiện
          </Link>
          <span>·</span>
          <Link to="/about" className="hover:text-primary transition-colors flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" /> Giới thiệu
          </Link>
          <span>·</span>
          <Link to="/contact" className="hover:text-primary transition-colors flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Liên hệ
          </Link>
        </div>
      </div>

      {/* Online Reservation Modal */}
      <Dialog open={showReserveModal} onOpenChange={setShowReserveModal}>
        <DialogContent className="max-w-md bg-card border border-border p-6 rounded-3xl text-left">
          <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
            Đặt trước bàn online
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Chọn một bàn trống và nhập thông tin. Bàn sẽ được giữ cho bạn trong vòng 10 phút kể từ lúc đặt thành công.
          </DialogDescription>

          <div className="space-y-4 mt-4">
            {/* Step 1: Select Table */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Chọn bàn ăn còn trống:</label>
              {tablesLoading ? (
                <p className="text-xs text-muted-foreground animate-pulse">Đang tải danh sách bàn trống...</p>
              ) : emptyTables.length === 0 ? (
                <p className="text-xs text-destructive font-semibold">⚠️ Hiện tại không còn bàn trống để đặt trước. Vui lòng quay lại sau!</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {emptyTables.map(table => (
                    <button
                      key={table.id}
                      onClick={() => setSelectedTableId(table.id)}
                      className={`h-11 rounded-xl font-bold text-xs border flex flex-col items-center justify-center transition-all cursor-pointer ${
                        selectedTableId === table.id
                          ? "bg-primary text-primary-foreground border-primary shadow-elegant"
                          : "bg-accent/20 border-border text-foreground hover:border-primary/40 hover:bg-accent/40"
                      }`}
                    >
                      <span>{table.tableNumber}</span>
                      <span className="text-[8px] opacity-75 font-normal">({table.capacity} chỗ)</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Customer Details */}
            {selectedTableId && (
              <div className="space-y-3 pt-2 border-t border-border/40 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Tên của bạn:</label>
                  <input
                    type="text"
                    value={reserveName}
                    onChange={(e) => setReserveName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full h-11 px-4 rounded-xl border border-border bg-background/50 focus:border-primary/50 focus:outline-none text-xs"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Số điện thoại nhận bàn:</label>
                  <input
                    type="tel"
                    value={reservePhone}
                    onChange={(e) => setReservePhone(e.target.value)}
                    placeholder="0901234567"
                    className="w-full h-11 px-4 rounded-xl border border-border bg-background/50 focus:border-primary/50 focus:outline-none text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Số lượng khách đi cùng:</label>
                  <select
                    value={reserveGuests}
                    onChange={(e) => setReserveGuests(Number(e.target.value))}
                    className="w-full h-11 px-4 rounded-xl border border-border bg-background/50 focus:border-primary/50 focus:outline-none text-xs"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                      <option key={n} value={n}>{n} người</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="pt-4 flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReserveModal(false);
                  setSelectedTableId(null);
                }}
                className="flex-1 h-11 rounded-full border-border bg-accent/20 text-foreground font-bold hover:bg-accent/40 cursor-pointer text-xs"
              >
                Đóng
              </Button>
              
              <Button
                onClick={() => {
                  if (!selectedTableId) {
                    toast.error("Vui lòng chọn bàn ăn trước!");
                    return;
                  }
                  if (!reserveName.trim() || !reservePhone.trim()) {
                    toast.error("Vui lòng điền đầy đủ Tên và Số điện thoại!");
                    return;
                  }
                  reserveMutation.mutate({
                    tableId: selectedTableId,
                    customerName: reserveName,
                    phone: reservePhone,
                    guestCount: reserveGuests
                  });
                }}
                disabled={!selectedTableId || reserveMutation.isPending}
                className="flex-1 h-11 rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-elegant hover:opacity-95 cursor-pointer text-xs flex items-center justify-center"
              >
                {reserveMutation.isPending ? "Đang đặt..." : "Xác nhận đặt bàn"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
