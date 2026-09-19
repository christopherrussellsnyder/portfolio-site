import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Captions,
  Film,
  Image as ImageIcon,
  Layout,
  Move,
  Palette,
  Scissors,
  Type,
  User,
} from 'lucide-react';
import {
  CAMERA_LABELS,
  COMPOSITION_LABELS,
  SCENE_VISUAL_LABELS,
  SHOT_LABELS,
  TEXT_POSITION_LABELS,
  TREATMENT_LABELS,
  type ProductionPlan,
  type SceneVisual,
} from '@/config/video.config';

const ICONS: Record<SceneVisual, typeof User> = {
  avatar: User,
  broll: ImageIcon,
  'text-card': Type,
  'brand-color': Palette,
};

interface Props {
  plan: ProductionPlan;
  /** Set when the user has edited the script away from the planned scenes. */
  stale?: boolean;
}

export function StoryboardPreview({ plan, stale }: Props) {
  const treatmentLabel = TREATMENT_LABELS[plan.treatment] ?? plan.treatment;

  return (
    <Card className="bg-background border-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Film className="w-3.5 h-3.5 text-primary" />
          <span className="text-sm font-semibold">Storyboard</span>
          <Badge variant="outline" className="border-border text-[10px]">
            {treatmentLabel}
          </Badge>
          <Badge variant="outline" className="border-border text-[10px]">
            {plan.scenes.length} {plan.scenes.length === 1 ? 'scene' : 'scenes'}
          </Badge>
          {plan.total_seconds ? (
            <Badge variant="outline" className="border-border text-[10px]">
              ~{plan.total_seconds}s
            </Badge>
          ) : null}
          {plan.format ? (
            <Badge variant="outline" className="border-border text-[10px]">
              {plan.format.width}×{plan.format.height}
            </Badge>
          ) : null}
          {plan.captions && (
            <Badge variant="outline" className="border-border text-[10px] gap-1">
              <Captions className="w-3 h-3" />
              Captions
            </Badge>
          )}
        </div>


        {plan.rationale && (
          <p className="text-xs text-muted-foreground leading-relaxed">{plan.rationale}</p>
        )}

        {plan.edit_style && (
          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
            <Scissors className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
            <span>{plan.edit_style}</span>
          </p>
        )}

        {stale ? (
          <p className="text-[11px] text-amber-500">
            You've edited the script, so this ad will render as a clean presenter read. Regenerate
            scripts to get a matching storyboard back.
          </p>
        ) : null}

        <ol className="space-y-2">
          {plan.scenes.map((scene, i) => {
            const Icon = ICONS[scene.visual] ?? User;
            return (
              <li
                key={i}
                className="flex gap-3 rounded-md border border-card bg-muted/40 p-3"
              >
                <span className="w-5 h-5 shrink-0 rounded border border-border text-[10px] flex items-center justify-center text-muted-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {scene.role}
                    </span>
                    <Badge variant="outline" className="border-border text-[10px] gap-1">
                      <Icon className="w-3 h-3" />
                      {SCENE_VISUAL_LABELS[scene.visual] ?? scene.visual}
                    </Badge>
                    {scene.duration_seconds ? (
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {scene.duration_seconds}s
                      </span>
                    ) : null}
                    {scene.on_screen_text && (
                      <span className="text-[11px] text-primary">“{scene.on_screen_text}”</span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-3">{scene.spoken}</p>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {scene.shot_type && (
                      <span className="text-[10px] rounded border border-border px-1.5 py-0.5 text-muted-foreground">
                        {SHOT_LABELS[scene.shot_type] ?? scene.shot_type}
                      </span>
                    )}
                    {scene.camera_move && (
                      <span className="text-[10px] rounded border border-border px-1.5 py-0.5 text-muted-foreground inline-flex items-center gap-1">
                        <Move className="w-2.5 h-2.5" />
                        {CAMERA_LABELS[scene.camera_move] ?? scene.camera_move}
                      </span>
                    )}
                    {scene.composition && (
                      <span className="text-[10px] rounded border border-border px-1.5 py-0.5 text-muted-foreground inline-flex items-center gap-1">
                        <Layout className="w-2.5 h-2.5" />
                        {COMPOSITION_LABELS[scene.composition] ?? scene.composition}
                      </span>
                    )}
                    {scene.energy && (
                      <span className="text-[10px] rounded border border-border px-1.5 py-0.5 text-muted-foreground capitalize">
                        {scene.energy}
                      </span>
                    )}
                    {scene.on_screen_text && scene.text_position && (
                      <span className="text-[10px] rounded border border-border px-1.5 py-0.5 text-muted-foreground">
                        {TEXT_POSITION_LABELS[scene.text_position] ?? scene.text_position}
                      </span>
                    )}
                  </div>

                  {scene.background_prompt && (
                    <p className="text-[11px] text-[hsl(var(--text-tertiary))] line-clamp-2 italic">
                      {scene.background_prompt}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
