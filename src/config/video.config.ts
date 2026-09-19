// Video ad generation limits — must stay in sync with
// supabase/functions/_shared/video-quota.ts
export const VIDEO_AD_LIMITS = {
  starter: 2, // lifetime trial
  pro: 10, // per month
  agency: 35, // per month
} as const;

export const VIDEO_ASPECT_RATIOS = [
  { value: '9:16', label: 'Vertical 9:16', hint: 'TikTok, Reels, Shorts' },
  { value: '1:1', label: 'Square 1:1', hint: 'Feed placements' },
  { value: '16:9', label: 'Landscape 16:9', hint: 'YouTube, in-stream' },
] as const;

export const VIDEO_HOOK_ANGLES = [
  {
    value: 'auto',
    label: 'Test all three',
    hint: 'Rotate intelligence, time and money hooks',
  },
  {
    value: 'intelligence',
    label: 'Intelligence',
    hint: 'How the thinking beats guessing',
  },
  { value: 'time', label: 'Time saved', hint: 'Hours given back every week' },
  { value: 'money', label: 'Money saved', hint: 'Versus agencies and freelancers' },
] as const;

export type VideoAdStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type SceneVisual = 'avatar' | 'broll' | 'text-card' | 'brand-color';

export type ShotType =
  | 'extreme-close'
  | 'close-up'
  | 'medium'
  | 'wide'
  | 'overhead'
  | 'detail-insert';
export type CameraMove =
  | 'static'
  | 'push-in'
  | 'pull-out'
  | 'pan'
  | 'tilt'
  | 'handheld'
  | 'whip';
export type Composition = 'full-bleed' | 'presenter-left' | 'presenter-right' | 'pip' | 'split';
export type SceneEnergy = 'calm' | 'steady' | 'punchy';
export type TextPosition = 'top' | 'center' | 'lower-third';

/** Pixel spec + safe zones for a delivery format. Mirrors FORMAT_SPECS on the backend. */
export interface FormatSpec {
  aspect: string;
  width: number;
  height: number;
  safe: { top: number; bottom: number; left: number; right: number };
  captionBand: string;
}

export interface AdScene {
  role: string;
  spoken: string;
  visual: SceneVisual;
  background_prompt?: string;
  on_screen_text?: string;
  background_color?: string;
  shot_type?: ShotType;
  camera_move?: CameraMove;
  composition?: Composition;
  energy?: SceneEnergy;
  duration_seconds?: number;
  text_position?: TextPosition;
}

/**
 * Where a creative recommendation actually comes from.
 * - measured: this advertiser's own measured results
 * - niche_calibrated: predicted-vs-actual data aggregated across the niche
 * - best_practice: general craft knowledge the model is applying
 */
export type CreativeBasis = 'measured' | 'niche_calibrated' | 'best_practice';

/** A creative choice scored against real outcomes for this niche. */
export interface CalibratedCreativePattern {
  pattern_type: string;
  pattern_value: string;
  error_pct: number;
  sample_size: number;
  avg_actual: number;
}

/** Provenance of the evidence behind an ad's creative direction. */
export interface AdEvidence {
  first_party: boolean;
  ai_estimated: boolean;
  calibrated_patterns: CalibratedCreativePattern[];
}

/** Evidence-backed guidance for how to CUT the ad, surfaced in the Edit studio. */
export interface EditRecommendations {
  cut_rhythm?: string;
  hook_retention?: string;
  caption_style?: string;
  text_density?: string;
  sound?: string;
  cta_treatment?: string;
  do_this?: string[];
  avoid?: string[];
  evidence?: string;
  basis?: CreativeBasis;
}

export interface ProductionPlan {
  treatment: 'talking-head' | 'product-showcase' | 'text-driven' | 'hybrid';
  rationale: string;
  captions: boolean;
  edit_style?: string;
  scenes: AdScene[];
  assets?: { role: string; visual: string; storage_path?: string }[];
  format?: FormatSpec;
  total_seconds?: number;
  edit_recommendations?: EditRecommendations;
  evidence?: AdEvidence;
}




export const SCENE_VISUAL_LABELS: Record<SceneVisual, string> = {
  avatar: 'Presenter',
  broll: 'B-roll',
  'text-card': 'Text card',
  'brand-color': 'Brand field',
};

export const SHOT_LABELS: Record<ShotType, string> = {
  'extreme-close': 'Extreme close',
  'close-up': 'Close-up',
  medium: 'Medium',
  wide: 'Wide',
  overhead: 'Overhead',
  'detail-insert': 'Detail insert',
};

export const CAMERA_LABELS: Record<CameraMove, string> = {
  static: 'Locked off',
  'push-in': 'Push in',
  'pull-out': 'Pull out',
  pan: 'Pan',
  tilt: 'Tilt',
  handheld: 'Handheld',
  whip: 'Whip pan',
};

export const COMPOSITION_LABELS: Record<Composition, string> = {
  'full-bleed': 'Full bleed',
  'presenter-left': 'Presenter left',
  'presenter-right': 'Presenter right',
  pip: 'Picture-in-picture',
  split: 'Split screen',
};

export const TREATMENT_LABELS: Record<ProductionPlan['treatment'], string> = {
  'talking-head': 'Talking head',
  'product-showcase': 'Product showcase',
  'text-driven': 'Text driven',
  hybrid: 'Hybrid',
};

export const TEXT_POSITION_LABELS: Record<TextPosition, string> = {
  top: 'Text top',
  center: 'Text centre',
  'lower-third': 'Text lower third',
};


export interface VideoAdRecord {
  id: string;
  title: string | null;
  hook: string | null;
  script: string;
  angle: string | null;
  avatar_id: string;
  avatar_name: string | null;
  avatar_preview_url: string | null;
  voice_id: string | null;
  aspect_ratio: string;
  status: VideoAdStatus;
  storage_path: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  error_message: string | null;
  created_at: string;
  treatment: string | null;
  scene_count: number | null;
  production_plan: ProductionPlan | null;
}

export interface AdScriptVariant {
  angle: string;
  title: string;
  hook: string;
  script: string;
  estimated_seconds?: number;
  why_it_works?: string;
  production_plan?: ProductionPlan;
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
}

export interface VideoQuota {
  tier: 'starter' | 'pro' | 'agency' | 'founder';
  limit: number | null;
  used: number;
  remaining: number | null;
  is_trial: boolean;
}
