import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Compass, Plus, Edit2, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../hooks/useAuth";
import AdminLayout from "../../components/AdminLayout";
import { provinceApi } from "../../api/provinceApi";

export const Route = createFileRoute("/admin/provinces")({
  component: AdminProvinces,
});

function AdminProvinces() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");

  // Route protection
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/admin/login" });
    } else if (user && user.role !== "ADMIN") {
      toast.error("Bạn không có quyền truy cập quản lý tỉnh thành!");
      navigate({ to: "/" });
    }
  }, [user, isAuthenticated]);

  const { data: provinces = [], isLoading } = useQuery({
    queryKey: ["adminProvinces"],
    queryFn: provinceApi.getProvinces,
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [paginatedProvinces, setPaginatedProvinces] = useState<any[]>([]);

  useEffect(() => {
    const start = (currentPage - 1) * itemsPerPage;
    setPaginatedProvinces(provinces.slice(start, start + itemsPerPage));
  }, [provinces, currentPage]);

  const totalPages = Math.ceil(provinces.length / itemsPerPage);

  const createMutation = useMutation({
    mutationFn: async (request: { name: string }) => {
      return provinceApi.createProvince(request);
    },
    onSuccess: (data) => {
      toast.success(data.message || "Tạo tỉnh thành thành công!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["adminProvinces"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Lỗi tạo tỉnh thành");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, request }: { id: number; request: { name: string } }) => {
      return provinceApi.updateProvince(id, request);
    },
    onSuccess: (data) => {
      toast.success(data.message || "Cập nhật tỉnh thành thành công!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["adminProvinces"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Lỗi cập nhật tỉnh thành");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return provinceApi.deleteProvince(id);
    },
    onSuccess: (data) => {
      toast.success(data.message || "Xóa tỉnh thành thành công!");
      queryClient.invalidateQueries({ queryKey: ["adminProvinces"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Lỗi xóa tỉnh thành");
    },
  });

  const handleEdit = (prov: any) => {
    setEditId(prov.id);
    setName(prov.name);
    setFormOpen(true);
  };

  const resetForm = () => {
    setEditId(null);
    setName("");
    setFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Tên tỉnh thành là bắt buộc!");
      return;
    }

    if (editId) {
      updateMutation.mutate({ id: editId, request: { name } });
    } else {
      createMutation.mutate({ name });
    }
  };

  if (!isAuthenticated || (user && user.role !== "ADMIN")) {
    return null;
  }

  return (
    <AdminLayout title="Quản lý Tỉnh/Thành phố">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <p className="text-xs text-muted-foreground text-left">
            Quản lý khu vực và danh sách các tỉnh/thành phố có chi nhánh nhà hàng hoạt động.
          </p>
          <Button
            onClick={() => setFormOpen(true)}
            className="rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-soft flex items-center gap-1.5 cursor-pointer text-xs h-9 px-4"
          >
            <Plus className="h-4 w-4" /> Thêm khu vực
          </Button>
        </div>

        {formOpen && (
          <div className="bg-card border border-border rounded-3xl p-6 shadow-soft max-w-xl text-left space-y-4">
            <h3 className="font-bold text-base font-display">
              {editId ? "Cập nhật khu vực" : "Tạo khu vực mới"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Tên tỉnh/thành phố *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: TP. Hồ Chí Minh, Hà Nội, Đà Nẵng..."
                  className="w-full h-10 px-4 rounded-xl border border-border bg-accent/20 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={resetForm} className="h-9 rounded-full text-xs cursor-pointer">
                  Hủy
                </Button>
                <Button type="submit" className="h-9 rounded-full bg-primary text-primary-foreground font-bold text-xs px-4 cursor-pointer">
                  {editId ? "Cập nhật" : "Lưu khu vực"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
            Đang tải danh sách tỉnh thành...
          </div>
        ) : provinces.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-3xl space-y-3 shadow-soft">
            <Compass className="h-10 w-10 text-muted-foreground" />
            <p className="font-semibold text-lg">Chưa có tỉnh thành nào</p>
            <p className="text-sm text-muted-foreground">
              Nhấp vào "Thêm khu vực" phía trên để tạo tỉnh/thành phố đầu tiên.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-soft text-left">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-accent/25 text-xs font-semibold text-muted-foreground">
                    <th className="p-4 text-left">Mã số</th>
                    <th className="p-4 text-left">Tên khu vực</th>
                    <th className="p-4 text-left">Số lượng chi nhánh</th>
                    <th className="p-4 text-left">Ngày tạo</th>
                    <th className="p-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProvinces.map((prov: any) => (
                    <tr key={prov.id} className="border-b border-border hover:bg-accent/10 transition-colors">
                      <td className="p-4 font-mono text-xs">PR-{prov.id}</td>
                      <td className="p-4 font-bold">{prov.name}</td>
                      <td className="p-4 text-muted-foreground text-xs">{prov.branchCount || 0}</td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {prov.createdAt ? new Date(prov.createdAt).toLocaleDateString("vi-VN") : "—"}
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(prov)}
                          className="h-8 w-8 rounded-lg hover:bg-accent cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (prov.branchCount > 0) {
                              toast.error("Không thể xóa tỉnh/thành phố đang có chi nhánh hoạt động!");
                              return;
                            }
                            if (confirm(`Bạn có chắc muốn xóa tỉnh thành "${prov.name}"?`)) {
                              deleteMutation.mutate(prov.id);
                            }
                          }}
                          className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-card/50">
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
                      <span className="font-semibold">{Math.min(currentPage * itemsPerPage, provinces.length)}</span> trong số{" "}
                      <span className="font-semibold">{provinces.length}</span> kết quả
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
    </AdminLayout>
  );
}
