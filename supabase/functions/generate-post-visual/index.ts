// Generate an AI image for a strategy post and upload it to the user's media bucket.
import { serviceClient } from "../_shared/supabase.ts";
import { requirePro } from "../_shared/require-pro.ts";
import { checkRateLimit, clientKey } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Platform-aware aspect ratios -> gpt-image-2 size strings
function sizeForPlatform(platform?: string, postType?: string): string {
  const p = (platform || "").toLowerCase();
  const t = (postType || "").toLowerCase();
  if (t.includes("reel") || t.includes("story") || p === "tiktok") return "1024x1536"; // 9:16-ish
  if (p === "linkedin") return "1536x1024"; // landscape
  if (p === "youtube") return "1536x1024";
  return "1024x1024"; // IG feed, default
}

const MAX_REFERENCE_BYTES = 8 * 1024 * 1024;
const SUPPORTED_REFERENCE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function parseReferenceImage(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const match = value.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  const mimeType = match?.[1];
  const encoded = match?.[2];
  if (!mimeType || !encoded || !SUPPORTED_REFERENCE_TYPES.has(mimeType)) {
    throw new Error("Product screen reference must be a PNG, JPEG, or WebP image.");
  }
  const estimatedBytes = Math.floor((encoded.length * 3) / 4);
  if (estimatedBytes > MAX_REFERENCE_BYTES) {
    throw new Error("Product screen reference must be smaller than 8 MB.");
  }
  return value;
}

function separateVisualBrief(brief?: string): { direction?: string; captionContext?: string } {
  if (!brief) return {};
  const marker = /caption this image supports\s*:/i;
  const match = marker.exec(brief);
  if (!match || match.index === undefined) return { direction: brief.trim() };
  return {
    direction: brief.slice(0, match.index).trim(),
    captionContext: brief.slice(match.index + match[0].length).trim(),
  };
}

// Art-direction scaffolding: what separates a stock-looking render from
// something that reads like a paid campaign asset.
const CRAFT_DIRECTIVES = [
  "Shot like a paid brand campaign asset, not stock photography.",
  "Full-frame camera look: 35mm or 50mm prime, f/2 to f/4, natural depth of field with a believable focal plane.",
  "Physically accurate lighting with a clear key, soft fill and gentle rim separation; realistic shadow falloff and colour bounce.",
  "Deliberate composition — strong subject placement, clean negative space for copy, no cluttered or centred-by-default framing.",
  "Rich micro-detail: true skin texture and pores, fabric weave, surface imperfection, material specularity.",
  "Colour-graded like a commercial: controlled contrast, filmic highlight rolloff, no crushed blacks, no oversaturation.",
  "Photorealistic and razor sharp where it matters, tack-focus on the subject.",
];

const NEGATIVE_DIRECTIVES =
  "Avoid: watermarks, signatures, invented brand logos, warped or extra fingers, plastic waxy skin, uncanny faces, " +
  "generic AI gloss, HDR halos, mushy background detail, gibberish lettering, cluttered collage layouts, " +
  "cheap clip-art icons, heavy vignette, oversharpened edges.";

function buildPrompt(input: {
  caption?: string;
  hook?: string;
  theme?: string;
  postType?: string;
  platform?: string;
  visualDescription?: string;
  colorPalette?: string;
  textOverlay?: string;
  brandColors?: string;
  brandVoice?: string;
  stylePrompt?: string;
  hasProductReference?: boolean;
}) {
  const platform = input.platform || "Instagram";
  const parts: string[] = [];
  const { direction, captionContext } = separateVisualBrief(input.visualDescription);

  parts.push(
    `High-end advertising visual for ${platform}, produced to agency standard for a scroll-stopping paid social placement.`,
  );

  if (direction) {
    parts.push(
      "Follow every labeled visual instruction in this production brief exactly. The split-screen/layout, subject, scene, emotion, palette, attention device, and CTA are requirements, not suggestions:\n" +
        direction,
    );
  }
  else if (input.hook) parts.push("Subject and scene: " + input.hook + ".");
  else if (input.caption) parts.push("Subject and scene: " + input.caption.slice(0, 300) + ".");

  if (captionContext) {
    parts.push(
      "Message context only (do not render this paragraph as text): " + captionContext.slice(0, 500),
    );
  }

  if (input.hasProductReference) {
    parts.push(
      "The attached image is the authoritative Korex Intelligence product-screen reference. Preserve its real interface structure, navigation, typography, brand mark, colors, controls, spacing, and recognizable screen content. Place that authentic interface on the device in the requested scene. Do not invent a generic analytics app, redesign the interface, replace its logo, or substitute unrelated charts.",
    );
  }

  if (input.stylePrompt) parts.push("Art direction: " + input.stylePrompt + ".");
  if (input.theme) parts.push("Mood: " + input.theme.replace(/_/g, " ") + ".");
  if (input.brandVoice) parts.push("Brand tone the image must feel like: " + input.brandVoice + ".");

  const palette = input.colorPalette || input.brandColors;
  if (palette) {
    parts.push(
      `Colour direction: ${palette}. Keep the palette disciplined — two dominant tones plus one accent, harmonised across the whole frame.`,
    );
  }

  if (input.textOverlay) {
    parts.push(
      `Render this exact headline as clean, correctly spelled typography, spelled letter for letter: "${input.textOverlay}". ` +
        "Use a single modern sans-serif, high contrast against its backdrop, placed in intentional negative space. " +
        "No other text anywhere in the image.",
    );
  } else {
    parts.push("No text, letters or numbers anywhere in the image.");
  }

  parts.push(CRAFT_DIRECTIVES.join(" "));
  parts.push(NEGATIVE_DIRECTIVES);

  return parts.join(" ");
}

