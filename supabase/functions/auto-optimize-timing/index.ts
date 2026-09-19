import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { serviceClient } from "../_shared/supabase.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, action, postId, platform, afterTime, preferences } = await req.json();
    
    const supabase = serviceClient();
    
    console.log('Auto-optimize action:', action, 'for user:', userId);
    
    if (action === 'get_preferences') {
      const { data: prefs, error } = await supabase
        .from('auto_schedule_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify({
          success: true,
          preferences: prefs || {
            enabled: false,
            posts_per_day: 1,
            posts_per_week: 7,
            avoid_weekends: false,
            avoid_nights: true,
            min_hours_between_posts: 4,
            auto_fill_queue: false
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'update_preferences') {
      const { data: existing } = await supabase
        .from('auto_schedule_preferences')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      let result;
      if (existing) {
        result = await supabase
          .from('auto_schedule_preferences')
          .update({ ...preferences, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .select();
      } else {
        result = await supabase
          .from('auto_schedule_preferences')
          .insert({ user_id: userId, ...preferences })
          .select();
      }
      
      if (result.error) throw result.error;
      
      return new Response(
        JSON.stringify({ success: true, preferences: result.data[0] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'find_optimal_slot') {
      const { data: slot, error } = await supabase
        .rpc('find_next_optimal_slot', {
          p_user_id: userId,
          p_platform: platform || 'all',
          p_after_time: afterTime || new Date().toISOString(),
          p_days_ahead: 14
        });
      
      if (error) {
        console.error('Error finding optimal slot:', error);
        throw error;
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          slot: slot && slot.length > 0 ? {
            time: slot[0].suggested_time,
            expectedEngagement: slot[0].expected_engagement,
            reason: slot[0].reason,
            confidence: slot[0].confidence
          } : null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'optimize_post') {
      const { data: slot, error: slotError } = await supabase
        .rpc('find_next_optimal_slot', {
          p_user_id: userId,
          p_platform: platform || 'all',
          p_after_time: afterTime || new Date().toISOString(),
          p_days_ahead: 14
        });
      
      if (slotError) throw slotError;
      
      if (slot && slot.length > 0 && postId) {
        const { error: updateError } = await supabase
          .from('scheduled_posts')
          .update({
            scheduled_time: slot[0].suggested_time,
            status: 'scheduled'
          })
          .eq('id', postId);
        
        if (updateError) throw updateError;
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          optimized: slot && slot.length > 0 ? {
            postId: postId,
            scheduledFor: slot[0].suggested_time,
            expectedEngagement: slot[0].expected_engagement,
            confidence: slot[0].confidence
          } : null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'auto_schedule_queue') {
      const { data: scheduled, error } = await supabase
        .rpc('auto_schedule_queued_content', {
          p_user_id: userId
        });
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify({
          success: true,
          scheduled: scheduled || [],
          count: scheduled?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'generate_weekly_schedule') {
      const { data: prefs } = await supabase
        .from('auto_schedule_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      const postsPerWeek = prefs?.posts_per_week || 7;
      const minHoursBetween = prefs?.min_hours_between_posts || 4;
      
      const schedule = [];
      let currentTime = new Date();
      currentTime.setHours(currentTime.getHours() + 1, 0, 0, 0);
      
      for (let i = 0; i < postsPerWeek; i++) {
        const { data: slot } = await supabase
          .rpc('find_next_optimal_slot', {
            p_user_id: userId,
            p_platform: 'all',
            p_after_time: currentTime.toISOString(),
            p_days_ahead: 7
          });
        
        if (slot && slot.length > 0) {
          schedule.push({
            position: i + 1,
            time: slot[0].suggested_time,
            dayOfWeek: new Date(slot[0].suggested_time).toLocaleDateString('en-US', { weekday: 'long' }),
            timeOfDay: new Date(slot[0].suggested_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            expectedEngagement: slot[0].expected_engagement,
            confidence: slot[0].confidence
          });
          
          currentTime = new Date(slot[0].suggested_time);
          currentTime.setHours(currentTime.getHours() + minHoursBetween);
        }
      }
      
      const avgEngagement = schedule.length > 0 
        ? schedule.reduce((sum, s) => sum + parseFloat(s.expectedEngagement || 0), 0) / schedule.length
        : 0;
      
      return new Response(
        JSON.stringify({
          success: true,
          schedule: schedule,
          summary: {
            totalSlots: schedule.length,
            targetPosts: postsPerWeek,
            avgEngagement: avgEngagement
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    throw new Error('Invalid action: ' + action);
    
  } catch (error) {
    console.error('Auto-optimize error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
