import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface BusinessProfile {
  businessName: string;
  industry: string;
  businessType: string;
  productsServices: { name: string; description: string }[];
  priceRange: string;
  geographicFocus: string;
  targetAudience: {
    ageRange: string;
    genderFocus: string | null;
    incomeLevel: string;
    interests: string[];
    painPoints: string[];
    customerType: string;
  };
  brandIdentity: {
    voiceScale: number;
    toneCharacteristics: string[];
    messagingThemes: string[];
    valueProposition: string;
    brandValues: string[];
    competitiveAdvantages: string[];
  };
  visualIdentity: {
    primaryColors: string[];
    secondaryColors: string[];
    visualStyle: string;
    photographyStyle: string;
  };
  contentAnalysis: {
    themes: string[];
    contentTypes: string[];
    topKeywords: string[];
    qualityAssessment: string;
  };
  marketingMaturity: {
    websiteQuality: number;
    seoLevel: string;
    contentMarketing: string;
    socialProof: string[];
    ctaClarity: string;
  };
  summary: string;
}

export interface ComprehensiveAnalysis {
  metadata?: any;
  business_identity?: any;
  audience_intelligence?: any;
  brand_architecture?: any;
  visual_identity?: any;
  content_strategy_analysis?: any;
  conversion_architecture?: any;
  competitive_positioning?: any;
  technical_maturity?: any;
  gaps_opportunities?: any;
  marketing_recommendations?: any;
  executive_summary?: any;
}

export interface BusinessContext {
  id: string;
  user_id: string;
  website_url: string;
  business_profile: BusinessProfile;
  comprehensive_analysis?: ComprehensiveAnalysis;
  analyzed_at: string;
  is_active: boolean;
  overall_assessment_score?: number;
  marketing_sophistication_level?: number;
}

type AnalysisStep = 'idle' | 'scraping' | 'analyzing' | 'saving' | 'complete' | 'error';
type AnalysisDepth = 'quick' | 'standard' | 'comprehensive';

export function useWebsiteAnalysis() {
  const { activeWorkspaceId } = useWorkspace();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState<AnalysisStep>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);

  const analyzeWebsite = useCallback(async (websiteUrl: string): Promise<BusinessProfile | null> => {
    setIsAnalyzing(true);
    setError(null);
    setCurrentStep('scraping');
    setProgress(10);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Please sign in to analyze websites');
      }

      // Step 1: Scrape website
      
      setProgress(20);

      const scrapeResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-website`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ websiteUrl, userId: user.id, workspace_id: activeWorkspaceId }),
        }
      );

      if (!scrapeResponse.ok) {
        const errorData = await scrapeResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to scrape website');
      }

      const scrapeResult = await scrapeResponse.json();
      
      if (!scrapeResult.success || !scrapeResult.data) {
        throw new Error(scrapeResult.error || 'No data returned from scraping');
      }

      
      setProgress(50);
      setCurrentStep('analyzing');

      // Step 2: Analyze business
      const analyzeResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-business`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            scrapedContent: scrapeResult.data, 
            userId: user.id,
            workspace_id: activeWorkspaceId,
          }),
        }
      );

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to analyze business');
      }

      const analyzeResult = await analyzeResponse.json();
      
      if (!analyzeResult.success || !analyzeResult.businessProfile) {
        throw new Error('No analysis data returned');
      }

      setProgress(90);
      setCurrentStep('complete');
      setBusinessProfile(analyzeResult.businessProfile);
      setProgress(100);

      toast({
        title: 'Analysis Complete',
        description: `Successfully analyzed ${scrapeResult.data.totalPages} pages from your website.`,
      });

      return analyzeResult.businessProfile;

    } catch (err) {
      console.error('Website analysis error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      setCurrentStep('error');
      
      toast({
        title: 'Analysis Failed',
        description: errorMessage,
        variant: 'destructive',
      });

      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [activeWorkspaceId]);

  const fetchActiveContext = useCallback(async (): Promise<BusinessContext | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('business_context')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch business context:', error);
        return null;
      }

      if (data) {
        setBusinessProfile(data.business_profile as unknown as BusinessProfile);
      }

      return data ? {
        id: data.id,
        user_id: data.user_id,
        website_url: data.website_url,
        business_profile: data.business_profile as unknown as BusinessProfile,
        analyzed_at: data.analyzed_at || '',
        is_active: data.is_active || false,
      } : null;
    } catch (err) {
      console.error('Error fetching business context:', err);
      return null;
    }
  }, []);

  const getProgressMessage = useCallback((): string => {
    switch (currentStep) {
      case 'scraping':
        return 'Scraping website pages...';
      case 'analyzing':
        return 'Analyzing your business with AI...';
      case 'saving':
        return 'Saving business profile...';
      case 'complete':
        return 'Analysis complete!';
      case 'error':
        return error || 'An error occurred';
      default:
        return '';
    }
  }, [currentStep, error]);

  const reset = useCallback(() => {
    setIsAnalyzing(false);
    setCurrentStep('idle');
    setProgress(0);
    setError(null);
    setBusinessProfile(null);
  }, []);

  return {
    analyzeWebsite,
    fetchActiveContext,
    isAnalyzing,
    currentStep,
    progress,
    error,
    businessProfile,
    getProgressMessage,
    reset,
  };
}