/**
 * Expands a short user brief into a full art-direction brief before it ever
 * reaches the image model. This is the single biggest quality lever — image
 * models reward specificity about lens, light, styling and composition.
 */
async function enhanceBrief(prompt: string, apiKey: string): Promise<string> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a senior art director writing prompts for a state-of-the-art image model. " +
              "Rewrite the brief into ONE dense paragraph (max 220 words) of concrete visual direction: " +
              "subject and styling, wardrobe, environment and set dressing, camera body/lens/aperture/angle/distance, " +
              "lighting setup and direction, time of day, colour grade, composition and where negative space sits, " +
              "and surface/material detail. Keep every explicit instruction from the brief exactly as given — " +
              "especially any headline text to render verbatim, colour palette, and prohibitions. " +
              "Never add text to the image that the brief did not request. Output the prompt only, no preamble.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 700,
      }),
    });
    if (!res.ok) return prompt;
    const json = await res.json();
    const enhanced = json?.choices?.[0]?.message?.content;
    return typeof enhanced === "string" && enhanced.trim().length > 80 ? enhanced.trim() : prompt;
  } catch (_err) {
    return prompt;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const rl = await checkRateLimit(clientKey(req, "generate-post-visual"), { limit: 15, windowMs: 60000 });
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  try {
    const gate = await requirePro(req);
    if (gate instanceof Response) return gate;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth: get user from JWT
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const supabase = serviceClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const {
      caption, hook, theme, postType, platform,
      visualDescription, colorPalette, textOverlay,
      brandColors, brandVoice, stylePrompt,
      model = "openai/gpt-image-2",
      quality = "high",
      enhance = true,
      referenceImage,
    } = body || {};

    if (typeof visualDescription !== "string" || !visualDescription.trim() || visualDescription.length > 6000) {
      return new Response(JSON.stringify({ error: "Image description must contain between 1 and 6,000 characters." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let productReference: string | null;
    try {
      productReference = parseReferenceImage(referenceImage);
    } catch (validationError) {
      return new Response(JSON.stringify({ error: (validationError as Error).message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const basePrompt = buildPrompt({
      caption, hook, theme, postType, platform,
      visualDescription, colorPalette, textOverlay,
      brandColors, brandVoice, stylePrompt,
      hasProductReference: Boolean(productReference),
    });
    const size = sizeForPlatform(platform, postType);
    // Keep structured, labeled strategy briefs intact. The enhancer is useful
    // for short ideas, but compressing a complete production brief can discard
    // required layout, product, copy, or CTA instructions.
    const prompt = enhance && basePrompt.length < 1400
      ? await enhanceBrief(basePrompt, LOVABLE_API_KEY)
      : basePrompt;

    // Body shape depends on the vendor: OpenAI image models take `prompt`,
    // Gemini image models take chat-style `messages` + `modalities`.
    // Product references use Gemini's multimodal image-generation body. The
    // OpenAI generations endpoint is text-only; its edit route is multipart.
    const selectedModel = productReference ? "google/gemini-3-pro-image" : String(model);
    const isGemini = selectedModel.startsWith("google/");
    const geminiContent = productReference
      ? [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: productReference } },
        ]
      : prompt;
    const requestBody = isGemini
      ? {
          model: selectedModel,
          messages: [{ role: "user", content: geminiContent }],
          modalities: ["image", "text"],
        }
      : {
          model: selectedModel,
          prompt,
          size,
          quality,
          output_format: "png",
          n: 1,
        };

    // Call Lovable AI Gateway image endpoint (non-streaming for simplicity)
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "AI Gateway rate limit reached. Please retry in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Workspace AI credits are depleted. Add credits in Lovable → Settings → Plans & credits, then retry.", code: "AI_CREDITS_DEPLETED" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `Image generation failed: ${errText}` }), {
        status: aiRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const b64 = aiJson?.data?.[0]?.b64_json;
    if (!b64) {
      return new Response(JSON.stringify({ error: "No image returned by model" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode and upload to media bucket
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const filename = `${userId}/generated/${Date.now()}-${crypto.randomUUID()}.png`;
    const { error: uploadErr } = await supabase.storage
      .from("media")
      .upload(filename, bytes, { contentType: "image/png", upsert: false });

    if (uploadErr) {
      return new Response(JSON.stringify({ error: `Upload failed: ${uploadErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pub } = supabase.storage.from("media").getPublicUrl(filename);

    const [width, height] = size.split("x").map(Number);
    const generatedName = filename.split("/").pop() ?? `korex-generated-${Date.now()}.png`;
    const { error: libraryErr } = await supabase.from("media_library").insert({
      user_id: userId,
      filename: generatedName,
      original_filename: generatedName,
      file_type: "image",
      mime_type: "image/png",
      file_size: bytes.byteLength,
      storage_url: pub.publicUrl,
      thumbnail_url: pub.publicUrl,
      width: Number.isFinite(width) ? width : null,
      height: Number.isFinite(height) ? height : null,
      title: "Korex generated visual",
      description: prompt.slice(0, 2000),
      alt_text: visualDescription.slice(0, 500),
      tags: productReference ? ["ai-generated", "korex-ui-reference"] : ["ai-generated"],
      times_used: 0,
      avg_engagement_rate: 0,
      total_impressions: 0,
      is_favorite: false,
    });

    if (libraryErr) {
      await supabase.storage.from("media").remove([filename]);
      return new Response(JSON.stringify({ error: `The image was generated, but could not be saved to Media: ${libraryErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      url: pub.publicUrl,
      path: filename,
      prompt,
      size,
      model: selectedModel,
      savedToMedia: true,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
