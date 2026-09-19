// Production layer for AI video ads.
//
// Everything here exists to answer one question per ad: what *visual* treatment
// does this specific script, on this specific strategy day, actually need?
// Elements (b-roll, brand backgrounds, text cards, captions) are opt-in per
// scene so consecutive ads don't collapse into the same look — the same
// anti-oversaturation discipline the strategy engine uses.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type SceneVisual = "avatar" | "broll" | "text-card" | "brand-color";

/** Lens/shot grammar — what size the frame is cut at. */
export type ShotType = "extreme-close" | "close-up" | "medium" | "wide" | "overhead" | "detail-insert";
/** Implied camera motion baked into the plate's blur, perspective and framing. */
export type CameraMove = "static" | "push-in" | "pull-out" | "pan" | "tilt" | "handheld" | "whip";
/** Where the presenter sits relative to the visual. */
export type Composition = "full-bleed" | "presenter-left" | "presenter-right" | "pip" | "split";
/** Cut rhythm for this beat — drives grade, contrast and framing tension. */
export type SceneEnergy = "calm" | "steady" | "punchy";
/** Where a headline sits vertically, expressed against the format's safe zones. */
export type TextPosition = "top" | "center" | "lower-third";

/* -------------------------------------------------------------------------- */
/* Format spec — the single source of truth for pixels and safe zones          */
/* -------------------------------------------------------------------------- */

export interface FormatSpec {
  aspect: string;
  width: number;
  height: number;
  /**
   * Fractions of the frame that must stay free of critical content. Anything
   * inside these bands is at risk of being cropped by the platform chrome
   * (feed UI, profile rail, CTA button) or covered by burned-in captions.
   */
  safe: { top: number; bottom: number; left: number; right: number };
  /** Human-readable note for the art-direction prompt. */
  captionBand: string;
}

export const FORMAT_SPECS: Record<string, FormatSpec> = {
  // Reels / TikTok / Shorts: heavy top and bottom chrome.
  "9:16": {
    aspect: "9:16",
    width: 720,
    height: 1280,
    safe: { top: 0.14, bottom: 0.2, left: 0.06, right: 0.06 },
    captionBand: "bottom fifth",
  },
  "1:1": {
    aspect: "1:1",
    width: 1080,
    height: 1080,
    safe: { top: 0.1, bottom: 0.16, left: 0.06, right: 0.06 },
    captionBand: "bottom sixth",
  },
  "16:9": {
    aspect: "16:9",
    width: 1280,
    height: 720,
    safe: { top: 0.08, bottom: 0.16, left: 0.05, right: 0.05 },
    captionBand: "bottom sixth",
  },
};

export function formatSpec(aspectRatio: string): FormatSpec {
  return FORMAT_SPECS[aspectRatio] ?? FORMAT_SPECS["9:16"];
}

/** Spoken words per second the TTS engine lands on at our render speed. */
export const WORDS_PER_SECOND = 2.4;

export function estimateSeconds(spoken: string): number {
  const words = spoken.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1.5, Math.round((words / WORDS_PER_SECOND) * 10) / 10);
}

export interface AdScene {
  /** hook | benefit | mechanism | promo | close */
  role: string;
  /** The words spoken during this beat. */
  spoken: string;
  visual: SceneVisual;
  /** Art direction for a generated background — only for broll / text-card. */
  background_prompt?: string;
  /** Short kinetic headline burned into a text card (max ~6 words). */
  on_screen_text?: string;
  /** Hex fallback pulled from the brand kit. */
  background_color?: string;

  /* ---- Edit layer: how the beat is SHOT and CUT, not just what's on it ---- */
  shot_type?: ShotType;
  camera_move?: CameraMove;
  composition?: Composition;
  energy?: SceneEnergy;

  /* ---- Timing + typography placement (derived, never improvised downstream) */
  duration_seconds?: number;
  text_position?: TextPosition;
}

/**
 * Editing intelligence: what the niche evidence says about how this ad should
 * be CUT, not just written. Surfaced to the user inside the Edit studio.
 */
