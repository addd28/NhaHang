import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, Calendar, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingDialog } from "./BookingDialog";

const navLinks = [
  { to: "/", label: "Trang chủ" },
  { to: "/menu", label: "Thực đơn" },
  { to: "/posts", label: "Khuyến mãi" },
  { to: "/about", label: "Về Chill Club" },
] as const;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-card/90 backdrop-blur-md border-b border-border shadow-soft py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex flex-col text-left">
              <span className="font-display font-extrabold text-2xl tracking-tight text-primary transition-colors group-hover:text-primary-glow">
                CHILL CLUB
              </span>
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
                Bia Hơi Ngon · Est. 2024
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-10 font-sans">
            {navLinks.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/80 hover:text-primary transition-colors duration-300"
                activeProps={{ className: "text-primary font-bold" }}
                activeOptions={{ exact: n.to === "/" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-4">

            <Button
              onClick={() => setBookingOpen(true)}
              className="bg-primary hover:bg-primary-glow text-primary-foreground font-bold px-6 py-2.5 rounded-full shadow-elegant cursor-pointer transition-all flex items-center gap-2 text-xs"
            >
              <Calendar className="h-3.5 w-3.5" />
              Đặt bàn ngay
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-foreground focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-card border-b border-border py-4 px-6 absolute top-full left-0 right-0 shadow-soft animate-in slide-in-from-top duration-200">
            <div className="flex flex-col gap-4">
              {navLinks.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-left py-2 text-sm font-semibold hover:text-primary transition-colors"
                  activeProps={{ className: "text-primary" }}
                  activeOptions={{ exact: n.to === "/" }}
                >
                  {n.label}
                </Link>
              ))}
              <div className="border-t border-border pt-4 flex flex-col gap-3">
                <Button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setBookingOpen(true);
                  }}
                  className="w-full bg-primary hover:bg-primary-glow text-primary-foreground font-bold py-3 rounded-full flex items-center justify-center gap-2 text-sm"
                >
                  <Calendar className="h-4 w-4" />
                  Đặt bàn ngay
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Booking Dialog */}
      <BookingDialog open={bookingOpen} onOpenChange={setBookingOpen} />
    </>
  );
}
