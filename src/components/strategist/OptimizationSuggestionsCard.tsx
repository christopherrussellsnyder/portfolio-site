import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface OptimizationSuggestion {
  testId: string;
  testName: string;
  platform: string;
  variantId: string;
  variantName: string;
  impressions: number;
  reason: string;
}

/**
 * Read-only recommendations surfaced from running A/B tests. This never
 * pauses or changes anything itself -- it tells the user what it would
 * recommend and why, and leaves the decision and the action to them.
 * Renders nothing when there's nothing worth flagging, so it never adds
 * sidebar clutter on a quiet day.
 */
export function OptimizationSuggestionsCard() {
  const query = useQuery({
    queryKey: ['ab-test-optimization-suggestions'],
    queryFn: async (): Promise<OptimizationSuggestion[]> => {
      const { data, error } = await supabase.functions.invoke('ab-test-optimization', {
        body: { action: 'suggest_optimizations' },
      });
      if (error) throw error;
      return data?.suggestions ?? [];
    },
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const suggestions = query.data ?? [];
  if (!suggestions.length) return null;

  return (
    <Card className="bg-background">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-primary" />
          Optimization Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        {suggestions.map((s) => (
          <div key={s.variantId} className="p-2 rounded-md bg-muted/50 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium truncate">{s.testName}</p>
              <Badge variant="outline" className="text-[10px] shrink-0">{s.variantName}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Underperforming: {s.reason}. Consider pausing this variant in your A/B test.
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
