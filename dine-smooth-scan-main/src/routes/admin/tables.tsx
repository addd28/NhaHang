import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Power, RotateCcw, Plus, Edit2, Trash2, QrCode } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "../../hooks/useAuth";
import AdminLayout from "../../components/AdminLayout";
import { tableApi } from "../../api/tableApi";
import axiosInstance from "../../api/axiosInstance";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/tables")({
  component: AdminTables,
});

function AdminTables() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Form state for create/edit table
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [tableNumber, setTableNumber] = useState<number | "">("");
  const [capacity, setCapacity] = useState<number | "">("");
  const [qrModalTable, setQrModalTable] = useState<any | null>(null);

  // Route protection
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/admin/login" });
    } else if (user && user.role !== "ADMIN" && user.role !== "WAITER") {
      toast.error("Bạn không có quyền truy cập trang Quản lý bàn!");
      navigate({ to: "/" });
    }
  }, [user, isAuthenticated]);

  const { data: rawTables, isLoading } = useQuery({
    queryKey: ["adminTables"],
    queryFn: () => tableApi.getTables(),
    refetchInterval: 5000,
    enabled: isAuthenticated && (user?.role === "ADMIN" || user?.role === "WAITER"),
  });

  const tables = useMemo(() => rawTables || [], [rawTables]);

  const createMutation = useMutation({
    mutationFn: async (request: { tableNumber: number; capacity: number }) => {
      return tableApi.createTable(request);
    },
    onSuccess: () => {
      toast.success("Tạo bàn thành công!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["adminTables"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Lỗi tạo bàn");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      request,
    }: {
      id: number;
      request: { tableNumber: number; capacity: number };
    }) => {
      return tableApi.updateTable(id, request);
    },
    onSuccess: () => {
      toast.success("Cập nhật bàn thành công!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["adminTables"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Lỗi cập nhật bàn");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return tableApi.deleteTable(id);
    },
    onSuccess: () => {
      toast.success("Xóa bàn thành công!");
      queryClient.invalidateQueries({ queryKey: ["adminTables"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Lỗi xóa bàn");
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async (tableId: number) => {
      return tableApi.checkIn(tableId);
    },
    onSuccess: () => {
      toast.success("Mở phiên bàn thành công!");
      queryClient.invalidateQueries({ queryKey: ["adminTables"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to open session");
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (tableId: number) => {
      return tableApi.resetTable(tableId);
    },
    onSuccess: () => {
      toast.success("Giải phóng và làm sạch bàn thành công!");
      queryClient.invalidateQueries({ queryKey: ["adminTables"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reset table");
    },
  });

  const openSessionMutation = useMutation({
    mutationFn: async (tableId: number) => {
      const res = await axiosInstance.post(`/sessions/open/${tableId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Mở phiên table session thành công!");
      queryClient.invalidateQueries({ queryKey: ["adminTables"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to open session");
    },
  });

  // Sort tables by number ascending
  const sortedTables = useMemo(() => {
    return [...tables].sort((a, b) => a.tableNumber - b.tableNumber);
  }, [tables]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [paginatedTables, setPaginatedTables] = useState<any[]>([]);

  useEffect(() => {
    const start = (currentPage - 1) * itemsPerPage;
    setPaginatedTables(sortedTables.slice(start, start + itemsPerPage));
  }, [sortedTables, currentPage]);

  const totalPages = Math.ceil(sortedTables.length / itemsPerPage);

  const handleEdit = (table: any) => {
    setEditId(table.id);
    setTableNumber(table.tableNumber);
    setCapacity(table.capacity);
    setFormOpen(true);
  };

  const resetForm = () => {
    setEditId(null);
    setTableNumber("");
    setCapacity("");
    setFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber || !capacity) {
      toast.error("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    const payload = {
      tableNumber: Number(tableNumber),
      capacity: Number(capacity),
    };

    if (editId) {
      updateMutation.mutate({
        id: editId,
        request: payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!isAuthenticated || (user && user.role !== "ADMIN" && user.role !== "WAITER")) {
    return null;
  }

  // Color rules:
  // EMPTY = Green
  // RESERVED = Blue
  // OCCUPIED = Yellow
  // DIRTY = Red
  const getStatusColor = (status: string) => {
    switch (status) {
      case "EMPTY":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "RESERVED":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "OCCUPIED":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "DIRTY":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <AdminLayout title="Quản lý bàn & Phiên hoạt động">
      <div className="p-6 space-y-6">
        {/* Header with Add button */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <p className="text-xs text-muted-foreground text-left">
            Quản lý bàn ăn, thêm/sửa/xóa bàn và quản lý phiên hoạt động.
          </p>
          {user?.role === "ADMIN" && (
            <Button
              onClick={() => setFormOpen(true)}
              className="rounded-full bg-gradient-primary text-primary-foreground hover:text-black transition-colors font-bold shadow-soft flex items-center gap-1.5 cursor-pointer text-xs h-9 px-4"
            >
              <Plus className="h-4 w-4" /> Thêm bàn
            </Button>
          )}
        </div>



        {/* Form create/edit */}
        {formOpen && (
          <div className="bg-card border border-border rounded-3xl p-6 shadow-soft max-w-xl text-left space-y-4">
            <h3 className="font-bold text-base font-display">
              {editId ? "Cập nhật bàn" : "Tạo bàn mới"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Số bàn
                </label>
                <input
                  type="number"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value ? Number(e.target.value) : "")}
                  placeholder="Ví dụ: 1, 2, 3..."
                  min={1}
                  className="w-full h-10 px-4 rounded-xl border border-border bg-accent/20 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Sức chứa (số khách)
                </label>
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value ? Number(e.target.value) : "")}
                  placeholder="Ví dụ: 4, 6, 8..."
                  min={1}
                  className="w-full h-10 px-4 rounded-xl border border-border bg-accent/20 text-sm focus:outline-none focus:border-primary"
                />
              </div>



              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="h-9 rounded-full text-xs cursor-pointer"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  className="h-9 rounded-full bg-primary text-primary-foreground hover:text-black transition-colors font-bold text-xs px-4 cursor-pointer"
                >
                  {editId ? "Cập nhật" : "Lưu bàn"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
            Đang tải danh sách bàn ăn...
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedTables.map((table) => (
                <div
                  key={table.id}
                  className="bg-card border border-border rounded-3xl p-5 shadow-soft flex flex-col justify-between space-y-4 text-left"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground font-bold text-sm shadow-soft">
                        {table.status === "RESERVED" ? `A${String(table.tableNumber).padStart(2, "0")}` : table.tableNumber}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 ${getStatusColor(table.status)}`}
                        >
                          {table.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setQrModalTable(table)}
                          className="h-7 w-7 rounded-lg hover:bg-primary/10 text-primary cursor-pointer"
                          title="Xem mã QR"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                        </Button>
                        {/* Edit & Delete buttons */}
                        {user?.role === "ADMIN" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(table)}
                              className="h-7 w-7 rounded-lg hover:bg-accent cursor-pointer"
                            >
                              <Edit2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Bạn có chắc muốn xóa bàn này?")) {
                                  deleteMutation.mutate(table.id);
                                }
                              }}
                              disabled={table.status !== "EMPTY"}
                              className="h-7 w-7 rounded-lg hover:bg-destructive/10 text-destructive cursor-pointer disabled:opacity-30"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-base">
                        Bàn {table.status === "RESERVED" ? `A${String(table.tableNumber).padStart(2, "0")}` : table.tableNumber}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Sức chứa: {table.capacity} khách
                      </p>

                      <p className="text-[10px] font-mono text-muted-foreground/80 mt-1">
                        Token QR: {table.qrToken.substring(0, 8)}...
                      </p>

                      {table.status === "RESERVED" && (
                        <div className="mt-3 space-y-2">
                          {/* Reservation Code & Formatted Table Number Info */}
                          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                            <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1">
                              🔑 Mã Đặt Bàn (Code)
                            </p>
                            <p className="text-lg font-black text-amber-700 tracking-wider font-mono">
                              {table.reservationCode || "N/A"}
                            </p>
                            <p className="text-[9px] text-amber-600/70 mt-0.5">
                              Bàn chỉ định: A{String(table.tableNumber).padStart(2, "0")}
                            </p>
                          </div>

                          {/* Customer info */}
                          <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-xs space-y-1">
                            <p className="font-semibold text-blue-500 uppercase tracking-wider text-[10px]">
                              Thông tin chi tiết
                            </p>
                            {table.customerName && (
                              <p className="font-bold text-foreground">
                                Khách: {table.customerName}
                              </p>
                            )}
                            {table.phone && <p className="text-muted-foreground">SĐT: {table.phone}</p>}
                            {table.guestCount && (
                              <p className="text-muted-foreground">
                                Số khách: {table.guestCount} người
                              </p>
                            )}
                            {table.reservationTime && (
                              <p className="text-muted-foreground text-[10px] italic">
                                Hẹn lúc:{" "}
                                {new Date(table.reservationTime).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
                    {table.status === "EMPTY" ? (
                      /* Waiter mở bàn walk-in → POST /sessions/open/{id} */
                      <Button
                        onClick={() => openSessionMutation.mutate(table.id)}
                        disabled={openSessionMutation.isPending}
                        className="w-full h-9 rounded-xl bg-primary text-primary-foreground hover:text-black transition-colors text-xs font-bold gap-1.5 cursor-pointer"
                      >
                        <Power className="h-3.5 w-3.5" /> Mở bàn
                      </Button>
                    ) : table.status === "RESERVED" ? (
                      /* Nhận bàn đặt trước → POST /tables/{id}/checkin */
                      <div className="flex gap-2">
                        <Button
                          onClick={() => checkinMutation.mutate(table.id)}
                          disabled={checkinMutation.isPending}
                          className="flex-1 h-9 rounded-xl bg-gradient-primary text-primary-foreground hover:text-black transition-colors text-xs font-bold cursor-pointer"
                        >
                          ✓ Nhận bàn
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => resetMutation.mutate(table.id)}
                          disabled={resetMutation.isPending}
                          className="flex-1 h-9 rounded-xl border-dashed border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-bold cursor-pointer"
                        >
                          Hủy giữ chỗ
                        </Button>
                      </div>
                    ) : table.status === "OCCUPIED" ? (
                      /* Bàn đang có khách — chỉ cho đóng phiên */
                      <Button
                        variant="outline"
                        onClick={() => resetMutation.mutate(table.id)}
                        disabled={resetMutation.isPending}
                        className="w-full h-9 rounded-xl border-dashed text-destructive hover:bg-destructive/10 text-xs font-bold gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Đóng bàn
                      </Button>
                    ) : (
                      /* DISABLED hoặc trạng thái khác — không thao tác */
                      <div className="h-9 rounded-xl bg-muted/40 flex items-center justify-center text-xs text-muted-foreground font-medium">
                        Không khả dụng
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-card border border-border rounded-3xl shadow-soft">
                <div className="flex flex-1 justify-between sm:hidden">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Sau
                  </Button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Hiển thị <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> đến{" "}
                      <span className="font-semibold">{Math.min(currentPage * itemsPerPage, sortedTables.length)}</span> trong số{" "}
                      <span className="font-semibold">{sortedTables.length}</span> kết quả
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm gap-1" aria-label="Pagination">
                      <Button
                        variant="outline"
                        className="rounded-l-md px-2 py-1 h-8 text-xs cursor-pointer"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        Trước
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          className="px-3 py-1 h-8 text-xs cursor-pointer"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        className="rounded-r-md px-2 py-1 h-8 text-xs cursor-pointer"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Sau
                      </Button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {qrModalTable && (
        <Dialog open={!!qrModalTable} onOpenChange={(open) => !open && setQrModalTable(null)}>
          <DialogContent className="max-w-sm rounded-3xl p-6 bg-card border border-border shadow-elegant text-center space-y-4">
            <DialogTitle className="font-bold text-lg font-display">Mã QR Bàn {qrModalTable.tableNumber}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Quét mã này để gọi món tại bàn {qrModalTable.tableNumber}
            </DialogDescription>
            <div className="flex justify-center p-4 bg-white rounded-2xl border border-border/40 mx-auto">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/customer/menu?tableKey=${qrModalTable.tableKey || ""}`)}`}
                alt={`QR code for table ${qrModalTable.tableNumber}`}
                className="h-44 w-44 object-contain"
              />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-mono bg-accent/45 p-2.5 rounded-xl break-all select-all text-muted-foreground border border-border/20 text-left">
                {`${window.location.origin}/customer/menu?tableKey=${qrModalTable.tableKey || ""}`}
              </p>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/customer/menu?tableKey=${qrModalTable.tableKey || ""}`);
                  toast.success("Đã sao chép liên kết QR!");
                }}
                className="w-full h-9 rounded-full bg-primary text-primary-foreground hover:text-black transition-colors font-bold text-xs"
              >
                Sao chép liên kết
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
