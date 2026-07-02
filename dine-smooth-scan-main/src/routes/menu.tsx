import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Soup, UtensilsCrossed, QrCode,
  ArrowRight, BookOpenCheck, Flame, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { menuApi } from "@/api/menuApi";
import { categoryApi } from "@/api/categoryApi";
import { Badge } from "@/components/ui/badge";
import { MenuItem } from "../types";
import { cn } from "@/lib/utils";
import { SiteLayout } from "@/components/SiteLayout";
import { BookingDialog } from "../components/BookingDialog";

export const Route = createFileRoute("/menu")({
  component: PublicMenuPage,
});

function PublicMenuPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [bookingOpen, setBookingOpen] = useState(false);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["menuCategories"],
    queryFn: () => categoryApi.getCategories(),
  });

  // Fetch menu items
  const { data: menuItems = [] } = useQuery({
    queryKey: ["menuShowcaseItems"],
    queryFn: () => menuApi.getMenuItems(),
  });

  const filteredMenuItems = useMemo(() => {
    const available = menuItems.filter(item => item.available);
    if (activeCategory === "all") return available;
    return available.filter(
      item => {
        const catName = item.categoryName || item.category;
        return catName && catName.toLowerCase() === activeCategory.toLowerCase();
      }
    );
  }, [menuItems, activeCategory]);

  const getMenuItemImage = (imageKey?: string) => {
    if (!imageKey || imageKey === "css-gradient-placeholder") {
      return "css-gradient-placeholder";
    }
    if (imageKey.startsWith("http") || imageKey.startsWith("/")) return imageKey;
    return "css-gradient-placeholder";
  };

  return (
    <SiteLayout>
      <div className="pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          {/* Header section */}
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <UtensilsCrossed className="h-4 w-4" /> Thực đơn ẩm thực
            </div>
            <h1 className="text-4xl font-display font-extrabold tracking-tight">
              TINH HOA THỰC ĐƠN CHILL CLUB
            </h1>
            <p className="text-sm text-muted-foreground">
              Khám phá trọn vẹn danh mục món ăn tươi ngon đặc sắc. Toàn bộ thực đơn được nạp thời gian thực từ nhà bếp để đảm bảo tính sẵn có của nguyên liệu.
            </p>
          </div>

          {/* Category Navigation Tabs */}
          <div className="flex flex-wrap justify-center gap-2.5">
            <button
              onClick={() => setActiveCategory("all")}
              className={cn(
                "px-5 py-2.5 rounded-full text-xs font-bold transition-all border cursor-pointer",
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground border-primary shadow-elegant"
                  : "bg-card border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
              )}
            >
              Tất cả món ăn
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.name)}
                className={cn(
                  "px-5 py-2.5 rounded-full text-xs font-bold transition-all border cursor-pointer",
                  activeCategory.toLowerCase() === cat.name.toLowerCase()
                    ? "bg-primary text-primary-foreground border-primary shadow-elegant"
                    : "bg-card border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Menu Grid */}
          {filteredMenuItems.length === 0 ? (
            <div className="py-20 bg-card rounded-3xl border border-border/40 text-muted-foreground italic text-sm">
              Đang tải danh sách món ăn từ nhà bếp Chill Club...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredMenuItems.map((item: MenuItem) => {
                const img = getMenuItemImage(item.image || item.imageUrl);
                const isPlaceholder = img === "css-gradient-placeholder";
                return (
                  <div
                    key={item.id}
                    className="group bg-card rounded-3xl border border-border/40 overflow-hidden hover:border-primary/40 hover:shadow-elegant transition-all duration-300 flex flex-col h-full text-left"
                  >
                    <div className="relative h-48 overflow-hidden bg-accent/20">
                      {isPlaceholder ? (
                        <div className="w-full h-full bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-yellow-500/20 flex items-center justify-center relative">
                          <UtensilsCrossed className="h-10 w-10 text-primary/40 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                      ) : (
                        <img
                          src={img}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}
                      {item.tag && (
                        <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground border-none font-bold text-[9px] uppercase px-2 py-0.5 shadow-md">
                          {item.tag}
                        </Badge>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <Badge variant="outline" className="border-primary/20 text-primary text-[9px] uppercase font-bold px-2 py-0">
                          {item.categoryName || item.category}
                        </Badge>
                        <h4 className="font-bold text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {item.name}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {item.description || "Món ngon trứ danh được các đầu bếp chuẩn bị tỉ mỉ bằng nguyên liệu tươi mới."}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick link to booking instead of direct table entry */}
          <div className="bg-card border border-border/40 p-8 rounded-3xl max-w-3xl mx-auto space-y-4">
            <h3 className="font-bold text-lg text-foreground">Bạn muốn đặt bàn trải nghiệm trực tiếp?</h3>
            <p className="text-xs text-muted-foreground">
              Đảm bảo một không gian riêng tư và vị trí ngồi đẹp nhất bằng cách đặt bàn trực tuyến trước. Chúng tôi sẽ chuẩn bị chu đáo để đón tiếp bạn.
            </p>
            <Button 
              onClick={() => setBookingOpen(true)}
              className="mt-2 bg-gradient-primary hover:opacity-95 text-primary-foreground font-bold px-8 py-3 rounded-full flex items-center gap-2 mx-auto cursor-pointer shadow-elegant border-none"
            >
              <Calendar className="h-4 w-4" />
              Đặt bàn ngay
            </Button>
          </div>
        </div>
      </div>
      <BookingDialog open={bookingOpen} onOpenChange={setBookingOpen} />
    </SiteLayout>
  );
}
