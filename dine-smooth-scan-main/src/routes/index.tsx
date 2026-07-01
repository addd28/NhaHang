import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  UtensilsCrossed,
  ArrowRight,
  Star,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  Mail,
  Clock,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SiteLayout } from "@/components/SiteLayout";
import { BookingDialog } from "@/components/BookingDialog";
import { menuApi } from "@/api/menuApi";
import { articleApi } from "@/api/articleApi";
import { reviewApi } from "@/api/reviewApi";
import { MenuItem, Article, Review } from "../types";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/")({
  component: EntrancePortal,
});

function EntrancePortal() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);

  // 1. Fetch menu items
  const { data: menuItems = [], isLoading: menuLoading } = useQuery({
    queryKey: ["featuredMenuItems"],
    queryFn: () => menuApi.getMenuItems(),
  });

  // 2. Fetch promotions
  const { data: articles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ["publishedArticles"],
    queryFn: () => articleApi.getArticles("PUBLISHED"),
  });

  // 3. Fetch reviews
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["latestReviews"],
    queryFn: () => reviewApi.getReviews(),
  });

  // Filter 6 featured items
  const featuredItems = useMemo(() => {
    return menuItems.filter((item) => item.available).slice(0, 6);
  }, [menuItems]);

  // Review navigation
  const handlePrevReview = () => {
    setReviewIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
  };

  const handleNextReview = () => {
    setReviewIndex((prev) => (prev === reviews.length - 1 ? 0 : prev + 1));
  };

  // Auto-rotate reviews every 6 seconds
  useEffect(() => {
    if (reviews.length <= 1) return;
    const interval = setInterval(handleNextReview, 6000);
    return () => clearInterval(interval);
  }, [reviews.length]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  const getMenuItemImage = (item: MenuItem) => {
    const img = item.imageUrl || item.image;
    if (!img || img === "css-gradient-placeholder") {
      return "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600";
    }
    return img;
  };

  return (
    <SiteLayout>
      {/* 1. HERO SECTION */}
      <section className="relative h-screen min-h-[650px] flex items-center overflow-hidden bg-[#121212]">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1600"
            alt="Chill Club space"
            className="w-full h-full object-cover opacity-45 animate-zoom-in"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full text-left space-y-6">
          <span className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4.5 py-1.5 rounded-full text-xs font-bold text-secondary uppercase tracking-[0.2em] animate-fade-up">
            <Sparkles className="h-3.5 w-3.5" />
            CHILL CLUB RESTAURANT
          </span>
          
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-foreground max-w-4xl leading-[1.1] animate-fade-up">
            Không chỉ là <span className="italic text-secondary">một bữa ăn</span>. <br />
            Đó là <span className="italic text-secondary">trải nghiệm</span>.
          </h1>

          <p className="mt-6 text-sm sm:text-base text-foreground/80 max-w-2xl font-sans font-light leading-relaxed animate-fade-up">
            Định nghĩa lại nghệ thuật ẩm thực tinh tế kết hợp công nghệ gọi món QR thông minh. 
            Không gian sang trọng, dịch vụ tận tâm và những món ăn thượng hạng đang chờ đón bạn.
          </p>

          <div className="pt-6 flex flex-wrap gap-4 animate-fade-up">
            <Button
              onClick={() => setBookingOpen(true)}
              className="gold-shimmer px-8 py-6 rounded-full bg-primary hover:bg-primary-glow text-primary-foreground font-bold shadow-elegant hover:scale-102 transition-all text-xs uppercase tracking-widest cursor-pointer"
            >
              Đặt bàn giữ chỗ
            </Button>
            <Link to="/menu">
              <Button
                variant="outline"
                className="px-8 py-6 rounded-full border-border bg-card/25 text-foreground hover:bg-accent/10 hover:scale-102 transition-all font-bold text-xs uppercase tracking-widest cursor-pointer"
              >
                Khám phá thực đơn
              </Button>
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 text-muted-foreground/60 text-[10px] uppercase tracking-[0.4em] flex flex-col items-center gap-3">
          <span className="font-sans font-medium">Cuộn màn hình</span>
          <span className="block w-px h-10 bg-primary animate-pulse" />
        </div>
      </section>

      {/* 2. FEATURED MENU */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="reveal flex flex-col md:flex-row justify-between items-baseline gap-6 mb-16 border-b border-border pb-8">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary block mb-3 font-sans">
              Ẩm thực chọn lọc
            </span>
            <h2 className="font-display text-4xl md:text-5xl text-foreground">
              Món ngon <span className="italic text-primary">Nổi bật</span>
            </h2>
          </div>
          <Link
            to="/menu"
            className="text-xs font-bold uppercase tracking-[0.2em] text-primary hover:text-primary-glow border-b border-primary pb-1 font-sans transition-colors"
          >
            Xem thực đơn đầy đủ →
          </Link>
        </div>

        {menuLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse space-y-4">
                <div className="bg-muted aspect-[4/3] rounded-2xl" />
                <div className="h-4 bg-muted w-2/3 rounded" />
                <div className="h-4 bg-muted w-1/3 rounded" />
              </div>
            ))}
          </div>
        ) : featuredItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground italic font-sans text-sm">
            Hiện chưa có món ăn nổi bật nào được xuất bản. Vui lòng quay lại sau!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredItems.map((item, i) => (
              <article
                key={item.id}
                className="reveal bg-card rounded-2xl overflow-hidden border border-border/80 hover:border-primary/30 transition-all hover:shadow-elegant group flex flex-col h-full text-left"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <img
                    src={getMenuItemImage(item)}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  {item.tag && (
                    <span className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded">
                      {item.tag}
                    </span>
                  )}
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4 font-sans">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-widest block">
                      {item.category}
                    </span>
                    <h3 className="font-display text-xl text-foreground group-hover:text-primary transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs text-muted-foreground font-light line-clamp-2 min-h-[32px]">
                      {item.description || "Hương vị ẩm thực cao cấp được chuẩn bị bởi đội ngũ đầu bếp Chill Club."}
                    </p>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border/50">
                    <span className="text-sm font-semibold text-primary">
                      {formatPrice(item.price)}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 3. ABOUT SECTION */}
      <section className="py-24 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left side text */}
            <div className="space-y-6 text-left reveal">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary font-sans block">
                Câu chuyện của chúng tôi
              </span>
              <h2 className="font-display text-4xl sm:text-5xl text-foreground">
                Khởi nguồn từ <span className="italic text-primary">Đam mê</span>
              </h2>
              <p className="text-sm text-foreground/80 font-sans font-light leading-relaxed">
                Được thành lập với mục tiêu cách tân ẩm thực Việt, **Chill Club Restaurant** mang
                đến một trải nghiệm dịch vụ nhà hàng tinh tế và sang trọng. Chúng tôi tin rằng một
                bữa ăn ngon không chỉ nằm ở hương vị của món ăn, mà còn là sự hòa quyện của không gian
                ấm cúng, âm nhạc nhẹ nhàng và dịch vụ chăm sóc khách hàng xuất sắc nhất.
              </p>
              <p className="text-sm text-foreground/80 font-sans font-light leading-relaxed">
                Áp dụng giải pháp QR Ordering giúp quy trình phục vụ diễn ra chuẩn xác, nhanh chóng, 
                đảm bảo món ăn của bạn luôn nóng hổi trực tiếp từ bếp của chúng tôi.
              </p>

              <div className="pt-4 grid grid-cols-3 gap-6 text-left font-sans">
                <div className="space-y-1">
                  <div className="text-3xl font-display font-extrabold text-primary">500+</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    Khách mỗi ngày
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-display font-extrabold text-primary">50+</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    Món đặc sản
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-display font-extrabold text-primary">4.9★</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    Đánh giá từ khách
                  </div>
                </div>
              </div>
            </div>

            {/* Right side elegant image */}
            <div className="relative reveal" style={{ transitionDelay: "200ms" }}>
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-elegant bg-muted">
                <img
                  src="https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800"
                  alt="Chill Club interior dining"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Floating card */}
              <div className="absolute -bottom-8 -left-8 bg-primary text-primary-foreground p-6 rounded-2xl shadow-elegant hidden sm:block max-w-[240px] text-left">
                <p className="font-display italic text-lg text-secondary">"Dịch vụ đi từ trái tim"</p>
                <p className="text-[10px] text-primary-foreground/80 font-sans uppercase tracking-widest font-bold mt-2">
                  Đầu bếp trưởng Chill Club
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. RESTAURANT EXPERIENCE (Alternating Layouts) */}
      <section className="py-24 max-w-7xl mx-auto px-6 space-y-32">
        {/* Experience 1: The Chef */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="reveal aspect-[4/3] rounded-2xl overflow-hidden bg-muted lg:order-2">
            <img
              src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=800"
              alt="Elite Chef"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="reveal space-y-6 text-left lg:order-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary font-sans block">
              Tinh hoa ẩm thực
            </span>
            <h3 className="font-display text-3xl sm:text-4xl text-foreground">
              Nghệ thuật từ <span className="italic text-primary">Bếp Trưởng</span>
            </h3>
            <p className="text-sm text-foreground/80 font-sans font-light leading-relaxed">
              Dưới sự dẫn dắt của bếp trưởng kỳ cựu, các món ăn tại Chill Club là sự kết hợp hài hòa
              giữa kỹ thuật chế biến hiện đại và hương vị truyền thống tinh tế. Mỗi đĩa ăn được trang
              trí chỉn chu, tỉ mỉ tựa như một tác phẩm nghệ thuật.
            </p>
          </div>
        </div>

        {/* Experience 2: Fresh Ingredients */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="reveal aspect-[4/3] rounded-2xl overflow-hidden bg-muted">
            <img
              src="https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=800"
              alt="Fresh Ingredients"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="reveal space-y-6 text-left">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary font-sans block">
              100% Tự nhiên
            </span>
            <h3 className="font-display text-3xl sm:text-4xl text-foreground">
              Nguyên liệu <span className="italic text-primary">Tươi ngon</span> mỗi ngày
            </h3>
            <p className="text-sm text-foreground/80 font-sans font-light leading-relaxed">
              Chúng tôi cam kết sử dụng nguồn nguyên liệu sạch, tươi ngon tự nhiên được tuyển chọn khắt 
              khe từ các trang trại hữu cơ uy tín địa phương. Không chất bảo quản, giữ trọn dưỡng chất 
              và hương vị tự nhiên của món ăn.
            </p>
          </div>
        </div>

        {/* Experience 3: Luxury Space & QR Ordering */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="reveal aspect-[4/3] rounded-2xl overflow-hidden bg-muted lg:order-2">
            <img
              src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=800"
              alt="QR Ordering"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="reveal space-y-6 text-left lg:order-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary font-sans block">
              Công nghệ & Không gian
            </span>
            <h3 className="font-display text-3xl sm:text-4xl text-foreground">
              Tiện nghi vượt trội với <span className="italic text-primary">QR Ordering</span>
            </h3>
            <p className="text-sm text-foreground/80 font-sans font-light leading-relaxed">
              Chỉ cần quét mã QR tại bàn, bạn có thể dễ dàng gọi món và thanh toán không tiếp xúc ngay 
              trên điện thoại của mình. Không gian ẩm thực luxury kết hợp công nghệ giúp bạn tận hưởng 
              sự riêng tư tối đa và giảm thiểu thời gian chờ đợi.
            </p>
          </div>
        </div>
      </section>

      {/* 5. PROMOTIONS SECTION */}
      {!articlesLoading && articles.length > 0 && (
        <section className="py-24 bg-card border-y border-border">
          <div className="max-w-7xl mx-auto px-6 text-center space-y-12">
            <div className="space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary font-sans block">
                Sự kiện đang diễn ra
              </span>
              <h2 className="font-display text-4xl md:text-5xl text-foreground">
                Chương trình <span className="italic text-primary">Ưu đãi</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {articles.slice(0, 3).map((art, i) => (
                <div
                  key={art.id}
                  onClick={() => setSelectedArticle(art)}
                  className="reveal group cursor-pointer bg-background rounded-2xl overflow-hidden border border-border/80 hover:border-primary/30 transition-all hover:shadow-elegant flex flex-col text-left"
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {art.coverImage ? (
                      <img
                        src={art.coverImage}
                        alt={art.title}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent flex items-center justify-center">
                        <BookOpen className="h-10 w-10 text-primary/45" />
                      </div>
                    )}
                    <Badge className="absolute top-4 left-4 bg-emerald-600 hover:bg-emerald-600 text-white font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border-none shadow-md">
                      Mới nhất
                    </Badge>
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-3 font-sans">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-secondary tracking-widest uppercase block">
                        {art.createdAt ? new Date(art.createdAt).toLocaleDateString("vi-VN") : "Khuyến mãi"}
                      </span>
                      <h4 className="font-display text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {art.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {art.summary || "Bấm xem chi tiết ưu đãi đặc biệt từ nhà hàng Chill Club."}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform pt-2">
                      Xem chi tiết <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. RESERVATION CTA */}
      <section className="py-24 bg-[#121212] text-primary-foreground relative overflow-hidden text-center">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1600"
            alt="Elegantly set restaurant dining table"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#121212]/40 via-[#121212] to-[#121212]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 space-y-6">
          <h2 className="font-display text-4xl sm:text-5xl text-secondary">
            Đặt bàn để có một <span className="italic text-primary-foreground">Vị trí đẹp</span>
          </h2>
          <p className="text-sm text-primary-foreground/75 font-sans font-light max-w-xl mx-auto leading-relaxed">
            Đảm bảo một không gian riêng tư và tầm nhìn đẹp nhất bằng cách đặt bàn trực tuyến trước. 
            Mã đặt bàn sẽ được xác nhận lập tức và giữ chỗ miễn phí tối đa trong vòng 10 phút.
          </p>
          <Button
            onClick={() => setBookingOpen(true)}
            className="gold-shimmer px-10 py-6 rounded-full bg-primary hover:bg-primary-glow text-primary-foreground font-bold shadow-elegant hover:scale-105 transition-all text-sm uppercase tracking-widest cursor-pointer mt-4"
          >
            Liên hệ đặt bàn ngay
          </Button>
        </div>
      </section>

      {/* 7. CUSTOMER REVIEWS */}
      {!reviewsLoading && reviews.length > 0 && (
        <section className="py-24 max-w-4xl mx-auto px-6 text-center space-y-12">
          <div className="space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary font-sans block">
              Trải nghiệm thực tế
            </span>
            <h2 className="font-display text-4xl md:text-5xl text-foreground">
              Ý kiến từ <span className="italic text-primary">Khách hàng</span>
            </h2>
          </div>

          <div className="relative reveal min-h-[220px] flex items-center justify-center bg-card border border-border p-8 sm:p-12 rounded-3xl shadow-soft font-sans">
            {/* Nav Arrows */}
            {reviews.length > 1 && (
              <>
                <button
                  onClick={handlePrevReview}
                  className="absolute left-4 p-2.5 rounded-full border border-border hover:bg-muted text-foreground transition-all cursor-pointer"
                  aria-label="Previous review"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={handleNextReview}
                  className="absolute right-4 p-2.5 rounded-full border border-border hover:bg-muted text-foreground transition-all cursor-pointer"
                  aria-label="Next review"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}

            <div className="max-w-xl space-y-4 animate-zoom-in" key={reviewIndex}>
              <div className="flex justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < reviews[reviewIndex].rating
                        ? "fill-secondary text-secondary"
                        : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
              <p className="text-sm sm:text-base text-foreground/80 italic font-light leading-relaxed">
                "{reviews[reviewIndex].comment || "Bữa ăn tuyệt vời, không gian sang trọng và đặt món vô cùng nhanh chóng!"}"
              </p>
              <div className="pt-2">
                <h4 className="font-bold text-xs uppercase tracking-widest text-primary">
                  Khách hàng tại bàn {reviews[reviewIndex].sessionId}
                </h4>
                {reviews[reviewIndex].createdAt && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(reviews[reviewIndex].createdAt!).toLocaleDateString("vi-VN")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 8. GALLERY SECTION */}
      <section className="py-24 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-12">
          <div className="space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary font-sans block">
              Hình ảnh nhà hàng
            </span>
            <h2 className="font-display text-4xl md:text-5xl text-foreground">
              Khoảnh khắc <span className="italic text-primary">Chill Club</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[
              "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600",
              "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=600",
              "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=600",
              "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?q=80&w=600",
              "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=600",
              "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=600",
            ].map((imgUrl, i) => (
              <div
                key={i}
                className="reveal aspect-square rounded-2xl overflow-hidden bg-muted group cursor-pointer border border-border/60 hover:border-primary/20 transition-all hover:shadow-soft"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <img
                  src={imgUrl}
                  alt={`Gallery ${i}`}
                  className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-700"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. LOCATION & DETAILS */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center text-left">
          {/* Info Details */}
          <div className="space-y-8 reveal">
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary font-sans block">
                Tìm chúng tôi tại
              </span>
              <h2 className="font-display text-4xl text-foreground">
                Thông tin <span className="italic text-primary">Liên hệ</span>
              </h2>
              <p className="text-sm text-muted-foreground font-sans font-light leading-relaxed">
                Nằm ngay trung tâm Quận 1 sầm uất, Chill Club là điểm dừng chân lý tưởng cho những 
                buổi gặp gỡ đối tác, tụ họp gia đình hay liên hoan bạn bè thân mật.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-sans">
              <div className="flex items-start gap-4 p-5 bg-card border border-border/80 rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Hotline</span>
                  <span className="text-sm font-bold text-foreground">0987 654 321</span>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 bg-card border border-border/80 rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Giờ phục vụ</span>
                  <span className="text-sm font-bold text-foreground">10:00 - 23:30</span>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 bg-card border border-border/80 rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Địa chỉ</span>
                  <span className="text-sm font-bold text-foreground">Quận 1, TP. Hồ Chí Minh</span>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 bg-card border border-border/80 rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Email</span>
                  <span className="text-sm font-bold text-foreground">contact@chillclub.vn</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Google Map Mockup */}
          <div className="reveal aspect-[16/10] rounded-2xl overflow-hidden border border-border shadow-soft bg-muted" style={{ transitionDelay: "200ms" }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.424167301072!2d106.7001476!3d10.7765343!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f4161a0a5b1%3A0x7d6f5fbf7eef9f24!2zUXXhuq1uIDEsIFRow6BuaCBwaOG7kSBI4buTIENow60gTWluaA!5e0!3m2!1svi!2svn!4v1700000000000!5m2!1svi!2svn"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Chill Club location map"
            />
          </div>
        </div>
      </section>

      {/* PROMOTION DETAIL DIALOG */}
      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        <DialogContent className="max-w-2xl bg-card border border-border p-6 sm:p-8 rounded-3xl text-left max-h-[90vh] overflow-y-auto">
          {selectedArticle && (
            <>
              <DialogTitle className="font-display text-2xl font-bold text-foreground">
                {selectedArticle.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-primary font-bold mt-1 uppercase tracking-wider font-sans">
                Ngày đăng:{" "}
                {selectedArticle.createdAt
                  ? new Date(selectedArticle.createdAt).toLocaleDateString("vi-VN")
                  : "Khuyến mãi"}
                {selectedArticle.author && ` · Tác giả: ${selectedArticle.author}`}
              </DialogDescription>

              <div className="mt-5 space-y-5">
                {selectedArticle.coverImage && (
                  <div className="w-full h-64 rounded-2xl overflow-hidden bg-muted border border-border">
                    <img
                      src={selectedArticle.coverImage}
                      alt={selectedArticle.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {selectedArticle.summary && (
                  <blockquote className="p-4 bg-primary/5 border-l-4 border-primary rounded-r-xl text-xs italic text-muted-foreground font-sans">
                    {selectedArticle.summary}
                  </blockquote>
                )}

                <div className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans font-light">
                  {selectedArticle.content}
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={() => setSelectedArticle(null)}
                    className="bg-primary hover:bg-primary-glow text-primary-foreground font-bold px-6 py-2 rounded-full cursor-pointer text-xs uppercase tracking-wider"
                  >
                    Đóng
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Controlled Booking dialog for buttons inside the page */}
      <BookingDialog open={bookingOpen} onOpenChange={setBookingOpen} />
    </SiteLayout>
  );
}
