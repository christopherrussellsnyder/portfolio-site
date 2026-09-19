import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, Sparkles, Zap, TrendingUp, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_TIERS } from "@/config/stripe.config";
import { toast } from "sonner";

type Reason = "UPGRADE_REQUIRED" | "AI_CREDITS_DEPLETED";

interface Detail {
  reason: Reason;
  message?: string;
}

const PLAN_META = {
  pro: {
    name: "Pro",
    tagline: "For serious operators scaling one brand",
    monthly: 49,
    yearly: 490,
    highlight: true,
    features: [
      "Unlimited AI strategies",
      "Unlimited analytics uploads",
      "All platforms supported",
      "Priority AI response times",
      "Export & share strategies",
    ],
  },
  agency: {
    name: "Agency",
    tagline: "For teams running multiple brands",
    monthly: 149,
    yearly: 1490,
    highlight: false,
    features: [
      "Everything in Pro",
      "Multi-client management",
      "White-label reports",
      "API access",
      "Dedicated support",
    ],
  },
} as const;

export function UpgradePromptModal() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [billingAnnual, setBillingAnnual] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<Detail>;
      setDetail(custom.detail);
      setOpen(true);
    };
    window.addEventListener("korex:upgrade-required", handler as EventListener);
    return () => window.removeEventListener("korex:upgrade-required", handler as EventListener);
  }, []);

  const isCreditIssue = detail?.reason === "AI_CREDITS_DEPLETED";

  const handleCheckout = async (planKey: "pro" | "agency") => {
    setLoadingPlan(planKey);
    const checkoutWindow = window.open("", "_blank");
    try {
      const interval = billingAnnual ? "yearly" : "monthly";
      const priceId = STRIPE_TIERS[planKey][interval].price_id;
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        if (checkoutWindow) checkoutWindow.location.href = data.url;
        else window.location.href = data.url;
      }
    } catch (err) {
      checkoutWindow?.close();
      toast.error("Couldn't start checkout. Please try again.");
      console.error(err);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden border-primary/20 bg-background">
        <div className="relative bg-gradient-to-br from-primary/15 via-background to-background p-6 border-b border-primary/10">
          <button
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-md bg-primary/15 p-2">
              {isCreditIssue ? <Zap className="h-5 w-5 text-primary" /> : <Sparkles className="h-5 w-5 text-primary" />}
            </div>
            <Badge variant="outline" className="border-primary/30 text-primary text-xs">
              {isCreditIssue ? "AI credits depleted" : "You've unlocked everything Starter offers"}
            </Badge>
          </div>
          <DialogHeader className="text-left space-y-2">
            <DialogTitle className="text-2xl font-semibold tracking-tight">
              {isCreditIssue
                ? "Keep the intelligence running — top up or upgrade"
                : "Ready to scale? Upgrade to keep generating strategies"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground max-w-2xl">
              {isCreditIssue
                ? "The Korex Algorithm is powered by high-throughput AI. You've used your current allotment. Upgrading unlocks a higher included allowance plus priority processing."
                : "You've generated both of your free Starter strategies. Upgrade to Pro or Agency to keep the Korex Algorithm building unlimited, performance-calibrated content plans for you."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm ${!billingAnnual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
            <button
              onClick={() => setBillingAnnual((v) => !v)}
              className="relative h-6 w-11 rounded-full bg-muted transition"
              aria-label="Toggle billing"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-primary transition-transform ${
                  billingAnnual ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
            <span className={`text-sm ${billingAnnual ? "text-foreground" : "text-muted-foreground"}`}>
              Annual <span className="text-primary text-xs">(save 17%)</span>
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {(Object.keys(PLAN_META) as Array<"pro" | "agency">).map((key) => {
              const plan = PLAN_META[key];
              const price = billingAnnual ? plan.yearly : plan.monthly;
              const suffix = billingAnnual ? "/yr" : "/mo";
              return (
                <div
                  key={key}
                  className={`relative rounded-xl border p-5 transition ${
                    plan.highlight
                      ? "border-primary/50 bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]"
                      : "border-border bg-card"
                  }`}
                >
                  {plan.highlight && (
                    <Badge className="absolute -top-2 left-5 bg-primary text-primary-foreground text-[10px] uppercase tracking-wider">
                      Most popular
                    </Badge>
                  )}
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <div className="text-right">
                      <span className="text-2xl font-bold">${price}</span>
                      <span className="text-xs text-muted-foreground">{suffix}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">{plan.tagline}</p>
                  <ul className="space-y-2 mb-5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => handleCheckout(key)}
                    disabled={loadingPlan === key}
                    className={`w-full ${plan.highlight ? "" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
                  >
                    {loadingPlan === key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Upgrade to {plan.name}
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition"
            >
              Maybe later
            </button>
            <button
              onClick={() => {
                setOpen(false);
                navigate("/pricing");
              }}
              className="text-xs text-primary hover:underline"
            >
              Compare all plans →
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
