import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Captions,
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Film,
  HelpCircle,
  Layout,
  Lightbulb,
  Scissors,
  Sparkles,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { EvidenceBasisBadge } from '@/components/DataSourceBadge';
import {
  CAMERA_LABELS,
  COMPOSITION_LABELS,
  SCENE_VISUAL_LABELS,
  SHOT_LABELS,
  TEXT_POSITION_LABELS,
  type FormatSpec,
  type ProductionPlan,
  type VideoAdRecord,
} from '@/config/video.config';
import type { ContentHandoff } from '@/lib/contentHandoff';

/** Set the first time a user opens the Edit studio — drives the onboarding tick. */
export const EDIT_STUDIO_VISITED_KEY = 'korex.editstudio.visited';

/** Plain-language walkthrough for users who have never edited a video before. */
const WALKTHROUGH: { title: string; body: string }[] = [
  {
    title: 'Pick the ad you want to finish',
    body: 'Choose one of your rendered ads as the base clip in step 3 below, then download it. That clip becomes the footage layer of your edit.',
  },
  {
    title: 'Grab the captions and timing sheet',
    body: 'Download the .srt caption file and copy the text sheet. Both are already timed to your script, so nothing needs typing out.',
  },
  {
    title: 'Open a free editor and drop the clip in',
    body: 'Clipchamp, Canva, VEED or CapCut all work and are free in the browser. Create a new project, set the ratio to match step 1, then drag your clip onto the timeline. If CapCut is blocked on your network, use Clipchamp.',
  },

  {
    title: 'Follow the beat list',
    body: 'The numbered beats below tell you what happens at each second — what is said, what should be on screen, and where the text sits. Match the timeline to that list.',
  },
  {
    title: 'Keep text inside the safe zones',
    body: 'The grey bands at the top and bottom of the frame get covered by app buttons and captions. Anything important must sit between them — the template already does this for you.',
  },
  {
    title: 'Export and upload',
    body: 'Export as MP4 at the resolution shown in step 1, then upload it to the platform the strategy day is written for.',
  },
];

const FALLBACK_SPECS: Record<string, FormatSpec> = {
  '9:16': {
    aspect: '9:16',
    width: 720,
    height: 1280,
    safe: { top: 0.14, bottom: 0.2, left: 0.06, right: 0.06 },
    captionBand: 'bottom fifth',
  },
  '1:1': {
    aspect: '1:1',
    width: 1080,
    height: 1080,
    safe: { top: 0.1, bottom: 0.16, left: 0.06, right: 0.06 },
    captionBand: 'bottom sixth',
  },
  '16:9': {
    aspect: '16:9',
    width: 1280,
    height: 720,
    safe: { top: 0.08, bottom: 0.16, left: 0.05, right: 0.05 },
    captionBand: 'bottom sixth',
  },
};

interface Props {
  plan?: ProductionPlan | null;
  /** Set when the script no longer matches the planned scenes. */
  planStale?: boolean;
  script?: string;
  aspectRatio: string;
  handoff?: ContentHandoff | null;
  videos: VideoAdRecord[];
  urls: Record<string, string>;
  onResolveUrl: (id: string) => Promise<string | null>;
}




