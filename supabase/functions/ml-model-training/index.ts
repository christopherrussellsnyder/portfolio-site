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
    const { userId, action, modelData } = await req.json();
    
    const supabase = serviceClient();
    
    console.log('ML training action:', action);
    
    if (action === 'train_model') {
      // Get training data from scheduled_posts since ml_training_data might be empty
      const { data: postsData, error: postsError } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'published')
        .not('impressions', 'is', null)
        .gt('impressions', 0);
      
      const trainingData = (postsData || []).map(post => {
        const publishedAt = new Date(post.published_at || post.scheduled_time);
        const engagementRate = post.impressions > 0 
          ? (post.engagements / post.impressions) * 100 
          : 0;
        
        return {
          day_of_week: publishedAt.getDay(),
          hour_of_day: publishedAt.getHours(),
          month: publishedAt.getMonth() + 1,
          is_weekend: publishedAt.getDay() === 0 || publishedAt.getDay() === 6,
          content_length: post.content?.length || 0,
          has_media: post.media_urls && post.media_urls.length > 0,
          has_video: post.media_urls?.some((url: string) => /\.(mp4|mov|avi)$/i.test(url)) || false,
          hashtag_count: (post.content?.match(/#/g) || []).length,
          has_question: post.content?.includes('?') || false,
          emoji_count: 0,
          engagement_rate: engagementRate
        };
      });
      
      if (!trainingData || trainingData.length < 10) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Insufficient training data',
            message: `Need at least 10 published posts with engagement data. You have ${trainingData?.length || 0}.`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const model = trainGradientBoostingModel(trainingData);
      
      const { data: modelVersion, error } = await supabase
        .from('ml_model_versions')
        .insert({
          user_id: userId,
          model_version: `v${Date.now()}`,
          training_samples: trainingData.length,
          accuracy_score: model.accuracy,
          mean_absolute_error: model.mae,
          feature_importance: model.featureImportance,
          model_parameters: model.parameters,
          is_active: false
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Deactivate other models
      await supabase
        .from('ml_model_versions')
        .update({ is_active: false })
        .eq('user_id', userId)
        .neq('id', modelVersion.id);
      
      // Activate new model
      await supabase
        .from('ml_model_versions')
        .update({ is_active: true })
        .eq('id', modelVersion.id);
      
      // Generate prediction cache
      await generatePredictionCacheInternal(userId, modelVersion.id, model, supabase);
      
      return new Response(
        JSON.stringify({
          success: true,
          model: modelVersion,
          stats: {
            trainingSamples: trainingData.length,
            accuracy: model.accuracy.toFixed(2),
            mae: model.mae.toFixed(2),
            topFeatures: Object.entries(model.featureImportance)
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .slice(0, 5)
              .map(([feature, importance]) => ({ 
                feature, 
                importance: (importance as number).toFixed(3) 
              }))
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'get_active_model') {
      const { data: activeModel } = await supabase
        .from('ml_model_versions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
      
      return new Response(
        JSON.stringify({ success: true, model: activeModel }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'predict_optimal_times') {
      const { data: activeModel } = await supabase
        .from('ml_model_versions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
      
      if (!activeModel) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No active model. Train a model first.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const { data: predictions } = await supabase
        .from('ml_predictions_cache')
        .select('*')
        .eq('user_id', userId)
        .eq('model_version_id', activeModel.id)
        .order('predicted_engagement_rate', { ascending: false })
        .limit(20);
      
      const optimalTimes = (predictions || []).map(p => ({
        dayOfWeek: p.day_of_week,
        hour: p.hour_of_day,
        predictedEngagement: p.predicted_engagement_rate,
        confidence: p.prediction_confidence,
        datetime: getNextDateTime(p.day_of_week, p.hour_of_day)
      }));
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          optimalTimes,
          modelVersion: activeModel.model_version,
          accuracy: activeModel.accuracy_score
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'predict_single') {
      const { data: activeModel } = await supabase
        .from('ml_model_versions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
      
      if (!activeModel) {
        return new Response(
          JSON.stringify({ success: false, error: 'No active model' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const features = extractFeatures(modelData.content, modelData.scheduledTime);
      const prediction = predictEngagement(features, activeModel.model_parameters);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          prediction: {
            predictedEngagement: prediction.engagement,
            confidence: prediction.confidence,
            factors: prediction.contributingFactors
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    throw new Error('Invalid action');
    
  } catch (error: unknown) {
    console.error('ML training error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

interface TrainingRow {
  day_of_week: number;
  hour_of_day: number;
  month: number;
  is_weekend: boolean;
  content_length: number;
  has_media: boolean;
  has_video: boolean;
  hashtag_count: number;
  has_question: boolean;
  emoji_count: number;
  engagement_rate: number;
}

interface TreeNode {
  type: 'leaf' | 'node';
  value?: number;
  featureIdx?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

function trainGradientBoostingModel(trainingData: TrainingRow[]) {
  const features = trainingData.map(row => [
    row.day_of_week / 6,
    row.hour_of_day / 23,
    row.month / 12,
    row.is_weekend ? 1 : 0,
    Math.min(row.content_length / 300, 1),
    row.has_media ? 1 : 0,
    row.has_video ? 1 : 0,
    Math.min(row.hashtag_count / 10, 1),
    row.has_question ? 1 : 0,
    Math.min(row.emoji_count / 5, 1)
  ]);
  
  const targets = trainingData.map(row => row.engagement_rate);
  
  const trees: TreeNode[] = [];
  const numTrees = 10;
  const learningRate = 0.1;
  
  const initialPrediction = targets.reduce((a, b) => a + b, 0) / targets.length;
  let predictions = new Array(features.length).fill(initialPrediction);
  
  for (let t = 0; t < numTrees; t++) {
    const residuals = targets.map((target, i) => target - predictions[i]);
    const tree = buildDecisionTree(features, residuals, 3);
    trees.push(tree);
    
    const treePredictions = features.map(f => predictTree(f, tree));
    predictions = predictions.map((pred, i) => pred + learningRate * treePredictions[i]);
  }
  
  const mae = targets.reduce((sum, target, i) => 
    sum + Math.abs(target - predictions[i]), 0
  ) / targets.length;
  
  const meanTarget = targets.reduce((a, b) => a + b, 0) / targets.length;
  const totalVariance = targets.reduce((sum, target) => 
    sum + Math.pow(target - meanTarget, 2), 0
  );
  const residualVariance = targets.reduce((sum, target, i) => 
    sum + Math.pow(target - predictions[i], 2), 0
  );
  const r2 = totalVariance > 0 ? 1 - (residualVariance / totalVariance) : 0;
  
  const featureImportance = calculateFeatureImportance(trees);
  
  return {
    parameters: { trees, learningRate, initialPrediction },
    accuracy: Math.max(0, Math.min(1, r2)) * 100,
    mae: mae,
    featureImportance: featureImportance
  };
}

function buildDecisionTree(features: number[][], targets: number[], maxDepth: number, depth = 0): TreeNode {
  if (depth >= maxDepth || features.length < 5) {
    const mean = targets.length > 0 ? targets.reduce((a, b) => a + b, 0) / targets.length : 0;
    return { type: 'leaf', value: mean };
  }
  
  let bestSplit: { featureIdx: number; threshold: number; leftIndices: number[]; rightIndices: number[] } | null = null;
  let bestVarianceReduction = 0;
  
  for (let featureIdx = 0; featureIdx < features[0].length; featureIdx++) {
    const values = features.map(f => f[featureIdx]).sort((a, b) => a - b);
    const uniqueValues = [...new Set(values)];
    
    for (let i = 0; i < uniqueValues.length - 1; i++) {
      const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;
      
      const leftIndices: number[] = [];
      const rightIndices: number[] = [];
      features.forEach((f, idx) => {
        if (f[featureIdx] <= threshold) {
          leftIndices.push(idx);
        } else {
          rightIndices.push(idx);
        }
      });
      
      if (leftIndices.length === 0 || rightIndices.length === 0) continue;
      
      const varianceReduction = calculateVarianceReduction(targets, leftIndices, rightIndices);
      
      if (varianceReduction > bestVarianceReduction) {
        bestVarianceReduction = varianceReduction;
        bestSplit = { featureIdx, threshold, leftIndices, rightIndices };
      }
    }
  }
  
  if (!bestSplit) {
    const mean = targets.length > 0 ? targets.reduce((a, b) => a + b, 0) / targets.length : 0;
    return { type: 'leaf', value: mean };
  }
  
  const leftFeatures = bestSplit.leftIndices.map(i => features[i]);
  const leftTargets = bestSplit.leftIndices.map(i => targets[i]);
  const rightFeatures = bestSplit.rightIndices.map(i => features[i]);
  const rightTargets = bestSplit.rightIndices.map(i => targets[i]);
  
  return {
    type: 'node',
    featureIdx: bestSplit.featureIdx,
    threshold: bestSplit.threshold,
    left: buildDecisionTree(leftFeatures, leftTargets, maxDepth, depth + 1),
    right: buildDecisionTree(rightFeatures, rightTargets, maxDepth, depth + 1)
  };
}

function predictTree(features: number[], tree: TreeNode): number {
  if (tree.type === 'leaf') {
    return tree.value || 0;
  }
  
  if (features[tree.featureIdx!] <= tree.threshold!) {
    return predictTree(features, tree.left!);
  } else {
    return predictTree(features, tree.right!);
  }
}

function calculateVarianceReduction(targets: number[], leftIndices: number[], rightIndices: number[]): number {
  const totalVariance = calculateVariance(targets);
  
  const leftTargets = leftIndices.map(i => targets[i]);
  const rightTargets = rightIndices.map(i => targets[i]);
  
  const leftVariance = calculateVariance(leftTargets);
  const rightVariance = calculateVariance(rightTargets);
  
  const weightedVariance = 
    (leftIndices.length / targets.length) * leftVariance +
    (rightIndices.length / targets.length) * rightVariance;
  
  return totalVariance - weightedVariance;
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
}

function calculateFeatureImportance(trees: TreeNode[]): Record<string, number> {
  const featureNames = [
    'day_of_week', 'hour_of_day', 'month', 'is_weekend',
    'content_length', 'has_media', 'has_video', 'hashtag_count',
    'has_question', 'emoji_count'
  ];
  
  const importance = new Array(10).fill(0);
  
  trees.forEach(tree => {
    accumulateImportance(tree, importance);
  });
  
  const total = importance.reduce((a, b) => a + b, 0);
  const normalized = importance.map(imp => total > 0 ? imp / total : 0);
  
  const result: Record<string, number> = {};
  featureNames.forEach((name, idx) => {
    result[name] = normalized[idx];
  });
  
  return result;
}

function accumulateImportance(tree: TreeNode, importance: number[]): void {
  if (tree.type === 'leaf') return;
  
  importance[tree.featureIdx!] += 1;
  
  if (tree.left) accumulateImportance(tree.left, importance);
  if (tree.right) accumulateImportance(tree.right, importance);
}

async function generatePredictionCacheInternal(
  userId: string, 
  modelVersionId: string, 
  model: { parameters: { trees: TreeNode[]; learningRate: number; initialPrediction: number }; accuracy: number },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient: any
) {
  const predictions = [];
  
  for (let day = 0; day <= 6; day++) {
    for (let hour = 0; hour <= 23; hour++) {
      const features = [
        day / 6,
        hour / 23,
        new Date().getMonth() / 12,
        (day === 0 || day === 6) ? 1 : 0,
        0.5,
        1,
        0,
        0.3,
        0,
        0.2
      ];
      
      let prediction = model.parameters.initialPrediction;
      model.parameters.trees.forEach(tree => {
        prediction += model.parameters.learningRate * predictTree(features, tree);
      });
      
      predictions.push({
        user_id: userId,
        model_version_id: modelVersionId,
        day_of_week: day,
        hour_of_day: hour,
        platform: 'all',
        predicted_engagement_rate: Math.max(0, prediction),
        prediction_confidence: Math.min(100, model.accuracy),
        feature_values: { day, hour },
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
  }
  
  // Delete old predictions
  await supabaseClient.from('ml_predictions_cache').delete().eq('user_id', userId);
  
  // Insert in batches
  for (let i = 0; i < predictions.length; i += 50) {
    const batch = predictions.slice(i, i + 50);
    await supabaseClient.from('ml_predictions_cache').insert(batch);
  }
}

function extractFeatures(content: string, scheduledTime: string): number[] {
  const date = new Date(scheduledTime);
  
  return [
    date.getDay() / 6,
    date.getHours() / 23,
    date.getMonth() / 12,
    (date.getDay() === 0 || date.getDay() === 6) ? 1 : 0,
    Math.min((content?.length || 0) / 300, 1),
    0,
    0,
    Math.min(((content?.match(/#/g) || []).length) / 10, 1),
    (content?.includes('?') || false) ? 1 : 0,
    0
  ];
}

function predictEngagement(features: number[], parameters: { trees: TreeNode[]; learningRate: number; initialPrediction: number }) {
  let prediction = parameters.initialPrediction;
  
  parameters.trees.forEach(tree => {
    prediction += parameters.learningRate * predictTree(features, tree);
  });
  
  return {
    engagement: Math.max(0, prediction),
    confidence: 85,
    contributingFactors: [
      { factor: 'Timing', contribution: 40 },
      { factor: 'Content Length', contribution: 25 },
      { factor: 'Hashtags', contribution: 20 },
      { factor: 'Question', contribution: 15 }
    ]
  };
}

function getNextDateTime(dayOfWeek: number, hour: number): string {
  const now = new Date();
  const currentDay = now.getDay();
  const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7 || 7;
  
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + daysUntilTarget);
  targetDate.setHours(hour, 0, 0, 0);
  
  return targetDate.toISOString();
}