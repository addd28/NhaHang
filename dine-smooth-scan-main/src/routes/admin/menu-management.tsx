import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Plus, Edit2, Trash2, BookOpen, Upload, Loader2, X, Settings } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "../../hooks/useAuth";
import AdminLayout from "../../components/AdminLayout";
import { menuApi, extractApiError, extractApiDetails } from "../../api/menuApi";
import { categoryApi } from "../../api/categoryApi";
import { uploadApi } from "../../api/uploadApi";
import { cn } from "@/lib/utils";
import { OptionGroupType, SelectionType } from "../../types";

const formatPrice = (val?: number | null) => {
  if (val === null || val === undefined) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(val);
};

export const Route = createFileRoute("/admin/menu-management")({
  component: AdminMenuManagement,
});

function AdminMenuManagement() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState(10.0);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("pizza");
  const [categoryId, setCategoryId] = useState<number>(0);
  const [type, setType] = useState<"INSTANT" | "KITCHEN">("KITCHEN");
  const [formErrors, setFormErrors] = useState<{ field: string; message: string }[]>([]);

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const res = await uploadApi.upload(file, "foods");
      setImage(res.url);
      toast.success("Tải ảnh món ăn lên thành công!");
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải ảnh");
    } finally {
      setUploadingImage(false);
    }
  };

  // Route protection
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/admin/login" });
    } else if (user && user.role !== "ADMIN") {
      toast.error("Bạn không có quyền truy cập quản lý thực đơn!");
      navigate({ to: "/" });
    }
  }, [user, isAuthenticated]);

  const [selectedOptionsItem, setSelectedOptionsItem] = useState<any | null>(null);

  const { data: menuItems = [], isLoading: menuItemsLoading } = useQuery({
    queryKey: ["adminMenuItems"],
    queryFn: menuApi.getAdminMenuItems,
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const totalPages = Math.ceil(menuItems.length / itemsPerPage);
  const paginatedMenuItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return menuItems.slice(start, start + itemsPerPage);
  }, [menuItems, currentPage]);

  const { data: categories = [] } = useQuery({
    queryKey: ["adminCategories"],
    queryFn: categoryApi.getCategories,
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  // Set default category when categories load
  useEffect(() => {
    if (categories.length > 0 && categoryId === 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  const createMutation = useMutation({
    mutationFn: async (request: any) => {
      return menuApi.createMenuItem(request);
    },
    onSuccess: (data) => {
      toast.success(data.message || "Tạo món ăn thành công!");
      setFormErrors([]);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["adminMenuItems"] });
    },
    onError: (err: any) => {
      const details = extractApiDetails(err);
      if (details.length > 0) {
        setFormErrors(details);
        toast.error("Vui lòng kiểm tra lại thông tin bên dưới.");
      } else {
        toast.error(extractApiError(err));
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, request }: { id: number; request: any }) => {
      return menuApi.updateMenuItem(id, request);
    },
    onSuccess: (data) => {
      toast.success(data.message || "Cập nhật món ăn thành công!");
      setFormErrors([]);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["adminMenuItems"] });
    },
    onError: (err: any) => {
      const details = extractApiDetails(err);
      if (details.length > 0) {
        setFormErrors(details);
        toast.error("Vui lòng kiểm tra lại thông tin bên dưới.");
      } else {
        toast.error(extractApiError(err));
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return menuApi.deleteMenuItem(id);
    },
    onSuccess: (data) => {
      toast.success(data.message || "Xóa món ăn thành công!");
      queryClient.invalidateQueries({ queryKey: ["adminMenuItems"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Lỗi xóa món ăn");
    }
  });

  const handleEdit = (menuItem: any) => {
    setEditId(menuItem.id);
    setName(menuItem.name);
    setPrice(menuItem.price);
    setDescription(menuItem.description || "");
    setImage(menuItem.image || "special");
    setCategoryId(menuItem.categoryId || categories[0]?.id || 0);
    setType(menuItem.type || "KITCHEN");
    setFormOpen(true);
  };

  const resetForm = () => {
    setEditId(null);
    setName("");
    setPrice(10.0);
    setDescription("");
    setImage("pizza");
    setCategoryId(categories[0]?.id || 0);
    setType("KITCHEN");
    setFormErrors([]);
    setFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
    if (!name || price <= 0 || !categoryId) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc!");
      return;
    }

    const payload = {
      name,
      price,
      description,
      imageUrl: image || undefined,
      image: image || undefined,
      categoryId,
      type
    };

    if (editId) {
      updateMutation.mutate({ id: editId, request: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!isAuthenticated || (user && user.role !== "ADMIN")) {
    return null;
  }

  return (
    <AdminLayout title="Quản lý món ăn thực đơn">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <p className="text-xs text-muted-foreground text-left">Quản lý các món ăn trong thực đơn của nhà hàng, thiết lập giá cả và các phân loại phục vụ.</p>
          <Button
            onClick={() => setFormOpen(true)}
            className="rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-soft flex items-center gap-1.5 cursor-pointer text-xs h-9 px-4"
          >
            <Plus className="h-4 w-4" /> Thêm món ăn
          </Button>
        </div>

        {formOpen && (
          <div className="bg-card border border-border rounded-3xl p-6 shadow-soft max-w-xl text-left space-y-4">
            <h3 className="font-bold text-base font-display">{editId ? "Cập nhật món ăn" : "Tạo món ăn mới"}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Tên món ăn*</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Beef Steak, Margherita..."
                    className="w-full h-10 px-4 rounded-xl border border-border bg-accent/20 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Giá bán ($)*</label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value))}
                    placeholder="12.50"
                    className="w-full h-10 px-4 rounded-xl border border-border bg-accent/20 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Danh mục*</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(parseInt(e.target.value))}
                    className="w-full h-10 px-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-primary"
                  >
                    {categories.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Loại phục vụ*</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as "INSTANT" | "KITCHEN")}
                    className="w-full h-10 px-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="KITCHEN">Chế biến (KITCHEN)</option>
                    <option value="INSTANT">Liền (INSTANT)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <label className="text-xs font-semibold text-muted-foreground">Hình ảnh đại diện *</label>
                  <div className="flex items-center gap-4 border border-border border-dashed rounded-xl p-3 bg-accent/10">
                    {image && !image.startsWith("http") && !image.startsWith("/api/uploads") ? (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-mono text-muted-foreground bg-accent/60 px-2 py-1 rounded">Mẫu: {image}</span>
                        <label className="text-xs font-bold text-primary hover:underline cursor-pointer">
                          Thay đổi ảnh
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                        </label>
                      </div>
                    ) : image ? (
                      <div className="relative h-16 w-16 rounded-xl overflow-hidden border border-border group">
                        <img src={image} alt="Food preview" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImage("")}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl cursor-pointer"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ) : uploadingImage ? (
                      <div className="h-16 w-16 rounded-xl border border-border flex items-center justify-center bg-accent/20">
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-16 w-16 rounded-xl border border-border bg-accent/20 cursor-pointer hover:bg-accent/40 transition-colors">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground font-semibold mt-1">Upload</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                      </label>
                    )}
                    {image && (image.startsWith("http") || image.startsWith("/api/uploads")) && (
                      <div className="flex-1 text-left flex flex-col justify-center">
                        <p className="text-xs font-semibold truncate max-w-[150px]">{image.split("/").pop()}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">Đã tải lên</span>
                          <span className="text-[10px] text-muted-foreground">·</span>
                          <label className="text-[10px] font-bold text-primary hover:underline cursor-pointer">
                            Thay đổi
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Mô tả ngắn</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả nguyên liệu, hương vị..."
                    className="w-full h-10 px-4 rounded-xl border border-border bg-accent/20 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Validation Error Details */}
              {formErrors.length > 0 && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 space-y-1">
                  <p className="text-xs font-bold text-destructive">Lỗi xác thực dữ liệu:</p>
                  {formErrors.map((fe, idx) => (
                    <p key={idx} className="text-xs text-destructive">
                      <span className="font-semibold font-mono">[{fe.field}]</span> {fe.message}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={resetForm} className="h-9 rounded-full text-xs">Hủy</Button>
                <Button type="submit" className="h-9 rounded-full bg-primary text-primary-foreground font-bold text-xs px-4">
                  {editId ? "Cập nhật" : "Lưu món ăn"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {menuItemsLoading ? (
          <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
            Đang tải danh sách món ăn...
          </div>
        ) : menuItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-3xl space-y-3 shadow-soft">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
            <p className="font-semibold text-lg">Chưa có món ăn nào</p>
            <p className="text-sm text-muted-foreground">Nhấp vào "Thêm món ăn" phía trên để tạo món ăn đầu tiên.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-soft text-left">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-accent/25 text-xs font-semibold text-muted-foreground">
                    <th className="p-4 text-left">Hình ảnh</th>
                    <th className="p-4 text-left">Tên món</th>
                    <th className="p-4 text-left">Danh mục</th>
                    <th className="p-4 text-left">Loại phục vụ</th>
                    <th className="p-4 text-left">Giá cả</th>
                    <th className="p-4 text-left">Trạng thái</th>
                    <th className="p-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMenuItems.map((menuItem: any) => (
                    <tr key={menuItem.id} className="border-b border-border hover:bg-accent/10 transition-colors">
                      <td className="p-4">
                        {menuItem.image && (menuItem.image.startsWith("http") || menuItem.image.startsWith("/api/uploads")) ? (
                          <img src={menuItem.image} alt={menuItem.name} className="h-10 w-10 rounded-xl object-cover border border-border shadow-soft" />
                        ) : (
                          <Badge className="bg-slate-200 text-slate-800 text-[10px] uppercase font-bold py-0.5 border-0">
                            {menuItem.image || "special"}
                          </Badge>
                        )}
                      </td>
                      <td className="p-4 font-bold">{menuItem.name}</td>
                      <td className="p-4 text-xs">{menuItem.categoryName}</td>
                      <td className="p-4">
                        <Badge variant="secondary" className={cn("text-[10px] uppercase border-0 font-bold", menuItem.type === "INSTANT" ? "bg-cyan-500/10 text-cyan-500" : "bg-green-500/10 text-green-500")}>
                          {menuItem.type}
                        </Badge>
                      </td>
                      <td className="p-4 font-mono font-semibold">{formatPrice(menuItem.price)}</td>
                      <td className="p-4">
                        <span className={cn("text-xs font-bold", menuItem.available ? "text-success" : "text-destructive")}>
                          {menuItem.available ? "Còn hàng" : "Hết món"}
                        </span>
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedOptionsItem(menuItem)}
                          className="h-8 w-8 rounded-lg hover:bg-accent cursor-pointer text-primary"
                          title="Quản lý tùy chọn"
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(menuItem)}
                          className="h-8 w-8 rounded-lg hover:bg-accent cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(menuItem.id)}
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
                      <span className="font-semibold">{Math.min(currentPage * itemsPerPage, menuItems.length)}</span> trong số{" "}
                      <span className="font-semibold">{menuItems.length}</span> kết quả
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
      {selectedOptionsItem && (
        <OptionGroupsDialog
          menuItem={selectedOptionsItem}
          onClose={() => setSelectedOptionsItem(null)}
        />
      )}
    </AdminLayout>
  );
}

function OptionGroupsDialog({ menuItem, onClose }: { menuItem: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  
  const { data: itemDetail, isLoading, refetch } = useQuery({
    queryKey: ["adminMenuItemDetail", menuItem.id],
    queryFn: () => menuApi.getAdminMenuItemById(menuItem.id),
  });

  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [groupEditId, setGroupEditId] = useState<number | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupType, setGroupType] = useState<OptionGroupType>("CUSTOM");
  const [groupSelectionType, setGroupSelectionType] = useState<SelectionType>("SINGLE");
  const [groupRequired, setGroupRequired] = useState(false);
  const [groupMinSelect, setGroupMinSelect] = useState<number>(0);
  const [groupMaxSelect, setGroupMaxSelect] = useState<number>(1);
  const [groupDisplayOrder, setGroupDisplayOrder] = useState<number>(0);
  const [groupAvailable, setGroupAvailable] = useState(true);

  const [optFormOpen, setOptFormOpen] = useState<number | null>(null);
  const [optEditId, setOptEditId] = useState<number | null>(null);
  const [optCode, setOptCode] = useState("");
  const [optName, setOptName] = useState("");
  const [optPrice, setOptPrice] = useState(0);
  const [optDisplayOrder, setOptDisplayOrder] = useState(0);
  const [optAvailable, setOptAvailable] = useState(true);

  const createGroupMutation = useMutation({
    mutationFn: (req: any) => menuApi.createOptionGroup(menuItem.id, req),
    onSuccess: () => {
      toast.success("Tạo nhóm tùy chọn thành công!");
      resetGroupForm();
      refetch();
      queryClient.invalidateQueries({ queryKey: ["adminMenuItems"] });
    },
    onError: (err: any) => toast.error(err.message || "Lỗi tạo nhóm tùy chọn")
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, req }: { id: number; req: any }) => menuApi.updateOptionGroup(id, req),
    onSuccess: () => {
      toast.success("Cập nhật nhóm tùy chọn thành công!");
      resetGroupForm();
      refetch();
      queryClient.invalidateQueries({ queryKey: ["adminMenuItems"] });
    },
    onError: (err: any) => toast.error(err.message || "Lỗi cập nhật nhóm tùy chọn")
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: number) => menuApi.deleteOptionGroup(id),
    onSuccess: () => {
      toast.success("Xóa nhóm tùy chọn thành công (Soft Delete)!");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["adminMenuItems"] });
    },
    onError: (err: any) => toast.error(err.message || "Lỗi xóa nhóm tùy chọn")
  });

  const createOptMutation = useMutation({
    mutationFn: ({ groupId, req }: { groupId: number; req: any }) => menuApi.createItemOption(groupId, req),
    onSuccess: () => {
      toast.success("Tạo tùy chọn thành công!");
      resetOptForm();
      refetch();
    },
    onError: (err: any) => toast.error(err.message || "Lỗi tạo tùy chọn (Mã tùy chọn có thể bị trùng)")
  });

  const updateOptMutation = useMutation({
    mutationFn: ({ id, req }: { id: number; req: any }) => menuApi.updateItemOption(id, req),
    onSuccess: () => {
      toast.success("Cập nhật tùy chọn thành công!");
      resetOptForm();
      refetch();
    },
    onError: (err: any) => toast.error(err.message || "Lỗi cập nhật tùy chọn")
  });

  const deleteOptMutation = useMutation({
    mutationFn: (id: number) => menuApi.deleteItemOption(id),
    onSuccess: () => {
      toast.success("Xóa tùy chọn thành công (Soft Delete)!");
      refetch();
    },
    onError: (err: any) => toast.error(err.message || "Lỗi xóa tùy chọn")
  });

  const resetGroupForm = () => {
    setGroupEditId(null);
    setGroupName("");
    setGroupType("CUSTOM");
    setGroupSelectionType("SINGLE");
    setGroupRequired(false);
    setGroupMinSelect(0);
    setGroupMaxSelect(1);
    setGroupDisplayOrder(0);
    setGroupAvailable(true);
    setGroupFormOpen(false);
  };

  const handleEditGroup = (g: any) => {
    setGroupEditId(g.id);
    setGroupName(g.name);
    setGroupType(g.type);
    setGroupSelectionType(g.selectionType);
    setGroupRequired(g.required);
    setGroupMinSelect(g.minSelect || 0);
    setGroupMaxSelect(g.maxSelect || 1);
    setGroupDisplayOrder(g.displayOrder || 0);
    setGroupAvailable(g.available);
    setGroupFormOpen(true);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName) {
      toast.error("Vui lòng nhập tên nhóm tùy chọn!");
      return;
    }
    const req = {
      name: groupName,
      type: groupType,
      selectionType: groupSelectionType,
      required: groupRequired,
      minSelect: groupMinSelect,
      maxSelect: groupMaxSelect,
      displayOrder: groupDisplayOrder,
      available: groupAvailable
    };
    if (groupEditId) {
      updateGroupMutation.mutate({ id: groupEditId, req });
    } else {
      createGroupMutation.mutate(req);
    }
  };

  const resetOptForm = () => {
    setOptEditId(null);
    setOptCode("");
    setOptName("");
    setOptPrice(0);
    setOptDisplayOrder(0);
    setOptAvailable(true);
    setOptFormOpen(null);
  };

  const handleEditOpt = (groupId: number, o: any) => {
    setOptEditId(o.id);
    setOptCode(o.optionCode);
    setOptName(o.name);
    setOptPrice(o.price);
    setOptDisplayOrder(o.displayOrder || 0);
    setOptAvailable(o.available);
    setOptFormOpen(groupId);
  };

  const handleSaveOpt = (groupId: number, e: React.FormEvent) => {
    e.preventDefault();
    if (!optCode || !optName) {
      toast.error("Vui lòng điền mã và tên tùy chọn!");
      return;
    }
    const req = {
      optionCode: optCode,
      name: optName,
      price: optPrice,
      displayOrder: optDisplayOrder,
      available: optAvailable
    };
    if (optEditId) {
      updateOptMutation.mutate({ id: optEditId, req });
    } else {
      createOptMutation.mutate({ groupId, req });
    }
  };

  const toggleGroupAvailability = (g: any) => {
    updateGroupMutation.mutate({
      id: g.id,
      req: {
        name: g.name,
        type: g.type,
        selectionType: g.selectionType,
        required: g.required,
        minSelect: g.minSelect,
        maxSelect: g.maxSelect,
        displayOrder: g.displayOrder,
        available: !g.available
      }
    });
  };

  const toggleOptAvailability = (o: any) => {
    updateOptMutation.mutate({
      id: o.id,
      req: {
        optionCode: o.optionCode,
        name: o.name,
        price: o.price,
        displayOrder: o.displayOrder,
        available: !o.available
      }
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl text-left bg-card border border-border">
        <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
          ⚙️ Quản lý Tùy chọn - {menuItem.name}
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          Thêm, sửa, xóa các nhóm tùy chọn (Size, Topping...) và các tùy chọn tương ứng cho món ăn này.
        </DialogDescription>

        <div className="mt-4 space-y-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h4 className="font-bold text-sm">Danh sách nhóm tùy chọn</h4>
            <Button
              onClick={() => { resetGroupForm(); setGroupFormOpen(true); }}
              size="sm"
              className="rounded-full bg-primary text-primary-foreground font-bold text-xs h-8 px-3 cursor-pointer"
            >
              + Thêm nhóm tùy chọn
            </Button>
          </div>

          {groupFormOpen && (
            <form onSubmit={handleSaveGroup} className="p-4 rounded-2xl bg-accent/15 border border-border space-y-3">
              <p className="font-bold text-xs">{groupEditId ? "Sửa nhóm tùy chọn" : "Tạo nhóm tùy chọn mới"}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground">Tên nhóm*</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    placeholder="Ví dụ: Kích thước, Toppings..."
                    className="w-full h-8 px-3 rounded-lg border border-border bg-card text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground">Loại nhóm*</label>
                    <select
                      value={groupType}
                      onChange={e => setGroupType(e.target.value as any)}
                      className="w-full h-8 px-2 rounded-lg border border-border bg-card text-xs focus:outline-none focus:border-primary"
                    >
                      <option value="SIZE">SIZE (Kích thước)</option>
                      <option value="TOPPING">TOPPING (Thêm topping)</option>
                      <option value="ADDON">ADDON (Món kèm)</option>
                      <option value="COOKING_LEVEL">COOKING_LEVEL (Độ chín)</option>
                      <option value="CUSTOM">CUSTOM (Tùy chỉnh khác)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground">Kiểu chọn*</label>
                    <select
                      value={groupSelectionType}
                      onChange={e => setGroupSelectionType(e.target.value as any)}
                      className="w-full h-8 px-2 rounded-lg border border-border bg-card text-xs focus:outline-none focus:border-primary"
                    >
                      <option value="SINGLE">SINGLE (Chọn một)</option>
                      <option value="MULTIPLE">MULTIPLE (Chọn nhiều)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 items-center">
                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="groupRequired"
                    checked={groupRequired}
                    onChange={e => setGroupRequired(e.target.checked)}
                    className="h-3.5 w-3.5 text-primary focus:ring-primary rounded border-border"
                  />
                  <label htmlFor="groupRequired" className="text-[10px] font-bold text-muted-foreground cursor-pointer">Bắt buộc chọn</label>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground">Chọn tối thiểu</label>
                  <input
                    type="number"
                    value={groupMinSelect}
                    onChange={e => setGroupMinSelect(parseInt(e.target.value))}
                    disabled={groupSelectionType === "SINGLE"}
                    className="w-full h-8 px-2 rounded-lg border border-border bg-card text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground">Chọn tối đa</label>
                  <input
                    type="number"
                    value={groupMaxSelect}
                    onChange={e => setGroupMaxSelect(parseInt(e.target.value))}
                    disabled={groupSelectionType === "SINGLE"}
                    className="w-full h-8 px-2 rounded-lg border border-border bg-card text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    value={groupDisplayOrder}
                    onChange={e => setGroupDisplayOrder(parseInt(e.target.value))}
                    className="w-full h-8 px-2 rounded-lg border border-border bg-card text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                <Button type="button" variant="outline" size="sm" onClick={resetGroupForm} className="h-8 rounded-lg text-xs">Hủy</Button>
                <Button type="submit" size="sm" className="h-8 rounded-lg bg-primary text-primary-foreground font-bold text-xs px-3">Lưu nhóm</Button>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="text-center py-6 text-xs text-muted-foreground">Đang tải cấu trúc tùy chọn...</div>
          ) : !itemDetail?.optionGroups || itemDetail.optionGroups.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border rounded-2xl text-xs text-muted-foreground">
              Món ăn này chưa có nhóm tùy chọn nào. Bấm "Thêm nhóm tùy chọn" phía trên để tạo.
            </div>
          ) : (
            <div className="space-y-4">
              {itemDetail.optionGroups.map((g: any) => (
                <div key={g.id} className={cn("border rounded-2xl bg-card overflow-hidden shadow-soft text-left p-4 space-y-4", g.deleted ? "border-dashed border-neutral-300 opacity-70 bg-neutral-50/20" : "border-border")}>
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-bold text-sm", g.deleted ? "line-through text-muted-foreground" : "text-foreground")}>{g.name}</span>
                        <Badge variant="secondary" className="text-[8px] uppercase font-extrabold px-1.5 py-0 border-0 bg-primary/10 text-primary">
                          {g.type}
                        </Badge>
                        <Badge variant="outline" className={cn("text-[8px] uppercase font-extrabold px-1.5 py-0", g.selectionType === "SINGLE" ? "border-cyan-500/30 text-cyan-500 bg-cyan-500/5" : "border-amber-500/30 text-amber-500 bg-amber-500/5")}>
                          {g.selectionType}
                        </Badge>
                        {g.required && (
                          <Badge className="text-[8px] font-extrabold px-1.5 py-0 bg-red-500/10 text-red-500 border-0">
                            REQUIRED
                          </Badge>
                        )}
                        {g.deleted && (
                          <Badge className="text-[8px] font-extrabold px-1.5 py-0 bg-neutral-500/10 text-neutral-500 border-0">
                            ĐÃ XÓA
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Min/Max: {g.minSelect || 0}/{g.maxSelect || 0} · Display Order: {g.displayOrder || 0}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {g.deleted ? (
                        <>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-neutral-100 text-neutral-400 border-neutral-200">
                            Đã xóa
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => toggleGroupAvailability(g)} 
                            className="h-7 text-xs font-semibold text-primary cursor-pointer hover:bg-primary/5"
                          >
                            Khôi phục
                          </Button>
                        </>
                      ) : (
                        <>
                          <span
                            onClick={() => toggleGroupAvailability(g)}
                            className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-all border", g.available ? "bg-success/15 border-success/30 text-success" : "bg-destructive/15 border-destructive/30 text-destructive")}
                          >
                            {g.available ? "Hoạt động" : "Tạm ẩn"}
                          </span>
                          <Button variant="ghost" size="sm" onClick={() => handleEditGroup(g)} className="h-7 text-xs font-semibold cursor-pointer">Sửa</Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteGroupMutation.mutate(g.id)} className="h-7 text-xs text-destructive hover:bg-destructive/10 cursor-pointer">Xóa</Button>
                          <Button
                            onClick={() => { resetOptForm(); setOptFormOpen(g.id); }}
                            size="sm"
                            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] h-7 px-2.5 cursor-pointer ml-1"
                          >
                            + Thêm tùy chọn
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {optFormOpen === g.id && (
                    <form onSubmit={(e) => handleSaveOpt(g.id, e)} className="p-3 rounded-xl bg-emerald-600/5 border border-emerald-600/20 space-y-3">
                      <p className="font-bold text-xs text-emerald-600">{optEditId ? "Sửa tùy chọn" : "Tạo tùy chọn mới"}</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground">Mã tùy chọn (Unique Code)*</label>
                          <input
                            type="text"
                            value={optCode}
                            onChange={e => setOptCode(e.target.value)}
                            placeholder="Ví dụ: SIZE_S, TOPPING_CHEESE"
                            className="w-full h-8 px-3 rounded-lg border border-border bg-card text-xs focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground">Tên hiển thị*</label>
                          <input
                            type="text"
                            value={optName}
                            onChange={e => setOptName(e.target.value)}
                            placeholder="Ví dụ: Small, Thêm Phô Mai"
                            className="w-full h-8 px-3 rounded-lg border border-border bg-card text-xs focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground">Giá cộng thêm ($)*</label>
                            <input
                              type="number"
                              step="0.01"
                              value={optPrice}
                              onChange={e => setOptPrice(parseFloat(e.target.value))}
                              placeholder="2.00"
                              className="w-full h-8 px-2 rounded-lg border border-border bg-card text-xs focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground">Thứ tự</label>
                            <input
                              type="number"
                              value={optDisplayOrder}
                              onChange={e => setOptDisplayOrder(parseInt(e.target.value))}
                              className="w-full h-8 px-2 rounded-lg border border-border bg-card text-xs focus:outline-none focus:border-primary"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                        <Button type="button" variant="outline" size="sm" onClick={resetOptForm} className="h-8 rounded-lg text-xs">Hủy</Button>
                        <Button type="submit" size="sm" className="h-8 rounded-lg bg-emerald-600 text-white font-bold text-xs px-3">Lưu tùy chọn</Button>
                      </div>
                    </form>
                  )}

                  {!g.options || g.options.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic pl-2">Nhóm này chưa có tùy chọn chi tiết.</p>
                  ) : (
                    <div className="overflow-x-auto pl-2">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[10px] font-semibold text-muted-foreground border-b border-border/40">
                            <th className="pb-1 text-left">Mã tùy chọn</th>
                            <th className="pb-1 text-left">Tên tùy chọn</th>
                            <th className="pb-1 text-left">Giá bán</th>
                            <th className="pb-1 text-left">Thứ tự</th>
                            <th className="pb-1 text-left">Trạng thái</th>
                            <th className="pb-1 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.options.map((o: any) => (
                            <tr key={o.id} className={cn("border-b border-border/20 last:border-0 hover:bg-accent/5", o.deleted && "bg-neutral-100/5 hover:bg-neutral-100/10")}>
                              <td className={cn("py-2 font-mono text-[10px]", o.deleted && "line-through text-muted-foreground")}>{o.optionCode}</td>
                              <td className={cn("py-2 font-bold", o.deleted && "line-through text-muted-foreground")}>{o.name}</td>
                              <td className={cn("py-2 font-mono font-semibold", o.deleted && "line-through text-muted-foreground")}>{formatPrice(o.price)}</td>
                              <td className={cn("py-2", o.deleted && "text-muted-foreground")}>{o.displayOrder || 0}</td>
                              <td className="py-2">
                                {o.deleted ? (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-neutral-100 text-neutral-400 border-neutral-200">
                                    Đã xóa
                                  </span>
                                ) : (
                                  <span
                                    onClick={() => toggleOptAvailability(o)}
                                    className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full cursor-pointer border transition-all", o.available ? "bg-success/15 border-success/30 text-success" : "bg-destructive/15 border-destructive/30 text-destructive")}
                                  >
                                    {o.available ? "Bán" : "Ẩn"}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 text-right">
                                {o.deleted ? (
                                  <button onClick={() => toggleOptAvailability(o)} className="text-[10px] text-primary hover:underline font-semibold cursor-pointer mr-3">Khôi phục</button>
                                ) : (
                                  <>
                                    <button onClick={() => handleEditOpt(g.id, o)} className="text-[10px] text-primary hover:underline font-semibold cursor-pointer mr-3">Sửa</button>
                                    <button onClick={() => deleteOptMutation.mutate(o.id)} className="text-[10px] text-destructive hover:underline font-semibold cursor-pointer">Xóa</button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-border">
            <Button onClick={onClose} className="rounded-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs h-10 px-6 cursor-pointer">
              Đóng cửa sổ
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
