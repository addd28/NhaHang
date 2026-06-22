import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tableApi } from "@/api/tableApi";
import { AdminLookupResponse, WaitlistResponse } from "@/types";
import { toast } from "sonner";
import { KeyRound, ArrowLeft, CheckCircle2, UtensilsCrossed, Users, Phone, Clock, Search, ChevronLeft, ChevronRight, Calendar, User } from "lucide-react";

export const Route = createFileRoute("/admin/checkin")({
  component: AdminCheckinPage,
});

function AdminCheckinPage() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [lookupData, setLookupData] = useState<AdminLookupResponse | null>(null);

  // Waitlist Search & Pagination states
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Query waitlist reservations
  const { data: reservations = [], isLoading: reservationsLoading } = useQuery({
    queryKey: ["reservations"],
    queryFn: tableApi.getReservations,
    refetchInterval: 5000,
  });

  const [activeTab, setActiveTab] = useState<"active" | "waitlist">("active");

  const [prevReservations, setPrevReservations] = useState<any[]>([]);

  useEffect(() => {
    if (reservations && reservations.length > 0) {
      if (prevReservations.length > 0) {
        reservations.forEach((newRes: any) => {
          if (newRes.status === "BOOKED" && newRes.reservationCode) {
            const wasPresentAndBooked = prevReservations.some(
              (oldRes) => oldRes.id === newRes.id && oldRes.status === "BOOKED" && oldRes.reservationCode
            );
            if (!wasPresentAndBooked) {
              const tableText = newRes.tableNumber ? `A${String(newRes.tableNumber).padStart(2, "0")}` : "Chưa xác định";
              toast.success(
                <div className="flex flex-col text-left space-y-1">
                  <p className="font-extrabold uppercase text-emerald-500 tracking-wider text-xs">🎉 MỚI ĐƯỢC CẤP BÀN</p>
                  <p className="font-bold text-white text-sm">{newRes.customerName}</p>
                  <p className="text-slate-300 text-xs">
                    Bàn: <strong className="text-white">{tableText}</strong>
                  </p>
                  <p className="text-xs font-mono font-black text-amber-400">
                    Mã đặt bàn: {newRes.reservationCode}
                  </p>
                </div>,
                { duration: 10000 }
              );
            }
          }
        });
      }
      setPrevReservations(reservations);
    }
  }, [reservations, prevReservations]);

  // Query actual waitlist queue
  const { data: waitlist = [], isLoading: waitlistLoading } = useQuery({
    queryKey: ["waitlist"],
    queryFn: tableApi.getWaitlist,
    refetchInterval: 5000,
  });

  const lookupMutation = useMutation({
    mutationFn: (codeStr: string) => tableApi.adminLookup(codeStr.toUpperCase().trim()),
    onSuccess: (data) => {
      setLookupData(data);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.message || "Không tìm thấy mã đặt bàn.";
      toast.error(msg);
    },
  });

  const checkinMutation = useMutation({
    mutationFn: (codeStr: string) => tableApi.adminCheckIn(codeStr.toUpperCase().trim()),
    onSuccess: (data) => {
      toast.success(data.message || "Check-in thành công!");
      setLookupData(null);
      setCode("");
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.message || "Lỗi check-in.";
      toast.error(msg);
    },
  });

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Vui lòng nhập mã đặt bàn!");
      return;
    }
    lookupMutation.mutate(code);
  };

  const handleCheckInSubmit = () => {
    if (lookupData) {
      checkinMutation.mutate(lookupData.reservationCode);
    }
  };

  const filteredItems = useMemo(() => {
    if (activeTab === "active") {
      return reservations.filter(r => 
        r.customerName.toLowerCase().includes(search.toLowerCase()) ||
        r.phone.includes(search) ||
        (r.reservationCode && r.reservationCode.toLowerCase().includes(search.toLowerCase())) ||
        r.confirmationCode.includes(search)
      );
    } else {
      return waitlist.filter(w => 
        w.customerName.toLowerCase().includes(search.toLowerCase()) ||
        w.phoneNumber.includes(search)
      );
    }
  }, [reservations, waitlist, activeTab, search]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  // Reset page on search or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-7xl flex flex-col gap-6">
        {/* Back Link */}
        <div className="flex items-center gap-3">
          <Link
            to="/admin/tables"
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại quản lý bàn
          </Link>
        </div>

        {/* Waitlist and Booked Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-6 flex items-center justify-between text-left shadow-lg">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Khách Đang Chờ (WAITLIST)</p>
              <h3 className="text-4xl font-black text-amber-400 mt-2 font-mono">{waitlist.length}</h3>
            </div>
            <div className="h-12 w-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center font-bold text-lg font-mono">
              Q
            </div>
          </div>
          
          <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-6 flex items-center justify-between text-left shadow-lg">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đặt Chỗ Đang Giữ Bàn</p>
              <h3 className="text-4xl font-black text-emerald-400 mt-2 font-mono">{reservations.length}</h3>
            </div>
            <div className="h-12 w-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center font-bold text-lg">
              ✓
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-8 items-start">
          {/* Left Column: Form Check-in / Lookup */}
          <div className="w-full">
            {!lookupData ? (
              /* Step 1: Lookup Form */
              <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-8 shadow-2xl text-left">
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center w-16 h-16 bg-amber-500/20 border border-amber-500/30 rounded-2xl mx-auto mb-4">
                    <KeyRound className="w-8 h-8 text-amber-400" />
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-2">Xác nhận Check-in</h1>
                  <p className="text-slate-400 text-sm">
                    Nhập mã đặt bàn của khách hàng để tiến hành check-in.
                  </p>
                </div>

                <form onSubmit={handleLookupSubmit} className="space-y-6">
                  {/* Code input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Mã đặt bàn
                    </label>
                    <input
                      id="confirmation-code-input"
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="RB-XXXXXX"
                      className="w-full h-16 text-center text-2xl font-black bg-slate-900/60 border-2 border-slate-600 focus:border-amber-400 rounded-xl text-white outline-none transition-colors placeholder:text-slate-600 uppercase"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={lookupMutation.isPending || !code.trim()}
                    id="checkin-submit-btn"
                    className="w-full h-13 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-black rounded-xl text-base transition-all shadow-lg cursor-pointer py-3"
                  >
                    {lookupMutation.isPending ? "Đang kiểm tra..." : "Check In"}
                  </button>
                </form>
              </div>
            ) : (
              /* Step 2: Lookup Result & Check-in Confirmation */
              <div className="bg-slate-800/60 backdrop-blur border border-amber-500/30 rounded-2xl p-8 shadow-2xl text-left">
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center w-16 h-16 bg-amber-500/20 border border-amber-500/30 rounded-2xl mx-auto mb-4">
                    <User className="w-8 h-8 text-amber-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1">Thông tin đặt chỗ</h2>
                  <p className="text-slate-400 text-sm">Xác nhận thông tin khách hàng trước khi check-in.</p>
                </div>

                {/* Details List */}
                <div className="space-y-4 mb-6">
                  <div className="bg-slate-900/50 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="text-xs text-slate-400">Khách hàng</span>
                      <span className="text-sm font-bold text-white">{lookupData.customerName}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="text-xs text-slate-400">Mã đặt bàn</span>
                      <span className="text-sm font-mono font-black text-amber-400">{lookupData.reservationCode}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="text-xs text-slate-400">Giờ đặt</span>
                      <span className="text-sm font-bold text-white flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(lookupData.reservationTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="text-xs text-slate-400">Số khách</span>
                      <span className="text-sm font-bold text-white flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {lookupData.guestCount} người
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Bàn được xếp</span>
                      <span className="text-base font-black text-emerald-400">
                        {lookupData.tableNumber || "Hàng chờ"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setLookupData(null);
                    }}
                    className="flex-1 h-11 bg-slate-750 hover:bg-slate-700 text-white rounded-xl font-semibold text-sm transition-all cursor-pointer border border-slate-700"
                  >
                    Quay lại
                  </button>
                  <button
                    onClick={handleCheckInSubmit}
                    disabled={checkinMutation.isPending}
                    className="flex-1 h-11 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl font-bold text-sm transition-all flex items-center justify-center cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    {checkinMutation.isPending ? "Đang check-in..." : "Check In"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Waitlist Sidebar */}
          <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-6 shadow-2xl text-left space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-700/50 pb-3 gap-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Quản lý đặt chỗ & Hàng chờ
              </h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm tên, SĐT, mã..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-900/50 border border-slate-700 focus:border-amber-400 text-xs text-white placeholder:text-slate-500 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Tab switchers */}
            <div className="flex border-b border-slate-700/40 pb-1">
              <button
                onClick={() => setActiveTab("active")}
                className={`flex-1 pb-2 text-xs font-bold text-center transition-all cursor-pointer ${
                  activeTab === "active"
                    ? "text-amber-400 border-b-2 border-amber-400 font-extrabold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Đang giữ bàn ({reservations.length})
              </button>
              <button
                onClick={() => setActiveTab("waitlist")}
                className={`flex-1 pb-2 text-xs font-bold text-center transition-all cursor-pointer ${
                  activeTab === "waitlist"
                    ? "text-amber-400 border-b-2 border-amber-400 font-extrabold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Danh sách chờ ({waitlist.length})
              </button>
            </div>

            {((activeTab === "active" && reservationsLoading) || (activeTab === "waitlist" && waitlistLoading)) ? (
              <p className="text-center text-sm text-slate-400 py-8 animate-pulse">Đang tải danh sách...</p>
            ) : paginatedItems.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-12 italic">
                {activeTab === "active" ? "Không có đặt chỗ đang giữ bàn" : "Không có khách hàng trong danh sách chờ"}
              </p>
            ) : activeTab === "active" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-700/40 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-2 text-left">Mã đặt bàn</th>
                      <th className="py-3 px-2 text-left">Bàn</th>
                      <th className="py-3 px-2 text-left">Khách hàng</th>
                      <th className="py-3 px-2 text-left">SĐT</th>
                      <th className="py-3 px-2 text-center">Số khách</th>
                      <th className="py-3 px-2 text-left">Ngày hẹn</th>
                      <th className="py-3 px-2 text-center">Trạng thái</th>
                      <th className="py-3 px-2 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((res: any) => {
                      const tableText = res.tableNumber ? `Bàn A${String(res.tableNumber).padStart(2, "0")}` : "Chưa xếp";
                      
                      // Status colors based on reservation status
                      const getStatusBadge = (status: string) => {
                        switch (status) {
                          case "BOOKED":
                            return (
                              <span className="px-2.5 py-0.5 rounded-full font-extrabold text-[10px] bg-green-500/15 text-green-400 border border-green-500/25 uppercase">
                                BOOKED
                              </span>
                            );
                          case "WAITLIST":
                            return (
                              <span className="px-2.5 py-0.5 rounded-full font-extrabold text-[10px] bg-yellow-500/15 text-yellow-400 border border-yellow-500/25 uppercase">
                                WAITLIST
                              </span>
                            );
                          case "SEATED":
                            return (
                              <span className="px-2.5 py-0.5 rounded-full font-extrabold text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/25 uppercase">
                                SEATED
                              </span>
                            );
                          case "CANCELLED_NO_SHOW":
                            return (
                              <span className="px-2.5 py-0.5 rounded-full font-extrabold text-[10px] bg-red-500/15 text-red-400 border border-red-500/25 uppercase">
                                NO SHOW
                              </span>
                            );
                          default:
                            return (
                              <span className="px-2.5 py-0.5 rounded-full font-extrabold text-[10px] bg-slate-500/15 text-slate-400 border border-slate-500/25 uppercase">
                                {status}
                              </span>
                            );
                        }
                      };

                      return (
                        <tr key={res.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                          <td className="py-3.5 px-2 font-mono font-black text-amber-400">
                            {res.reservationCode || "(Hàng chờ)"}
                          </td>
                          <td className="py-3.5 px-2 font-bold text-emerald-400">
                            {tableText}
                          </td>
                          <td className="py-3.5 px-2 font-semibold text-white truncate max-w-[120px]">{res.customerName}</td>
                          <td className="py-3.5 px-2 font-medium">{res.phone}</td>
                          <td className="py-3.5 px-2 text-center font-bold text-white">{res.guestCount} người</td>
                          <td className="py-3.5 px-2 text-slate-400">
                            {res.reservationTime ? new Date(res.reservationTime).toLocaleDateString("vi-VN") : "--"}
                          </td>
                          <td className="py-3.5 px-2 text-center">
                            {getStatusBadge(res.status)}
                          </td>
                          <td className="py-3.5 px-2 text-center">
                            <button
                              onClick={() => checkinMutation.mutate(res.reservationCode)}
                              disabled={checkinMutation.isPending || !res.reservationCode}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-lg font-bold text-[11px] cursor-pointer transition-colors shadow-sm"
                            >
                              Check In
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-700/40 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-2 text-center">Thứ tự</th>
                      <th className="py-3 px-2 text-left">Khách hàng</th>
                      <th className="py-3 px-2 text-left">SĐT</th>
                      <th className="py-3 px-2 text-center">Số khách</th>
                      <th className="py-3 px-2 text-left">Hẹn lúc</th>
                      <th className="py-3 px-2 text-center">Đã chờ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((item: any, idx: number) => (
                      <tr key={item.reservationId} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                        <td className="py-3.5 px-2 text-center font-bold text-slate-400">
                          #{ (currentPage - 1) * itemsPerPage + idx + 1 }
                        </td>
                        <td className="py-3.5 px-2 font-semibold text-white truncate max-w-[120px]">{item.customerName}</td>
                        <td className="py-3.5 px-2 font-medium">{item.phoneNumber}</td>
                        <td className="py-3.5 px-2 text-center font-bold text-white">{item.guestCount} người</td>
                        <td className="py-3.5 px-2 text-slate-400">
                          {item.reservationTime ? new Date(item.reservationTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "--"}
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/25">
                            {item.waitingMinutes} phút
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-700/50 pt-4 text-xs text-slate-400">
                <span>
                  Trang <strong>{currentPage}</strong> / {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="h-8 px-2.5 rounded-lg border border-slate-700 hover:border-slate-500 hover:text-white disabled:opacity-40 disabled:hover:border-slate-700 disabled:hover:text-slate-400 cursor-pointer transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Trước
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="h-8 px-2.5 rounded-lg border border-slate-700 hover:border-slate-500 hover:text-white disabled:opacity-40 disabled:hover:border-slate-700 disabled:hover:text-slate-400 cursor-pointer transition-colors flex items-center gap-1"
                  >
                    Sau <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
