import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, ImageIcon, Loader2, Sparkles, Upload, X } from 'lucide-react';

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram feed', hint: 'Square 1:1' },
  { value: 'tiktok', label: 'TikTok / Reels / Stories', hint: 'Vertical 9:16' },
  { value: 'linkedin', label: 'LinkedIn', hint: 'Landscape' },
  { value: 'youtube', label: 'YouTube thumbnail', hint: 'Landscape' },
];

const STYLES = [
  { value: '', label: 'Auto — match my brand' },
  { value: 'Photorealistic editorial photography, natural lighting, shallow depth of field', label: 'Photoreal editorial' },
  { value: 'Clean studio product shot on seamless backdrop, soft key light', label: 'Studio product' },
  { value: 'Bold high-contrast graphic poster, flat shapes, strong typography space', label: 'Bold graphic poster' },
  { value: 'Candid smartphone UGC look, slightly imperfect framing, authentic', label: 'Candid UGC' },
  { value: 'Dark cinematic tech aesthetic, moody rim lighting, subtle grain', label: 'Dark cinematic' },
];

const ENGINES = [
  { value: 'openai/gpt-image-2', label: 'Flagship — maximum fidelity', hint: 'Best detail and typography' },
  { value: 'google/gemini-3-pro-image', label: 'Pro alternative', hint: 'Different look, strong realism' },
  { value: 'openai/gpt-image-1-mini', label: 'Draft — fast concepts', hint: 'Quick exploration' },
];

interface GeneratedImage {
  url: string;
  prompt: string;
  size: string;
}

const MAX_REFERENCE_BYTES = 8 * 1024 * 1024;

interface ImageStudioProps {
  /** Prefilled from a linked strategy day so nothing has to be retyped. */
  initialConcept?: string;
  initialTextOverlay?: string;
  initialPalette?: string;
  initialPlatform?: string;
}

