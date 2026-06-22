import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contact")({
  component: Contact,
});

function Contact() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-6 items-center justify-center">
      <div className="max-w-2xl w-full bg-card rounded-3xl border border-border p-8 shadow-elegant space-y-8">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Mail className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold">Contact Plateaux</h1>
        </div>

        <p className="text-muted-foreground leading-relaxed">
          Have questions or feedback about our service? Feel free to reach out to our management.
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-accent/30 border border-border rounded-2xl">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Phone className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Phone Support</p>
              <p className="text-sm font-semibold">+1 (555) 123-4567</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-accent/30 border border-border rounded-2xl">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Email Address</p>
              <p className="text-sm font-semibold">support@plateauxqr.com</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-accent/30 border border-border rounded-2xl">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="text-sm font-semibold">Hudson St, New York, NY 10013</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center border-t border-border pt-6">
          <Link to="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Go Back
            </Button>
          </Link>
          <span className="text-xs text-muted-foreground">Plateaux QR Dining</span>
        </div>
      </div>
    </div>
  );
}
