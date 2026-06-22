import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { FileText, Plus, Edit2, Trash2, BookOpen, Upload, Loader2, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../hooks/useAuth";
import AdminLayout from "../../components/AdminLayout";
import { articleApi } from "../../api/articleApi";
import { uploadApi } from "../../api/uploadApi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/posts")({
  component: AdminPosts,
});

function AdminPosts() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const res = await uploadApi.upload(file, "posts");
      setCoverImage(res.url);
      toast.success("Tải ảnh bìa lên thành công!");
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải ảnh bìa");
    } finally {
      setUploadingImage(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Route protection
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/admin/login" });
    } else if (user && user.role !== "ADMIN") {
      toast.error("Bạn không có quyền truy cập quản lý bài viết!");
      navigate({ to: "/" });
    }
  }, [user, isAuthenticated]);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["adminArticles"],
    queryFn: () => articleApi.getArticles(),
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  const totalPages = Math.ceil(articles.length / itemsPerPage);
  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return articles.slice(start, start + itemsPerPage);
  }, [articles, currentPage]);

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return articleApi.createArticle(payload);
    },
    onSuccess: (data) => {
      toast.success(data.message || "Tạo bài viết thành công!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["adminArticles"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Lỗi tạo bài viết");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      return articleApi.updateArticle(id, payload);
    },
    onSuccess: (data) => {
      toast.success(data.message || "Cập nhật bài viết thành công!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["adminArticles"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Lỗi cập nhật bài viết");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return articleApi.deleteArticle(id);
    },
    onSuccess: (data) => {
      toast.success(data.message || "Xóa bài viết thành công!");
      queryClient.invalidateQueries({ queryKey: ["adminArticles"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Lỗi xóa bài viết");
    },
  });

  const handleEdit = (art: any) => {
    setEditId(art.id);
    setTitle(art.title);
    setSummary(art.summary || "");
    setContent(art.content);
    setCoverImage(art.coverImage || "");
    setAuthor(art.author || "");
    setStatus(art.status);
    setFormOpen(true);
  };

  const resetForm = () => {
    setEditId(null);
    setTitle("");
    setSummary("");
    setContent("");
    setCoverImage("");
    setAuthor("");
    setStatus("DRAFT");
    setFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Vui lòng nhập đầy đủ Tiêu đề và Nội dung bài viết!");
      return;
    }

    const payload = {
      title: title.trim(),
      summary: summary.trim() || undefined,
      content: content.trim(),
      coverImage: coverImage.trim() || undefined,
      author: author.trim() || "Ban biên tập",
      status
    };

    if (editId) {
      updateMutation.mutate({ id: editId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!isAuthenticated || (user && user.role !== "ADMIN")) {
    return null;
  }

  return (
    <AdminLayout title="Quản lý bài viết (Blog & News)">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <p className="text-xs text-muted-foreground text-left">
            Quản lý các bài viết tin tức, sự kiện và chương trình khuyến mãi hiển thị trên website.
          </p>
          <Button
            onClick={() => setFormOpen(true)}
            className="rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-soft flex items-center gap-1.5 cursor-pointer text-xs h-9 px-4"
          >
            <Plus className="h-4 w-4" /> Viết bài mới
          </Button>
        </div>

        {formOpen && (
          <div className="bg-card border border-border rounded-3xl p-6 shadow-soft max-w-2xl text-left space-y-4">
            <h3 className="font-bold text-base font-display">
              {editId ? "Chỉnh sửa bài viết" : "Viết bài viết mới"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Tiêu đề bài viết *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nhập tiêu đề..."
                    className="w-full h-10 px-4 rounded-xl border border-border bg-accent/20 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Tác giả</label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Ví dụ: Admin, Chef..."
                    className="w-full h-10 px-4 rounded-xl border border-border bg-accent/20 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

               <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <label className="text-xs font-semibold text-muted-foreground">Ảnh bìa bài viết *</label>
                  <div className="flex items-center gap-4 border border-border border-dashed rounded-xl p-3 bg-accent/10">
                    {coverImage ? (
                      <div className="relative h-16 w-16 rounded-xl overflow-hidden border border-border group">
                        <img src={coverImage} alt="Cover preview" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setCoverImage("")}
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
                    {coverImage && (
                      <div className="flex-1 text-left flex flex-col justify-center">
                        <p className="text-xs font-semibold truncate max-w-[150px]">{coverImage.split("/").pop()}</p>
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
                  <label className="text-xs font-semibold text-muted-foreground">Trạng thái xuất bản *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full h-10 px-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="DRAFT">Nháp (DRAFT)</option>
                    <option value="PUBLISHED">Xuất bản (PUBLISHED)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Tóm tắt ngắn</label>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Mô tả ngắn gọn nội dung bài viết..."
                  className="w-full h-10 px-4 rounded-xl border border-border bg-accent/20 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Nội dung chi tiết *</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Viết nội dung bài viết tại đây..."
                  rows={6}
                  className="w-full p-4 rounded-xl border border-border bg-accent/20 text-sm focus:outline-none focus:border-primary resize-y"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={resetForm} className="h-9 rounded-full text-xs cursor-pointer">
                  Hủy
                </Button>
                <Button type="submit" className="h-9 rounded-full bg-primary text-primary-foreground font-bold text-xs px-4 cursor-pointer">
                  {editId ? "Cập nhật" : "Lưu bài viết"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
            Đang tải danh sách bài viết...
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-3xl space-y-3 shadow-soft">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="font-semibold text-lg">Chưa có bài viết nào</p>
            <p className="text-sm text-muted-foreground">
              Nhấp vào "Viết bài mới" để tạo bài viết đầu tiên cho trang tin tức.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-soft text-left">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-accent/25 text-xs font-semibold text-muted-foreground">
                    <th className="p-4 text-left">Ảnh bìa</th>
                    <th className="p-4 text-left">Tiêu đề</th>
                    <th className="p-4 text-left">Tác giả</th>
                    <th className="p-4 text-left">Trạng thái</th>
                    <th className="p-4 text-left">Ngày tạo</th>
                    <th className="p-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedArticles.map((art: any) => (
                    <tr key={art.id} className="border-b border-border hover:bg-accent/10 transition-colors">
                      <td className="p-4">
                        {art.coverImage ? (
                          <img src={art.coverImage} alt={art.title} className="h-10 w-16 rounded object-cover border border-border" />
                        ) : (
                          <div className="h-10 w-16 rounded bg-gradient-to-br from-amber-500/10 to-red-500/10 flex items-center justify-center text-[9px] text-primary/40 font-bold border border-border">
                            No Cover
                          </div>
                        )}
                      </td>
                      <td className="p-4 max-w-xs truncate">
                        <div className="font-bold truncate">{art.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{art.summary || "Không có tóm tắt"}</div>
                      </td>
                      <td className="p-4 text-xs font-medium">{art.author || "—"}</td>
                      <td className="p-4">
                        <Badge
                          className={cn(
                            "text-[10px] uppercase font-bold border-0",
                            art.status === "PUBLISHED" ? "bg-green-500/10 text-green-500" : "bg-warning/10 text-warning"
                          )}
                          variant="secondary"
                        >
                          {art.status === "PUBLISHED" ? "Đã đăng" : "Nháp"}
                        </Badge>
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {art.createdAt ? new Date(art.createdAt).toLocaleDateString("vi-VN") : "—"}
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2 items-center h-full pt-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(art)}
                          className="h-8 w-8 rounded-lg hover:bg-accent cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Bạn có chắc muốn xóa bài viết "${art.title}"?`)) {
                              deleteMutation.mutate(art.id);
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
                      <span className="font-semibold">{Math.min(currentPage * itemsPerPage, articles.length)}</span> trong số{" "}
                      <span className="font-semibold">{articles.length}</span> kết quả
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
