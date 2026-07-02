import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Clock, Shield } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card mt-24">
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-12 text-left">
        {/* Brand Column */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex flex-col">
            <span className="font-display text-3xl font-extrabold tracking-tight text-primary">
              CHILL CLUB
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              Bia Hơi Ngon · Est. 2024
            </span>
          </div>
          <p className="text-sm text-foreground/75 leading-relaxed max-w-sm font-sans font-light">
            Định nghĩa lại trải nghiệm ẩm thực cao cấp kết hợp công nghệ đặt món thông minh. Nơi tinh
            hoa ẩm thực hội tụ cùng không gian sang trọng tinh tế.
          </p>
        </div>

        {/* Visit & Contact */}
        <div className="space-y-4 font-sans">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-secondary">
            Liên hệ
          </h4>
          <ul className="space-y-3 text-sm text-foreground/80 font-light">
            <li className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Hoàn Kiếm, Hà Nội</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Mở cửa hàng ngày 10:00 — 23:30</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Phone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span className="font-medium text-foreground">0987 654 321</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Mail className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>contact@chillclub.vn</span>
            </li>
          </ul>
        </div>

        {/* Explore Links */}
        <div className="space-y-4 font-sans">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-secondary">
            Khám phá
          </h4>
          <ul className="space-y-2 text-sm text-foreground/80 font-light">
            <li>
              <Link to="/menu" className="hover:text-primary transition-colors">
                Thực đơn đầy đủ
              </Link>
            </li>
            <li>
              <Link to="/posts" className="hover:text-primary transition-colors">
                Ưu đãi & Tin tức
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-primary transition-colors">
                Về chúng tôi
              </Link>
            </li>

          </ul>
        </div>
      </div>

      {/* Bottom Copyright */}
      <div className="border-t border-border/60">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
          <span>© {new Date().getFullYear()} Chill Club Restaurant. Bảo lưu mọi quyền.</span>
          <span>Phát triển trên nền tảng Plateaux QR Dining</span>
        </div>
      </div>
    </footer>
  );
}
