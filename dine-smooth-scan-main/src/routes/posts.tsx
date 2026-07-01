import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { 
  BookOpen, Search, QrCode,
  ChevronRight
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { articleApi } from "../api/articleApi";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Article } from "../types";
import { cn } from "@/lib/utils";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/posts")({
  component: PublicPostsList,
});

function PublicPostsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Fetch only PUBLISHED articles
  const { data: articles = [], isLoading: articlesLoading } = useQuery({
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
    <SiteLayout>
      <div className="pt-28 pb-16 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <BookOpen className="h-4 w-4" /> Tin tức sự kiện
          </div>
          <h1 className="text-4xl font-display font-extrabold tracking-tight">
            KHUYẾN MÃI & SỰ KIỆN NỔI BẬT
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Xem các chương trình tri ân, tặng quà sinh nhật, nhạc hội bia hơi, và giảm giá lẩu nướng mới nhất được công bố trực tiếp từ ban quản lý nhà hàng.
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
            placeholder="Tìm kiếm bài viết khuyến mãi..."
            className="w-full h-11 pl-9 pr-4 rounded-full border border-border bg-card text-xs focus:outline-none focus:border-primary shadow-soft"
          />
        </div>

        {articlesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-80 rounded-3xl bg-card border border-border/40 animate-pulse" />
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border/40 rounded-3xl space-y-3 shadow-soft max-w-md mx-auto">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
            <p className="font-semibold text-base">Không tìm thấy bài viết nào</p>
            <p className="text-xs text-muted-foreground">Vui lòng thử tìm kiếm với từ khóa khác.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
              {paginatedArticles.map((art) => (
                <div
                  key={art.id}
                  onClick={() => setSelectedArticle(art)}
                  className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-border/40 bg-card shadow-soft hover:-translate-y-1 hover:shadow-elegant transition-all duration-300 cursor-pointer"
                >
                  <div>
                    {/* Cover image */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-accent/20">
                      {art.coverImage ? (
                        <img
                          src={art.coverImage}
                          alt={art.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            const parent = (e.target as HTMLImageElement).parentElement;
                            if (parent) {
                              parent.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-amber-500/20 to-red-500/20 flex items-center justify-center font-bold text-primary/40 text-xs">Chill Club</div>`;
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-red-500/20 flex items-center justify-center font-display font-extrabold text-primary/40 text-lg">
                          Chill Club
                        </div>
                      )}
                    </div>

                    {/* Metadata & Title */}
                    <div className="p-6 space-y-3">
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-semibold uppercase">
                        <span>
                          {art.createdAt ? new Date(art.createdAt).toLocaleDateString("vi-VN") : "Just now"}
                        </span>
                        <span>·</span>
                        <span>
                          Tác giả: {art.author || "Ban biên tập"}
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

                  <div className="px-6 pb-6 pt-2 border-t border-border/20 flex justify-between items-center text-xs font-bold text-primary">
                    <span>Đọc chi tiết</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center pt-8">
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm gap-1" aria-label="Pagination">
                  <Button
                    variant="outline"
                    className="rounded-l-md px-3 h-9 text-xs cursor-pointer"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Trước
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      className="px-3.5 h-9 text-xs cursor-pointer"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    className="rounded-r-md px-3 h-9 text-xs cursor-pointer"
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
      </div>

      {/* Promotion Detail Dialog */}
      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        <DialogContent className="max-w-2xl bg-card border border-border p-6 sm:p-8 rounded-3xl text-left max-h-[90vh] overflow-y-auto">
          {selectedArticle && (
            <>
              <DialogTitle className="font-display text-xl sm:text-2xl font-extrabold text-foreground">
                {selectedArticle.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-primary font-bold mt-1 uppercase">
                Ngày đăng: {selectedArticle.createdAt ? new Date(selectedArticle.createdAt).toLocaleDateString("vi-VN") : "Khuyến mãi"}
                {selectedArticle.author && ` · Người viết: ${selectedArticle.author}`}
              </DialogDescription>

              <div className="mt-5 space-y-5">
                {selectedArticle.coverImage && (
                  <div className="w-full h-64 rounded-2xl overflow-hidden bg-accent/10 border border-border/40">
                    <img 
                      src={selectedArticle.coverImage} 
                      alt={selectedArticle.title} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                )}

                {selectedArticle.summary && (
                  <blockquote className="p-4 bg-primary/5 border-l-4 border-primary rounded-r-xl text-xs italic text-muted-foreground">
                    {selectedArticle.summary}
                  </blockquote>
                )}

                <div className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap font-normal">
                  {selectedArticle.content}
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={() => setSelectedArticle(null)}
                    className="bg-primary hover:bg-primary-glow text-primary-foreground font-bold px-6 py-2 rounded-full cursor-pointer text-xs"
                  >
                    Đóng cửa sổ
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}
