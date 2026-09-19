import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Building2, Users, Palette, Image, BarChart3, ChevronDown, 
  Save, Loader2, Info, HelpCircle, CheckCircle2, Tag
} from 'lucide-react';
import { CompanyDetailsSection } from './business-info/CompanyDetailsSection';
import { TargetAudienceSection } from './business-info/TargetAudienceSection';
import { BrandIdentitySection } from './business-info/BrandIdentitySection';
import { MarketingAssetsSection } from './business-info/MarketingAssetsSection';
import { PerformanceMetricsSection } from './business-info/PerformanceMetricsSection';
import { PromotionsSection } from './business-info/PromotionsSection';

export interface BusinessInformation {
  // Company Details
  business_name: string;
  business_type: string;
  industry: string;
  company_size: string;
  website: string;
  location: string;
  business_stage: string;
  years_in_business: number | null;
  monthly_revenue_range: string;
  primary_products_services: string;
  unique_value_proposition: string;
  top_competitors: string[];
  competitive_advantage: string;
  
  // Target Audience
  target_age_min: number;
  target_age_max: number;
  gender_distribution: { male: number; female: number; other: number };
  income_level: string;
  education_levels: string[];
  geographic_focus: string[];
  customer_pain_points: string;
  buying_behavior: string;
  customer_lifetime_value: number | null;
  
  // Brand Identity
  brand_voice_traits: string[];
  tone_formal_casual: number;
  tone_serious_playful: number;
  tone_informative_entertaining: number;
  primary_brand_color: string;
  secondary_brand_color: string;
  content_themes: string[];
  content_restrictions: string;
  brand_values: string[];
  
  // Marketing Assets
  available_content_types: string[];
  professional_photos_count: number;
  videos_available_count: number;
  testimonials_count: number;
  photography_style: string;
  video_production_capability: string;
  content_creation_frequency: string;
  
  // Performance Metrics
  monthly_website_visitors: number | null;
  total_social_followers: number | null;
  avg_post_engagement_rate: number | null;
  current_conversion_rate: number | null;
  customer_acquisition_cost: number | null;
  email_subscriber_count: number | null;
  best_performing_content_types: string[];
}

const defaultBusinessInfo: BusinessInformation = {
  business_name: '',
  business_type: '',
  industry: '',
  company_size: '',
  website: '',
  location: '',
  business_stage: '',
  years_in_business: null,
  monthly_revenue_range: '',
  primary_products_services: '',
  unique_value_proposition: '',
  top_competitors: [],
  competitive_advantage: '',
  target_age_min: 18,
  target_age_max: 65,
  gender_distribution: { male: 33, female: 33, other: 34 },
  income_level: '',
  education_levels: [],
  geographic_focus: [],
  customer_pain_points: '',
  buying_behavior: '',
  customer_lifetime_value: null,
  brand_voice_traits: [],
  tone_formal_casual: 3,
  tone_serious_playful: 3,
  tone_informative_entertaining: 3,
  primary_brand_color: '#8B5CF6',
  secondary_brand_color: '#3B82F6',
  content_themes: [],
  content_restrictions: '',
  brand_values: [],
  available_content_types: [],
  professional_photos_count: 0,
  videos_available_count: 0,
  testimonials_count: 0,
  photography_style: '',
  video_production_capability: '',
  content_creation_frequency: '',
  monthly_website_visitors: null,
  total_social_followers: null,
  avg_post_engagement_rate: null,
  current_conversion_rate: null,
  customer_acquisition_cost: null,
  email_subscriber_count: null,
  best_performing_content_types: []
};

