import { useEffect, useState } from 'react';
import { CalendarClock, Loader2, Sparkles, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Preferences {
  enabled: boolean;
  posts_per_day: number;
  posts_per_week: number;
  avoid_weekends: boolean;
  avoid_nights: boolean;
  min_hours_between_posts: number;
  auto_fill_queue: boolean;
}

interface ScheduleSlot {
  position: number;
  time: string;
  dayOfWeek: string;
  timeOfDay: string;
  expectedEngagement: number;
  confidence: string;
}

const DEFAULT_PREFS: Preferences = {
  enabled: false,
  posts_per_day: 1,
  posts_per_week: 7,
  avoid_weekends: false,
  avoid_nights: true,
  min_hours_between_posts: 4,
  auto_fill_queue: false,
};

/** Settings + automation layer that sits on top of scheduler-intelligence's
 *  read-only analysis: lets the user turn on auto-scheduling, tune the
 *  guardrails, preview a generated week, and run it against the queue now. */
export function AutoScheduleCard({ platform }: { platform?: string | null }) {
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleSlot[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.functions
      .invoke('auto-optimize-timing', { body: { action: 'get_preferences' } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) throw error;
        if (data?.preferences) setPrefs({ ...DEFAULT_PREFS, ...data.preferences });
      })
      .catch((e) => console.error('auto-optimize-timing get_preferences failed:', e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const savePreferences = async (next: Preferences) => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-optimize-timing', {
        body: { action: 'update_preferences', preferences: next },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.preferences) setPrefs({ ...DEFAULT_PREFS, ...data.preferences });
      toast({ title: 'Auto-schedule settings saved' });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Try again in a moment.';
      toast({ title: 'Could not save settings', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = (enabled: boolean) => {
    const next = { ...prefs, enabled };
    setPrefs(next);
    savePreferences(next);
  };

  const previewSchedule = async () => {
    setGenerating(true);
    setSchedule(null);
    try {
      const { data, error } = await supabase.functions.invoke('auto-optimize-timing', {
        body: { action: 'generate_weekly_schedule', platform: platform || 'all' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSchedule(data?.schedule || []);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Try again in a moment.';
      toast({ title: 'Could not generate schedule preview', description: message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const runQueueNow = async () => {
    setQueueing(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-optimize-timing', {
        body: { action: 'auto_schedule_queue' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const count = data?.count ?? 0;
      toast({
        title: count > 0 ? `Scheduled ${count} queued post${count === 1 ? '' : 's'}` : 'Nothing to schedule',
        description: count > 0 ? 'Placed into your best available time slots.' : 'Your queue is empty right now.',
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Try again in a moment.';
      toast({ title: 'Could not run auto-schedule', description: message, variant: 'destructive' });
    } finally {
      setQueueing(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-primary" />
            Auto-Schedule
          </CardTitle>
          <Switch checked={prefs.enabled} onCheckedChange={toggleEnabled} disabled={saving} aria-label="Enable auto-schedule" />
        </div>
        <p className="text-xs text-muted-foreground">
          Automatically places your queued content into the best-performing time slots.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Posts / day</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={prefs.posts_per_day}
              onChange={(e) => setPrefs({ ...prefs, posts_per_day: Number(e.target.value) || 1 })}
              onBlur={() => savePreferences(prefs)}
              className="h-8 text-xs bg-muted border-border"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Posts / week</Label>
            <Input
              type="number"
              min={1}
              max={14}
              value={prefs.posts_per_week}
              onChange={(e) => setPrefs({ ...prefs, posts_per_week: Number(e.target.value) || 1 })}
              onBlur={() => savePreferences(prefs)}
              className="h-8 text-xs bg-muted border-border"
            />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs text-muted-foreground">Min. hours between posts</Label>
            <Input
              type="number"
              min={1}
              max={24}
              value={prefs.min_hours_between_posts}
              onChange={(e) => setPrefs({ ...prefs, min_hours_between_posts: Number(e.target.value) || 1 })}
              onBlur={() => savePreferences(prefs)}
              className="h-8 text-xs bg-muted border-border"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-foreground">Avoid weekends</Label>
            <Switch
              checked={prefs.avoid_weekends}
              onCheckedChange={(v) => {
                const next = { ...prefs, avoid_weekends: v };
                setPrefs(next);
                savePreferences(next);
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-foreground">Avoid late nights</Label>
            <Switch
              checked={prefs.avoid_nights}
              onCheckedChange={(v) => {
                const next = { ...prefs, avoid_nights: v };
                setPrefs(next);
                savePreferences(next);
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-foreground">Auto-fill empty queue</Label>
            <Switch
              checked={prefs.auto_fill_queue}
              onCheckedChange={(v) => {
                const next = { ...prefs, auto_fill_queue: v };
                setPrefs(next);
                savePreferences(next);
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
          <Button variant="outline" size="sm" onClick={previewSchedule} disabled={generating} className="gap-1.5 justify-center">
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Preview a week
          </Button>
          <Button size="sm" onClick={runQueueNow} disabled={queueing || !prefs.enabled} className="gap-1.5 justify-center">
            {queueing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Auto-schedule queue now
          </Button>
          {!prefs.enabled && (
            <p className="text-[10px] text-muted-foreground text-center">Turn on auto-schedule above to run this.</p>
          )}
        </div>

        {schedule && (
          <div className="pt-2 border-t border-border/50">
            {schedule.length === 0 ? (
              <p className="text-xs text-muted-foreground">Not enough data to generate a preview yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {schedule.map((slot) => (
                  <li key={slot.position} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{slot.dayOfWeek} {slot.timeOfDay}</span>
                    <Badge variant="outline" className="text-[10px]">{Number(slot.expectedEngagement || 0).toFixed(1)}% eng.</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
