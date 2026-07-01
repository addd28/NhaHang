import { createFileRoute } from "@tanstack/react-router";
import { 
  Soup, UtensilsCrossed, Users, QrCode,
  Phone, Clock, MapPin, Flame, Star, Award, Heart, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { BookingDialog } from "@/components/BookingDialog";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  const [showReserveModal, setShowReserveModal] = useState(false);

  return (
    <SiteLayout>
      <div className="pt-28 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 text-left">
          {/* Header section */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <Award className="h-4 w-4" /> Câu chuyện thương hiệu
            </div>
            <h1 className="text-4xl font-display font-extrabold tracking-tight">
              GIỚI THIỆU VỀ CHILL CLUB
            </h1>
            <p className="text-sm text-muted-foreground">
              Tìm hiểu về không gian ẩm thực lẩu nướng kết hợp bia hơi tươi và triết lý phục vụ lấy công nghệ thông minh làm cốt lõi.
            </p>
          </div>

          {/* Intro block */}
          <div className="bg-card border border-border/40 p-8 sm:p-10 rounded-3xl space-y-6 shadow-soft">
            <h3 className="font-display font-extrabold text-2xl text-foreground">
              Nơi giao thoa giữa Ẩm thực truyền thống & Công nghệ hiện đại
            </h3>
            
            <p className="text-muted-foreground leading-relaxed text-sm">
              Chào mừng bạn đến với **Chill Club**, dự án tiên phong cung cấp giải pháp ẩm thực lẩu nướng kết hợp bia hơi truyền thống được nâng tầm bằng công nghệ số. Được thành lập vào năm 2024, Chill Club sinh ra với mục tiêu mang đến cho thực khách một không gian ẩm thực thoáng mát, ấm cúng nhưng không kém phần năng động và tiện nghi.
            </p>
            
            <p className="text-muted-foreground leading-relaxed text-sm">
              Tại Chill Club, chúng tôi giải quyết bài toán phục vụ chậm trễ bằng hệ thống **QR Code Ordering thông minh**. Khách hàng chỉ cần quét mã QR tại bàn để xem thực đơn thực tế trực tiếp, gọi món và theo dõi quá trình làm món trong nhà bếp hoàn toàn tự động. Tất cả các dữ liệu từ nhà bếp, quầy bar, và hệ thống thanh toán đều được xử lý đồng bộ theo thời gian thực.
            </p>
          </div>

          {/* Three Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-card border border-border/40 rounded-3xl space-y-3 hover:border-primary/40 hover:shadow-elegant transition-all">
              <Shield className="h-6 w-6 text-primary" />
              <h3 className="font-bold text-base text-foreground">Đặt Món An Toàn</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Mỗi bàn ăn có một mã bảo mật riêng biệt, bảo vệ tuyệt đối thông tin gọi món và tránh việc nhầm lẫn phiên gọi món giữa các bàn.
              </p>
            </div>

            <div className="p-6 bg-card border border-border/40 rounded-3xl space-y-3 hover:border-primary/40 hover:shadow-elegant transition-all">
              <Clock className="h-6 w-6 text-primary" />
              <h3 className="font-bold text-base text-foreground">Theo Dõi Thời Gian Thực</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Khách hàng dễ dàng biết được món ăn của mình đang được chuẩn bị ở bếp chảo hay đã sẵn sàng lên đĩa qua thanh trạng thái tự động.
              </p>
            </div>

            <div className="p-6 bg-card border border-border/40 rounded-3xl space-y-3 hover:border-primary/40 hover:shadow-elegant transition-all">
              <Heart className="h-6 w-6 text-primary" />
              <h3 className="font-bold text-base text-foreground">Phục Vụ Tận Tâm</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Đội ngũ đầu bếp tay nghề cao cùng đội ngũ chạy bàn chuyên nghiệp luôn túc trực hỗ trợ khách hàng nhanh chóng mọi lúc.
              </p>
            </div>
          </div>

          {/* Booking section shortcut */}
          <div className="bg-gradient-to-r from-primary/10 via-transparent to-primary/5 p-8 rounded-3xl border border-primary/10 text-center space-y-4">
            <h3 className="font-bold text-lg text-foreground">Trải nghiệm dịch vụ đỉnh cao tại Chill Club</h3>
            <p className="text-xs text-muted-foreground max-w-xl mx-auto">
              Hãy đặt giữ bàn ngay hôm nay để nhận được vị trí đẹp nhất cho bạn và gia đình vào tối cuối tuần!
            </p>
            <Button
              onClick={() => setShowReserveModal(true)}
              className="bg-primary hover:bg-primary-glow text-primary-foreground font-bold px-8 py-2.5 rounded-full shadow-elegant cursor-pointer"
            >
              Đặt bàn online giữ chỗ ngay
            </Button>
          </div>
        </div>
      </div>

      {/* Booking Dialog */}
      <BookingDialog open={showReserveModal} onOpenChange={setShowReserveModal} />
    </SiteLayout>
  );
}