interface CollapsibleSectionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  completedFields: number;
  totalFields: number;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title, description, icon: Icon, isOpen, onToggle, children, completedFields, totalFields
}) => {
  const percentage = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
  
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card className="bg-card border-border overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {title}
                    {percentage === 100 && (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                  </CardTitle>
                  <CardDescription className="text-sm">{description}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  {totalFields > 0 && (
                    <>
                      <span className="text-xs text-muted-foreground">
                        {completedFields}/{totalFields} fields
                      </span>
                      <Progress value={percentage} className="w-20 h-1.5 mt-1" />
                    </>
                  )}
                </div>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 border-t border-border/50">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export const BusinessInformationSection: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [businessInfo, setBusinessInfo] = useState<BusinessInformation>(defaultBusinessInfo);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showWhyCollect, setShowWhyCollect] = useState(false);
  
  // Section open states
  const [openSections, setOpenSections] = useState({
    company: true,
    audience: false,
    brand: false,
    assets: false,
    metrics: false,
    promotions: false
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Calculate completion percentage
  const calculateCompletion = useCallback(() => {
    const fields = [
      // Company Details (13 fields)
      businessInfo.business_name,
      businessInfo.business_type,
      businessInfo.industry,
      businessInfo.company_size,
      businessInfo.website,
      businessInfo.location,
      businessInfo.business_stage,
      businessInfo.years_in_business,
      businessInfo.monthly_revenue_range,
      businessInfo.primary_products_services,
      businessInfo.unique_value_proposition,
      businessInfo.top_competitors.length > 0,
      businessInfo.competitive_advantage,
      // Target Audience (9 fields)
      businessInfo.income_level,
      businessInfo.education_levels.length > 0,
      businessInfo.geographic_focus.length > 0,
      businessInfo.customer_pain_points,
      businessInfo.buying_behavior,
      businessInfo.customer_lifetime_value,
      // Brand Identity (9 fields)
      businessInfo.brand_voice_traits.length > 0,
      businessInfo.primary_brand_color,
      businessInfo.secondary_brand_color,
      businessInfo.content_themes.length > 0,
      businessInfo.content_restrictions,
      businessInfo.brand_values.length > 0,
      // Marketing Assets (7 fields)
      businessInfo.available_content_types.length > 0,
      businessInfo.professional_photos_count > 0,
      businessInfo.videos_available_count > 0,
      businessInfo.testimonials_count > 0,
      businessInfo.photography_style,
      businessInfo.video_production_capability,
      businessInfo.content_creation_frequency,
      // Performance Metrics (7 fields)
      businessInfo.monthly_website_visitors,
      businessInfo.total_social_followers,
      businessInfo.avg_post_engagement_rate,
      businessInfo.current_conversion_rate,
      businessInfo.customer_acquisition_cost,
      businessInfo.email_subscriber_count,
      businessInfo.best_performing_content_types.length > 0
    ];

    const filledFields = fields.filter(Boolean).length;
    return Math.round((filledFields / fields.length) * 100);
  }, [businessInfo]);

  const getSectionCompletion = useCallback((section: string) => {
    switch (section) {
      case 'company':
        const companyFields = [
          businessInfo.business_name, businessInfo.business_type, businessInfo.industry,
          businessInfo.company_size, businessInfo.website, businessInfo.location,
          businessInfo.business_stage, businessInfo.years_in_business,
          businessInfo.monthly_revenue_range, businessInfo.primary_products_services,
          businessInfo.unique_value_proposition, businessInfo.top_competitors.length > 0,
          businessInfo.competitive_advantage
        ];
        return { filled: companyFields.filter(Boolean).length, total: 13 };
      case 'audience':
        const audienceFields = [
          businessInfo.income_level, businessInfo.education_levels.length > 0,
          businessInfo.geographic_focus.length > 0, businessInfo.customer_pain_points,
          businessInfo.buying_behavior, businessInfo.customer_lifetime_value,
          true, true, true // age range always counts as filled
        ];
        return { filled: audienceFields.filter(Boolean).length, total: 9 };
      case 'brand':
        const brandFields = [
          businessInfo.brand_voice_traits.length > 0, businessInfo.primary_brand_color,
          businessInfo.secondary_brand_color, businessInfo.content_themes.length > 0,
          businessInfo.content_restrictions, businessInfo.brand_values.length > 0,
          true, true, true // tone sliders always count
        ];
        return { filled: brandFields.filter(Boolean).length, total: 9 };
      case 'assets':
        const assetFields = [
          businessInfo.available_content_types.length > 0, businessInfo.professional_photos_count > 0,
          businessInfo.videos_available_count > 0, businessInfo.testimonials_count > 0,
          businessInfo.photography_style, businessInfo.video_production_capability,
          businessInfo.content_creation_frequency
        ];
        return { filled: assetFields.filter(Boolean).length, total: 7 };
      case 'metrics':
        const metricFields = [
          businessInfo.monthly_website_visitors, businessInfo.total_social_followers,
          businessInfo.avg_post_engagement_rate, businessInfo.current_conversion_rate,
          businessInfo.customer_acquisition_cost, businessInfo.email_subscriber_count,
          businessInfo.best_performing_content_types.length > 0
        ];
        return { filled: metricFields.filter(Boolean).length, total: 7 };
      default:
        return { filled: 0, total: 0 };
    }
  }, [businessInfo]);

  // Load existing data
  useEffect(() => {
    const loadBusinessInfo = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('business_information')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading business info:', error);
          return;
        }

        if (data) {
          setBusinessInfo({
            ...defaultBusinessInfo,
            ...data,
            top_competitors: (data.top_competitors as string[]) || [],
            gender_distribution: (data.gender_distribution as { male: number; female: number; other: number }) || { male: 33, female: 33, other: 34 },
            education_levels: (data.education_levels as string[]) || [],
            geographic_focus: (data.geographic_focus as string[]) || [],
            brand_voice_traits: (data.brand_voice_traits as string[]) || [],
            content_themes: (data.content_themes as string[]) || [],
            brand_values: (data.brand_values as string[]) || [],
            available_content_types: (data.available_content_types as string[]) || [],
            best_performing_content_types: (data.best_performing_content_types as string[]) || []
          });
        }
      } catch (err) {
        console.error('Failed to load business info:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBusinessInfo();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const dataToSave = {
        user_id: user.id,
        ...businessInfo,
        top_competitors: businessInfo.top_competitors,
        gender_distribution: businessInfo.gender_distribution,
        education_levels: businessInfo.education_levels,
        geographic_focus: businessInfo.geographic_focus,
        brand_voice_traits: businessInfo.brand_voice_traits,
        content_themes: businessInfo.content_themes,
        brand_values: businessInfo.brand_values,
        available_content_types: businessInfo.available_content_types,
        best_performing_content_types: businessInfo.best_performing_content_types
      };

      const { error } = await supabase
        .from('business_information')
        .upsert(dataToSave, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: 'Business information saved',
        description: 'Your profile has been updated successfully.'
      });
    } catch (err: any) {
      toast({
        title: 'Error saving',
        description: err.message || 'Failed to save business information.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const completionPercentage = calculateCompletion();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with completion */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            Business Information
            <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
              completionPercentage >= 75 ? 'bg-green-500/20 text-green-400' :
              completionPercentage >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-muted text-muted-foreground'
            }`}>
              {completionPercentage}% Complete
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Comprehensive data for personalized AI strategy generation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={completionPercentage} className="w-32 h-2" />
        </div>
      </div>

      {/* Why we collect this */}
      <Collapsible open={showWhyCollect} onOpenChange={setShowWhyCollect}>
        <Card className="bg-primary/5 border-primary/20">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Why we collect this</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-primary transition-transform ${showWhyCollect ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                This information helps our AI generate personalized marketing strategies tailored to your specific business, 
                audience, and goals. All fields are optional but more data means better recommendations. Your data is encrypted 
                and never shared with third parties.
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Collapsible Sections */}
      <div className="space-y-4">
        <CollapsibleSection
          title="Company Details"
          description="Basic information about your business"
          icon={Building2}
          isOpen={openSections.company}
          onToggle={() => toggleSection('company')}
          completedFields={getSectionCompletion('company').filled}
          totalFields={getSectionCompletion('company').total}
        >
          <CompanyDetailsSection
            businessInfo={businessInfo}
            setBusinessInfo={setBusinessInfo}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Target Audience"
          description="Define your ideal customers"
          icon={Users}
          isOpen={openSections.audience}
          onToggle={() => toggleSection('audience')}
          completedFields={getSectionCompletion('audience').filled}
          totalFields={getSectionCompletion('audience').total}
        >
          <TargetAudienceSection
            businessInfo={businessInfo}
            setBusinessInfo={setBusinessInfo}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Brand Identity"
          description="Your brand voice and visual identity"
          icon={Palette}
          isOpen={openSections.brand}
          onToggle={() => toggleSection('brand')}
          completedFields={getSectionCompletion('brand').filled}
          totalFields={getSectionCompletion('brand').total}
        >
          <BrandIdentitySection
            businessInfo={businessInfo}
            setBusinessInfo={setBusinessInfo}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Marketing Assets & Capabilities"
          description="What content resources you have available"
          icon={Image}
          isOpen={openSections.assets}
          onToggle={() => toggleSection('assets')}
          completedFields={getSectionCompletion('assets').filled}
          totalFields={getSectionCompletion('assets').total}
        >
          <MarketingAssetsSection
            businessInfo={businessInfo}
            setBusinessInfo={setBusinessInfo}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Current Performance Metrics"
          description="Optional but helps us set realistic goals"
          icon={BarChart3}
          isOpen={openSections.metrics}
          onToggle={() => toggleSection('metrics')}
          completedFields={getSectionCompletion('metrics').filled}
          totalFields={getSectionCompletion('metrics').total}
        >
          <PerformanceMetricsSection
            businessInfo={businessInfo}
            setBusinessInfo={setBusinessInfo}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Promotions, Sales & Discounts"
          description="Active offers auto-injected into strategy generation"
          icon={Tag}
          isOpen={openSections.promotions}
          onToggle={() => toggleSection('promotions')}
          completedFields={0}
          totalFields={0}
        >
          <PromotionsSection />
        </CollapsibleSection>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
