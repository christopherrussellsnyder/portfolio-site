import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { serviceClient } from "../_shared/supabase.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActivitySlot {
  day_of_week: number;
  hour_of_day: number;
  avg_engagement_rate: number;
  sample_size?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, platform, selectedTime } = await req.json();
    
    const supabase = serviceClient();
    
    console.log('Analyzing schedule for user:', userId);
    
    // Calculate audience activity patterns
    const { data: activityData, error: activityError } = await supabase
      .rpc('calculate_audience_activity', {
        p_user_id: userId,
        p_platform: platform || 'all'
      });
    
    if (activityError) {
      console.error('Activity calculation error:', activityError);
    }
    
    const hasEnoughData = activityData && activityData.length >= 5;
    let optimalSlots: ActivitySlot[] = [];
    
    if (hasEnoughData) {
      // Update activity patterns in database
      await supabase.from('audience_activity_patterns').delete().match({ user_id: userId, platform: platform || 'all' });
      
      for (const slot of activityData as ActivitySlot[]) {
        await supabase.from('audience_activity_patterns').upsert({
          user_id: userId,
          platform: platform || 'all',
          day_of_week: slot.day_of_week,
          hour_of_day: slot.hour_of_day,
          avg_engagement_rate: slot.avg_engagement_rate,
          sample_size: slot.sample_size
        });
      }
      
      optimalSlots = (activityData as ActivitySlot[]).slice(0, 10);
    } else {
      // Use industry benchmarks
      optimalSlots = getIndustryBenchmarks(platform || 'all');
    }
    
    // Find schedule gaps
    const { data: gaps } = await supabase.rpc('find_schedule_gaps', {
      p_user_id: userId,
      p_days_ahead: 30
    });
    
    // Get upcoming posts
    const { data: upcomingPosts } = await supabase
      .from('scheduled_posts')
      .select('scheduled_time')
      .eq('user_id', userId)
      .eq('status', 'scheduled')
      .gte('scheduled_time', new Date().toISOString())
      .lte('scheduled_time', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
    
    const postingFrequency = (upcomingPosts?.length || 0) / 30;
    
    const suggestions: Array<{
      type: string;
      priority: string;
      reason: string;
      recommendation?: string;
      benefit?: string;
      expectedBoost?: string;
      suggestedTime?: string;
      originalTime?: string;
      confidence?: string;
      alternativeTime?: string;
      gapStart?: string;
      gapEnd?: string;
      gapHours?: number;
      currentFrequency?: string;
      recommendedFrequency?: string;
    }> = [];
    
    // Analyze selected time if provided
    if (selectedTime) {
      const selectedDate = new Date(selectedTime);
      const selectedDay = selectedDate.getDay();
      const selectedHour = selectedDate.getHours();
      
      const bestForDay = optimalSlots.find((slot: ActivitySlot) => slot.day_of_week === selectedDay);
      
      if (bestForDay && Math.abs(bestForDay.hour_of_day - selectedHour) > 2) {
        const suggestedDate = new Date(selectedDate);
        suggestedDate.setHours(bestForDay.hour_of_day, 0, 0, 0);
        
        suggestions.push({
          type: 'optimize_time',
          priority: 'high',
          originalTime: selectedTime,
          suggestedTime: suggestedDate.toISOString(),
          reason: `Your audience is ${Math.round((bestForDay.avg_engagement_rate / 2.5) * 100)}% more active at ${bestForDay.hour_of_day}:00`,
          expectedBoost: `+${Math.round(((bestForDay.avg_engagement_rate - 2.5) / 2.5) * 100)}% engagement`,
          confidence: hasEnoughData ? 'high' : 'medium'
        });
      }
      
      // Check for nearby posts
      const nearbyPosts = upcomingPosts?.filter((p: { scheduled_time: string }) => {
        const postTime = new Date(p.scheduled_time);
        const diff = Math.abs(postTime.getTime() - selectedDate.getTime());
        return diff < 2 * 60 * 60 * 1000;
      });
      
      if (nearbyPosts && nearbyPosts.length > 0) {
        suggestions.push({
          type: 'avoid_conflict',
          priority: 'medium',
          reason: `You have ${nearbyPosts.length} post(s) scheduled within 2 hours`,
          recommendation: 'Space out posts by at least 3-4 hours for better reach',
          alternativeTime: new Date(selectedDate.getTime() + 4 * 60 * 60 * 1000).toISOString()
        });
      }
    }
    
    // Add gap suggestions
    if (gaps && gaps.length > 0) {
      const firstGap = gaps[0] as { gap_start: string; gap_end: string; gap_hours: number };
      suggestions.push({
        type: 'fill_gap',
        priority: 'low',
        gapStart: firstGap.gap_start,
        gapEnd: firstGap.gap_end,
        gapHours: Math.round(firstGap.gap_hours),
        reason: `You have a ${Math.round(firstGap.gap_hours / 24)}-day gap in your schedule`,
        benefit: 'Maintain consistent audience engagement'
      });
    }
    
    // Add frequency suggestions
    if (postingFrequency < 0.5) {
      suggestions.push({
        type: 'increase_frequency',
        priority: 'medium',
        currentFrequency: postingFrequency.toFixed(1),
        recommendedFrequency: '1-2',
        reason: "You're posting less than once every 2 days",
        benefit: 'Regular posting improves audience retention and reach'
      });
    }
    
    // Generate heat map
    const heatMap = generateHeatMap(optimalSlots);
    
    // Find next optimal slot
    let nextOptimalSlot: {
      time: string;
      dayOfWeek: number;
      hour: number;
      expectedEngagement: number;
      reason: string;
    } | null = null;
    
    if (optimalSlots.length > 0) {
      const now = new Date();
      outerLoop:
      for (let day = 0; day < 14; day++) {
        for (const slot of optimalSlots) {
          const candidateDate = new Date(now);
          candidateDate.setDate(now.getDate() + day);
          const daysToAdd = (slot.day_of_week - candidateDate.getDay() + 7) % 7;
          candidateDate.setDate(candidateDate.getDate() + daysToAdd);
          candidateDate.setHours(slot.hour_of_day, 0, 0, 0);
          
          if (candidateDate > now) {
            const isTaken = upcomingPosts?.some((p: { scheduled_time: string }) => {
              const postTime = new Date(p.scheduled_time);
              return Math.abs(postTime.getTime() - candidateDate.getTime()) < 2 * 60 * 60 * 1000;
            });
            
            if (!isTaken) {
              nextOptimalSlot = {
                time: candidateDate.toISOString(),
                dayOfWeek: slot.day_of_week,
                hour: slot.hour_of_day,
                expectedEngagement: slot.avg_engagement_rate,
                reason: `Optimal slot based on ${slot.avg_engagement_rate.toFixed(1)}% avg engagement`
              };
              break outerLoop;
            }
          }
        }
      }
    }
    
    console.log('Analysis complete:', { hasEnoughData, suggestionsCount: suggestions.length });
    
    return new Response(
      JSON.stringify({
        success: true,
        hasHistoricalData: hasEnoughData,
        dataPoints: activityData?.length || 0,
        optimalSlots: optimalSlots.slice(0, 5).map((slot: ActivitySlot) => ({
          dayOfWeek: slot.day_of_week,
          hour: slot.hour_of_day,
          engagementRate: slot.avg_engagement_rate,
          confidence: hasEnoughData ? 'high' : 'low'
        })),
        suggestions: suggestions,
        postingPattern: {
          upcomingPosts: upcomingPosts?.length || 0,
          frequency: postingFrequency.toFixed(2),
          gaps: gaps?.length || 0,
          recommendation: postingFrequency < 0.5 ? 'increase' : postingFrequency > 3 ? 'decrease' : 'maintain'
        },
        heatMap: heatMap,
        nextOptimalSlot: nextOptimalSlot
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (err) {
    const error = err as Error;
    console.error('Scheduler intelligence error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getIndustryBenchmarks(platform: string): ActivitySlot[] {
  const benchmarks: Record<string, ActivitySlot[]> = {
    twitter: [
      { day_of_week: 2, hour_of_day: 12, avg_engagement_rate: 3.5 },
      { day_of_week: 2, hour_of_day: 15, avg_engagement_rate: 3.3 },
      { day_of_week: 3, hour_of_day: 9, avg_engagement_rate: 3.2 },
      { day_of_week: 4, hour_of_day: 11, avg_engagement_rate: 3.1 },
      { day_of_week: 3, hour_of_day: 14, avg_engagement_rate: 3.0 }
    ],
    linkedin: [
      { day_of_week: 2, hour_of_day: 8, avg_engagement_rate: 4.2 },
      { day_of_week: 3, hour_of_day: 9, avg_engagement_rate: 4.0 },
      { day_of_week: 4, hour_of_day: 10, avg_engagement_rate: 3.9 },
      { day_of_week: 2, hour_of_day: 12, avg_engagement_rate: 3.8 },
      { day_of_week: 3, hour_of_day: 11, avg_engagement_rate: 3.7 }
    ],
    instagram: [
      { day_of_week: 3, hour_of_day: 11, avg_engagement_rate: 5.2 },
      { day_of_week: 5, hour_of_day: 14, avg_engagement_rate: 5.0 },
      { day_of_week: 6, hour_of_day: 10, avg_engagement_rate: 4.8 },
      { day_of_week: 0, hour_of_day: 13, avg_engagement_rate: 4.7 },
      { day_of_week: 4, hour_of_day: 15, avg_engagement_rate: 4.6 }
    ],
    facebook: [
      { day_of_week: 3, hour_of_day: 13, avg_engagement_rate: 2.8 },
      { day_of_week: 4, hour_of_day: 12, avg_engagement_rate: 2.7 },
      { day_of_week: 5, hour_of_day: 13, avg_engagement_rate: 2.6 },
      { day_of_week: 3, hour_of_day: 15, avg_engagement_rate: 2.5 },
      { day_of_week: 2, hour_of_day: 14, avg_engagement_rate: 2.4 }
    ]
  };
  
  return benchmarks[platform] || benchmarks.twitter;
}

function generateHeatMap(slots: ActivitySlot[]): number[][] {
  const heatMap: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
  
  slots.forEach(slot => {
    if (slot.day_of_week >= 0 && slot.day_of_week <= 6 && slot.hour_of_day >= 0 && slot.hour_of_day <= 23) {
      heatMap[slot.day_of_week][slot.hour_of_day] = slot.avg_engagement_rate;
    }
  });
  
  return heatMap;
}