export function ImageStudio({
  initialConcept = '',
  initialTextOverlay = '',
  initialPalette = '',
  initialPlatform = 'instagram',
}: ImageStudioProps = {}) {
  const [concept, setConcept] = useState(initialConcept);
  const [textOverlay, setTextOverlay] = useState(initialTextOverlay);
  const [platform, setPlatform] = useState(initialPlatform);
  const [style, setStyle] = useState('');
  const [palette, setPalette] = useState(initialPalette);
  const [engine, setEngine] = useState('openai/gpt-image-2');
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceName, setReferenceName] = useState('');

  const handleReferenceImage = (file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast({ title: 'Unsupported image', description: 'Use a PNG, JPEG, or WebP screenshot.', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_REFERENCE_BYTES) {
      toast({ title: 'Screenshot is too large', description: 'Choose an image smaller than 8 MB.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      setReferenceImage(reader.result);
      setReferenceName(file.name);
    };
    reader.onerror = () => toast({ title: 'Could not read screenshot', variant: 'destructive' });
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!concept.trim()) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-post-visual', {
        body: {
          visualDescription: concept.trim(),
          textOverlay: textOverlay.trim() || undefined,
          colorPalette: palette.trim() || undefined,
          stylePrompt: style || undefined,
          platform,
          model: engine,
          quality: engine === 'openai/gpt-image-1-mini' ? 'medium' : 'high',
          enhance: true,
          referenceImage: referenceImage ?? undefined,
        },
      });

      let payload = data as { url?: string; prompt?: string; size?: string; savedToMedia?: boolean; error?: string; code?: string } | null;

      // Non-2xx responses surface as an error with the body on `context`.
      if (error && !payload) {
        try {
          const res = (error as { context?: Response }).context;
          if (res && typeof res.json === 'function') {
            payload = await res.clone().json();
          }
        } catch {
          /* keep the generic message */
        }
      }

      if (error || payload?.error) {
        const message = payload?.error ?? error?.message ?? 'Image generation failed.';
        const code = payload?.code;
        if (code === 'AI_CREDITS_DEPLETED' || code === 'UPGRADE_REQUIRED') {
          window.dispatchEvent(
            new CustomEvent('korex:upgrade-required', { detail: { reason: code, message } }),
          );
          return;
        }
        toast({ title: 'Image generation failed', description: message, variant: 'destructive' });
        return;
      }

      if (!payload?.url) {
        toast({ title: 'No image returned', description: 'Please try again.', variant: 'destructive' });
        return;
      }

      setImages((prev) => [
        { url: payload.url as string, prompt: payload.prompt ?? concept, size: payload.size ?? '' },
        ...prev,
      ]);
      toast({
        title: 'Image ready',
        description: payload.savedToMedia ? 'Saved to your media library.' : 'Generated successfully.',
      });
    } catch (err) {
      toast({
        title: 'Image generation failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-background border-card">
        <CardContent className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">What should the image show?</Label>
            <Textarea
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="A founder at a desk reviewing a campaign dashboard at night, warm desk lamp, city window behind."
              rows={3}
              maxLength={6000}
              className="bg-muted border-border resize-none"
            />
            <p className="text-[11px] text-muted-foreground text-right">{concept.length.toLocaleString()} / 6,000</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Placement</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label} — <span className="text-muted-foreground">{p.hint}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Look</Label>
              <Select value={style || 'auto'} onValueChange={(v) => setStyle(v === 'auto' ? '' : v)}>
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STYLES.map((s) => (
                    <SelectItem key={s.label} value={s.value || 'auto'}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Engine</Label>
              <Select value={engine} onValueChange={setEngine}>
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENGINES.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label} — <span className="text-muted-foreground">{e.hint}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Text overlay (optional)</Label>
              <Input
                value={textOverlay}
                onChange={(e) => setTextOverlay(e.target.value)}
                placeholder="Stop guessing. Start scaling."
                maxLength={120}
                className="bg-muted border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Color palette (optional)</Label>
              <Input
                value={palette}
                onChange={(e) => setPalette(e.target.value)}
                placeholder="Deep black, crimson red accents"
                maxLength={120}
                className="bg-muted border-border"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Product screen reference</Label>
              {referenceImage ? (
                <div className="flex items-center gap-3 border border-border bg-muted p-2 rounded-md">
                  <img src={referenceImage} alt="Product screen reference" className="h-16 w-24 rounded-sm object-cover border border-border" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{referenceName}</p>
                    <p className="text-xs text-muted-foreground">The generated device screen will follow this real interface.</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove product screen reference"
                    onClick={() => { setReferenceImage(null); setReferenceName(''); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button asChild type="button" variant="outline" className="w-full justify-start gap-2">
                  <label>
                    <Upload className="h-4 w-4" />
                    Add a real screenshot
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(event) => {
                        handleReferenceImage(event.target.files?.[0]);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>
                </Button>
              )}
              <p className="text-[11px] text-muted-foreground">PNG, JPEG, or WebP up to 8 MB. A reference automatically uses the product-grounded image engine.</p>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !concept.trim()}
            className="w-full sm:w-auto"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Rendering at full quality...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate image
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">This session</h2>
          {images.length > 0 && <span className="text-xs text-[hsl(var(--text-tertiary))]">{images.length}</span>}
        </div>

        {images.length === 0 ? (
          <Card className="bg-background border-card">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No images yet. Every render is art-directed automatically before it hits the image
              engine, then produced at maximum quality — expect 30-60 seconds. Describe the shot above — everything you generate is also saved to your
              media library.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {images.map((img) => (
              <Card key={img.url} className="bg-background border-card overflow-hidden">
                <img
                  src={img.url}
                  alt={img.prompt.slice(0, 120)}
                  loading="lazy"
                  className="w-full aspect-square object-cover"
                />
                <CardContent className="p-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-[hsl(var(--text-tertiary))]">{img.size}</span>
                  <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                    <a href={img.url} target="_blank" rel="noreferrer" download>
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
