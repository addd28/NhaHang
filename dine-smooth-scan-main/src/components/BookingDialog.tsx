import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, User, Phone, Users, CheckCircle2, Loader2, Info } from "lucide-react";
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
    if (!reserveGuests || reserveGuests <= 0) {
      toast.error("Vui lòng nhập số lượng khách hợp lệ!");
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
      <DialogContent className="max-w-[580px] w-[95vw] bg-card text-foreground border border-border/40 p-0 overflow-hidden rounded-[28px] shadow-soft transition-all duration-300 font-sans">
        {/* Custom Header Bar */}
        <div className="bg-[#121212] px-6 py-6 border-b border-border/40 relative">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-primary" />
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-2xl border border-primary/20">
              <Calendar className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <div className="text-left">
              <DialogTitle className="font-display text-xl font-bold tracking-wide text-white uppercase">
                Đặt Bàn Trực Tuyến
              </DialogTitle>
            </div>
          </div>
        </div>

        {/* Main Body */}
        <div className="p-6 md:p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {!bookingResult ? (
            /* ================= FORM VIEW ================= */
            <form onSubmit={handleBookingSubmit} className="space-y-6">
              <DialogDescription className="sr-only">
                Nhập thông tin chi tiết để tiến hành giữ chỗ tại nhà hàng.
              </DialogDescription>

              {/* Form Input Fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Họ và tên */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 font-sans">
                      <User className="h-3.5 w-3.5 text-primary" />
                      Họ và tên <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={reserveName}
                      onChange={(e) => setReserveName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-black focus:border-primary focus:outline-none text-sm placeholder:text-gray-400 font-sans"
                    />
                  </div>

                  {/* Số điện thoại */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 font-sans">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      Số điện thoại <span className="text-primary">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={reservePhone}
                      onChange={(e) => setReservePhone(e.target.value)}
                      placeholder="Ví dụ: 0901234567"
                      className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-black focus:border-primary focus:outline-none text-sm placeholder:text-gray-400 font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Số khách */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 font-sans">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      Số khách <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      value={reserveGuests || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*$/.test(val)) {
                          setReserveGuests(val ? Number(val) : 0);
                        }
                      }}
                      placeholder="Nhập số khách"
                      className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-black focus:border-primary focus:outline-none text-sm placeholder:text-gray-400 font-sans"
                    />
                  </div>

                  {/* Ngày */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 font-sans">
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
                      className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-black focus:border-primary focus:outline-none text-sm cursor-pointer font-sans"
                    />
                  </div>

                  {/* Giờ */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 font-sans">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      Giờ <span className="text-primary">*</span>
                    </label>
                    {availableSlots.length > 0 ? (
                      <select
                        value={reserveTime}
                        onChange={(e) => setReserveTime(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-black focus:border-primary focus:outline-none text-sm cursor-pointer font-sans"
                      >
                        {availableSlots.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full h-12 px-3 rounded-xl border border-amber-200 bg-amber-500/10 text-amber-500 text-[10px] leading-tight flex items-center font-sans">
                        Hết khung giờ hôm nay.
                      </div>
                    )}
                  </div>
                </div>

                {/* Occupancy Warning Banner */}
                {occupancy && (
                  <div className={`p-4 rounded-2xl text-xs font-sans flex flex-col gap-1 text-left border ${occupancy.status === "PLENTY"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                      : occupancy.status === "NEAR_FULL"
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                    }`}>
                    <span className="font-bold flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${occupancy.status === "PLENTY"
                          ? "bg-emerald-500 animate-pulse"
                          : occupancy.status === "NEAR_FULL"
                            ? "bg-amber-500 animate-pulse"
                            : "bg-rose-500 animate-pulse"
                        }`} />
                      {occupancy.status === "PLENTY" && "Còn nhiều chỗ trống"}
                      {occupancy.status === "NEAR_FULL" && "Khung giờ gần kín"}
                      {occupancy.status === "CROWDED" && "Khung giờ đã rất đông"}
                    </span>
                    <span className="font-light opacity-90 leading-relaxed">{occupancy.message}</span>
                  </div>
                )}

                {/* Ghi chú */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-sans">
                    Ghi chú thêm
                  </label>
                  <textarea
                    rows={2}
                    value={reserveNote}
                    onChange={(e) => setReserveNote(e.target.value)}
                    placeholder="Ví dụ: Đặt bàn gần cửa sổ, tổ chức sinh nhật, có trẻ em..."
                    className="w-full p-4 rounded-xl border border-gray-200 bg-white text-black focus:border-primary focus:outline-none text-sm resize-none placeholder:text-gray-400 min-h-[90px] font-sans"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3 font-sans">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="w-full sm:flex-1 h-12 rounded-full border-border bg-accent/20 hover:bg-accent/40 text-foreground font-bold transition-all text-xs uppercase tracking-widest cursor-pointer"
                >
                  Hủy bỏ
                </Button>

                <Button
                  type="submit"
                  disabled={reserveMutation.isPending || availableSlots.length === 0}
                  className="w-full sm:flex-1 h-12 rounded-full bg-gradient-primary hover:opacity-95 text-primary-foreground font-bold shadow-elegant hover:scale-[1.02] transition-all text-xs uppercase tracking-widest cursor-pointer flex items-center justify-center gap-2 border-none"
                >
                  {reserveMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
                      <span>Đang giữ chỗ...</span>
                    </div>
                  ) : (
                    "Xác Nhận Đặt Bàn"
                  )}
                </Button>
              </div>
            </form>
          ) : (
            /* ================= SUCCESS / BOOKED VIEW ================= */
            <div className="text-center py-4 space-y-6 animate-fade-up font-sans">
              {/* Animated Success Icon */}
              <div className="flex justify-center">
                <div className="bg-emerald-500/10 p-5 rounded-full text-emerald-500 border border-emerald-500/20 relative animate-pulse">
                  <CheckCircle2 className="h-14 w-14" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="font-display text-2xl font-bold text-foreground">
                  Đặt Bàn Thành Công!
                </h3>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Đã xác nhận (Booked)
                </div>
              </div>

              {/* Bold Reservation Code Ticket */}
              <div className="bg-primary/5 border border-dashed border-primary/20 rounded-2xl p-5 max-w-sm mx-auto shadow-inner relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-primary" />
                <p className="text-[10px] tracking-[0.2em] text-muted-foreground font-bold uppercase">
                  Mã Đặt Bàn của bạn
                </p>
                <p className="text-3xl font-mono font-black text-primary tracking-wider my-3">
                  {bookingResult.reservationCode || "N/A"}
                </p>
                <p className="text-[11px] text-muted-foreground leading-normal font-light">
                  Vui lòng xuất trình mã này cho nhân viên lễ tân khi đến nhà hàng.
                </p>
              </div>

              {/* Details List Card */}
              <div className="border border-border/40 bg-accent/10 rounded-2xl divide-y divide-border/20 max-w-md mx-auto text-xs text-left shadow-soft">
                <div className="grid grid-cols-3 p-3.5">
                  <span className="text-muted-foreground">Khách hàng:</span>
                  <span className="col-span-2 text-foreground font-bold text-right">{bookingResult.customerName || reserveName}</span>
                </div>
                <div className="grid grid-cols-3 p-3.5">
                  <span className="text-muted-foreground">Số điện thoại:</span>
                  <span className="col-span-2 text-foreground font-semibold text-right">{reservePhone}</span>
                </div>
                <div className="grid grid-cols-3 p-3.5">
                  <span className="text-muted-foreground">Ngày đặt:</span>
                  <span className="col-span-2 text-foreground font-semibold text-right">
                    {reserveDate ? new Date(reserveDate).toLocaleDateString("vi-VN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "--"}
                  </span>
                </div>
                <div className="grid grid-cols-3 p-3.5">
                  <span className="text-muted-foreground">Khung giờ:</span>
                  <span className="col-span-2 text-foreground font-bold text-right text-primary">{reserveTime}</span>
                </div>
                <div className="grid grid-cols-3 p-3.5">
                  <span className="text-muted-foreground">Số lượng khách:</span>
                  <span className="col-span-2 text-primary font-bold text-right">{bookingResult.guestCount || reserveGuests} người</span>
                </div>
              </div>

              {/* Info alert card */}
              <div className="max-w-md mx-auto bg-warning/5 border border-warning/20 p-4 rounded-2xl text-left text-[11px] text-warning flex gap-2.5 items-start leading-relaxed font-sans">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-warning" />
                <div>
                  <p className="font-bold mb-0.5">💡 Lưu ý quan trọng:</p>
                  <p className="font-light opacity-90">
                    Bàn đặt của quý khách sẽ được hỗ trợ giữ chỗ tối đa trong vòng 10 phút so với giờ hẹn. Nếu quá thời gian trên, hệ thống sẽ tự động hủy lịch để nhường chỗ cho khách hàng tiếp theo.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleClose}
                  className="w-full max-w-xs h-12 rounded-full bg-gradient-primary hover:opacity-95 text-primary-foreground font-bold transition-all text-xs uppercase tracking-widest cursor-pointer shadow-elegant border-none"
                >
                  Hoàn tất
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
