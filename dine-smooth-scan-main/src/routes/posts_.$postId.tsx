import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar, User, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { articleApi } from "../api/articleApi";

export const Route = createFileRoute("/posts_/$postId")({
  component: PublicPostDetail,
});

function PublicPostDetail() {
  const { postId } = Route.useParams();

  const { data: article, isLoading, error } = useQuery({
    queryKey: ["publicArticle", postId],
    queryFn: () => articleApi.getArticleById(Number(postId)),
    enabled: !!postId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-4">
          <BookOpen className="h-10 w-10 text-primary animate-pulse mx-auto" />
          <p className="text-xs text-muted-foreground">Đang tải nội dung bài viết...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center space-y-4">
        <p className="text-destructive font-bold text-lg">⚠️ Lỗi tải bài viết hoặc bài viết không tồn tại!</p>
        <Link to="/posts">
          <Button className="rounded-full bg-primary text-primary-foreground font-bold text-xs h-9 cursor-pointer">
            Quay lại danh sách tin tức
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-16 relative">
      {/* Glow effects */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-primary-glow/5 blur-3xl pointer-events-none" />

      {/* Header bar */}
      <header className="sticky top-0 z-40 glass border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 md:px-6">
          <Link to="/posts">
            <Button variant="ghost" size="sm" className="rounded-full gap-1.5 cursor-pointer text-xs h-9">
              <ArrowLeft className="h-4 w-4" /> Tất cả bài viết
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-sm tracking-tight">Chi tiết bài viết</span>
          </div>
        </div>
      </header>

      {/* Article Container */}
      <article className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 md:px-6 space-y-6 text-left relative">
        {/* Cover image banner */}
        {article.coverImage && (
          <div className="w-full aspect-[2/1] rounded-3xl overflow-hidden bg-accent/20 border border-border shadow-soft">
            <img
              src={article.coverImage}
              alt={article.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}

        {/* Article Metadata & Header */}
        <div className="space-y-4">
          <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
            {article.title}
          </h1>
          <div className="flex items-center gap-4 text-xs text-muted-foreground border-b border-border/60 pb-4">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {article.createdAt ? new Date(article.createdAt).toLocaleDateString("vi-VN") : "Just now"}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              Tác giả: <strong className="text-foreground">{article.author || "Ban biên tập"}</strong>
            </span>
          </div>
        </div>

        {/* Article Summary */}
        {article.summary && (
          <div className="p-4 rounded-2xl bg-accent/30 border-l-4 border-primary text-xs leading-relaxed text-muted-foreground font-medium italic">
            "{article.summary}"
          </div>
        )}

        {/* Article Content */}
        <div className="text-sm md:text-base leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap space-y-4">
          {article.content}
        </div>
      </article>
    </div>
  );
}
