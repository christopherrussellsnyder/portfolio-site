import { StrategyOverview, StrategyPost } from '@/hooks/useStrategyGeneration';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function exportStrategyToCSV(
  strategy: StrategyOverview,
  posts: StrategyPost[]
): void {
  const headers = [
    'Day',
    'Date',
    'Time',
    'Week',
    'Week_Theme',
    'Post_Type',
    'Content_Category',
    'Primary_Emotion',
    'Hook',
    'Hook_Technique',
    'Opening',
    'Caption',
    'CTA',
    'CTA_Type',
    'CTA_Strength',
    'Hashtags_High_Volume',
    'Hashtags_Medium_Volume',
    'Hashtags_Niche',
    'Hashtags_Branded',
    'All_Hashtags',
    'Visual_Type',
    'Visual_Description',
    'Color_Palette',
    'Predicted_Reach',
    'Predicted_Impressions',
    'Predicted_Engagement_Rate',
    'Predicted_Likes',
    'Predicted_Comments',
    'Predicted_Shares',
    'Predicted_Saves',
    'Confidence_Level',
    'Prediction_Basis',
    'Strategic_Rationale',
    'Engagement_Boosters',
    'AB_Test_Ideas',
  ];

  const escapeCSV = (text: string | null | undefined): string => {
    if (!text) return '';
    return `"${text.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
  };

  const rows = posts.map(post => {
    const hashtagMix = post.hashtag_mix || {};
    const visualGuidance = post.visual_guidance || {};
    const strategicRationale = post.strategic_rationale || {};
    const optimizationTips = post.optimization_tips || {};
    
    return [
      post.day_number.toString(),
      post.post_date,
      post.post_time || '',
      (post.week_number || '').toString(),
      post.week_theme || '',
      post.post_type || '',
      post.content_category || post.theme || '',
      post.primary_emotion || '',
      escapeCSV(post.hook),
      post.hook_technique || '',
      escapeCSV(post.opening_text),
      escapeCSV(post.caption),
      escapeCSV(post.cta),
      post.cta_type || '',
      post.cta_strength || '',
      escapeCSV((hashtagMix.high_volume || []).join(' ')),
      escapeCSV((hashtagMix.medium_volume || []).join(' ')),
      escapeCSV((hashtagMix.niche || []).join(' ')),
      escapeCSV((hashtagMix.branded || []).join(' ')),
      escapeCSV((post.hashtags || []).join(' ')),
      visualGuidance.visual_type || '',
      escapeCSV(visualGuidance.description),
      visualGuidance.color_palette || '',
      (post.predicted_reach || '').toString(),
      (post.predicted_impressions || '').toString(),
      (post.predicted_engagement || '').toString(),
      (post.predicted_likes || '').toString(),
      (post.predicted_comments || '').toString(),
      (post.predicted_shares || '').toString(),
      (post.predicted_saves || '').toString(),
      post.performance_confidence || '',
      escapeCSV(post.prediction_basis),
      escapeCSV(strategicRationale.why_this_day),
      escapeCSV((optimizationTips.engagement_boosters || []).join('; ')),
      escapeCSV((optimizationTips.a_b_test_ideas || []).join('; ')),
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${strategy.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast({
    title: 'CSV Exported',
    description: `Strategy exported with ${posts.length} posts and all enhanced fields.`,
  });
}

export function exportStrategyToJSON(
  strategy: StrategyOverview,
  posts: StrategyPost[]
): void {
  const data = {
    strategy_overview: {
      title: strategy.title,
      platform: strategy.platform,
      duration_days: strategy.duration_days,
      start_date: strategy.start_date,
      end_date: strategy.end_date,
      goals: strategy.goals,
      content_mix: strategy.content_mix,
      predicted_metrics: strategy.predicted_metrics,
      strategic_approach: strategy.strategic_approach,
      key_tactics: strategy.key_tactics,
      success_milestones: strategy.success_milestones,
      risk_assessment: strategy.risk_assessment,
      implementation_guide: strategy.implementation_guide,
      post_type_distribution: strategy.post_type_distribution,
    },
    weekly_breakdown: strategy.weekly_breakdown,
    posts: posts.map(post => ({
      day_number: post.day_number,
      post_date: post.post_date,
      post_time: post.post_time,
      week_number: post.week_number,
      week_theme: post.week_theme,
      content_details: {
        post_type: post.post_type,
        content_category: post.content_category || post.theme,
        primary_emotion: post.primary_emotion,
        content_pillar: post.content_pillar,
      },
      copy_elements: {
        hook: {
          text: post.hook,
          technique: post.hook_technique,
          psychological_principle: post.hook_principle,
        },
        opening: post.opening_text,
        body: post.body_text,
        cta: {
          text: post.cta,
          type: post.cta_type,
          strength: post.cta_strength,
        },
        full_caption: post.caption,
      },
      hashtag_strategy: {
        hashtags: post.hashtags,
        mix_breakdown: post.hashtag_mix,
      },
      visual_guidance: post.visual_guidance,
      performance_prediction: {
        predicted_reach: post.predicted_reach,
        predicted_impressions: post.predicted_impressions,
        predicted_engagement_rate: post.predicted_engagement,
        predicted_likes: post.predicted_likes,
        predicted_comments: post.predicted_comments,
        predicted_shares: post.predicted_shares,
        predicted_saves: post.predicted_saves,
        confidence_level: post.performance_confidence,
        prediction_basis: post.prediction_basis,
      },
      strategic_rationale: post.strategic_rationale,
      optimization_tips: post.optimization_tips,
    })),
    exported_at: new Date().toISOString(),
  };

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${strategy.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast({
    title: 'JSON Exported',
    description: `Strategy exported with ${posts.length} posts and full metadata.`,
  });
}

export function generateStrategyMarkdown(
  strategy: StrategyOverview,
  posts: StrategyPost[]
): string {
  let markdown = `# ${strategy.title}\n\n`;
  markdown += `**Platform:** ${strategy.platform}\n`;
  markdown += `**Duration:** ${strategy.duration_days} days\n`;
  markdown += `**Date Range:** ${strategy.start_date} to ${strategy.end_date}\n\n`;

  // Strategic Approach
  if (strategy.strategic_approach?.core_strategy) {
    markdown += `## Strategic Approach\n\n`;
    markdown += `${strategy.strategic_approach.core_strategy}\n\n`;
    if (strategy.strategic_approach.key_differentiator) {
      markdown += `**Differentiator:** ${strategy.strategic_approach.key_differentiator}\n\n`;
    }
  }

  // Goals
  if (strategy.goals?.length) {
    markdown += `## Goals\n`;
    strategy.goals.forEach(goal => {
      markdown += `- ${goal}\n`;
    });
    markdown += '\n';
  }

  // Predicted Metrics
  markdown += `## Predicted Metrics\n`;
  markdown += `- **Total Reach:** ${strategy.predicted_metrics?.total_reach?.toLocaleString() || 'N/A'}\n`;
  markdown += `- **Total Impressions:** ${strategy.predicted_metrics?.total_impressions?.toLocaleString() || 'N/A'}\n`;
  markdown += `- **Avg Engagement:** ${strategy.predicted_metrics?.avg_engagement_rate || 'N/A'}%\n`;
  markdown += `- **Follower Growth:** +${strategy.predicted_metrics?.expected_follower_growth || 'N/A'}\n`;
  markdown += `- **Website Clicks:** ${strategy.predicted_metrics?.expected_website_clicks || 'N/A'}\n`;
  markdown += `- **Conversions:** ${strategy.predicted_metrics?.expected_conversions || 'N/A'}\n\n`;

  // Key Tactics
  if (strategy.key_tactics?.length) {
    markdown += `## Key Tactics\n`;
    strategy.key_tactics.forEach((tactic, i) => {
      markdown += `${i + 1}. ${tactic}\n`;
    });
    markdown += '\n';
  }

  // Weekly Breakdown
  if (strategy.weekly_breakdown?.length) {
    markdown += `## Weekly Breakdown\n\n`;
    strategy.weekly_breakdown.forEach(week => {
      markdown += `### Week ${week.week}: ${week.theme}\n`;
      markdown += `**Objective:** ${week.objective}\n`;
      markdown += `**Post Count:** ${week.post_count}\n`;
      if (week.focus_areas?.length) {
        markdown += `**Focus Areas:** ${week.focus_areas.join(', ')}\n`;
      }
      markdown += '\n';
    });
  }

  // Content Calendar
  markdown += `## Content Calendar\n\n`;

  posts.forEach(post => {
    markdown += `### Day ${post.day_number} - ${post.post_date}`;
    if (post.week_theme) {
      markdown += ` (${post.week_theme})`;
    }
    markdown += `\n`;
    
    markdown += `**Time:** ${post.post_time || 'TBD'} | **Type:** ${post.post_type || 'N/A'} | **Category:** ${post.content_category || post.theme || 'N/A'}\n\n`;
    
    if (post.hook) {
      markdown += `**Hook:** "${post.hook}"`;
      if (post.hook_technique) {
        markdown += ` _(${post.hook_technique.replace('_', ' ')})_`;
      }
      markdown += `\n\n`;
    }
    
    markdown += `**Caption:**\n${post.caption}\n\n`;
    
    if (post.hashtags?.length) {
      markdown += `**Hashtags:** ${post.hashtags.join(' ')}\n\n`;
    }
    
    if (post.cta) {
      markdown += `**CTA:** ${post.cta}`;
      if (post.cta_type) {
        markdown += ` (${post.cta_type}, ${post.cta_strength})`;
      }
      markdown += `\n\n`;
    }

    // Visual guidance
    if (post.visual_guidance?.description) {
      markdown += `**Visual Guidance:** ${post.visual_guidance.description}\n\n`;
    }
    
    // Predictions
    markdown += `**Predicted:** ${post.predicted_reach?.toLocaleString() || 'N/A'} reach, ${post.predicted_engagement || 'N/A'}% engagement`;
    if (post.performance_confidence) {
      markdown += ` (${post.performance_confidence} confidence)`;
    }
    markdown += `\n\n`;

    // Strategic Rationale
    if (post.strategic_rationale?.why_this_day) {
      markdown += `**Why This Day:** ${post.strategic_rationale.why_this_day}\n\n`;
    }
    
    markdown += `---\n\n`;
  });

  // Implementation Guide
  if (strategy.implementation_guide) {
    markdown += `## Implementation Guide\n\n`;
    const guide = strategy.implementation_guide;
    if (guide.posting_schedule) markdown += `**Posting Schedule:** ${guide.posting_schedule}\n`;
    if (guide.content_creation_timeline) markdown += `**Content Creation:** ${guide.content_creation_timeline}\n`;
    if (guide.engagement_protocol) markdown += `**Engagement Protocol:** ${guide.engagement_protocol}\n`;
    if (guide.monitoring_schedule) markdown += `**Monitoring:** ${guide.monitoring_schedule}\n`;
    if (guide.adjustment_criteria) markdown += `**Adjustment Criteria:** ${guide.adjustment_criteria}\n`;
    markdown += '\n';
  }

  return markdown;
}

export function copyStrategyMarkdown(
  strategy: StrategyOverview,
  posts: StrategyPost[]
): void {
  const markdown = generateStrategyMarkdown(strategy, posts);
  navigator.clipboard.writeText(markdown);
  
  toast({
    title: 'Copied to Clipboard',
    description: 'Full strategy copied in markdown format.',
  });
}