export interface EditRecommendations {
  /** e.g. "Cut every 1.5s for the first 5 seconds" */
  cut_rhythm?: string;
  /** How to hold the first 2 seconds on this platform. */
  hook_retention?: string;
  /** Caption treatment: size, placement, styling. */
  caption_style?: string;
  /** How much on-screen text this niche's winners use. */
  text_density?: string;
  /** Music / sound-off guidance. */
  sound?: string;
  /** Where the CTA card goes and how long it holds. */
  cta_treatment?: string;
  /** Short list of concrete do-this-in-the-editor moves. */
  do_this?: string[];
  /** Short list of mistakes that kill performance in this niche. */
  avoid?: string[];
  /** One line on what evidence these calls came from. */
  evidence?: string;
}

export interface ProductionPlan {
  treatment: "talking-head" | "product-showcase" | "text-driven" | "hybrid";
  rationale: string;
  captions: boolean;
  /** One-line summary of the cut rhythm across the whole ad. */
  edit_style?: string;
  scenes: AdScene[];
  /** Resolved delivery format — every asset request must carry these numbers. */
  format?: FormatSpec;
  /** Sum of the scene durations, used for the post-render sanity check. */
  total_seconds?: number;
  /** Evidence-backed editing guidance for the Edit studio. */
  edit_recommendations?: EditRecommendations;
}



export interface BrandKit {
  websiteUrl?: string;
  colors: string[];
  primaryColor?: string;
  fonts: string[];
  imagery?: string;
  tone?: string;
  products?: string;
  summary?: string;
  /** Real photography lifted from the advertiser's own website. */
  referenceImages: string[];
}

/* -------------------------------------------------------------------------- */
/* Brand kit — design inspiration lifted from the user's own website           */
/* -------------------------------------------------------------------------- */

function pluckStrings(value: unknown, depth = 0): string[] {
  if (depth > 3 || !value) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((v) => pluckStrings(v, depth + 1));
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((v) => pluckStrings(v, depth + 1));
  }
  return [];
}

const HEX = /#[0-9a-fA-F]{3,8}\b/g;

/** Keeps only real, usable hero/product photography from a scraped page. */
function usableImages(scrapedPages: unknown, baseUrl?: string): string[] {
  const out: string[] = [];
  const pages = Array.isArray(scrapedPages) ? scrapedPages : [];

  for (const page of pages.slice(0, 6)) {
    const imgs = (page as { images?: { src?: string; alt?: string }[] })?.images ?? [];
    for (const img of imgs) {
      let src = String(img?.src ?? "").trim();
      if (!src) continue;
      if (src.startsWith("//")) src = `https:${src}`;
      if (src.startsWith("/") && baseUrl) {
        try {
          src = new URL(src, baseUrl).toString();
        } catch {
          continue;
        }
      }
      if (!/^https?:\/\//i.test(src)) continue;
      // Icons, sprites, trackers and vector marks make terrible art references.
      if (/\.svg(\?|$)|sprite|favicon|icon|logo|pixel|tracking|1x1|badge/i.test(src)) continue;
      if (!/\.(jpe?g|png|webp|avif)(\?|$)/i.test(src) && !/images?\.|cdn|media/i.test(src)) continue;
      out.push(src);
      if (out.length >= 8) return out;
    }
  }
  return out;
}

export async function loadBrandKit(
  supabase: SupabaseClient,
  userId: string,
  workspaceId?: string,
): Promise<BrandKit> {
  const kit: BrandKit = { colors: [], fonts: [], referenceImages: [] };

  try {
    let q = supabase
      .from("business_context")
      .select(
        "website_url, visual_identity, brand_architecture, business_profile, executive_summary, scraped_pages",
      )
      .eq("user_id", userId)
      .limit(1);
    if (workspaceId) q = q.eq("workspace_id", workspaceId);
    const { data } = await q.maybeSingle();
    if (!data) return kit;

    kit.websiteUrl = data.website_url ?? undefined;

    const vi = (data.visual_identity ?? {}) as Record<string, unknown>;
    const viText = JSON.stringify(vi);
    kit.colors = Array.from(new Set(viText.match(HEX) ?? [])).slice(0, 6);
    kit.primaryColor = kit.colors[0];

    kit.fonts = pluckStrings(vi.typography ?? vi.fonts)
      .filter((s) => s.length < 40)
      .slice(0, 3);
    kit.imagery = pluckStrings(vi.imagery ?? vi.photography ?? vi.style).slice(0, 4).join("; ") || undefined;

    const brand = (data.brand_architecture ?? {}) as Record<string, unknown>;
    kit.tone = pluckStrings(brand.tone ?? brand.voice ?? brand.personality).slice(0, 3).join("; ") || undefined;

    const profile = (data.business_profile ?? {}) as Record<string, unknown>;
    kit.products =
      pluckStrings(profile.products ?? profile.offerings ?? profile.services).slice(0, 6).join("; ") || undefined;

    kit.summary = pluckStrings(data.executive_summary).slice(0, 3).join(" ") || undefined;

    kit.referenceImages = usableImages((data as { scraped_pages?: unknown }).scraped_pages, kit.websiteUrl);
  } catch (e) {
    console.error("[ad-production] brand kit load failed (non-fatal):", e);
  }

  return kit;
}

/**
 * Downloads one of the advertiser's own website images and returns it as a
 * data URL so the image model can match their real product, palette and
 * photographic style instead of inventing generic stock imagery.
 */
export async function fetchReferenceImage(urls: string[]): Promise<string | null> {
  for (const url of urls.slice(0, 4)) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const type = res.headers.get("content-type") ?? "image/jpeg";
      if (!type.startsWith("image/")) continue;
      const buf = new Uint8Array(await res.arrayBuffer());
      // Skip tracking pixels and anything too heavy to inline.
      if (buf.byteLength < 8_000 || buf.byteLength > 4_000_000) continue;
      let binary = "";
      for (let i = 0; i < buf.length; i += 0x8000) {
        binary += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      }
      return `data:${type};base64,${btoa(binary)}`;
    } catch {
      continue;
    }
  }
  return null;
}


