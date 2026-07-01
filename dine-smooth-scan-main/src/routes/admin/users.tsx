import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Users, UserCheck, Plus, Edit2, Trash2, Key } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../hooks/useAuth";
import AdminLayout from "../../components/AdminLayout";
import { userApi } from "../../api/userApi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "KITCHEN" | "WAITER" | "CASHIER">("WAITER");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Route protection
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/admin/login" });
    } else if (user && user.role !== "ADMIN") {
      toast.error("Bạn không có quyền truy cập quản lý nhân viên!");
      navigate({ to: "/" });
    }
  }, [user, isAuthenticated]);

  const { data: usersList = [], isLoading } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: userApi.getUsers,
    enabled: isAuthenticated && user?.role === "ADMIN",
  });



  const totalPages = Math.ceil(usersList.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return usersList.slice(start, start + itemsPerPage);
  }, [usersList, currentPage]);

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return userApi.createUser(payload);
    },
    onSuccess: (data) => {
      toast.success(data.message || "Tạo tài khoản thành công!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Lỗi tạo tài khoản");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      return userApi.updateUser(id, payload);
    },
    onSuccess: (data) => {
      toast.success(data.message || "Cập nhật tài khoản thành công!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Lỗi cập nhật tài khoản");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return userApi.deleteUser(id);
    },
    onSuccess: (data) => {
      toast.success(data.message || "Xóa tài khoản thành công!");
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Lỗi xóa tài khoản");
    },
  });

  const handleEdit = (u: any) => {
    setEditId(u.id);
    setUsername(u.username);
    setPassword(""); // Keep password blank unless they want to change it
    setRole(u.role);
    setFormOpen(true);
  };

  const resetForm = () => {
    setEditId(null);
    setUsername("");
    setPassword("");
    setRole("WAITER");
    setFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || (!editId && !password.trim())) {
      toast.error("Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu!");
      return;
    }

    const payload: any = {
      username: username.trim(),
      role: role
    };

    if (password.trim()) {
      payload.password = password;
    }

    if (editId) {
      updateMutation.mutate({ id: editId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!isAuthenticated || (user && user.role !== "ADMIN")) {
    return null;
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "KITCHEN":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "WAITER":
        return "bg-cyan-500/10 text-cyan-500 border-cyan-500/20";
      case "CASHIER":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <AdminLayout title="Quản lý nhân viên & Phân quyền">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <p className="text-xs text-muted-foreground text-left">
            Danh sách các tài khoản nhân viên được cấp quyền truy cập hệ thống Staff Portal.
          </p>
          <Button
            onClick={() => setFormOpen(true)}
            className="rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-soft flex items-center gap-1.5 cursor-pointer text-xs h-9 px-4"
          >
            <Plus className="h-4 w-4" /> Thêm tài khoản
          </Button>
        </div>

        {formOpen && (
          <div className="bg-card border border-border rounded-3xl p-6 shadow-soft max-w-xl text-left space-y-4">
            <h3 className="font-bold text-base font-display">
              {editId ? "Cập nhật tài khoản" : "Tạo tài khoản mới"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Tên đăng nhập *</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ví dụ: waiter2, kitchen3..."
                    className="w-full h-10 px-4 rounded-xl border border-border bg-accent/20 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Mật khẩu {editId && "(để trống nếu không đổi)"} *
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 px-4 rounded-xl border border-border bg-accent/20 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Quyền hạn / Vai trò *</label>
                  <select
                    value={role}
                    onChange={(e) => {
                      const newRole = e.target.value as any;
                      setRole(newRole);
                    }}
                    className="w-full h-10 px-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="ADMIN">ADMIN (Quản trị viên)</option>
                    <option value="WAITER">WAITER (Phục vụ bàn)</option>
                    <option value="KITCHEN">KITCHEN (Bộ phận Bếp)</option>
                    <option value="CASHIER">CASHIER (Thu ngân)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={resetForm} className="h-9 rounded-full text-xs cursor-pointer">
                  Hủy
                </Button>
                <Button type="submit" className="h-9 rounded-full bg-primary text-primary-foreground font-bold text-xs px-4 cursor-pointer">
                  {editId ? "Cập nhật" : "Lưu tài khoản"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
            Đang tải danh sách tài khoản...
          </div>
        ) : usersList.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-3xl space-y-3 shadow-soft">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="font-semibold text-lg">Không có tài khoản nào</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-soft text-left">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-accent/25 text-xs font-semibold text-muted-foreground">
                    <th className="p-4 text-left">Mã nhân viên</th>
                    <th className="p-4 text-left">Tên tài khoản</th>
                    <th className="p-4 text-left">Trạng thái quyền</th>
                    <th className="p-4 text-left">Trạng thái hệ thống</th>
                    <th className="p-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((u: any) => (
                    <tr key={u.id} className="border-b border-border hover:bg-accent/10 transition-colors">
                      <td className="p-4 font-mono text-xs">USR-{u.id}</td>
                      <td className="p-4 font-bold">@{u.username}</td>
                      <td className="p-4">
                        <Badge variant="outline" className={`font-bold uppercase tracking-wider text-[10px] px-2.5 py-0.5 ${getRoleBadge(u.role)}`}>
                          {u.role}
                        </Badge>
                      </td>
                      <td className="p-4 items-center gap-1.5 text-xs text-success font-semibold">
                        <span className="flex items-center gap-1"><UserCheck className="h-4 w-4 text-success" /> Hoạt động</span>
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(u)}
                          className="h-8 w-8 rounded-lg hover:bg-accent cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (u.username === user?.username) {
                              toast.error("Không thể tự xóa chính tài khoản của bạn!");
                              return;
                            }
                            if (confirm(`Bạn có chắc muốn xóa tài khoản "${u.username}"?`)) {
                              deleteMutation.mutate(u.id);
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
                      <span className="font-semibold">{Math.min(currentPage * itemsPerPage, usersList.length)}</span> trong số{" "}
                      <span className="font-semibold">{usersList.length}</span> kết quả
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
