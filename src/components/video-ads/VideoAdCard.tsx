import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Play, Trash2, Download, AlertTriangle, Clock } from 'lucide-react';
import type { VideoAdRecord } from '@/config/video.config';

interface Props {
  video: VideoAdRecord;
  url?: string;
  onResolveUrl: (id: string) => Promise<string | null>;
  onDelete: (id: string) => void;
}

export function VideoAdCard({ video, url, onResolveUrl, onDelete }: Props) {
  const [resolved, setResolved] = useState<string | null>(url ?? null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  useEffect(() => {
    if (url) setResolved(url);
  }, [url]);

  const handlePlay = async () => {
    if (resolved) return;
    setLoadingUrl(true);
    const next = await onResolveUrl(video.id);
    setResolved(next);
    setLoadingUrl(false);
  };

  const isPending = video.status === 'queued' || video.status === 'processing';
  const aspectClass =
    video.aspect_ratio === '16:9'
      ? 'aspect-video'
      : video.aspect_ratio === '1:1'
        ? 'aspect-square'
        : 'aspect-[9/16]';

  return (
    <Card className="bg-background border-card overflow-hidden">
      <div className={`relative ${aspectClass} bg-[#000] flex items-center justify-center`}>
        {video.status === 'completed' && resolved ? (
          <video
            src={resolved}
            controls
            playsInline
            poster={video.thumbnail_url ?? undefined}
            className="w-full h-full object-cover"
          />
        ) : video.status === 'completed' ? (
          <button
            type="button"
            onClick={handlePlay}
            className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            style={
              video.thumbnail_url
                ? {
                    backgroundImage: `url(${video.thumbnail_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
          >
            <span className="w-12 h-12 rounded-full border border-border bg-black/60 flex items-center justify-center">
              {loadingUrl ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </span>
            <span className="text-xs">Load video</span>
          </button>
        ) : isPending ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground px-4 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs">Rendering your actor</span>
            <span className="text-[11px] text-[hsl(var(--text-tertiary))]">Usually 1–3 minutes</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground px-4 text-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
            <span className="text-xs">Render failed</span>
            {video.error_message && (
              <span className="text-[11px] text-[hsl(var(--text-tertiary))] line-clamp-3">{video.error_message}</span>
            )}
            <span className="text-[11px] text-[hsl(var(--text-tertiary))]">This didn't use a video credit.</span>
          </div>
        )}
      </div>

      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <p className="text-sm font-medium leading-snug flex-1 line-clamp-2">
            {video.title || video.hook || 'Untitled ad'}
          </p>
          {video.angle && (
            <Badge variant="outline" className="border-border text-[10px] shrink-0 capitalize">
              {video.angle}
            </Badge>
          )}
        </div>

        {video.hook && video.title && (
          <p className="text-xs text-muted-foreground line-clamp-2">{video.hook}</p>
        )}

        <div className="flex items-center gap-2 text-[11px] text-[hsl(var(--text-tertiary))] flex-wrap">
          {video.avatar_name && <span className="truncate">{video.avatar_name}</span>}
          <span>·</span>
          <span>{video.aspect_ratio}</span>
          {video.duration_seconds ? (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {Math.round(Number(video.duration_seconds))}s
              </span>
            </>
          ) : null}
          {video.treatment && (
            <>
              <span>·</span>
              <span className="capitalize">{video.treatment.replace(/-/g, ' ')}</span>
            </>
          )}
          {video.scene_count && video.scene_count > 1 ? (
            <>
              <span>·</span>
              <span>{video.scene_count} scenes</span>
            </>
          ) : null}
        </div>


        <div className="flex items-center gap-2 pt-1">
          {video.status === 'completed' && resolved && (
            <Button
              size="sm"
              variant="outline"
              className="border-border h-7 text-xs flex-1"
              asChild
            >
              <a href={resolved} download={`korex-ad-${video.id}.mp4`}>
                <Download className="w-3 h-3 mr-1.5" />
                Download
              </a>
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-[hsl(var(--text-tertiary))] hover:text-destructive"
            onClick={() => onDelete(video.id)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
