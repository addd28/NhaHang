import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { useReveal } from "@/hooks/use-reveal";

interface SiteLayoutProps {
  children: ReactNode;
}

export function SiteLayout({ children }: { children: ReactNode }) {
  useReveal();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/25 relative overflow-x-hidden">
      {/* Elegant background tint */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-20 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none z-0" />

      <SiteHeader />
      <main className="relative z-10">{children}</main>
      <SiteFooter />
    </div>
  );
}
