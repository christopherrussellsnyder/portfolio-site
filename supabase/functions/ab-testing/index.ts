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
    const { userId, action, testData, testId } = await req.json();
    
    const supabase = serviceClient();
    
    console.log('A/B testing action:', action);
    
    if (action === 'create_test') {
      const { data: test, error } = await supabase
        .from('ab_tests')
        .insert({
          user_id: userId,
          name: testData.name,
          description: testData.description,
          hypothesis: testData.hypothesis,
          variable_being_tested: testData.variable,
          minimum_sample_size: testData.sampleSize || 30,
          confidence_level: testData.confidenceLevel || 95,
          status: 'draft'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const variants = [];
      for (let i = 0; i < testData.variants.length; i++) {
        const variant = testData.variants[i];
        const { data: createdVariant, error: variantError } = await supabase
          .from('ab_test_variants')
          .insert({
            ab_test_id: test.id,
            variant_name: variant.name,
            is_control: i === 0,
            content_template: variant.content,
            variable_value: variant.variableValue || {}
          })
          .select()
          .single();
        
        if (variantError) throw variantError;
        variants.push(createdVariant);
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          test: { ...test, variants } 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'get_tests') {
      const { data: tests } = await supabase
        .from('ab_tests')
        .select('*, ab_test_variants(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      return new Response(
        JSON.stringify({ success: true, tests: tests || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'start_test') {
      const { error } = await supabase
        .from('ab_tests')
        .update({
          status: 'running',
          start_date: new Date().toISOString()
        })
        .eq('id', testId);
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ success: true, message: 'Test started' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'pause_test') {
      const { error } = await supabase
        .from('ab_tests')
        .update({
          status: 'paused'
        })
        .eq('id', testId);
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ success: true, message: 'Test paused' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'resume_test') {
      const { error } = await supabase
        .from('ab_tests')
        .update({
          status: 'running'
        })
        .eq('id', testId);
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ success: true, message: 'Test resumed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'delete_test') {
      // Delete associated variants first
      await supabase
        .from('ab_test_variants')
        .delete()
        .eq('ab_test_id', testId);
      
      // Delete associated results
      await supabase
        .from('ab_test_results')
        .delete()
        .eq('ab_test_id', testId);
      
      // Delete the test
      const { error } = await supabase
        .from('ab_tests')
        .delete()
        .eq('id', testId);
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ success: true, message: 'Test deleted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'get_results') {
      const { data: test } = await supabase
        .from('ab_tests')
        .select('*, ab_test_variants(*)')
        .eq('id', testId)
        .single();
      
      if (!test) throw new Error('Test not found');
      
      const { data: significance } = await supabase
        .rpc('calculate_ab_test_significance', {
          p_test_id: testId
        });
      
      const analysis = analyzeTestResults(test, significance || []);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          test,
          significance: significance || [],
          analysis
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'assign_variant') {
      const { data: test } = await supabase
        .from('ab_tests')
        .select('*, ab_test_variants(*)')
        .eq('id', testData.testId)
        .single();
      
      if (!test || test.status !== 'running') {
        return new Response(
          JSON.stringify({ success: false, error: 'Test not running' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const assignedVariant = selectVariantForAssignment(test.ab_test_variants);
      
      await supabase
        .from('ab_test_results')
        .insert({
          ab_test_id: test.id,
          variant_id: assignedVariant.id,
          post_id: testData.postId
        });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          assignedVariant
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'check_for_winner') {
      await supabase.rpc('auto_select_ab_winner', {
        p_test_id: testId
      });
      
      const { data: updatedTest } = await supabase
        .from('ab_tests')
        .select('*')
        .eq('id', testId)
        .single();
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          test: updatedTest,
          hasWinner: updatedTest?.status === 'completed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    throw new Error('Invalid action');
    
  } catch (error) {
    console.error('A/B testing error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

interface Variant {
  id: string;
  variant_name: string;
  is_control: boolean;
  posts_published: number;
  avg_engagement_rate: number;
}

interface SignificanceResult {
  variant_id: string;
  variant_name: string;
  sample_size: number;
  avg_engagement_rate: number;
  is_statistically_significant: boolean;
  confidence_level: number;
  improvement_over_control: number;
}

function selectVariantForAssignment(variants: Variant[]): Variant {
  const totalPosts = variants.reduce((sum, v) => sum + v.posts_published, 0);
  
  if (totalPosts === 0) {
    return variants.find(v => v.is_control) || variants[0];
  }
  
  const targetPerVariant = totalPosts / variants.length;
  const underservedVariants = variants.filter(v => v.posts_published < targetPerVariant);
  
  if (underservedVariants.length > 0) {
    return underservedVariants[0];
  }
  
  return variants[Math.floor(Math.random() * variants.length)];
}

interface ABTest {
  id: string;
  status: string;
  minimum_sample_size: number;
  ab_test_variants: Variant[];
}

function analyzeTestResults(test: ABTest, significance: SignificanceResult[]) {
  const variants = test.ab_test_variants;
  const controlVariant = variants.find(v => v.is_control);
  
  if (!controlVariant) {
    return { status: 'error', message: 'No control variant found' };
  }
  
  const totalSampleSize = variants.reduce((sum, v) => sum + v.posts_published, 0);
  const meetsMinimum = totalSampleSize >= test.minimum_sample_size;
  
  const significantVariants = significance.filter(s => s.is_statistically_significant);
  const hasWinner = significantVariants.length > 0;
  
  let recommendation = '';
  let nextSteps: string[] = [];
  
  if (!meetsMinimum) {
    recommendation = `Continue testing. You need ${test.minimum_sample_size - totalSampleSize} more posts.`;
    nextSteps = [
      'Keep publishing posts distributed across variants',
      `Target: ${test.minimum_sample_size} total posts minimum`,
      'Check results daily for significance'
    ];
  } else if (hasWinner) {
    const winner = significantVariants[0];
    recommendation = `${winner.variant_name} is the clear winner with ${winner.confidence_level}% confidence!`;
    nextSteps = [
      `Implement ${winner.variant_name} across all future posts`,
      `Expected improvement: +${winner.improvement_over_control.toFixed(1)}%`,
      'Document learnings for future tests'
    ];
  } else {
    recommendation = 'No statistically significant difference yet. Continue testing or consider variations.';
    nextSteps = [
      'Continue running the test for more data',
      'Consider testing more extreme variations',
      'Check if sample size is sufficient'
    ];
  }
  
  const insights: { type: string; message: string; confidence: number }[] = [];
  
  variants.forEach(variant => {
    const sig = significance.find(s => s.variant_id === variant.id);
    if (sig && sig.improvement_over_control > 0) {
      insights.push({
        type: 'positive',
        message: `${variant.variant_name} shows ${sig.improvement_over_control.toFixed(1)}% improvement`,
        confidence: sig.confidence_level
      });
    } else if (sig && sig.improvement_over_control < -10) {
      insights.push({
        type: 'negative',
        message: `${variant.variant_name} underperforms by ${Math.abs(sig.improvement_over_control).toFixed(1)}%`,
        confidence: sig.confidence_level
      });
    }
  });
  
  return {
    status: test.status,
    totalSampleSize,
    meetsMinimum,
    hasWinner,
    recommendation,
    nextSteps,
    insights,
    estimatedTimeToCompletion: meetsMinimum ? 'Sufficient data' : calculateEstimatedTime(totalSampleSize, test.minimum_sample_size)
  };
}

function calculateEstimatedTime(current: number, target: number): string {
  const avgPostsPerDay = 2;
  const daysNeeded = Math.ceil((target - current) / avgPostsPerDay);
  
  if (daysNeeded <= 3) return `~${daysNeeded} days`;
  if (daysNeeded <= 7) return '~1 week';
  if (daysNeeded <= 14) return '~2 weeks';
  return `~${Math.ceil(daysNeeded / 7)} weeks`;
}
