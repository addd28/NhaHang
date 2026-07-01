import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, User, Phone, Users, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { tableApi } from "@/api/tableApi";

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
  "20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00", "23:30"
];

export function BookingDialog({ open, onOpenChange }: BookingDialogProps) {
  const queryClient = useQueryClient();

  // Date and Time Helper to initialize default values
  const getDefaults = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    // Default time is 2 hours in the future
    const future = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    let hours = future.getHours();
    let minutes = future.getMinutes();

    // Round up to next 30-minute interval
    if (minutes > 30) {
      minutes = 0;
      hours += 1;
    } else if (minutes > 0) {
      minutes = 30;
    }

    if (hours > 23) {
      hours = 23;
      minutes = 30;
    }

    const timeStr = `${pad(hours)}:${pad(minutes)}`;
    return { todayStr, timeStr };
  };

  const { todayStr, timeStr } = getDefaults();

  // Form states
  const [reserveName, setReserveName] = useState("");
  const [reservePhone, setReservePhone] = useState("");
  const [reserveGuests, setReserveGuests] = useState(2);
  const [reserveDate, setReserveDate] = useState(todayStr);
  const [reserveTime, setReserveTime] = useState(timeStr);
  const [reserveNote, setReserveNote] = useState("");

  // Result state (stores response from backend)
  const [bookingResult, setBookingResult] = useState<any | null>(null);

  // Real-time occupancy state
  const [occupancy, setOccupancy] = useState<{ status: string; message: string } | null>(null);

  // Compute available time slots based on selected date
  const availableSlots = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    // If selected date is today, we only keep slots >= now + 2 hours
    if (reserveDate === todayStr) {
      const minBookingTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      return TIME_SLOTS.filter((slot) => {
        const [hours, minutes] = slot.split(":").map(Number);
        const slotDate = new Date();
        slotDate.setHours(hours, minutes, 0, 0);
        return slotDate >= minBookingTime;
      });
    }

    return TIME_SLOTS;
  }, [reserveDate]);

  // Dynamically set or update the selected time when available slots change
  useEffect(() => {
    if (availableSlots.length > 0) {
      if (!availableSlots.includes(reserveTime)) {
        setReserveTime(availableSlots[0]);
      }
    } else {
      setReserveTime("");
    }
  }, [availableSlots, reserveTime]);

  // Fetch real-time occupancy status
  useEffect(() => {
    if (!reserveDate || !reserveTime) {
      setOccupancy(null);
      return;
    }
    const dateTimeStr = `${reserveDate}T${reserveTime}:00`;
    tableApi.getOccupancy(dateTimeStr)
      .then((data) => {
        setOccupancy({ status: data.status, message: data.message });
      })
      .catch(() => {
        setOccupancy(null);
      });
  }, [reserveDate, reserveTime]);

  const resetForm = () => {
    const defaults = getDefaults();
    setReserveName("");
    setReservePhone("");
    setReserveGuests(2);
    setReserveDate(defaults.todayStr);
    setReserveTime(defaults.timeStr);
    setReserveNote("");
    setBookingResult(null);
  };

  const reserveMutation = useMutation({
    mutationFn: async (req: {
      customerName: string;
      phone: string;
      guestCount: number;
      reservationTime: string;
      note: string;
    }) => {
      // Backend expects LocalDateTime string (e.g. YYYY-MM-DDTHH:mm:ss)
      const dateTimeStr = `${reserveDate}T${reserveTime}:00`;
      return tableApi.reserveSlot({
        customerName: req.customerName,
        phone: req.phone,
        guestCount: req.guestCount,
        reservationTime: dateTimeStr,
        note: req.note,
      });
    },
    onSuccess: (data) => {
      setBookingResult(data);
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || error.message || "Lỗi đặt bàn.";
      toast.error(errMsg);
    },
  });

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!reserveName.trim()) {
      toast.error("Vui lòng nhập Họ và tên!");
      return;
    }
    if (!reservePhone.trim()) {
      toast.error("Vui lòng nhập Số điện thoại!");
      return;
    }
    if (!reserveDate) {
      toast.error("Vui lòng chọn Ngày đặt bàn!");
      return;
    }
    if (!reserveTime) {
      toast.error("Vui lòng chọn Giờ đặt bàn hợp lệ!");
      return;
    }

    // Validation: must be at least 2 hours in the future
    const selectedDateTimeStr = `${reserveDate}T${reserveTime}:00`;
    const selectedDateTime = new Date(selectedDateTimeStr);
    const now = new Date();

    if (isNaN(selectedDateTime.getTime())) {
      toast.error("Vui lòng chọn ngày và giờ đặt bàn hợp lệ!");
      return;
    }

    const minTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    if (selectedDateTime < minTime) {
      toast.error("Đặt bàn phải trước ít nhất 2 giờ.");
      return;
    }

    reserveMutation.mutate({
      customerName: reserveName,
      phone: reservePhone,
      guestCount: reserveGuests,
      reservationTime: selectedDateTimeStr,
      note: reserveNote,
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form after dialog animation closes
    setTimeout(resetForm, 300);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) handleClose();
    }}>
      <DialogContent className="max-w-[640px] w-full bg-card text-foreground border border-border/30 p-0 overflow-hidden rounded-[24px] shadow-soft transition-all duration-300 font-sans">
        {/* Custom Header Bar */}
        <div className="bg-[#121212] text-white px-6 py-5 flex items-center gap-3 border-b border-white/5">
          <Calendar className="h-6 w-6 text-primary animate-pulse" />
          <DialogTitle className="font-display text-xl font-bold tracking-wide text-white uppercase">
            Đặt bàn trực tuyến
          </DialogTitle>
        </div>

        {/* Main Body */}
        <div className="p-6 md:p-8 max-h-[85vh] overflow-y-auto">
          {!bookingResult ? (
            /* ================= FORM VIEW ================= */
            <form onSubmit={handleBookingSubmit} className="space-y-6">
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed font-light font-sans">
                Nhập thông tin bên dưới để hệ thống tự động tìm và giữ chỗ phù hợp.
                <br />
                Nếu hiện tại nhà hàng đã hết bàn, bạn sẽ được đưa vào <strong className="font-semibold text-primary">Danh sách chờ</strong> và hệ thống sẽ tự động xác nhận khi có bàn trống.
              </DialogDescription>

              {/* Form Input Fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Họ và tên */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 font-sans">
                      <User className="h-3.5 w-3.5 text-primary" />
                      Họ và tên <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={reserveName}
                      onChange={(e) => setReserveName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn A"
                      className="w-full h-[52px] px-4 rounded-xl border border-border bg-background/50 text-foreground focus:bg-card focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none text-sm transition-all placeholder:text-muted-foreground/60 font-sans"
                    />
                  </div>

                  {/* Số điện thoại */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 font-sans">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      Số điện thoại <span className="text-primary">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={reservePhone}
                      onChange={(e) => setReservePhone(e.target.value)}
                      placeholder="Ví dụ: 0901234567"
                      className="w-full h-[52px] px-4 rounded-xl border border-border bg-background/50 text-foreground focus:bg-card focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none text-sm transition-all placeholder:text-muted-foreground/60 font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Số khách */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 font-sans">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      Số khách <span className="text-primary">*</span>
                    </label>
                    <select
                      value={reserveGuests}
                      onChange={(e) => setReserveGuests(Number(e.target.value))}
                      className="w-full h-[52px] px-4 rounded-xl border border-border bg-background/50 text-foreground focus:bg-card focus:border-primary focus:outline-none text-sm transition-all cursor-pointer font-sans"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 20].map((n) => (
                        <option key={n} value={n}>
                          {n} người
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Ngày */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 font-sans">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      Ngày <span className="text-primary">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      min={todayStr}
                      value={reserveDate}
                      onChange={(e) => setReserveDate(e.target.value)}
                      onKeyDown={(e) => e.preventDefault()}
                      className="w-full h-[52px] px-4 rounded-xl border border-border bg-background/50 text-foreground focus:bg-card focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none text-sm transition-all cursor-pointer font-sans"
                    />
                  </div>

                  {/* Giờ */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 font-sans">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      Giờ <span className="text-primary">*</span>
                    </label>
                    {availableSlots.length > 0 ? (
                      <select
                        value={reserveTime}
                        onChange={(e) => setReserveTime(e.target.value)}
                        className="w-full h-[52px] px-4 rounded-xl border border-border bg-background/50 text-foreground focus:bg-card focus:border-primary focus:outline-none text-sm transition-all cursor-pointer font-sans"
                      >
                        {availableSlots.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full h-[52px] px-3 rounded-xl border border-amber-200 bg-amber-500/10 text-amber-500 text-[11px] leading-tight flex items-center font-sans">
                        Hết khung giờ khả dụng cho hôm nay.
                      </div>
                    )}
                  </div>
                </div>

                {/* Occupancy Warning Banner */}
                {occupancy && (
                  <div className={`p-4 rounded-xl text-xs font-medium font-sans flex flex-col gap-1 text-left border ${occupancy.status === "PLENTY"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                      : occupancy.status === "NEAR_FULL"
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                    }`}>
                    <span className="font-bold flex items-center gap-1">
                      {occupancy.status === "PLENTY" && "🟢 Còn nhiều chỗ"}
                      {occupancy.status === "NEAR_FULL" && "🟡 Khung giờ gần kín"}
                      {occupancy.status === "CROWDED" && "🔴 Khung giờ đã rất đông"}
                    </span>
                    <span className="font-light opacity-90">{occupancy.message}</span>
                  </div>
                )}

                {/* Ghi chú */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-sans">
                    Ghi chú thêm
                  </label>
                  <textarea
                    rows={2}
                    value={reserveNote}
                    onChange={(e) => setReserveNote(e.target.value)}
                    placeholder="Ví dụ:&#10;Sinh nhật&#10;Họp nhóm&#10;Có trẻ em&#10;..."
                    className="w-full p-4 rounded-xl border border-border bg-background/50 text-foreground focus:bg-card focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none text-sm transition-all resize-none placeholder:text-muted-foreground/60 min-h-[90px] font-sans"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3 font-sans">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="w-full sm:flex-1 h-[52px] rounded-xl border-border bg-muted/20 hover:bg-muted/40 text-foreground font-bold transition-all text-sm cursor-pointer"
                >
                  Hủy bỏ
                </Button>

                <Button
                  type="submit"
                  disabled={reserveMutation.isPending || availableSlots.length === 0}
                  className="w-full sm:flex-1 h-[52px] rounded-xl bg-primary hover:bg-primary-glow text-primary-foreground font-bold shadow-elegant hover:scale-[1.02] transition-all text-sm cursor-pointer flex items-center justify-center gap-2 border-none"
                >
                  {reserveMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
                      <div className="text-left text-[11px] leading-tight">
                        <p className="font-bold">Đang tìm bàn phù hợp...</p>
                        <p className="font-light opacity-90">Vui lòng chờ trong giây lát...</p>
                      </div>
                    </div>
                  ) : (
                    "Đặt bàn ngay"
                  )}
                </Button>
              </div>
            </form>
          ) : (
            /* ================= SUCCESS / BOOKED VIEW ================= */
            <div className="text-center py-4 space-y-6 animate-fade-up font-sans">
              {/* Animated Success Icon */}
              <div className="flex justify-center">
                <div className="bg-emerald-500/10 p-4 rounded-full text-emerald-500 animate-bounce">
                  <CheckCircle2 className="h-16 w-16" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="font-display text-2xl font-bold text-foreground">
                  Đặt bàn thành công
                </h3>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  🟢 BOOKED
                </div>
              </div>

              {/* Bold Reservation Code Card */}
              <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-5 max-w-sm mx-auto shadow-sm">
                <p className="text-[10px] tracking-widest text-muted-foreground font-bold uppercase">
                  Mã đặt bàn
                </p>
                <p className="text-3xl font-mono font-black text-primary tracking-wider my-2.5">
                  {bookingResult.reservationCode || "N/A"}
                </p>
                <p className="text-[11px] text-muted-foreground leading-normal font-light">
                  Vui lòng cung cấp mã này cho nhân viên khi đến nhà hàng.
                </p>
              </div>

              {/* Details List */}
              <div className="border border-border/60 rounded-xl divide-y divide-border/60 max-w-md mx-auto text-sm text-left">
                <div className="grid grid-cols-3 p-3">
                  <span className="text-muted-foreground font-medium">Khách hàng:</span>
                  <span className="col-span-2 text-foreground font-bold text-right">{bookingResult.customerName || reserveName}</span>
                </div>
                <div className="grid grid-cols-3 p-3">
                  <span className="text-muted-foreground font-medium">Số điện thoại:</span>
                  <span className="col-span-2 text-foreground font-semibold text-right">{reservePhone}</span>
                </div>
                <div className="grid grid-cols-3 p-3">
                  <span className="text-muted-foreground font-medium">Ngày đặt bàn:</span>
                  <span className="col-span-2 text-foreground font-semibold text-right">
                    {reserveDate ? new Date(reserveDate).toLocaleDateString("vi-VN") : "--"}
                  </span>
                </div>
                <div className="grid grid-cols-3 p-3">
                  <span className="text-muted-foreground font-medium">Giờ đặt bàn:</span>
                  <span className="col-span-2 text-foreground font-semibold text-right">{reserveTime}</span>
                </div>
                <div className="grid grid-cols-3 p-3">
                  <span className="text-muted-foreground font-medium">Số khách:</span>
                  <span className="col-span-2 text-primary font-bold text-right">{bookingResult.guestCount || reserveGuests} người</span>
                </div>
              </div>

              {/* Info text */}
              <div className="max-w-md mx-auto bg-primary/5 border border-primary/10 p-4 rounded-xl text-left text-xs text-muted-foreground space-y-1 leading-relaxed">
                <p className="font-bold flex items-center gap-1.5 text-primary">
                  💡 Lưu ý về giữ chỗ:
                </p>
                <p className="font-light">
                  Vui lòng đến đúng giờ.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleClose}
                  className="w-full max-w-xs h-[52px] rounded-xl bg-primary hover:bg-primary-glow text-primary-foreground font-bold transition-all text-sm cursor-pointer shadow-elegant border-none"
                >
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
