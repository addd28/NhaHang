import { createFileRoute, Link } from "@tanstack/react-router";
import { Info, Shield, Clock, Heart, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  component: About,
});

function About() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-6 items-center justify-center">
      <div className="max-w-2xl w-full bg-card rounded-3xl border border-border p-8 shadow-elegant space-y-8">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Info className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold">About Plateaux</h1>
        </div>

        <p className="text-muted-foreground leading-relaxed">
          Welcome to **Plateaux**, a premium QR-based digital dining experience. We believe that ordering food should be as elegant and seamless as enjoying it. By scanning the unique QR code on your table, you gain instant access to our real-time interactive menu.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-accent/30 border border-border rounded-2xl text-center space-y-2">
            <Shield className="h-5 w-5 text-primary mx-auto" />
            <h3 className="font-bold text-sm">Secure Ordering</h3>
            <p className="text-xs text-muted-foreground">Sessions are tied to specific tables secure from interception.</p>
          </div>

          <div className="p-4 bg-accent/30 border border-border rounded-2xl text-center space-y-2">
            <Clock className="h-5 w-5 text-primary mx-auto" />
            <h3 className="font-bold text-sm">Realtime Tracking</h3>
            <p className="text-xs text-muted-foreground">Watch your food transition from prep to table in real-time.</p>
          </div>

          <div className="p-4 bg-accent/30 border border-border rounded-2xl text-center space-y-2">
            <Heart className="h-5 w-5 text-primary mx-auto" />
            <h3 className="font-bold text-sm">Crafted with Love</h3>
            <p className="text-xs text-muted-foreground">Prepared by chef experts and brought straight to you.</p>
          </div>
        </div>

        <div className="flex justify-between items-center border-t border-border pt-6">
          <Link to="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Go Back
            </Button>
          </Link>
          <span className="text-xs text-muted-foreground">Plateaux Dining v1.0</span>
        </div>
      </div>
    </div>
  );
}