/* -------------------------------------------------------------------------- */
/* Diversification — never ship the same look twice in a row                   */
/* -------------------------------------------------------------------------- */

export async function recentTreatments(
  supabase: SupabaseClient,
  userId: string,
  limit = 8,
): Promise<{ treatment: string; hook: string }[]> {
  try {
    const { data } = await supabase
      .from("video_ads")
      .select("treatment, hook, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? [])
      .filter((r) => r.treatment)
      .map((r) => ({ treatment: String(r.treatment), hook: String(r.hook ?? "") }));
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* Scene visual generation                                                     */
/* -------------------------------------------------------------------------- */

const IMAGE_MODEL = "google/gemini-3-pro-image";

function aspectHint(aspectRatio: string): string {
  if (aspectRatio === "16:9") return "wide 16:9 landscape frame";
  if (aspectRatio === "1:1") return "square 1:1 frame";
  return "vertical 9:16 mobile frame";
}

/* ---- Edit grammar -------------------------------------------------------- */

const SHOT_DIRECTION: Record<ShotType, string> = {
  "extreme-close": "Extreme close-up on a single telling detail — texture, hands, a surface, a moment. Frame fills with one subject, everything else falls away.",
  "close-up": "Close-up framing, subject large in frame, tight crop, strong subject separation from a soft background.",
  medium: "Medium shot, subject in its working environment, balanced headroom, clear foreground/midground/background layering.",
  wide: "Wide establishing shot, generous negative space, subject small and deliberately placed against the environment.",
  overhead: "Top-down overhead flat-lay composition, precise geometric alignment, even directional light, clean shadow shapes.",
  "detail-insert": "Tight insert shot of a product detail or interaction, macro-adjacent, razor-thin depth of field, tactile materials.",
};

const CAMERA_DIRECTION: Record<CameraMove, string> = {
  static: "Locked-off tripod frame, perfectly still and composed.",
  "push-in": "Frozen mid dolly push-in: slight wide-angle compression toward the subject, edges of frame gently falling out of focus, sense of forward momentum.",
  "pull-out": "Frozen mid dolly pull-out: the subject sits deeper in frame with the environment opening up around it.",
  pan: "Frozen mid lateral pan: a whisper of horizontal motion blur on the frame edges, subject held sharp.",
  tilt: "Frozen mid vertical tilt: low or high perspective with converging vertical lines.",
  handheld: "Handheld documentary energy — very slight dutch tilt, imperfect framing, lived-in realism.",
  whip: "Frozen mid whip-pan: strong directional motion streaks across the outer third, subject core still readable.",
};

const ENERGY_DIRECTION: Record<SceneEnergy, string> = {
  calm: "Soft, airy grade. Low contrast, generous negative space, slow cinematic stillness.",
  steady: "Balanced commercial grade, confident contrast, controlled highlights.",
  punchy: "High-contrast punchy grade, deep blacks, crisp specular highlights, saturated brand accent, kinetic tension in the framing.",
};

/** Which side of the frame must stay quiet so the presenter can be composited in. */
function safeSideFor(composition: Composition, aspectRatio: string): string {
  if (composition === "full-bleed") {
    return aspectRatio === "9:16"
      ? "Keep the bottom fifth calm and low-detail — burned-in captions sit there."
      : "Keep the bottom fifth calm and low-detail — burned-in captions sit there.";
  }
  if (composition === "presenter-left") {
    return "Keep the LEFT third of the frame calm, uncluttered and low-detail — a presenter is composited there. Push the subject to the right of frame.";
  }
  if (composition === "split") {
    return "Compose so one clean half of the frame is a quiet field of colour or soft gradient and the other half carries the subject — a hard graphic split.";
  }
  // presenter-right / pip
  return aspectRatio === "9:16"
    ? "Keep the lower right quadrant calm and low-detail — a presenter bubble is composited there. Push the subject up and left."
    : "Keep the lower right third calm and low-detail — a presenter bubble is composited there.";
}

/**
 * Turns the format's safe zones into hard, numeric art-direction the image
 * model can obey. This is what stops headlines being cropped when the plate is
 * conformed to the delivery resolution or covered by platform chrome.
 */
function safeZoneDirective(spec: FormatSpec, position: TextPosition): string {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const band =
    position === "top"
      ? `Anchor the headline in the UPPER-MIDDLE of the frame, starting below the top ${pct(spec.safe.top)} of the image.`
      : position === "lower-third"
        ? `Anchor the headline in the lower third, but keep it entirely ABOVE the bottom ${pct(spec.safe.bottom)} of the image.`
        : "Anchor the headline in the exact optical centre of the frame.";

  return [
    `Target delivery resolution is exactly ${spec.width}x${spec.height} pixels (${spec.aspect}). Compose for that frame — no borders, no letterboxing, no mockup frames.`,
    band,
    `SAFE ZONES — absolutely no text, logo or critical subject detail inside the top ${pct(spec.safe.top)}, the bottom ${pct(spec.safe.bottom)}, the left ${pct(spec.safe.left)} or the right ${pct(spec.safe.right)} of the frame. Those bands are reserved for platform UI and burned-in captions.`,
    `Keep the ${spec.captionBand} calm and low-detail — captions are burned in there.`,
  ].join(" ");
}

/** Fills in shot grammar the model didn't specify, and guarantees cut-to-cut variety. */
export function applyEditGrammar(scenes: AdScene[]): AdScene[] {
  const shotCycle: ShotType[] = ["medium", "close-up", "detail-insert", "wide", "extreme-close"];
  const moveCycle: CameraMove[] = ["push-in", "static", "pan", "pull-out", "handheld"];

  return scenes.map((scene, i) => {
    const isHook = i === 0 || scene.role === "hook";
    const next = { ...scene };

    if (!next.energy) {
      next.energy = isHook || scene.role === "promo" ? "punchy" : i === scenes.length - 1 ? "punchy" : "steady";
    }
    if (!next.shot_type) {
      next.shot_type = scene.visual === "text-card" ? "medium" : shotCycle[i % shotCycle.length];
    }
    if (!next.camera_move) {
      next.camera_move = isHook ? "push-in" : moveCycle[i % moveCycle.length];
    }
    if (!next.composition) {
      if (scene.visual === "avatar") next.composition = "full-bleed";
      else if (scene.visual === "text-card") next.composition = i === scenes.length - 1 ? "full-bleed" : "pip";
      else next.composition = i % 2 === 0 ? "presenter-right" : "presenter-left";
    }

    return next;
  }).map((scene, i, all) => {
    // Never cut two identical shot sizes or moves back to back — that reads as a slideshow.
    if (i === 0) return scene;
    const prev = all[i - 1];
    if (scene.shot_type === prev.shot_type) {
      const alt: ShotType[] = ["close-up", "wide", "detail-insert", "medium", "overhead"];
      scene.shot_type = alt.find((s) => s !== prev.shot_type) ?? scene.shot_type;
    }
    if (scene.camera_move === prev.camera_move && scene.camera_move !== "static") {
      scene.camera_move = "static";
    }
    return scene;
  });
}

/**
 * Translates a scene's edit grammar into HeyGen presenter framing.
 * Varying scale and position between consecutive beats is what makes the ad
 * feel cut rather than pasted together.
 */
export function sceneFraming(
  scene: AdScene,
  aspectRatio: string,
): { characterStyle?: "normal" | "circle"; characterScale?: number; offsetX?: number; offsetY?: number } {
  const composition = scene.composition ?? "presenter-right";
  const vertical = aspectRatio === "9:16";

  if (composition === "full-bleed") {
    // Presenter tucked small and low so the visual owns the frame.
    return { characterStyle: "circle", characterScale: 0.3, offsetX: 0.3, offsetY: vertical ? 0.34 : 0.28 };
  }
  if (composition === "presenter-left") {
    return { characterStyle: "circle", characterScale: 0.46, offsetX: -0.28, offsetY: vertical ? 0.26 : 0.2 };
  }
  if (composition === "split") {
    return { characterStyle: "normal", characterScale: 0.62, offsetX: -0.22, offsetY: vertical ? 0.12 : 0.08 };
  }
  if (composition === "pip") {
    return { characterStyle: "circle", characterScale: 0.34, offsetX: 0.3, offsetY: vertical ? 0.32 : 0.26 };
  }
  // presenter-right
  return { characterStyle: "circle", characterScale: 0.48, offsetX: 0.28, offsetY: vertical ? 0.28 : 0.22 };
}

/** Composes the art-direction prompt for one scene background. */
export function sceneImagePrompt(scene: AdScene, kit: BrandKit, aspectRatio: string): string {
  const palette = kit.colors.length ? `Brand palette to obey exactly: ${kit.colors.join(", ")}.` : "";
  const typography = kit.fonts.length ? `Typographic feel: ${kit.fonts.join(", ")}.` : "";
  const imagery = kit.imagery ? `Existing brand imagery style: ${kit.imagery}.` : "";
  const product = kit.products ? `The advertiser sells: ${kit.products}.` : "";
  const grounding = kit.referenceImages.length
    ? "A reference photograph from the advertiser's own website is attached. Match its product, colour grade, materials, lighting and photographic style so the frame is unmistakably this brand. Do not copy it literally — art-direct a new, better-composed campaign frame from it."
    : "";

  const composition = scene.composition ?? "presenter-right";
  const spec = formatSpec(aspectRatio);
  const safeSide = safeSideFor(composition, aspectRatio);
  const safeZones = safeZoneDirective(spec, scene.text_position ?? "center");
  const shot = SHOT_DIRECTION[scene.shot_type ?? "medium"];
  const camera = CAMERA_DIRECTION[scene.camera_move ?? "static"];
  const energy = ENERGY_DIRECTION[scene.energy ?? "steady"];

  if (scene.visual === "text-card") {
    const layout =
      composition === "split"
        ? "Split-screen layout: type locked to one half, a brand-tinted photographic field on the other."
        : composition === "presenter-left"
          ? "Type set hard to the right of frame on a strict grid, left third left empty."
          : "Type set as an oversized stack on a deliberate baseline grid.";

    return [
      `A broadcast-grade advertising motion-graphics title frame, ${aspectHint(aspectRatio)}, at the quality bar of a Nike or Apple campaign end-card.`,
      `Render this exact headline, spelled precisely, as the ONLY text in the image: "${scene.on_screen_text ?? ""}".`,
      "Oversized bold contemporary grotesk typography, tight kerning, one accent word emphasised in the brand accent colour, crisp edges, generous negative space, subtle depth (soft gradient field or gently blurred brand-tinted photographic backdrop — never flat clip-art).",
      layout,
      camera,
      energy,
      safeZones,
      safeSide,
      palette,
      typography,
      grounding,
      "No watermarks, no logos, no extra words, no lorem ipsum, no misspellings, no gibberish letterforms, no UI chrome.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    `Cinematic advertising b-roll background plate, ${aspectHint(aspectRatio)}, at the production quality of a national brand campaign.`,
    scene.background_prompt ?? "Premium product-in-context environment.",
    product,
    shot,
    camera,
    energy,
    "Shot on a full-frame camera with a fast prime, shallow depth of field, motivated directional key light with soft falloff, rich contrast, subtle film grain, professional colour grade with clean skin tones and deep blacks. Real materials and real environments — nothing plasticky, nothing AI-glossy, no surreal artefacts.",
    safeZones,
    safeSide,
    palette,
    imagery,
    grounding,
    "No text, no typography, no logos, no watermarks, no people looking at camera, no distorted hands or faces.",
  ]
    .filter(Boolean)
    .join(" ");
}

/* -------------------------------------------------------------------------- */
/* Plate conforming — the fix for wrong framing / cropping                     */
/* -------------------------------------------------------------------------- */

/**
 * Image models only *approximate* a requested aspect ratio (a 9:16 request
 * commonly comes back 768x1376, a 1:1 request comes back landscape). Handing
 * that straight to the renderer means it gets cover-cropped by an unknown
 * amount and the composition — including any headline — drifts out of frame.
 *
 * We conform every plate to the exact delivery resolution ourselves, with a
 * centre-weighted cover crop, so what the art direction composed is what the
 * renderer receives.
 */
export async function conformPlate(
  bytes: Uint8Array,
  width: number,
  height: number,
): Promise<Uint8Array> {
  try {
    const { decode, Image } = await import("https://deno.land/x/imagescript@1.2.17/mod.ts");
    const decoded = (await decode(bytes)) as InstanceType<typeof Image>;
    if (decoded.width === width && decoded.height === height) return bytes;

    const scale = Math.max(width / decoded.width, height / decoded.height);
    const resized = decoded.resize(
      Math.max(width, Math.ceil(decoded.width * scale)),
      Math.max(height, Math.ceil(decoded.height * scale)),
    );
    const cropped = resized.crop(
      Math.floor((resized.width - width) / 2),
      Math.floor((resized.height - height) / 2),
      width,
      height,
    );
    return await cropped.encode();
  } catch (e) {
    console.error("[ad-production] plate conform failed, using original:", e);
    return bytes;
  }
}


/**
 * Generates one background plate and returns raw PNG bytes.
 * When a reference image from the advertiser's website is supplied, the plate
 * is art-directed from their real brand imagery rather than invented.
 */
export async function generateSceneImage(
  prompt: string,
  apiKey: string,
  referenceImage?: string | null,
): Promise<Uint8Array | null> {
  const content = referenceImage
    ? [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: referenceImage } },
      ]
    : prompt;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        messages: [{ role: "user", content }],
        modalities: ["image", "text"],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[ad-production] scene image failed [${res.status}]: ${body}`);
      // A rejected reference image must never cost us the visual entirely.
      if (referenceImage) return await generateSceneImage(prompt, apiKey, null);
      return null;
    }

    const json = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) return null;
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  } catch (e) {
    console.error("[ad-production] scene image error:", e);
    return null;
  }
}


/** Archives the plate so the user can see what was used inside their ad. */
export async function archiveSceneImage(
  supabase: SupabaseClient,
  userId: string,
  bytes: Uint8Array,
): Promise<string | null> {
  const path = `${userId}/scenes/${Date.now()}-${crypto.randomUUID()}.png`;
  const { error } = await supabase.storage
    .from("ad-scene-assets")
    .upload(path, bytes, { contentType: "image/png", upsert: false });
  if (error) {
    console.error("[ad-production] archive failed (non-fatal):", error.message);
    return null;
  }
  return path;
}

/* -------------------------------------------------------------------------- */
/* Safety rails                                                                */
/* -------------------------------------------------------------------------- */

/** Caps how much visual production a single render is allowed to request. */
export const MAX_GENERATED_PLATES = 4;

/** Compresses a spoken line into a short kinetic headline for a text card. */
function headlineFrom(spoken: string): string {
  const clean = spoken.replace(/[^\w\s%$.,'-]/g, " ").replace(/\s+/g, " ").trim();
  const words = clean.split(" ").filter(Boolean).slice(0, 6);
  return words.join(" ").replace(/[.,]$/, "");
}

/**
 * Finalises the shot list: every scene leaves this function with a duration, a
 * text position resolved against the format's safe zones, and full edit
 * grammar. Downstream stages read the plan — they never improvise structure.
 */
export function normalizePlan(
  plan: unknown,
  fallbackScript: string,
  aspectRatio = "9:16",
): ProductionPlan {
  const p = (plan ?? {}) as Partial<ProductionPlan>;
  const rawScenes = Array.isArray(p.scenes) ? p.scenes : [];

  const scenes: AdScene[] = rawScenes
    .filter((s) => s && typeof (s as AdScene).spoken === "string" && (s as AdScene).spoken.trim())
    .slice(0, 5)
    .map((s) => {
      const scene = s as AdScene;
      const visual: SceneVisual = (["avatar", "broll", "text-card", "brand-color"] as SceneVisual[]).includes(
        scene.visual,
      )
        ? scene.visual
        : "avatar";
      const pick = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined =>
        allowed.includes(value as T) ? (value as T) : undefined;

      return {
        role: String(scene.role ?? "beat"),
        spoken: scene.spoken.trim(),
        visual,
        background_prompt: scene.background_prompt ? String(scene.background_prompt).slice(0, 600) : undefined,
        on_screen_text: scene.on_screen_text ? String(scene.on_screen_text).slice(0, 70) : undefined,
        background_color: /^#[0-9a-fA-F]{3,8}$/.test(String(scene.background_color ?? ""))
          ? String(scene.background_color)
          : undefined,
        shot_type: pick(scene.shot_type, [
          "extreme-close",
          "close-up",
          "medium",
          "wide",
          "overhead",
          "detail-insert",
        ] as const),
        camera_move: pick(scene.camera_move, [
          "static",
          "push-in",
          "pull-out",
          "pan",
          "tilt",
          "handheld",
          "whip",
        ] as const),
        composition: pick(scene.composition, [
          "full-bleed",
          "presenter-left",
          "presenter-right",
          "pip",
          "split",
        ] as const),
        energy: pick(scene.energy, ["calm", "steady", "punchy"] as const),
        text_position: pick(scene.text_position, ["top", "center", "lower-third"] as const),
      };
    });


  const spec = formatSpec(aspectRatio);

  if (!scenes.length) {
    // Even a bare script gets a produced treatment — a flat talking head is
    // below the bar advertisers are competing against.
    const sentences = fallbackScript
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const mid = Math.max(1, Math.ceil(sentences.length / 3));
    const parts = [
      sentences.slice(0, mid).join(" "),
      sentences.slice(mid, mid * 2).join(" "),
      sentences.slice(mid * 2).join(" "),
    ].filter(Boolean);

    const fallbackScenes: AdScene[] =
      parts.length > 1
        ? parts.map((spoken, i) => ({
            role: i === 0 ? "hook" : i === parts.length - 1 ? "close" : "benefit",
            spoken,
            visual: (i === 0 ? "avatar" : i === parts.length - 1 ? "text-card" : "broll") as SceneVisual,
            on_screen_text: i === parts.length - 1 ? headlineFrom(spoken) : undefined,
            background_prompt:
              i === 0 || i === parts.length - 1
                ? undefined
                : "The advertiser's product or service being used in its real environment.",
          }))
        : [{ role: "full", spoken: fallbackScript, visual: "avatar" as SceneVisual }];

    const finalised = finaliseTiming(applyEditGrammar(fallbackScenes), spec);
    return {
      treatment: parts.length > 1 ? "hybrid" : "talking-head",
      rationale: "Auto-storyboarded: presenter hook, product b-roll, typographic close.",
      captions: true,
      edit_style: editStyleSummary(finalised),
      scenes: finalised,
      format: spec,
      total_seconds: totalSeconds(finalised),
    };
  }

  // Hard cap on generated plates keeps render time and cost predictable.
  let plates = 0;
  for (const scene of scenes) {
    if (scene.visual === "broll" || scene.visual === "text-card") {
      plates += 1;
      if (plates > MAX_GENERATED_PLATES) scene.visual = "brand-color";
    }
    // A text card without a headline is just an empty frame.
    if (scene.visual === "text-card" && !scene.on_screen_text) {
      scene.on_screen_text = headlineFrom(scene.spoken);
    }
  }

  // Never ship an all-avatar multi-scene ad — the mid beats carry the visuals.
  if (plates === 0 && scenes.length > 1) {
    const last = scenes[scenes.length - 1];
    const mid = scenes[1];
    mid.visual = "broll";
    mid.background_prompt =
      mid.background_prompt ?? "The advertiser's product or service being used in its real environment.";
    if (scenes.length > 2) {
      last.visual = "text-card";
      last.on_screen_text = last.on_screen_text ?? headlineFrom(last.spoken);
    }
  }


  const treatment = (["talking-head", "product-showcase", "text-driven", "hybrid"] as const).includes(
    p.treatment as never,
  )
    ? (p.treatment as ProductionPlan["treatment"])
    : "hybrid";

  const edited = finaliseTiming(applyEditGrammar(scenes), spec);

  return {
    treatment,
    rationale: String(p.rationale ?? "").slice(0, 400),
    captions: p.captions !== false,
    edit_style: p.edit_style
      ? String(p.edit_style).slice(0, 200)
      : editStyleSummary(edited),
    scenes: edited,
    format: spec,
    total_seconds: totalSeconds(edited),
    edit_recommendations: normalizeEditRecommendations(
      (p as { edit_recommendations?: unknown }).edit_recommendations,
    ),
  };
}

/** Trims model-authored editing guidance down to something safe to render. */
export function normalizeEditRecommendations(value: unknown): EditRecommendations | undefined {
  if (!value || typeof value !== "object") return undefined;
  const r = value as Record<string, unknown>;
  const line = (v: unknown, max = 220) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
  const list = (v: unknown) =>
    Array.isArray(v)
      ? v.filter((i) => typeof i === "string" && i.trim()).slice(0, 6).map((i) => String(i).trim().slice(0, 200))
      : undefined;

  const out: EditRecommendations = {
    cut_rhythm: line(r.cut_rhythm),
    hook_retention: line(r.hook_retention),
    caption_style: line(r.caption_style),
    text_density: line(r.text_density),
    sound: line(r.sound),
    cta_treatment: line(r.cta_treatment),
    do_this: list(r.do_this),
    avoid: list(r.avoid),
    evidence: line(r.evidence, 260),
  };

  return Object.values(out).some(Boolean) ? out : undefined;
}


/**
 * Stamps every beat with its spoken duration and resolves where its headline
 * sits. Text never lands in a safe-zone band, and never in the caption band.
 */
function finaliseTiming(scenes: AdScene[], spec: FormatSpec): AdScene[] {
  return scenes.map((scene) => {
    const next = { ...scene };
    if (!next.duration_seconds || next.duration_seconds <= 0) {
      next.duration_seconds = estimateSeconds(next.spoken);
    }
    if (!next.text_position) {
      // Captions occupy the bottom band, so a headline only ever sits high or
      // dead centre — the lower third is reserved and must be opted into.
      next.text_position = next.composition === "full-bleed" ? "center" : "top";
    }
    if (next.text_position === "lower-third" && spec.safe.bottom >= 0.2) {
      // Not enough clearance in this format — promote it out of the caption band.
      next.text_position = "center";
    }
    return next;
  });
}

function totalSeconds(scenes: AdScene[]): number {
  return Math.round(scenes.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) * 10) / 10;
}

/** Human-readable one-liner describing the cut rhythm we ended up with. */
function editStyleSummary(scenes: AdScene[]): string {
  const moves = Array.from(new Set(scenes.map((s) => s.camera_move ?? "static")));
  const shots = Array.from(new Set(scenes.map((s) => s.shot_type ?? "medium")));
  return `${scenes.length}-beat cut — ${shots.join(" / ")} shot sizes, ${moves.join(" / ")} camera.`;
}


