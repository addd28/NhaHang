import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FolderOpen, Plus, Edit2, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "../../hooks/useAuth";
import AdminLayout from "../../components/AdminLayout";
import { categoryApi } from "../../api/categoryApi";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategories,
});

function AdminCategories() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Route protection
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/admin/login" });
    } else if (user && user.role !== "ADMIN") {
      toast.error("Bạn không có quyền truy cập quản lý danh mục!");
      navigate({ to: "/" });
    }
  }, [user, isAuthenticated]);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["adminCategories"],
    queryFn: categoryApi.getCategories,
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [paginatedCategories, setPaginatedCategories] = useState<any[]>([]);

  useEffect(() => {
    const start = (currentPage - 1) * itemsPerPage;
    setPaginatedCategories(categories.slice(start, start + itemsPerPage));
  }, [categories, currentPage]);

  const totalPages = Math.ceil(categories.length / itemsPerPage);

  const createMutation = useMutation({
    mutationFn: async (request: { name: string; description?: string }) => {
      return categoryApi.createCategory(request);
    },
    onSuccess: (data) => {
      toast.success(data.message || "Tạo danh mục thành công!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["adminCategories"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Lỗi tạo danh mục");
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, request }: { id: number; request: { name: string; description?: string } }) => {
      return categoryApi.updateCategory(id, request);
    },
    onSuccess: (data) => {
      toast.success(data.message || "Cập nhật danh mục thành công!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["adminCategories"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Lỗi cập nhật danh mục");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return categoryApi.deleteCategory(id);
    },
    onSuccess: (data) => {
      toast.success(data.message || "Xóa danh mục thành công!");
      queryClient.invalidateQueries({ queryKey: ["adminCategories"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Lỗi xóa danh mục");
    }
  });

  const handleEdit = (cat: any) => {
    setEditId(cat.id);
    setName(cat.name);
    setDescription(cat.description || "");
    setFormOpen(true);
  };

  const resetForm = () => {
    setEditId(null);
    setName("");
    setDescription("");
    setFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error("Tên danh mục là bắt buộc!");
      return;
    }

    if (editId) {
      updateMutation.mutate({ id: editId, request: { name, description } });
    } else {
      createMutation.mutate({ name, description });
    }
  };

  if (!isAuthenticated || (user && user.role !== "ADMIN")) {
    return null;
  }

  return (
    <AdminLayout title="Quản lý danh mục thực đơn">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <p className="text-xs text-muted-foreground text-left">Quản lý các danh mục phân loại món ăn (như Pizza, Burger, Tráng miệng, Đồ uống...).</p>
          <Button
            onClick={() => setFormOpen(true)}
            className="rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-soft flex items-center gap-1.5 cursor-pointer text-xs h-9 px-4"
          >
            <Plus className="h-4 w-4" /> Thêm danh mục
          </Button>
        </div>

        {formOpen && (
          <div className="bg-card border border-border rounded-3xl p-6 shadow-soft max-w-xl text-left space-y-4">
            <h3 className="font-bold text-base font-display">{editId ? "Cập nhật danh mục" : "Tạo danh mục mới"}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Tên danh mục</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Pizza, Tráng miệng, Trà sữa..."
                  className="w-full h-10 px-4 rounded-xl border border-border bg-accent/20 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Mô tả ngắn</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ví dụ: Các loại bánh nướng lò gạch..."
                  className="w-full h-10 px-4 rounded-xl border border-border bg-accent/20 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={resetForm} className="h-9 rounded-full text-xs">Hủy</Button>
                <Button type="submit" className="h-9 rounded-full bg-primary text-primary-foreground font-bold text-xs px-4">
                  {editId ? "Cập nhật" : "Lưu danh mục"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
            Đang tải danh sách danh mục...
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-3xl space-y-3 shadow-soft">
            <FolderOpen className="h-10 w-10 text-muted-foreground" />
            <p className="font-semibold text-lg">Chưa có danh mục nào</p>
            <p className="text-sm text-muted-foreground">Nhấp vào "Thêm danh mục" phía trên để tạo danh mục phân loại đầu tiên.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-soft text-left">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-accent/25 text-xs font-semibold text-muted-foreground">
                    <th className="p-4 text-left">Mã số</th>
                    <th className="p-4 text-left">Tên danh mục</th>
                    <th className="p-4 text-left">Mô tả phân loại</th>
                    <th className="p-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCategories.map((cat: any) => (
                    <tr key={cat.id} className="border-b border-border hover:bg-accent/10 transition-colors">
                      <td className="p-4 font-mono text-xs">CAT-{cat.id}</td>
                      <td className="p-4 font-bold">{cat.name}</td>
                      <td className="p-4 text-muted-foreground text-xs">{cat.description || "—"}</td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(cat)}
                          className="h-8 w-8 rounded-lg hover:bg-accent cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(cat.id)}
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
                      <span className="font-semibold">{Math.min(currentPage * itemsPerPage, categories.length)}</span> trong số{" "}
                      <span className="font-semibold">{categories.length}</span> kết quả
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
