import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tableApi } from "@/api/tableApi";
import { provinceApi } from "@/api/provinceApi";
import { branchApi } from "@/api/branchApi";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Calendar as CalendarIcon, MapPin, Users, Building2, Globe, MessageSquare, Clock } from "lucide-react";
import { toast } from "sonner";
import backdropImage from "../../assets/restaurant-backdrop.png";

export const Route = createFileRoute("/customer/reserve")({
  component: TableReservationPage,
});


const TIME_SLOTS = [
  "10:00", "11:30", "12:00", "13:30", "17:30", "18:00", "19:30", "20:00", "21:30"
];

function TableReservationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Form states
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [guestCount, setGuestCount] = useState<number>(2);
  const [date, setDate] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  // After successful reservation
  const [confirmationResult, setConfirmationResult] = useState<{
    confirmationCode: string;
    reservationCode: string | null;
    reservationId: number;
    tableNumber: number | null;
    status: string;
  } | null>(null);

  // Fetch provinces
  const { data: provinces = [] } = useQuery({
    queryKey: ["provinces"],
    queryFn: () => provinceApi.getProvinces(),
  });

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchApi.getBranches(),
  });

  // Set default province when they are loaded
  useEffect(() => {
    if (provinces.length > 0 && selectedProvinceId === null) {
      setSelectedProvinceId(provinces[0].id);
    }
  }, [provinces, selectedProvinceId]);

  // Filter branches by selected province
  const filteredBranches = useMemo(() => {
    if (selectedProvinceId === null) return [];
    return branches.filter((b) => b.provinceId === selectedProvinceId);
  }, [branches, selectedProvinceId]);

  // Set default branch when filtered branches change
  useEffect(() => {
    if (filteredBranches.length > 0) {
      if (!filteredBranches.some((b) => b.id === selectedBranchId)) {
        setSelectedBranchId(filteredBranches[0].id);
      }
    } else {
      setSelectedBranchId(null);
    }
  }, [filteredBranches, selectedBranchId]);

  // Fetch tables to find a matching empty table
  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ["reserveTables", selectedBranchId],
    queryFn: () => tableApi.getTables(selectedBranchId || undefined),
    enabled: selectedBranchId !== null,
    refetchInterval: 5000,
  });

  // Find suitable empty table for reservation
  const suitableTable = useMemo(() => {
    const emptyTables = tables.filter(
      (t) => t.status === "EMPTY" && t.capacity >= guestCount
    );
    // Sort by capacity ascending to get the smallest table that fits
    return emptyTables.sort((a, b) => a.capacity - b.capacity)[0] || null;
  }, [tables, guestCount]);

  const reserveMutation = useMutation({
    mutationFn: async (req: {
      customerName: string;
      phone: string;
      guestCount: number;
      reservationTime: string;
      note: string;
      branchId: number;
    }) => {
      return tableApi.reserveSlot({
        customerName: req.customerName,
        phone: req.phone,
        guestCount: req.guestCount,
        reservationTime: req.reservationTime,
        note: req.note,
        branchId: req.branchId,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["reserveTables"] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      setConfirmationResult({
        confirmationCode: data.confirmationCode,
        reservationCode: data.reservationCode,
        reservationId: data.reservationId,
        tableNumber: data.tableNumber,
        status: data.status,
      });
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || error.message || "Lỗi đặt bàn.";
      toast.error(errMsg);
    },
  });

  const handleBookTableOnly = () => {
    if (!selectedBranchId) {
      toast.error("Vui lòng chọn chi nhánh!");
      return;
    }
    if (!date) {
      toast.error("Vui lòng chọn ngày đặt bàn!");
      return;
    }
    if (date < todayStr) {
      toast.error("Vui lòng chọn ngày ở hiện tại hoặc tương lai!");
      return;
    }
    if (!selectedTimeSlot) {
      toast.error("Vui lòng chọn giờ đặt bàn!");
      return;
    }
    if (!customerName.trim() || !phone.trim()) {
      toast.error("Vui lòng điền Họ tên và Số điện thoại!");
      return;
    }
    const reservationTimeStr = `${date}T${selectedTimeSlot}:00`;
    reserveMutation.mutate({
      customerName,
      phone,
      guestCount,
      reservationTime: reservationTimeStr,
      note: note || "Đặt bàn thông thường",
      branchId: selectedBranchId,
    });
  };

  // Confirmation screen shown after successful reservation
  if (confirmationResult) {
    const isWaitlist = confirmationResult.status === "WAITLIST";
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center p-4 relative bg-cover bg-center"
        style={{ backgroundImage: `url(${backdropImage})` }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-none" />
        <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col p-8 animate-in fade-in zoom-in-95 duration-300 text-center">
          
          {isWaitlist ? (
            <>
              {/* Waitlist View */}
              <div className="flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mx-auto mb-4">
                <Clock className="w-9 h-9 text-amber-600" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-1">Hiện tại chưa có bàn phù hợp.</h1>
              <p className="text-sm text-gray-500 mb-6">Bạn đã được thêm vào danh sách chờ.</p>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100/35 border border-amber-200 rounded-2xl p-6 mb-6">
                <p className="text-xs text-amber-800 leading-relaxed font-semibold">
                  Chúng tôi sẽ tự động giữ bàn cho bạn nếu có bàn trống.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Booked View */}
              <div className="flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mx-auto mb-4">
                <svg className="w-9 h-9 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-1">Đặt bàn thành công</h1>
              <p className="text-sm text-gray-500 mb-6">Yêu cầu đặt bàn của bạn đã được ghi nhận.</p>

              {/* Confirmation Code Box */}
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-2xl p-6 mb-6">
                <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">🔑 Mã đặt bàn</p>
                <div className="text-3xl font-black text-primary tracking-wider mb-3">
                  {confirmationResult.reservationCode}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                  Vui lòng lưu lại mã đặt bàn và cung cấp mã này khi đến nhà hàng.
                </p>
              </div>
            </>
          )}

          {/* Info */}
          <div className="text-left bg-gray-50 rounded-xl p-4 mb-6 space-y-1.5 text-xs text-gray-600">
            <div className="flex justify-between"><span className="text-gray-400 font-medium">Khách hàng</span><span className="font-semibold text-gray-800">{customerName}</span></div>
            <div className="flex justify-between"><span className="text-gray-400 font-medium">Số điện thoại</span><span className="font-semibold text-gray-800">{phone}</span></div>
            <div className="flex justify-between"><span className="text-gray-400 font-medium">Số khách</span><span className="font-semibold text-gray-800">{guestCount} người</span></div>
            <div className="flex justify-between"><span className="text-gray-400 font-medium">Ngày đặt bàn</span><span className="font-semibold text-gray-800">{date}</span></div>
            <div className="flex justify-between"><span className="text-gray-400 font-medium">Giờ đặt bàn</span><span className="font-semibold text-gray-800">{selectedTimeSlot}</span></div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate({ to: "/" })}
              className="w-full h-11 bg-primary text-white hover:bg-primary/95 rounded-xl font-semibold text-sm transition-all cursor-pointer"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4 relative bg-cover bg-center"
      style={{ backgroundImage: `url(${backdropImage})` }}
    >
      {/* Blurred overlay */}
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm pointer-events-none" />

      {/* Main reservation card */}
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col p-6 md:p-8 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-gray-100 mb-6">
          <Link to="/" className="flex items-center text-gray-800 hover:text-primary transition-colors">
            <ChevronLeft className="h-6 w-6 mr-1" />
            <h1 className="text-xl font-bold text-gray-900">Đặt bàn</h1>
          </Link>
          
          {/* Country flag selector */}
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-full px-3 py-1 bg-gray-50 text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors">
            <span className="text-base">🇻🇳</span>
            <Globe className="h-3 w-3 text-gray-500" />
          </div>
        </div>

        {/* Form Grid */}
        <div className="space-y-4">
          
          {/* Row 1: City & Branch */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Tỉnh/Thành
              </label>
              <select
                value={selectedProvinceId || ""}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setSelectedProvinceId(val);
                }}
                className="w-full h-12 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 font-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
              >
                <option value="">Chọn Tỉnh/Thành</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Chi nhánh
              </label>
              <select
                value={selectedBranchId || ""}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setSelectedBranchId(val);
                }}
                className="w-full h-12 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 font-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                disabled={!selectedProvinceId}
              >
                <option value="">Chọn Chi nhánh</option>
                {filteredBranches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Guests, Date & Time Slot */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Users className="h-3 w-3" /> Số lượng khách
              </label>
              <select
                value={guestCount}
                onChange={(e) => setGuestCount(Number(e.target.value))}
                className="w-full h-12 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 font-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>{n} người</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" /> Ngày đặt bàn
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={todayStr}
                onKeyDown={(e) => e.preventDefault()}
                onClick={(e) => e.currentTarget.showPicker?.()}
                className="w-full h-12 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 font-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Clock className="h-3 w-3" /> Giờ đặt bàn
              </label>
              <select
                value={selectedTimeSlot}
                onChange={(e) => setSelectedTimeSlot(e.target.value)}
                className="w-full h-12 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 font-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
              >
                <option value="">Chọn giờ</option>
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>



          {/* Row 3: Name & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Họ và tên</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full h-12 px-4 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Số điện thoại</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0901234567"
                className="w-full h-12 px-4 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Row 4: Note */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Ghi chú (tùy chọn)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Ghế trẻ em, bàn gần cửa sổ, tổ chức sinh nhật..."
              className="w-full h-12 px-4 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
            />
          </div>

        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
          <Button
            onClick={handleBookTableOnly}
            disabled={reserveMutation.isPending}
            className="h-11 px-6 bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {reserveMutation.isPending 
              ? "Đang đặt..." 
              : "Đặt bàn"}
          </Button>
        </div>

      </div>
    </div>
  );
}
