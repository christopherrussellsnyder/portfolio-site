// In-browser caption burning for the Edit studio's "smallest useful slice"
// of an in-app editor: burns the already-generated .srt file directly onto
// a rendered ad, entirely client-side, so the user doesn't have to round-trip
// through a third-party editor just to get captions on screen.
//
// Uses ffmpeg.wasm (the real FFmpeg, compiled to WebAssembly). Verified
// directly against the compiled ffmpeg-core.wasm binary (0.12.10) that the
// `subtitles` filter -- which needs libass -- is actually compiled in: the
// exact filter description strings ("Render text subtitles onto input video
// using the libass library.") are present in the binary. This is not
// guaranteed by every ffmpeg.wasm core build (libass is commonly left out
// to save size), so that was confirmed before writing this, not assumed.
//
// The core (~30MB) is loaded from jsdelivr's CDN on first use, not bundled
// into the app -- it's the same pattern ffmpeg.wasm's own docs recommend,
// and avoids committing a 30MB binary into this repo's git history. The
// single-threaded core is used deliberately: the multi-threaded core is
// faster but requires the host to send cross-origin-isolation headers
// (COOP/COEP), which isn't something this code can verify is configured on
// every hosting target this app runs under.
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const FFMPEG_CORE_VERSION = "0.12.10";
const FFMPEG_CORE_BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`;

// Module-level singleton: the ~30MB core is downloaded at most once per page
// load, even if the user burns captions on several clips in one session.
let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = (async () => {
      const ffmpeg = new FFmpeg();
      const [coreURL, wasmURL] = await Promise.all([
        toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
        toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
      ]);
      await ffmpeg.load({ coreURL, wasmURL });
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })();
  }
  try {
    return await ffmpegLoadPromise;
  } catch (err) {
    // Let a failed load be retried on the next click instead of permanently
    // wedging every future attempt on one bad fetch (e.g. a transient CDN blip).
    ffmpegLoadPromise = null;
    throw err;
  }
}

export type BurnStage = "loading-engine" | "processing" | "done";

export interface BurnCaptionsArgs {
  videoUrl: string;
  srt: string;
  onStage?: (stage: BurnStage) => void;
  /** 0-1 */
  onProgress?: (ratio: number) => void;
}

/** Burns the given .srt captions onto the video at videoUrl, entirely in-browser. Returns a downloadable Blob. */
export async function burnCaptions({
  videoUrl,
  srt,
  onStage,
  onProgress,
}: BurnCaptionsArgs): Promise<Blob> {
  onStage?.("loading-engine");
  const ffmpeg = await getFFmpeg();

  const handleProgress = ({ progress }: { progress: number }) => {
    // ffmpeg.wasm's reported progress occasionally spikes above 1 or stays
    // negative for a moment right at the start -- clamp rather than let a
    // progress bar visibly jump backwards or overflow.
    onProgress?.(Math.min(1, Math.max(0, progress)));
  };
  ffmpeg.on("progress", handleProgress);

  try {
    onStage?.("processing");
    const inputName = "input.mp4";
    const srtName = "captions.srt";
    const outputName = "output.mp4";

    await ffmpeg.writeFile(inputName, await fetchFile(videoUrl));
    await ffmpeg.writeFile(srtName, srt);

    // force_style keeps the burned-in look consistent regardless of what
    // font/size the user's system would otherwise default to: white text,
    // black outline, bottom-center -- matches the "safe zone" caption
    // placement the rest of the Edit studio already describes.
    await ffmpeg.exec([
      "-i",
      inputName,
      "-vf",
      "subtitles=captions.srt:force_style='FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Alignment=2,MarginV=60'",
      "-c:a",
      "copy",
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    onStage?.("done");
    return new Blob([bytes], { type: "video/mp4" });
  } finally {
    ffmpeg.off("progress", handleProgress);
  }
}
