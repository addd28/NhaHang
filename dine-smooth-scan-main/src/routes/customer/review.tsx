import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Star, MessageSquare, ArrowLeft } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { reviewApi } from "../../api/reviewApi";

export const Route = createFileRoute("/customer/review")({
  component: CustomerReview,
});

function CustomerReview() {
  const navigate = useNavigate();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const sessionId = typeof window !== "undefined" ? sessionStorage.getItem("sessionId") : null;

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error("Chưa check-in. Không thể gửi đánh giá.");
      return reviewApi.createReview({
        sessionId: Number(sessionId),
        rating,
        comment,
      });
    },
    onSuccess: (data) => {
      toast.success(data.message || "Cảm ơn bạn đã đóng góp ý kiến!");
      navigate({ to: "/customer/menu" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Lỗi gửi đánh giá.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reviewMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-6 items-center justify-center">
      <div className="max-w-md w-full bg-card rounded-3xl border border-border p-8 shadow-elegant space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Link to="/customer/tracking">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="font-display text-xl font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Đánh giá bữa ăn
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div className="space-y-2 text-center">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mức độ hài lòng</label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform cursor-pointer"
                >
                  <Star className={`h-8 w-8 ${star <= rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </div>
            <p className="text-sm font-bold mt-1 text-primary">
              {rating === 5 ? "Rất xuất sắc!" : rating === 4 ? "Rất hài lòng!" : rating === 3 ? "Tốt!" : rating === 2 ? "Tạm được" : "Chưa tốt"}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="comment" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ý kiến đóng góp</label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ trải nghiệm của bạn về món ăn và dịch vụ của nhà hàng…"
              className="resize-none rounded-2xl"
              rows={4}
            />
          </div>

          <Button
            type="submit"
            disabled={reviewMutation.isPending}
            className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-soft"
          >
            {reviewMutation.isPending ? "Đang gửi..." : "Gửi đánh giá"}
          </Button>
        </form>
      </div>
    </div>
  );
}
