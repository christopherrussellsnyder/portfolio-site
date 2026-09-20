import { useQuery } from '@tanstack/react-query';
import { Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CalibrationRow {
  sample_size: number;
  is_calibrated: boolean;
  error_pct: number;
}

interface PredictionAccuracyCardProps {
  /** The business's industry/niche, used to look up niche_calibration rows. */
  niche: string | null | undefined;
}

/**
 * Shows the real, measured prediction accuracy for this business's industry —
 * never a made-up number. Mirrors the honesty rules in algorithms.ts: no
 * error % is shown until enough real outcomes exist to be meaningful
 * (MIN_SAMPLE = 10 in calculate-prediction-accuracy), and an empty state is
 * shown rather than a misleadingly confident placeholder.
 */
export function PredictionAccuracyCard({ niche }: PredictionAccuracyCardProps) {
  const query = useQuery({
    queryKey: ['niche-calibration-summary', niche],
    enabled: !!niche,
    queryFn: async (): Promise<CalibrationRow[]> => {
      const { data, error } = await supabase
        .from('niche_calibration')
        .select('sample_size, is_calibrated, error_pct')
        .eq('niche', niche as string);
      if (error) throw error;
      return (data ?? []) as CalibrationRow[];
    },
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (!niche) return null;

  const rows = query.data ?? [];
  const totalSamples = rows.reduce((sum, r) => sum + (r.sample_size || 0), 0);
  const calibrated = rows.filter((r) => r.is_calibrated);
  const avgAbsError = calibrated.length
    ? Math.round(
        (calibrated.reduce((sum, r) => sum + Math.abs(Number(r.error_pct) || 0), 0) / calibrated.length) * 10,
      ) / 10
    : null;

  return (
    <Card className="bg-background">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Prediction Accuracy
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-2">
        {query.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : totalSamples === 0 ? (
          <p className="text-xs text-muted-foreground">
            Still gathering measured outcomes for {niche}. Predictions get sharper as your posts report real results back.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Measured outcomes in {niche}</p>
              <span className="text-sm font-medium">{totalSamples.toLocaleString()}</span>
            </div>
            {avgAbsError !== null && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Avg. prediction error</p>
                <span className="text-sm font-medium">±{avgAbsError}%</span>
              </div>
            )}
            <Badge variant={calibrated.length > 0 ? 'default' : 'outline'} className="text-xs">
              {calibrated.length > 0
                ? `Calibrated on ${calibrated.length} pattern${calibrated.length === 1 ? '' : 's'}`
                : 'Collecting data — not yet calibrated'}
            </Badge>
          </>
        )}
      </CardContent>
    </Card>
  );
}
