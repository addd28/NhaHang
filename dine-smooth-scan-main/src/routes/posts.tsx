import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { BookOpen, Calendar, User, ArrowLeft, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { articleApi } from "../api/articleApi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/posts")({
  component: PublicPostsList,
});

function PublicPostsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Fetch only PUBLISHED articles
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["publicArticles"],
    queryFn: () => articleApi.getArticles("PUBLISHED"),
  });

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const q = searchQuery.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.summary && a.summary.toLowerCase().includes(q)) ||
        a.content.toLowerCase().includes(q)
    );
  }, [articles, searchQuery]);

  const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);
  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredArticles.slice(start, start + itemsPerPage);
  }, [filteredArticles, currentPage]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-12 relative">
      {/* Glow effects */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-primary-glow/5 blur-3xl pointer-events-none" />

      {/* Header bar */}
      <header className="sticky top-0 z-40 glass border-b border-border/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="rounded-full gap-1.5 cursor-pointer text-xs h-9">
              <ArrowLeft className="h-4 w-4" /> Quay lại Portal
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="font-display font-bold text-sm tracking-tight">Plateaux News</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:px-6 space-y-8 relative">
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <h2 className="font-display text-3xl font-extrabold tracking-tight bg-gradient-primary bg-clip-text text-transparent">
            Tin Tức & Sự Kiện
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Cập nhật những tin tức ẩm thực mới nhất, sự kiện hấp dẫn và ưu đãi đặc sắc từ hệ thống nhà hàng Plateaux.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm kiếm bài viết..."
            className="w-full h-10 pl-9 pr-4 rounded-full border border-border bg-card text-xs focus:outline-none focus:border-primary shadow-soft"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-80 rounded-3xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-3xl space-y-3 shadow-soft max-w-md mx-auto">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
            <p className="font-semibold text-lg">Không tìm thấy bài viết nào</p>
            <p className="text-xs text-muted-foreground">Vui lòng thử tìm kiếm với từ khóa khác.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
              {paginatedArticles.map((art) => (
                <Link
                  key={art.id}
                  to="/posts/$postId"
                  params={{ postId: String(art.id) }}
                  className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card shadow-soft hover:-translate-y-1 hover:shadow-elegant transition-smooth"
                >
                  <div>
                    {/* Cover image */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-accent/20">
                      {art.coverImage ? (
                        <img
                          src={art.coverImage}
                          alt={art.title}
                          className="h-full w-full object-cover transition-smooth group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            const parent = (e.target as HTMLImageElement).parentElement;
                            if (parent) {
                              parent.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-amber-500/20 to-red-500/20 flex items-center justify-center font-bold text-primary/40 text-xs">Plateaux News</div>`;
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-red-500/20 flex items-center justify-center font-display font-extrabold text-primary/40 text-lg">
                          Plateaux
                        </div>
                      )}
                    </div>

                    {/* Metadata & Title */}
                    <div className="p-5 space-y-2">
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {art.createdAt ? new Date(art.createdAt).toLocaleDateString("vi-VN") : "Just now"}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {art.author || "Admin"}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {art.title}
                      </h3>
                      {art.summary && (
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {art.summary}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-2 border-t border-border/40 flex justify-end">
                    <span className="text-xs text-primary font-bold group-hover:underline">
                      Đọc tiếp &rarr;
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center pt-4">
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm gap-1" aria-label="Pagination">
                  <Button
                    variant="outline"
                    className="rounded-l-md px-2.5 py-1 h-8 text-xs cursor-pointer"
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
                    className="rounded-r-md px-2.5 py-1 h-8 text-xs cursor-pointer"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Sau
                  </Button>
                </nav>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
