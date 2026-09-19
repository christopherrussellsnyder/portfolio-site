// Strategy day -> Content Generation handoff.
//
// A strategy post carries everything Content Generation needs (hook, scene,
// palette, CTA, on-screen text). Rather than making the user retype it, we
// stash a prefill payload keyed by post id and let the destination page read
// it once. sessionStorage keeps URLs short and survives a page refresh.

export interface ContentHandoff {
  postId: string;
  theme?: string;
  dayNumber?: number;
  /** Video side */
  videoBrief: string;
  angle: string;
  durationSeconds: number;
  aspectRatio: string;
  promoDetail?: string;
  promoCode?: string;
  /** Image side */
  imageConcept: string;
  textOverlay?: string;
  palette?: string;
  platform: string;
  /** Which tab to land on. */
  tab: 'video' | 'image';
}

const key = (postId: string) => `korex:content-handoff:${postId}`;

export function saveContentHandoff(payload: ContentHandoff) {
  try {
    sessionStorage.setItem(key(payload.postId), JSON.stringify(payload));
  } catch {
    /* private mode — the page simply falls back to manual entry */
  }
}

export function readContentHandoff(postId: string): ContentHandoff | null {
  try {
    const raw = sessionStorage.getItem(key(postId));
    return raw ? (JSON.parse(raw) as ContentHandoff) : null;
  } catch {
    return null;
  }
}

const VERTICAL_TYPES = ['reel', 'video', 'story'];

export function aspectForPost(postType?: string | null, platform?: string | null): string {
  if (postType && VERTICAL_TYPES.includes(postType)) return '9:16';
  if (platform && ['tiktok', 'youtube_shorts', 'shorts'].includes(platform.toLowerCase())) return '9:16';
  return '1:1';
}

export function durationForPost(postType?: string | null): number {
  return postType === 'story' ? 15 : 30;
}

/** Maps a strategy theme onto the closest video hook angle. */
export function angleForTheme(theme?: string | null): string {
  switch (theme) {
    case 'promotional':
      return 'money';
    case 'educational':
      return 'intelligence';
    case 'engagement':
    case 'behind_scenes':
      return 'time';
    default:
      return 'auto';
  }
}

export function platformForPost(platform?: string | null): string {
  const p = (platform ?? '').toLowerCase();
  if (p.includes('tiktok')) return 'tiktok';
  if (p.includes('linkedin')) return 'linkedin';
  if (p.includes('youtube')) return 'youtube';
  return 'instagram';
}
