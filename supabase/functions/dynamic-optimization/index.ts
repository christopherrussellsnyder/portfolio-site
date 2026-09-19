import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { serviceClient } from "../_shared/supabase.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { userId, action, ruleData } = await req.json();
    
    const supabase = serviceClient();
    
    console.log('Dynamic optimization action:', action);
    
    if (action === 'get_dashboard') {
      const { data: rules } = await supabase
        .from('optimization_rules')
        .select('*')
        .eq('user_id', userId)
        .order('priority', { ascending: false });
      
      const { data: recentActions } = await supabase
        .from('optimization_actions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      const { data: monitoring } = await supabase
        .from('performance_monitoring')
        .select('*')
        .eq('user_id', userId)
        .order('monitored_at', { ascending: false })
        .limit(50);
      
      const stats = calculateOptimizationStats(rules || [], recentActions || [], monitoring || []);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          rules: rules || [],
          recentActions: recentActions || [],
          monitoring: monitoring || [],
          stats
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'execute_pending_actions') {
      const { data, error } = await supabase.rpc('execute_optimization_actions');
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          executed: data || 0,
          message: `Executed ${data || 0} optimization actions`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'create_rule') {
      const { data: rule, error } = await supabase
        .from('optimization_rules')
        .insert({
          user_id: userId,
          rule_name: ruleData.name,
          rule_type: ruleData.type,
          condition: ruleData.condition,
          action: ruleData.action,
          priority: ruleData.priority || 5,
          is_active: true
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ success: true, rule }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'toggle_rule') {
      const { error } = await supabase
        .from('optimization_rules')
        .update({ is_active: ruleData.isActive })
        .eq('id', ruleData.ruleId)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'auto_optimize_schedule') {
      const { data: posts } = await supabase
        .from('scheduled_posts')
        .select('*, engagement_data')
        .eq('user_id', userId)
        .eq('status', 'published')
        .not('engagement_data', 'is', null)
        .gte('published_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      const analysis = analyzeSchedulePerformance(posts || []);
      const recommendations = generateScheduleOptimizations(analysis);
      
      if (recommendations.shouldRetrain) {
        await supabase.functions.invoke('ml-model-training', {
          body: { userId, action: 'train_model' }
        });
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          analysis,
          recommendations
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'get_performance_insights') {
      const { data: monitoring } = await supabase
        .from('performance_monitoring')
        .select('*')
        .eq('user_id', userId)
        .gte('monitored_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('monitored_at', { ascending: false });
      
      const insights = generatePerformanceInsights(monitoring || []);
      
      return new Response(
        JSON.stringify({ success: true, insights }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'auto_create_ab_test') {
      const { data: topPost } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'published')
        .not('engagements', 'is', null)
        .order('engagements', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!topPost) {
        return new Response(
          JSON.stringify({ success: false, error: 'No high-performing posts found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const variations = generateContentVariations(topPost.content);
      
      const { data: test } = await supabase
        .from('ab_tests')
        .insert({
          user_id: userId,
          name: `Auto: ${topPost.content.substring(0, 30)}...`,
          variable_being_tested: 'content',
          status: 'running',
          start_date: new Date().toISOString()
        })
        .select()
        .single();
      
      for (const variant of variations) {
        await supabase
          .from('ab_test_variants')
          .insert({
            ab_test_id: test.id,
            variant_name: variant.name,
            is_control: variant.isControl,
            content_template: variant.content
          });
      }
      
      await supabase
        .from('auto_ab_tests')
        .insert({
          ab_test_id: test.id,
          trigger_reason: 'High-performing post detected',
          status: 'active'
        });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          test,
          message: 'Auto A/B test created from high-performing post'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    throw new Error('Invalid action');
    
  } catch (error) {
    console.error('Dynamic optimization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

interface Rule {
  is_active: boolean;
  trigger_count?: number;
  success_count?: number;
}

interface Action {
  created_at: string;
}

interface Monitoring {
  status: string;
}

function calculateOptimizationStats(rules: Rule[], actions: Action[], monitoring: Monitoring[]) {
  const activeRules = rules.filter(r => r.is_active).length;
  const totalTriggers = rules.reduce((sum, r) => sum + (r.trigger_count || 0), 0);
  const totalSuccesses = rules.reduce((sum, r) => sum + (r.success_count || 0), 0);
  const successRate = totalTriggers > 0 ? (totalSuccesses / totalTriggers * 100) : 0;
  
  const last24hActions = actions.filter(a => 
    Date.now() - new Date(a.created_at).getTime() < 24 * 60 * 60 * 1000
  ).length;
  
  const criticalAlerts = monitoring.filter(m => m.status === 'critical').length;
  const warningAlerts = monitoring.filter(m => m.status === 'warning').length;
  
  return {
    activeRules,
    totalTriggers,
    successRate: successRate.toFixed(1),
    actionsLast24h: last24hActions,
    criticalAlerts,
    warningAlerts
  };
}

interface Post {
  published_at: string;
  engagements?: number;
  impressions?: number;
}

function analyzeSchedulePerformance(posts: Post[]) {
  if (posts.length === 0) {
    return { avgEngagement: 0, bestTime: null, worstTime: null, hourlyBreakdown: [] };
  }
  
  const timeSlots: Record<number, { rates: number[]; count: number }> = {};
  
  posts.forEach(post => {
    const hour = new Date(post.published_at).getHours();
    const engagement = post.engagements || 0;
    const impressions = post.impressions || 1;
    const rate = (engagement / impressions) * 100;
    
    if (!timeSlots[hour]) {
      timeSlots[hour] = { rates: [], count: 0 };
    }
    timeSlots[hour].rates.push(rate);
    timeSlots[hour].count++;
  });
  
  const avgByHour = Object.entries(timeSlots).map(([hour, data]) => ({
    hour: parseInt(hour),
    avgRate: data.rates.reduce((a, b) => a + b, 0) / data.rates.length,
    count: data.count
  }));
  
  avgByHour.sort((a, b) => b.avgRate - a.avgRate);
  
  const overallAvg = posts.reduce((sum, p) => {
    const engagement = p.engagements || 0;
    const impressions = p.impressions || 1;
    return sum + (engagement / impressions * 100);
  }, 0) / posts.length;
  
  return {
    avgEngagement: overallAvg.toFixed(2),
    bestTime: avgByHour[0] || null,
    worstTime: avgByHour[avgByHour.length - 1] || null,
    hourlyBreakdown: avgByHour
  };
}

interface TimeSlot {
  hour: number;
  avgRate: number;
}

interface Analysis {
  avgEngagement: string | number;
  bestTime: TimeSlot | null;
  worstTime: TimeSlot | null;
}

function generateScheduleOptimizations(analysis: Analysis) {
  const recommendations = [];
  const avgEng = typeof analysis.avgEngagement === 'string' 
    ? parseFloat(analysis.avgEngagement) 
    : analysis.avgEngagement;
  
  if (avgEng < 3.0) {
    recommendations.push({
      priority: 'high',
      action: 'Retrain ML model',
      reason: `Average engagement (${analysis.avgEngagement}%) is below target`,
      impact: 'Should improve timing predictions by 15-25%'
    });
  }
  
  if (analysis.bestTime && analysis.worstTime) {
    const diff = analysis.bestTime.avgRate - analysis.worstTime.avgRate;
    if (diff > 2) {
      recommendations.push({
        priority: 'high',
        action: 'Shift more posts to optimal times',
        reason: `${analysis.bestTime.hour}:00 performs ${diff.toFixed(1)}% better than ${analysis.worstTime.hour}:00`,
        impact: `Could increase overall engagement by ${(diff / 2).toFixed(1)}%`
      });
    }
  }
  
  return {
    shouldRetrain: avgEng < 3.0,
    recommendations
  };
}

interface MonitoringRecord {
  status: string;
  metric_name: string;
  metric_value: number | string;
}

function generatePerformanceInsights(monitoring: MonitoringRecord[]) {
  const insights = [];
  
  const criticalMetrics = monitoring.filter(m => m.status === 'critical');
  const warningMetrics = monitoring.filter(m => m.status === 'warning');
  
  if (criticalMetrics.length > 0) {
    insights.push({
      severity: 'critical',
      title: `${criticalMetrics.length} Critical Performance Issues`,
      description: 'Immediate attention required',
      actions: ['Review underperforming posts', 'Adjust content strategy', 'Check posting times']
    });
  }
  
  if (warningMetrics.length > 0) {
    insights.push({
      severity: 'warning',
      title: `${warningMetrics.length} Performance Warnings`,
      description: 'Performance below expected levels',
      actions: ['Monitor trends', 'Consider A/B testing', 'Analyze competitor activity']
    });
  }
  
  const recentEngagement = monitoring
    .filter(m => m.metric_name === 'post_engagement_rate')
    .slice(0, 10);
  
  if (recentEngagement.length >= 5) {
    const avg = recentEngagement.reduce((sum, m) => sum + parseFloat(String(m.metric_value)), 0) / recentEngagement.length;
    
    if (avg > 4.5) {
      insights.push({
        severity: 'success',
        title: 'Strong Performance',
        description: `Recent posts averaging ${avg.toFixed(1)}% engagement`,
        actions: ['Maintain current strategy', 'Scale up posting frequency']
      });
    }
  }
  
  return insights;
}

function generateContentVariations(originalContent: string) {
  return [
    {
      name: 'Control',
      content: originalContent,
      isControl: true
    },
    {
      name: 'With Question',
      content: originalContent + '\n\nWhat do you think?',
      isControl: false
    },
    {
      name: 'With CTA',
      content: originalContent + '\n\nShare your thoughts below!',
      isControl: false
    }
  ];
}
