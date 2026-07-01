import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Calendar as CalendarIcon, 
  Users, 
  Phone, 
  Clock, 
  Search, 
  Check, 
  X, 
  User, 
  History, 
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Filter
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../hooks/useAuth";
import AdminLayout from "../../components/AdminLayout";
import { tableApi } from "../../api/tableApi";
import { ReservationResponse } from "../../types";

export const Route = createFileRoute("/admin/reservations")({
  component: AdminReservationsPage,
});

type TabType = "booked" | "seated" | "history";

function AdminReservationsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Tab and Filters State
  const [activeTab, setActiveTab] = useState<TabType>("booked");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDate, setFilterDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [filterGuestCount, setFilterGuestCount] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Selected reservation for Check-in Dialog
  const [selectedRes, setSelectedRes] = useState<ReservationResponse | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);

  // Route protection
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/admin/login" });
    } else if (user && user.role !== "ADMIN" && user.role !== "CASHIER" && user.role !== "WAITER") {
      toast.error("Bạn không có quyền truy cập quản lý đặt bàn!");
      navigate({ to: "/" });
    }
  }, [user, isAuthenticated]);

  // Queries
  const { data: bookings = [], isLoading: bookingsLoading, refetch: refetchBookings } = useQuery({
    queryKey: ["adminBookings"],
    queryFn: tableApi.getReservations,
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  const { data: historyList = [], isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ["adminHistory"],
    queryFn: tableApi.getHistory,
    enabled: isAuthenticated,
    refetchInterval: 10000,
  });

  const { data: tables = [], isLoading: tablesLoading, refetch: refetchTables } = useQuery({
    queryKey: ["adminTables"],
    queryFn: tableApi.getTables,
    enabled: isAuthenticated,
  });

  // Mutations
  const checkinMutation = useMutation({
    mutationFn: ({ id, tableId }: { id: number; tableId: number }) => 
      tableApi.checkInReservation(id, tableId),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || "Khách đã check-in thành công!");
        setSelectedRes(null);
        setSelectedTableId(null);
        queryClient.invalidateQueries({ queryKey: ["adminBookings"] });
        queryClient.invalidateQueries({ queryKey: ["adminHistory"] });
        queryClient.invalidateQueries({ queryKey: ["adminTables"] });
      } else {
        toast.error(data.message || "Lỗi check-in");
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Không thể thực hiện check-in");
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => tableApi.cancelReservation(id),
    onSuccess: () => {
      toast.success("Đã hủy đặt bàn thành công!");
      queryClient.invalidateQueries({ queryKey: ["adminBookings"] });
      queryClient.invalidateQueries({ queryKey: ["adminHistory"] });
      queryClient.invalidateQueries({ queryKey: ["adminTables"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Lỗi hủy đặt bàn");
    }
  });

  // Filter and Sort Calculations
  const filterByDateAndSearch = (list: ReservationResponse[], checkStatus?: string) => {
    return list
      .filter((r) => {
        // Status filter (only applied if checkStatus parameter is not set by Tab defaults)
        if (checkStatus) {
          if (r.status !== checkStatus) return false;
        } else if (filterStatus !== "ALL") {
          if (r.status !== filterStatus) return false;
        }

        // Date filter
        if (filterDate) {
          const rDate = r.reservationTime?.split("T")[0];
          if (rDate !== filterDate) return false;
        }

        // Guest count filter
        if (filterGuestCount !== "ALL") {
          if (filterGuestCount === "8+") {
            if ((r.guestCount || 0) < 8) return false;
          } else {
            if (r.guestCount !== Number(filterGuestCount)) return false;
          }
        }

        // Text search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            r.customerName?.toLowerCase().includes(q) ||
            r.phone?.includes(q) ||
            r.reservationCode?.toLowerCase().includes(q)
          );
        }

        return true;
      });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "N/A";
    const date = new Date(timeStr);
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + 
           " - " + date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "BOOKED":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-600 border border-amber-200/60">ĐÃ ĐẶT (BOOKED)</span>;
      case "SEATED":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-cyan-50 text-cyan-600 border border-cyan-200/60">ĐANG ĂN (SEATED)</span>;
      case "COMPLETED":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60">HOÀN THÀNH</span>;
      case "CANCELLED":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-600 border border-rose-200/60">ĐÃ HỦY</span>;
      case "NO_SHOW":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200">NO SHOW</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-500 border border-slate-200">{status}</span>;
    }
  };

  // Lists corresponding to current tab
  const activeBookings = filterByDateAndSearch(bookings); 
  const seatedReservations = filterByDateAndSearch(historyList, "SEATED");
  const historyReservations = filterByDateAndSearch(
    historyList.filter(r => r.status === "COMPLETED" || r.status === "CANCELLED" || r.status === "NO_SHOW")
  );
  const emptyTables = tables.filter(t => t.status === "EMPTY");

  return (
    <AdminLayout title="Quản lý Đặt bàn">
      <div className="p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-4 mb-6">
          <p className="text-xs text-muted-foreground text-left">
            Phân bàn động khi khách đến, lọc theo ngày và kiểm soát trạng thái ăn uống.
          </p>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Real-time search */}
            <div className="relative flex-1 md:w-64 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Mã đặt, Tên, SĐT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 bg-accent/20 border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>
            
            {/* Refresh Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                refetchBookings();
                refetchHistory();
                refetchTables();
                toast.success("Làm mới dữ liệu thành công!");
              }}
              className="border-border bg-accent/20 text-muted-foreground hover:bg-accent/40 hover:text-foreground h-10 w-10 rounded-xl"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-card p-4 border border-border rounded-3xl shadow-soft">
          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-primary" />
              Ngày đặt bàn
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full h-10 px-3 bg-accent/20 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {/* Guest Count Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              Số lượng khách
            </label>
            <select
              value={filterGuestCount}
              onChange={(e) => setFilterGuestCount(e.target.value)}
              className="w-full h-10 px-3 bg-accent/20 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">Tất cả số khách</option>
              <option value="2">2 người</option>
              <option value="4">4 người</option>
              <option value="6">6 người</option>
              <option value="8+">8 người trở lên</option>
            </select>
          </div>

          {/* Status Filter (Only enabled for history tab) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-primary" />
              Trạng thái
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              disabled={activeTab !== "history"}
              className="w-full h-10 px-3 bg-accent/20 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <option value="ALL">Tất cả lịch sử</option>
              <option value="COMPLETED">HOÀN THÀNH</option>
              <option value="CANCELLED">ĐÃ HỦY</option>
              <option value="NO_SHOW">NO SHOW</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setFilterDate(new Date().toISOString().split("T")[0]);
                setFilterGuestCount("ALL");
                setFilterStatus("ALL");
                setSearchQuery("");
              }}
              className="w-full h-10 border-border bg-accent/10 text-muted-foreground hover:bg-accent/30 font-semibold rounded-xl"
            >
              Đặt lại bộ lọc
            </Button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-border mb-6 gap-2">
          <button
            onClick={() => { setActiveTab("booked"); }}
            className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "booked"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <Clock className="w-4 h-4" />
            Đến giờ Check-in ({activeBookings.length})
          </button>
          
          <button
            onClick={() => { setActiveTab("seated"); }}
            className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "seated"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <Users className="w-4 h-4" />
            Đang sử dụng ({seatedReservations.length})
          </button>

          <button
            onClick={() => { setActiveTab("history"); }}
            className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "history"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <History className="w-4 h-4" />
            Lịch sử ({historyReservations.length})
          </button>
        </div>

        {/* Tab Contents Card */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-soft">
          
          {/* TAB 1: BOOKED (Đến giờ Check-in) */}
          {activeTab === "booked" && (
            <div>
              <div className="p-4 bg-amber-50/50 border-b border-border flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-amber-700 text-sm">Danh sách đặt chỗ sắp đến giờ</h3>
                  <p className="text-muted-foreground text-xs mt-0.5">Vui lòng nhấp Check-in khi khách tới và lựa chọn bàn ăn phù hợp.</p>
                </div>
                <div className="text-xs bg-amber-50 text-amber-600 px-3 py-1 rounded-full border border-amber-200 font-bold uppercase tracking-wider">
                  Trạng thái: BOOKED
                </div>
              </div>

              {bookingsLoading ? (
                <div className="p-12 text-center text-muted-foreground">Đang tải danh sách đặt bàn...</div>
              ) : activeBookings.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">Không tìm thấy lượt đặt bàn nào phù hợp trong hôm nay/ngày được chọn.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs uppercase bg-accent/30">
                        <th className="p-4 font-semibold">Mã Đặt Bàn</th>
                        <th className="p-4 font-semibold">Khách Hàng</th>
                        <th className="p-4 font-semibold">Số Khách</th>
                        <th className="p-4 font-semibold">Thời Gian Đặt</th>
                        <th className="p-4 font-semibold text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {activeBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-accent/20 transition-colors">
                          <td className="p-4">
                            <span className="font-mono font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded border border-amber-200">
                              {b.reservationCode}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-foreground flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-muted-foreground" />
                              {b.customerName}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                              {b.phone}
                            </div>
                          </td>
                          <td className="p-4 font-semibold">
                            <div className="flex items-center gap-1.5 text-foreground">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              {b.guestCount} khách
                            </div>
                          </td>
                          <td className="p-4 text-foreground">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-primary" />
                              {formatTime(b.reservationTime)}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedRes(b);
                                  setSelectedTableId(null);
                                }}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground hover:text-black transition-colors font-bold px-3 py-1.5 flex items-center gap-1 text-xs rounded-lg"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Check-in
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (confirm(`Bạn có chắc chắn muốn hủy đặt bàn của khách ${b.customerName}?`)) {
                                    cancelMutation.mutate(b.id);
                                  }
                                }}
                                disabled={cancelMutation.isPending}
                                className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs px-3 rounded-lg"
                              >
                                <X className="w-3.5 h-3.5" />
                                Hủy Đặt
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SEATED (Đang sử dụng) */}
          {activeTab === "seated" && (
            <div>
              <div className="p-4 bg-cyan-50/50 border-b border-border flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-cyan-700 text-sm">Danh sách đặt bàn đang tại vị</h3>
                  <p className="text-muted-foreground text-xs mt-0.5">Khách đang ăn uống tại nhà hàng. Bấm "Xem Session" để quản lý món và thanh toán.</p>
                </div>
                <div className="text-xs bg-cyan-50 text-cyan-600 px-3 py-1 rounded-full border border-cyan-200 font-bold uppercase tracking-wider">
                  Trạng thái: SEATED
                </div>
              </div>

              {historyLoading ? (
                <div className="p-12 text-center text-muted-foreground">Đang tải danh sách đặt bàn...</div>
              ) : seatedReservations.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">Hiện tại không có lượt đặt bàn nào đang sử dụng.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs uppercase bg-accent/30">
                        <th className="p-4 font-semibold">Mã Đặt Bàn</th>
                        <th className="p-4 font-semibold">Khách Hàng</th>
                        <th className="p-4 font-semibold">Số Khách</th>
                        <th className="p-4 font-semibold">Bàn</th>
                        <th className="p-4 font-semibold">Giờ Vào</th>
                        <th className="p-4 font-semibold text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {seatedReservations.map((r) => (
                        <tr key={r.id} className="hover:bg-accent/20 transition-colors">
                          <td className="p-4">
                            <span className="font-mono text-xs text-muted-foreground">
                              {r.reservationCode || "N/A"}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-foreground">
                            <div>{r.customerName}</div>
                            <div className="text-xs text-muted-foreground font-normal mt-0.5">{r.phone}</div>
                          </td>
                          <td className="p-4 text-foreground font-medium">
                            {r.guestCount} khách
                          </td>
                          <td className="p-4">
                            <span className="font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded text-xs border border-amber-200">
                              {r.tableNumber ? `Bàn A${String(r.tableNumber).padStart(2, "0")}` : "N/A"}
                            </span>
                          </td>
                          <td className="p-4 text-muted-foreground text-xs">
                            {r.checkedInAt ? formatTime(r.checkedInAt) : "N/A"}
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              size="sm"
                              onClick={() => navigate({ to: "/admin/tables" })}
                              className="bg-accent hover:bg-accent/70 text-foreground border border-border text-xs font-semibold px-3.5 py-1.5 flex items-center gap-1.5 ml-auto rounded-lg"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Xem Session
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HISTORY (Lịch sử) */}
          {activeTab === "history" && (
            <div>
              <div className="p-4 bg-accent/30 border-b border-border flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Lịch sử đặt bàn</h3>
                  <p className="text-muted-foreground text-xs mt-0.5">Lịch sử các lượt đặt bàn đã kết thúc.</p>
                </div>
                <div className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200 font-bold uppercase tracking-wider">
                  Trạng thái: KẾT THÚC
                </div>
              </div>

              {historyLoading ? (
                <div className="p-12 text-center text-muted-foreground">Đang tải lịch sử đặt bàn...</div>
              ) : historyReservations.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">Lịch sử đặt bàn trống hoặc không tìm thấy kết quả phù hợp.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs uppercase bg-accent/30">
                        <th className="p-4 font-semibold">Mã Đặt Bàn</th>
                        <th className="p-4 font-semibold">Khách Hàng</th>
                        <th className="p-4 font-semibold">Số Khách</th>
                        <th className="p-4 font-semibold">Thời Gian Đặt</th>
                        <th className="p-4 font-semibold">Bàn Đã Ăn</th>
                        <th className="p-4 font-semibold">Giờ Check-in</th>
                        <th className="p-4 font-semibold">Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {historyReservations.map((h) => (
                        <tr key={h.id} className="hover:bg-accent/20 transition-colors">
                          <td className="p-4 font-mono text-xs text-muted-foreground">
                            {h.reservationCode || "N/A"}
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-foreground">{h.customerName}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{h.phone}</div>
                          </td>
                          <td className="p-4 text-foreground font-medium">
                            {h.guestCount} khách
                          </td>
                          <td className="p-4 text-foreground">
                            {formatTime(h.reservationTime)}
                          </td>
                          <td className="p-4">
                            {h.tableNumber ? (
                              <span className="bg-accent text-foreground px-2 py-0.5 rounded text-xs border border-border">
                                Bàn A{String(h.tableNumber).padStart(2, "0")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-4 text-muted-foreground text-xs">
                            {h.checkedInAt ? formatTime(h.checkedInAt) : <span className="text-muted-foreground/60">Không check-in</span>}
                          </td>
                          <td className="p-4">
                            {getStatusBadge(h.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DYNAMIC CHECK-IN TABLE SELECTOR DIALOG */}
      {selectedRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="text-xl font-display font-bold text-foreground">Check-in Nhận Bàn</h3>
                <p className="text-muted-foreground text-xs mt-1">Lựa chọn bàn ăn còn trống phù hợp cho đoàn khách.</p>
              </div>
              <button 
                onClick={() => { setSelectedRes(null); setSelectedTableId(null); }}
                className="text-muted-foreground hover:text-foreground p-1 bg-accent rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Brief Card */}
            <div className="p-6 bg-accent/20 border-b border-border space-y-2">
              <div className="grid grid-cols-2 gap-y-2.5 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider block">Khách hàng</span>
                  <span className="font-bold text-foreground">{selectedRes.customerName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider block">Số điện thoại</span>
                  <span className="font-semibold text-foreground">{selectedRes.phone}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider block">Số lượng khách</span>
                  <span className="font-bold text-primary flex items-center gap-1 mt-0.5">
                    <Users className="w-4 h-4 text-primary" />
                    {selectedRes.guestCount} người
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider block">Giờ đặt bàn</span>
                  <span className="font-semibold text-foreground">{formatTime(selectedRes.reservationTime)}</span>
                </div>
              </div>
            </div>

            {/* Table Selection Body */}
            <div className="p-6 max-h-[350px] overflow-y-auto space-y-4">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Bàn Trống Khả Dụng ({emptyTables.length})
              </label>

              {tablesLoading ? (
                <div className="text-center py-6 text-muted-foreground text-sm">Đang tải sơ đồ bàn...</div>
              ) : emptyTables.length === 0 ? (
                <div className="text-center py-8 text-rose-600 bg-rose-50 rounded-xl border border-rose-200 text-sm font-medium">
                  Cảnh báo: Không còn bàn trống khả dụng!
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {emptyTables.map((t) => {
                    const isSelected = selectedTableId === t.id;
                    const fitsGuests = t.capacity >= (selectedRes.guestCount || 0);

                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTableId(t.id)}
                        className={`p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer relative overflow-hidden group ${
                          isSelected
                            ? "bg-primary/10 border-primary text-foreground shadow-lg shadow-primary/10"
                            : "bg-accent/30 border-border text-foreground hover:border-primary/40 hover:bg-accent/60"
                        }`}
                      >
                        {/* Suitability Warning dot */}
                        {!fitsGuests && (
                          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Sức chứa nhỏ hơn số khách" />
                        )}

                        <span className={`text-base font-black tracking-wide ${isSelected ? "text-primary" : "text-foreground"}`}>
                          A{String(t.tableNumber).padStart(2, "0")}
                        </span>
                        
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-light leading-none">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          Sức chứa: {t.capacity}
                        </div>

                        {!fitsGuests && (
                          <span className="text-[9px] text-rose-500 font-medium">Ít sức chứa</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirm Actions */}
            <div className="p-4 bg-accent/20 border-t border-border flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => { setSelectedRes(null); setSelectedTableId(null); }}
                className="border-border bg-card text-muted-foreground hover:bg-accent font-semibold rounded-xl"
              >
                Hủy bỏ
              </Button>
              <Button
                disabled={!selectedTableId || checkinMutation.isPending}
                onClick={() => {
                  if (selectedTableId && selectedRes) {
                    checkinMutation.mutate({ id: selectedRes.id, tableId: selectedTableId });
                  }
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground hover:text-black transition-colors font-bold px-5 rounded-xl"
              >
                Xác nhận Check-in
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
