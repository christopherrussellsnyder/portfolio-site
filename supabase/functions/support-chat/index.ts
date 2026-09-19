import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { checkRateLimit, clientKey } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Korex Support, the AI-powered customer support agent for Korex Intelligence — an AI marketing strategy platform.

VOICE: Professional, calm, helpful, direct. Never overly chipper. Use the user's first name if known. Keep replies under 4 short paragraphs.

KOREX PRODUCT KNOWLEDGE:
- Core product: AI marketing strategist that generates 7- or 14-day content strategies, analyzes ad/social analytics screenshots, audits websites, and recommends campaign structures.
- 6 core sections: AI Strategist (chat with Korex Intelligence), Content Library, Strategies, Insights, Media, and Settings. When directing a user to a section, always refer to it by its plain name (e.g. "AI Strategist", "Insights", "Settings") — never include slashes, URL paths, or route syntax like "/ai-strategist" in replies.
- Plans: Starter (free, 2 lifetime strategies), Pro ($99/mo or $831/yr (30% off annual) — unlimited strategies, all platforms, PDF export, priority support), Agency ($299/mo or $2511/yr (30% off annual) — everything in Pro + coming features).
- Launch promo: code KOREX gives 15% off the first month. Enter it at checkout on the Stripe page.
- Strategies are always 7 or 14 days. Not 30. Posts can be edited individually.
- Insights extracts metrics, health scores (1-10), trends, and recommendations from screenshots, PDFs, or spreadsheets you upload on the Insights page.
- Media Library stores generated images and videos; supports Unsplash/Pexels imports and folder tagging.
- Connections: Replicate (for AI image + video generation, "Animate to Video"). No live posting to social platforms — strategies are for planning/execution by the user.
- Email verification is mandatory before app access. /auth/confirm handles the exchange.
- 2FA (TOTP) is available in Settings → Profile.
- Billing is handled by Stripe Customer Portal — Settings → Billing → "Manage Subscription".

ESCALATION RULES — surface "Escalate to support team" if the user mentions:
- billing disputes, refund requests, chargebacks
- account access issues (can't log in, locked out, lost 2FA)
- suspected bugs reproducible step-by-step
- data deletion / GDPR requests
- enterprise / agency contract questions
- explicit request: "talk to a human", "real person", "support team"

When escalating, end your reply with the literal token [ESCALATE] on its own line so the UI can render the escalation CTA.

If a question is outside Korex scope (unrelated coding, personal advice, etc.), gently redirect to what Korex does help with.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = serviceClient();
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Per-user + per-IP rate limit: 30 requests/minute. Well above normal usage;
    // trips only on scripted abuse. Response shape stays a plain JSON error.
    const rlUser = await checkRateLimit(`support-chat:user:${user.id}`, { limit: 30, windowMs: 60_000 });
    const rlIp = await checkRateLimit(clientKey(req, "support-chat"), { limit: 60, windowMs: 60_000 });
    if (!rlUser.ok || !rlIp.ok) {
      return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    const messages = body?.messages;
    const conversationId = body?.conversationId;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 100) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Bound individual message size to prevent prompt-flooding abuse.
    for (const m of messages) {
      if (!m || typeof m.role !== "string" || typeof m.content !== "string" || m.content.length > 8000) {
        return new Response(JSON.stringify({ error: "invalid message payload" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch user plan for context
    const { data: sub } = await supabase
      .from("subscriptions").select("status, plan_type").eq("user_id", user.id).maybeSingle();
    const planContext = sub
      ? `User plan: ${sub.plan_type || "starter"} (${sub.status})`
      : "User plan: starter (free)";

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: `${SYSTEM_PROMPT}\n\nUSER CONTEXT:\nEmail: ${user.email}\n${planContext}` },
          ...messages.slice(-12),
        ],
        temperature: 0.5,
        max_tokens: 1200,
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "AI Gateway rate limit reached. Please retry in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Workspace AI credits are depleted. Add credits in Lovable → Settings → Plans & credits, then retry.", code: "AI_CREDITS_DEPLETED" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI error", aiRes.status, txt);
      return new Response(JSON.stringify({ error: "Support AI temporarily unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const rawReply = data.choices?.[0]?.message?.content || "";
    const escalate = /\[ESCALATE\]/i.test(rawReply);
    const reply = rawReply.replace(/\[ESCALATE\]/gi, "").trim();

    // Persist transcript
    const fullMessages = [...messages, { role: "assistant", content: reply, escalated: escalate, at: new Date().toISOString() }];
    if (conversationId) {
      await supabase
        .from("support_conversations")
        .update({ messages: fullMessages, escalated: escalate, escalated_at: escalate ? new Date().toISOString() : null })
        .eq("id", conversationId).eq("user_id", user.id);
    } else {
      const { data: inserted } = await supabase
        .from("support_conversations")
        .insert({ user_id: user.id, messages: fullMessages, escalated: escalate, escalated_at: escalate ? new Date().toISOString() : null })
        .select("id").single();
      return new Response(JSON.stringify({ reply, escalate, conversationId: inserted?.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ reply, escalate, conversationId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("support-chat error", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
