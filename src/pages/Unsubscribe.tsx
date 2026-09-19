import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";

type State = "loading" | "valid" | "invalid" | "already" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    (async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState(data?.already_unsubscribed ? "already" : "invalid");
          return;
        }
        setEmail(data?.email ?? null);
        setState(data?.already_unsubscribed ? "already" : "valid");
      } catch {
        setState("error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (error) throw error;
      // Also mark our funnel record (best-effort; user may not be signed in)
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (auth?.user) {
          await supabase
            .from("email_subscribers")
            .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString(), next_send_at: null })
            .eq("user_id", auth.user.id);
        }
      } catch { /* non-fatal */ }
      setState("done");
    } catch {
      setState("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 text-center">
        <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-5">
          {state === "done" ? <CheckCircle2 className="w-7 h-7 text-primary" /> :
           state === "invalid" || state === "error" ? <AlertCircle className="w-7 h-7 text-destructive" /> :
           <Mail className="w-7 h-7 text-primary" />}
        </div>

        {state === "loading" && (
          <>
            <h1 className="text-xl font-semibold mb-2">Checking your link…</h1>
            <p className="text-muted-foreground text-sm">One moment.</p>
          </>
        )}

        {state === "valid" && (
          <>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Unsubscribe from Korex emails?</h1>
            <p className="text-muted-foreground text-sm mb-6">
              {email ? <><span className="text-foreground font-medium">{email}</span> will stop receiving</> : "You'll stop receiving"} marketing emails from Korex Intelligence. You can resubscribe anytime from your settings.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={confirm} disabled={submitting} className="bg-primary hover:bg-primary/90">
                {submitting ? "Unsubscribing…" : "Confirm unsubscribe"}
              </Button>
              <Button asChild variant="ghost"><Link to="/">Keep me subscribed</Link></Button>
            </div>
          </>
        )}

        {state === "already" && (
          <>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Already unsubscribed</h1>
            <p className="text-muted-foreground text-sm mb-6">{email ?? "This address"} won't receive any further marketing emails from us.</p>
            <Button asChild variant="ghost"><Link to="/">Back to home</Link></Button>
          </>
        )}

        {state === "done" && (
          <>
            <h1 className="text-2xl font-bold tracking-tight mb-2">You're unsubscribed</h1>
            <p className="text-muted-foreground text-sm mb-6">Sorry to see you go. We won't email you again.</p>
            <Button asChild variant="ghost"><Link to="/">Back to home</Link></Button>
          </>
        )}

        {(state === "invalid" || state === "error") && (
          <>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Link not valid</h1>
            <p className="text-muted-foreground text-sm mb-6">This unsubscribe link has expired or wasn't recognized. You can manage email preferences from your account settings.</p>
            <Button asChild variant="ghost"><Link to="/">Back to home</Link></Button>
          </>
        )}
      </div>
    </div>
  );
}
