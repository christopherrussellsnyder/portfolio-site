// Thin HeyGen API client used by the video ad pipeline.
// Docs: https://docs.heygen.com

const HEYGEN_BASE = "https://api.heygen.com";

export function heygenKey(): string {
  const key = Deno.env.get("HEYGEN_API_KEY");
  if (!key) throw new Error("HEYGEN_API_KEY is not configured");
  return key;
}

export const ASPECT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "9:16": { width: 720, height: 1280 },
  "16:9": { width: 1280, height: 720 },
  "1:1": { width: 1080, height: 1080 },
};

interface HeygenError {
  status: number;
  body: string;
}

async function heygenFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${HEYGEN_BASE}${path}`, {
    ...init,
    headers: {
      "X-Api-Key": heygenKey(),
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`[heygen] ${path} failed [${res.status}]: ${text}`);
    const err: HeygenError = { status: res.status, body: text };
    throw Object.assign(new Error(`HeyGen request failed (${res.status})`), { heygen: err });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("HeyGen returned a malformed response");
  }

  // HeyGen reports some failures inside a 200 body.
  const errorField = parsed?.error;
  if (errorField) {
    const message =
      typeof errorField === "string"
        ? errorField
        : (errorField as Record<string, unknown>)?.message ?? "Unknown HeyGen error";
    console.error(`[heygen] ${path} returned an in-body error: ${JSON.stringify(errorField)}`);
    throw new Error(String(message));
  }

  return parsed;
}

/** One rendered beat of the ad. Backgrounds must already be resolved to a HeyGen-reachable asset. */
export interface RenderScene {
  text: string;
  backgroundUrl?: string;
  backgroundAssetId?: string;
  backgroundColor?: string;
  /** 1 = full frame. Smaller values push the presenter aside so on-screen visuals breathe. */
  characterScale?: number;
  offsetX?: number;
  offsetY?: number;
  /** "normal" for a full set shot, "circle" for a picture-in-picture presenter over b-roll. */
  characterStyle?: "normal" | "circle";
}


export interface CreateVideoArgs {
  script: string;
  avatarId: string;
  voiceId: string;
  aspectRatio: string;
  speed?: number;
  /** When supplied, the ad renders as a multi-scene storyboard instead of a single talking head. */
  scenes?: RenderScene[];
  /** Burn animated captions into the render. */
  captions?: boolean;
}

function buildBackground(scene: RenderScene): Record<string, unknown> | undefined {
  // Prefer the hosted URL HeyGen hands back on upload. The `image_key`
  // ("image/<id>/original.png") is NOT a valid `image_asset_id` for v2 and the
  // API rejects the render with "Background image asset not found".
  if (scene.backgroundUrl) return { type: "image", url: scene.backgroundUrl, fit: "cover" };
  if (scene.backgroundAssetId) return { type: "image", image_asset_id: scene.backgroundAssetId, fit: "cover" };
  if (scene.backgroundColor) return { type: "color", value: scene.backgroundColor };
  return undefined;
}

/** Kicks off a render. Returns the HeyGen video id to poll. */
export async function createHeygenVideo(args: CreateVideoArgs): Promise<string> {
  const dimension = ASPECT_DIMENSIONS[args.aspectRatio] ?? ASPECT_DIMENSIONS["9:16"];
  const speed = args.speed ?? 1.05; // slightly quick — reads as natural UGC, not corporate

  const scenes: RenderScene[] =
    args.scenes && args.scenes.length ? args.scenes : [{ text: args.script }];

  const build = (withBackgrounds: boolean) => ({
    video_inputs: scenes.map((scene) => {
      const background = withBackgrounds ? buildBackground(scene) : undefined;
      const character: Record<string, unknown> = {
        type: "avatar",
        avatar_id: args.avatarId,
        avatar_style: background && scene.characterStyle === "circle" ? "circle" : "normal",
      };
      if (withBackgrounds && scene.characterScale && scene.characterScale !== 1) {
        character.scale = scene.characterScale;
        character.offset = { x: scene.offsetX ?? 0, y: scene.offsetY ?? 0 };
      }
      return {
        character,
        voice: { type: "text", input_text: scene.text, voice_id: args.voiceId, speed },
        ...(background ? { background } : {}),
      };
    }),
    dimension,
    ...(args.captions === false ? {} : { caption: true }),
  });


  const send = async (withBackgrounds: boolean) => {
    const result = (await heygenFetch("/v2/video/generate", {
      method: "POST",
      body: JSON.stringify(build(withBackgrounds)),
    })) as { data?: { video_id?: string } };
    const videoId = result?.data?.video_id;
    if (!videoId) throw new Error("HeyGen did not return a video id");
    return videoId;
  };

  const hasBackgrounds = scenes.some((s) => buildBackground(s));
  try {
    return await send(hasBackgrounds);
  } catch (err) {
    // A bad background must never cost the user the whole render — retry clean.
    if (!hasBackgrounds) throw err;
    console.error("[heygen] render with backgrounds failed, retrying without them:", err);
    return await send(false);
  }
}


/**
 * Uploads raw image bytes to HeyGen's asset store so they can be used as a
 * scene background. Avoids needing a publicly reachable URL of our own.
 */
export async function uploadHeygenImage(
  bytes: Uint8Array,
  contentType = "image/png",
): Promise<{ url?: string; assetId?: string }> {
  const res = await fetch("https://upload.heygen.com/v1/asset", {
    method: "POST",
    headers: { "X-Api-Key": heygenKey(), "Content-Type": contentType },
    body: bytes as unknown as BodyInit,
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`[heygen] asset upload failed [${res.status}]: ${text}`);
    throw new Error(`HeyGen asset upload failed (${res.status})`);
  }

  let parsed: { data?: { url?: string; image_key?: string; id?: string } };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("HeyGen returned a malformed asset response");
  }

  // `image_key` is an upload path, not a render-time asset id — never use it as one.
  return { url: parsed?.data?.url, assetId: parsed?.data?.id };

}


export interface HeygenStatus {
  status: "pending" | "processing" | "completed" | "failed" | string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  error?: string;
}

/** Polls a single render. */
export async function getHeygenStatus(videoId: string): Promise<HeygenStatus> {
  const result = (await heygenFetch(
    `/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`,
  )) as {
    data?: {
      status?: string;
      video_url?: string;
      thumbnail_url?: string;
      duration?: number;
      error?: { message?: string; detail?: string } | string | null;
    };
  };

  const d = result?.data ?? {};
  let error: string | undefined;
  if (d.error) {
    error =
      typeof d.error === "string" ? d.error : d.error.message ?? d.error.detail ?? "Render failed";
  }

  return {
    status: d.status ?? "pending",
    videoUrl: d.video_url,
    thumbnailUrl: d.thumbnail_url,
    duration: d.duration,
    error,
  };
}

export interface AdActor {
  avatar_id: string;
  name: string;
  preview_image_url?: string;
  preview_video_url?: string;
  gender?: string;
}

export interface AdVoice {
  voice_id: string;
  name: string;
  language?: string;
  gender?: string;
  preview_audio?: string;
}

/**
 * Fetches the actor catalog. We deliberately favour filmed, natural-looking
 * avatars over corporate presenter styles so output reads as authentic UGC.
 */
export async function listHeygenAvatars(): Promise<AdActor[]> {
  const result = (await heygenFetch("/v2/avatars")) as {
    data?: { avatars?: Record<string, unknown>[] };
  };

  const avatars = result?.data?.avatars ?? [];
  return avatars
    .map((a) => ({
      avatar_id: String(a.avatar_id ?? ""),
      name: String(a.avatar_name ?? a.name ?? "Actor"),
      preview_image_url: a.preview_image_url ? String(a.preview_image_url) : undefined,
      preview_video_url: a.preview_video_url ? String(a.preview_video_url) : undefined,
      gender: a.gender ? String(a.gender) : undefined,
    }))
    .filter((a) => a.avatar_id);
}

export async function listHeygenVoices(): Promise<AdVoice[]> {
  const result = (await heygenFetch("/v2/voices")) as {
    data?: { voices?: Record<string, unknown>[] };
  };

  const voices = result?.data?.voices ?? [];
  return voices
    .map((v) => ({
      voice_id: String(v.voice_id ?? ""),
      name: String(v.name ?? "Voice"),
      language: v.language ? String(v.language) : undefined,
      gender: v.gender ? String(v.gender) : undefined,
      preview_audio: v.preview_audio ? String(v.preview_audio) : undefined,
    }))
    .filter((v) => v.voice_id)
    // English-first: the ad engine writes English scripts.
    .filter((v) => !v.language || /english/i.test(v.language));
}
