import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "korex_funnel_optin_dismissed_v1";

// Marketing/public pages only — never inside the signed-in product experience.
const PUBLIC_PATHS = new Set([
  "/",
  "/pricing",
  "/features",
  "/how-it-works",
  "/about",
  "/contact",
  "/demo",
  "/help",
]);

/**
 * Post-signup email funnel opt-in.
 * Shows ONE branded prompt on public marketing pages for a verified user.
 * Never shown on in-app routes. Skipped if already subscribed or declined.
 */
export function EmailFunnelOptInPrompt() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isPublicPage = PUBLIC_PATHS.has(location.pathname.replace(/\/+$/, "") || "/");

  useEffect(() => {
    if (!isPublicPage) {
      setOpen(false);
      return;
    }
    if (!user) return;
    if (!user.email_confirmed_at) return; // verified users only
    if (localStorage.getItem(STORAGE_KEY) === "1") return;

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("email_subscribers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        // Small delay so it doesn't slam the user the millisecond they land
        setTimeout(() => !cancelled && setOpen(true), 1500);
      } else {
        localStorage.setItem(STORAGE_KEY, "1");
      }
    })();
    return () => { cancelled = true; };
  }, [user, isPublicPage]);

  const handleOptIn = async () => {
    if (!user?.email) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("email_subscribers").insert({
        user_id: user.id,
        email: user.email,
        full_name: (user.user_metadata as any)?.full_name ?? null,
        current_step: 0,
        next_send_at: new Date().toISOString(), // queue first email immediately
        status: "active",
      });
      if (error) throw error;
      localStorage.setItem(STORAGE_KEY, "1");
      toast.success("You're in. Watch for your welcome email shortly.");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Couldn't subscribe — try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleDecline(); }}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-3">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            Get the Korex playbook in your inbox
          </DialogTitle>
          <DialogDescription className="text-muted-foreground pt-2 leading-relaxed">
            5 short emails over 10 days. The exact workflows top operators use to ship
            content strategies in minutes. No spam, unsubscribe anytime.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 py-3 text-sm">
          {[
            "Day 0 · Welcome & quick wins",
            "Day 2 · The 3 features that matter",
            "Day 4 · 90-second strategy walkthrough",
            "Day 7 · How operators are using Korex",
            "Day 10 · Unlock the full platform",
          ].map((s) => (
            <li key={s} className="flex items-start gap-2 text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-primary mt-1 shrink-0" />
              <span>{s}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button variant="ghost" onClick={handleDecline} disabled={submitting} className="flex-1">
            No thanks
          </Button>
          <Button onClick={handleOptIn} disabled={submitting} className="flex-1 bg-primary hover:bg-primary/90">
            {submitting ? "Subscribing..." : "Send me the playbook"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
