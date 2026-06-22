import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Plus, Edit2, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../hooks/useAuth";
import AdminLayout from "../../components/AdminLayout";
import { branchApi } from "../../api/branchApi";
import { provinceApi } from "../../api/provinceApi";

export const Route = createFileRoute("/admin/branches")({
  component: AdminBranches,
});

function AdminBranches() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [provinceId, setProvinceId] = useState<string>("");

  // Route protection
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/admin/login" });
    } else if (user && user.role !== "ADMIN") {
      toast.error("Bạn không có quyền truy cập quản lý chi nhánh!");
      navigate({ to: "/" });
    }
  }, [user, isAuthenticated]);

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ["adminBranches"],
    queryFn: branchApi.getBranches,
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [paginatedBranches, setPaginatedBranches] = useState<any[]>([]);

  useEffect(() => {
    const start = (currentPage - 1) * itemsPerPage;
    setPaginatedBranches(branches.slice(start, start + itemsPerPage));
  }, [branches, currentPage]);

  const totalPages = Math.ceil(branches.length / itemsPerPage);

  const { data: provinces = [] } = useQuery({
    queryKey: ["adminProvinces"],
    queryFn: provinceApi.getProvinces,
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  const createMutation = useMutation({
    mutationFn: async (request: { name: string; address?: string; phone?: string; provinceId?: number }) => {
      return branchApi.createBranch(request);
    },
    onSuccess: (data) => {
      toast.success(data.message || "Tạo chi nhánh thành công!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["adminBranches"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Lỗi tạo chi nhánh");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      request,
    }: {
      id: number;
      request: { name: string; address?: string; phone?: string; provinceId?: number };
    }) => {
      return branchApi.updateBranch(id, request);
    },
    onSuccess: (data) => {
      toast.success(data.message || "Cập nhật chi nhánh thành công!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["adminBranches"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Lỗi cập nhật chi nhánh");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return branchApi.deleteBranch(id);
    },
    onSuccess: (data) => {
      toast.success(data.message || "Xóa chi nhánh thành công!");
      queryClient.invalidateQueries({ queryKey: ["adminBranches"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Lỗi xóa chi nhánh");
    },
  });

  const handleEdit = (branch: any) => {
    setEditId(branch.id);
    setName(branch.name);
    setAddress(branch.address || "");
    setPhone(branch.phone || "");
    setProvinceId(branch.provinceId ? String(branch.provinceId) : "");
    setFormOpen(true);
  };

  const resetForm = () => {
    setEditId(null);
    setName("");
    setAddress("");
    setPhone("");
    setProvinceId("");
    setFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Tên chi nhánh là bắt buộc!");
      return;
    }
    if (!provinceId) {
      toast.error("Vui lòng chọn Tỉnh/Thành phố!");
      return;
    }

    const payload = {
      name,
      address: address || undefined,
      phone: phone || undefined,
      provinceId: Number(provinceId),
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

  if (!isAuthenticated || (user && user.role !== "ADMIN")) {
    return null;
  }

  return (
    <AdminLayout title="Quản lý chi nhánh">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <p className="text-xs text-muted-foreground text-left">
            Quản lý các chi nhánh nhà hàng (tên, địa chỉ, số điện thoại).
          </p>
          <Button
            onClick={() => setFormOpen(true)}
            className="rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-soft flex items-center gap-1.5 cursor-pointer text-xs h-9 px-4"
          >
            <Plus className="h-4 w-4" /> Thêm chi nhánh
          </Button>
        </div>

        {formOpen && (
          <div className="bg-card border border-border rounded-3xl p-6 shadow-soft max-w-xl text-left space-y-4">
            <h3 className="font-bold text-base font-display">
              {editId ? "Cập nhật chi nhánh" : "Tạo chi nhánh mới"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Tên chi nhánh *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Chi nhánh Quận 1, Chi nhánh Thủ Đức..."
                  className="w-full h-10 px-4 rounded-xl border border-border bg-accent/20 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ví dụ: 123 Nguyễn Huệ, Quận 1, TP.HCM"
                  className="w-full h-10 px-4 rounded-xl border border-border bg-accent/20 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ví dụ: 0901234567"
                  className="w-full h-10 px-4 rounded-xl border border-border bg-accent/20 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Tỉnh/Thành phố *
                </label>
                <select
                  value={provinceId}
                  onChange={(e) => setProvinceId(e.target.value)}
                  className="w-full h-10 px-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">-- Chọn Tỉnh/Thành phố --</option>
                  {provinces.map((prov: any) => (
                    <option key={prov.id} value={prov.id}>
                      {prov.name}
                    </option>
                  ))}
                </select>
                {provinces.length === 0 && (
                  <p className="text-[10px] text-destructive mt-1">
                    Chưa có tỉnh thành nào. Vui lòng tạo tỉnh thành trước.
                  </p>
                )}
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
                  className="h-9 rounded-full bg-primary text-primary-foreground font-bold text-xs px-4 cursor-pointer"
                >
                  {editId ? "Cập nhật" : "Lưu chi nhánh"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
            Đang tải danh sách chi nhánh...
          </div>
        ) : branches.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-3xl space-y-3 shadow-soft">
            <MapPin className="h-10 w-10 text-muted-foreground" />
            <p className="font-semibold text-lg">Chưa có chi nhánh nào</p>
            <p className="text-sm text-muted-foreground">
              Nhấp vào "Thêm chi nhánh" phía trên để tạo chi nhánh đầu tiên.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-soft text-left">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-accent/25 text-xs font-semibold text-muted-foreground">
                    <th className="p-4 text-left">Mã số</th>
                    <th className="p-4 text-left">Tên chi nhánh</th>
                    <th className="p-4 text-left">Tỉnh/Thành</th>
                    <th className="p-4 text-left">Địa chỉ</th>
                    <th className="p-4 text-left">Số điện thoại</th>
                    <th className="p-4 text-left">Ngày tạo</th>
                    <th className="p-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBranches.map((branch: any) => (
                    <tr
                      key={branch.id}
                      className="border-b border-border hover:bg-accent/10 transition-colors"
                    >
                      <td className="p-4 font-mono text-xs">BR-{branch.id}</td>
                      <td className="p-4 font-bold">{branch.name}</td>
                      <td className="p-4 text-xs font-semibold text-primary">
                        {branch.provinceName || "—"}
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {branch.address || "—"}
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {branch.phone || "—"}
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {branch.createdAt
                          ? new Date(branch.createdAt).toLocaleDateString("vi-VN")
                          : "—"}
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(branch)}
                          className="h-8 w-8 rounded-lg hover:bg-accent cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Bạn có chắc muốn xóa chi nhánh này?")) {
                              deleteMutation.mutate(branch.id);
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
                      <span className="font-semibold">{Math.min(currentPage * itemsPerPage, branches.length)}</span> trong số{" "}
                      <span className="font-semibold">{branches.length}</span> kết quả
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