export function EditStudio({
  plan,
  planStale,
  script,
  aspectRatio,
  handoff,
  videos,
  urls,
  onResolveUrl,
}: Props) {
  const [sourceId, setSourceId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  // Open by default for first-timers, collapsed once they've been here before.
  const [guideOpen, setGuideOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(EDIT_STUDIO_VISITED_KEY) !== 'true';
    } catch {
      return true;
    }
  });

  const completed = useMemo(
    () => videos.filter((v) => v.status === 'completed'),
    [videos],
  );

  const spec = plan?.format ?? FALLBACK_SPECS[aspectRatio] ?? FALLBACK_SPECS['9:16'];
  const sourceVideo = completed.find((v) => v.id === sourceId);

  const scenes = plan?.scenes ?? [];

  const sourceUrl = sourceVideo ? (urls[sourceVideo.id] ?? null) : null;

  /** Beat timings shared by the caption file and the timing sheet. */
  const beats = useMemo(() => {
    let t = 0;
    return scenes.map((scene) => {
      const start = t;
      const dur = scene.duration_seconds ?? 3;
      t += dur;
      return { scene, start, end: t };
    });
  }, [scenes]);

  /** SRT captions CapCut can import directly (Captions → Import captions). */
  const srt = useMemo(() => {
    const stamp = (s: number) => {
      const ms = Math.round(s * 1000);
      const hh = String(Math.floor(ms / 3_600_000)).padStart(2, '0');
      const mm = String(Math.floor(ms / 60_000) % 60).padStart(2, '0');
      const ss = String(Math.floor(ms / 1000) % 60).padStart(2, '0');
      const mmm = String(ms % 1000).padStart(3, '0');
      return `${hh}:${mm}:${ss},${mmm}`;
    };
    return beats
      .filter((b) => b.scene.spoken?.trim())
      .map(
        (b, i) =>
          `${i + 1}\n${stamp(b.start)} --> ${stamp(b.end)}\n${b.scene.spoken.trim()}\n`,
      )
      .join('\n');
  }, [beats]);

  /** Plain-text cheat sheet: what text goes on screen, when, and where. */
  const textSheet = useMemo(() => {
    if (!beats.length) return '';
    const lines = [
      `KOREX EDIT SHEET — ${spec.width}x${spec.height} (${spec.aspect}), 30 fps, MP4`,
      `Safe margins: top ${Math.round(spec.safe.top * 100)}%, bottom ${Math.round(
        spec.safe.bottom * 100,
      )}%, sides ${Math.round(spec.safe.left * 100)}%`,
      '',
    ];
    beats.forEach((b, i) => {
      lines.push(`BEAT ${i + 1} · ${b.start.toFixed(1)}s – ${b.end.toFixed(1)}s · ${b.scene.role}`);
      lines.push(`  Says: ${b.scene.spoken}`);
      if (b.scene.on_screen_text) {
        lines.push(
          `  On-screen text: "${b.scene.on_screen_text}" (${
            TEXT_POSITION_LABELS[b.scene.text_position ?? 'center']
          })`,
        );
      }
      if (b.scene.background_prompt) lines.push(`  B-roll: ${b.scene.background_prompt}`);
      lines.push('');
    });
    return lines.join('\n');
  }, [beats, spec]);

  const handleCopySheet = async () => {
    try {
      await navigator.clipboard.writeText(textSheet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Sheet copied', description: 'Keep it beside your editor as you edit.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Select the sheet and copy manually.', variant: 'destructive' });
    }
  };

  const handleDownload = (body: string, filename: string, mime: string) => {
    const blob = new Blob([body], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handlePickSource = async (id: string) => {
    setSourceId(id);
    if (!urls[id]) await onResolveUrl(id);
  };


  const recs = plan?.edit_recommendations;
  const calibrated = plan?.evidence?.calibrated_patterns ?? [];

  // Marks the Edit studio as visited so the Getting started checklist can tick.
  useEffect(() => {
    try {
      localStorage.setItem(EDIT_STUDIO_VISITED_KEY, 'true');
      window.dispatchEvent(new Event('korex:edit-studio-visited'));
    } catch {
      /* private mode — the checklist simply stays open */
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Why this section exists */}
      <Card className="bg-background border-primary/30">
        <CardContent className="p-4 flex items-start gap-3">
          <Scissors className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Edit studio</p>
            <p className="text-muted-foreground text-xs mt-1">
              {handoff
                ? `The edit brief below is built from day ${handoff.dayNumber ?? ''}${
                    handoff.theme ? ` (${handoff.theme})` : ''
                  } of your strategy and the script you selected — follow it beat by beat and the ad matches the plan.`
                : 'Generate a script first, then this becomes a beat-by-beat edit brief plus timed captions and a text sheet you can drop straight into a free editor.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Beginner walkthrough — editing is the scariest step for new users */}
      <Card className="bg-background border-card">
        <CardContent className="p-4">
          <button
            type="button"
            onClick={() => setGuideOpen((v) => !v)}
            aria-expanded={guideOpen}
            className="w-full flex items-center gap-2 text-left"
          >
            <HelpCircle className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-medium flex-1">
              New to editing? Read this first — 2 minutes
            </span>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform ${
                guideOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {guideOpen ? (
            <div className="mt-4 space-y-4 text-xs text-muted-foreground">
              <p>
                Your video ad is delivered as a <strong className="text-foreground">clean master</strong>:
                just the presenter speaking, at the right size for the platform. No text, no cuts,
                no music. That's on purpose — a clean master is what every real editor starts from,
                and it means you can change the wording on screen without paying to re-render.
              </p>

              <ol className="space-y-3 list-none">
                {WALKTHROUGH.map((step, i) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full border border-border text-[10px] flex items-center justify-center text-muted-foreground">
                      {i + 1}
                    </span>
                    <span>
                      <span className="block text-foreground font-medium">{step.title}</span>
                      <span className="block mt-0.5">{step.body}</span>
                    </span>
                  </li>
                ))}
              </ol>

              <p className="text-[11px] text-[hsl(var(--text-tertiary))]">
                You can't break anything. Nothing you do in the editor changes your rendered ad —
                it stays safe in your library, and you can start over any time.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              A plain-English walkthrough: what the template is, where to paste it, and what to
              change.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit direction, labelled by how it was actually arrived at */}
      {recs ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">How to cut this ad</h2>
            <EvidenceBasisBadge basis={recs.basis ?? 'best_practice'} />
          </div>
          <Card className="bg-background border-card">
            <CardContent className="p-4 space-y-3">

              <dl className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ['Cut rhythm', recs.cut_rhythm],
                    ['First two seconds', recs.hook_retention],
                    ['Captions', recs.caption_style],
                    ['On-screen text', recs.text_density],
                    ['Sound', recs.sound],
                    ['Offer card', recs.cta_treatment],
                  ] as const
                )
                  .filter(([, v]) => !!v)
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[10px] uppercase tracking-wide text-[hsl(var(--text-tertiary))]">
                        {label}
                      </dt>
                      <dd className="text-xs text-muted-foreground mt-0.5">{value}</dd>
                    </div>
                  ))}
              </dl>

              {recs.do_this?.length ? (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[hsl(var(--text-tertiary))]">
                    Do this
                  </p>
                  <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5 mt-1">
                    {recs.do_this.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {recs.avoid?.length ? (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[hsl(var(--text-tertiary))]">
                    Avoid
                  </p>
                  <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5 mt-1">
                    {recs.avoid.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {recs.evidence ? (
                <p className="text-[11px] text-[hsl(var(--text-tertiary))] italic">
                  Based on: {recs.evidence}
                </p>
              ) : null}

              {calibrated.length ? (
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] uppercase tracking-wide text-[hsl(var(--text-tertiary))]">
                    Measured in your niche
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                    {calibrated.slice(0, 4).map((c) => (
                      <li key={`${c.pattern_type}-${c.pattern_value}`}>
                        <span className="text-foreground">
                          {c.pattern_type.replace('creative_', '').replace(/_/g, ' ')}:{' '}
                          {c.pattern_value.replace(/_/g, ' ')}
                        </span>{' '}
                        — {c.avg_actual.toFixed(2)}% average engagement across {c.sample_size}{' '}
                        shipped ads.
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p className="text-[11px] text-[hsl(var(--text-tertiary))] pt-2 border-t border-border">
                A note on honesty: these calls are read from the script, the shot list and measured
                outcomes — nothing here watches the finished footage. We can tell you what has
                worked structurally; we can't tell you whether a given frame looks good. Judge the
                picture with your own eyes.
              </p>

            </CardContent>
          </Card>
        </section>
      ) : null}


      {/* Delivery spec */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded border border-border text-[11px] flex items-center justify-center text-muted-foreground">
            1
          </span>
          <h2 className="text-sm font-semibold">Delivery spec and safe zones</h2>
        </div>
        <Card className="bg-background border-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-border text-[10px]">
                {spec.width}×{spec.height} ({spec.aspect})
              </Badge>
              <Badge variant="outline" className="border-border text-[10px]">30 fps · MP4</Badge>
              <Badge variant="outline" className="border-border text-[10px] gap-1">
                <Captions className="w-3 h-3" /> Captions in the {spec.captionBand}
              </Badge>
              {handoff?.platform ? (
                <Badge variant="outline" className="border-border text-[10px] capitalize">
                  {handoff.platform}
                </Badge>
              ) : null}
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>
                Keep every headline, logo and key subject out of the top{' '}
                {Math.round(spec.safe.top * 100)}% and bottom {Math.round(spec.safe.bottom * 100)}% —
                that's platform UI and caption space.
              </li>
              <li>
                Side margins: {Math.round(spec.safe.left * 100)}% left and{' '}
                {Math.round(spec.safe.right * 100)}% right.
              </li>
              <li>Cut on the beat boundaries below; hard cuts, 0.25s cross-dissolve at most.</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Edit brief */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded border border-border text-[11px] flex items-center justify-center text-muted-foreground">
            2
          </span>
          <h2 className="text-sm font-semibold">Edit brief — what to do on each beat</h2>
          {plan?.edit_style ? (
            <span className="text-[11px] text-muted-foreground">{plan.edit_style}</span>
          ) : null}
        </div>

        {planStale ? (
          <p className="text-[11px] text-amber-500">
            You've edited the script away from the planned scenes — timings below are indicative.
          </p>
        ) : null}

        {scenes.length === 0 ? (
          <Card className="bg-background border-card">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Pick a script on the Video ads tab and the beat-by-beat edit brief appears here.
            </CardContent>
          </Card>
        ) : (
          <ol className="space-y-2">
            {(() => {
              let t = 0;
              return scenes.map((scene, i) => {
                const start = t;
                const dur = scene.duration_seconds ?? 3;
                t += dur;
                return (
                  <li key={i} className="rounded-md border border-card bg-muted/40 p-3 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] tabular-nums rounded border border-border px-1.5 py-0.5 text-muted-foreground">
                        {start.toFixed(1)}s – {t.toFixed(1)}s
                      </span>
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {scene.role}
                      </span>
                      <Badge variant="outline" className="border-border text-[10px]">
                        {SCENE_VISUAL_LABELS[scene.visual] ?? scene.visual}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{scene.spoken}</p>
                    <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc pl-4">
                      <li>
                        Framing: {scene.shot_type ? SHOT_LABELS[scene.shot_type] : 'Medium'}
                        {scene.camera_move ? ` · ${CAMERA_LABELS[scene.camera_move]}` : ''}
                        {scene.composition ? ` · ${COMPOSITION_LABELS[scene.composition]}` : ''}
                      </li>
                      {scene.on_screen_text ? (
                        <li>
                          On-screen text: “{scene.on_screen_text}” —{' '}
                          {TEXT_POSITION_LABELS[scene.text_position ?? 'center']}, word-by-word rise,
                          inside the safe margins.
                        </li>
                      ) : (
                        <li>No headline on this beat — let the read carry it.</li>
                      )}
                      {scene.background_prompt ? (
                        <li className="italic">B-roll direction: {scene.background_prompt}</li>
                      ) : null}
                      <li>
                        Pace: {scene.energy ?? 'steady'} — cut out of this beat the moment the line
                        lands.
                      </li>
                    </ul>
                  </li>
                );
              });
            })()}
          </ol>
        )}

        {handoff?.promoDetail || handoff?.promoCode ? (
          <p className="text-[11px] text-muted-foreground">
            Hold the offer card{handoff.promoCode ? ` (code ${handoff.promoCode})` : ''} on screen for
            the final 2 seconds{handoff.promoDetail ? ` — “${handoff.promoDetail}”` : ''}.
          </p>
        ) : null}
      </section>

      {/* CapCut handoff */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded border border-border text-[11px] flex items-center justify-center text-muted-foreground">
            3
          </span>
          <h2 className="text-sm font-semibold">Finish it in a free editor</h2>
        </div>

        <Card className="bg-background border-card">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1.5 max-w-md">
              <Label className="text-xs text-muted-foreground">Base clip</Label>
              <Select value={sourceId} onValueChange={handlePickSource}>
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Pick a rendered ad to edit" />
                </SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  {completed.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No finished renders yet
                    </SelectItem>
                  ) : (
                    completed.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.title ?? v.hook ?? 'Untitled ad'} · {v.aspect_ratio}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-[hsl(var(--text-tertiary))]">
                Download it, then drag the file straight onto the editor timeline. Playback links
                expire, so download it fresh if it won't open.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {sourceUrl ? (
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <a href={sourceUrl} download target="_blank" rel="noopener noreferrer">
                    <Download className="w-3.5 h-3.5" />
                    Download base clip
                  </a>
                </Button>
              ) : null}
              <Button
                onClick={() => handleDownload(srt, `korex-captions.srt`, 'text/plain')}
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!srt}
              >
                <Captions className="w-3.5 h-3.5" />
                Download captions (.srt)
              </Button>
              <Button onClick={handleCopySheet} variant="outline" size="sm" className="gap-1.5" disabled={!textSheet}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                Copy text + timing sheet
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Open a free editor</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Clipchamp', href: 'https://app.clipchamp.com/', note: 'Microsoft — works everywhere' },
                  { label: 'Canva', href: 'https://www.canva.com/video-editor/', note: 'Free plan' },
                  { label: 'VEED', href: 'https://www.veed.io/new', note: 'Free plan' },
                  { label: 'CapCut', href: 'https://www.capcut.com/editor', note: 'Blocked on some networks' },
                ].map((e) => (
                  <Button key={e.label} asChild size="sm" variant={e.label === 'Clipchamp' ? 'default' : 'outline'} className="gap-1.5">
                    <a href={e.href} target="_blank" rel="noopener noreferrer" title={e.note}>
                      <ExternalLink className="w-3.5 h-3.5" />
                      {e.label}
                    </a>
                  </Button>
                ))}
              </div>
              <p className="text-[11px] text-[hsl(var(--text-tertiary))]">
                CapCut refuses connections on some networks, schools and regions (ERR_BLOCKED_BY_RESPONSE).
                If it won't load, use Clipchamp — it opens in any browser and imports the same clip, .srt
                captions and timing sheet.
              </p>
            </div>

            <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4">
              <li>Open one of the free editors above and create a new project.</li>
              <li>
                Set the canvas to {spec.aspect} so it exports at {spec.width}×{spec.height}.
              </li>
              <li>Drag in the base clip you downloaded above.</li>
              <li>
                Import the .srt caption file (Captions → Import in CapCut/VEED, Subtitles in
                Clipchamp). Every spoken line lands already timed.
              </li>
              <li>
                Add each headline from the timing sheet as a Text layer at the second listed, kept
                inside the safe margins in step 1.
              </li>
              <li>Split the clip at each beat boundary below; hard cuts, no fancy transitions.</li>
              <li>Export → MP4, {spec.width}×{spec.height}, 30 fps.</li>
            </ol>


            {textSheet ? (
              <details className="rounded-md border border-card bg-muted/40">
                <summary className="cursor-pointer px-3 py-2 text-xs text-muted-foreground flex items-center gap-1.5">
                  <Layout className="w-3.5 h-3.5" />
                  View text + timing sheet
                </summary>
                <pre className="px-3 pb-3 text-[10px] leading-relaxed overflow-x-auto max-h-80 text-muted-foreground whitespace-pre-wrap">
                  {textSheet}
                </pre>
              </details>
            ) : null}
          </CardContent>
        </Card>
      </section>


      {script ? (
        <p className="text-[11px] text-[hsl(var(--text-tertiary))] flex items-start gap-1.5">
          <Sparkles className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
          Caption track should mirror the spoken script word for word — burn captions in the{' '}
          {spec.captionBand}.
        </p>
      ) : (
        <p className="text-[11px] text-[hsl(var(--text-tertiary))] flex items-start gap-1.5">
          <Film className="w-3 h-3 mt-0.5 shrink-0" />
          No script selected yet.
        </p>
      )}
    </div>
  );
}
