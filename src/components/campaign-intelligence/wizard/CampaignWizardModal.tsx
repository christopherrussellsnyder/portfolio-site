import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  X, ChevronLeft, ChevronRight, Check, Sparkles, 
  Target, Layers, BarChart3, FileText, CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Step1CampaignObjective } from './Step1CampaignObjective';
import { Step2PlatformTiming } from './Step2PlatformTiming';
import { Step3CampaignTargets } from './Step3CampaignTargets';
import { Step4CampaignDetails } from './Step4CampaignDetails';
import { Step5Review } from './Step5Review';
import { WizardLoadingState } from './WizardLoadingState';

export interface CampaignWizardData {
  // Step 1
  primaryGoal: string;
  secondaryGoals: string[];
  // Step 2
  primaryPlatform: string;
  additionalPlatforms: string[];
  durationDays: number;
  startDate: Date;
  // Step 3
  targetImpressions: number | null;
  targetEngagementRate: number | null;
  targetConversions: number | null;
  targetFollowers: number | null;
  budgetRange: string;
  urgencyLevel: string;
  // Step 4
  campaignThemes: string[];
  seasonalType: string;
  seasonalDetails: string;
  specialRequirements: string;
  campaignDifferentiation: string;
}

export interface BusinessInfo {
  business_name: string;
  industry: string;
  target_age_min: number;
  target_age_max: number;
  brand_voice_traits: string[];
  company_size: string;
  unique_value_proposition: string;
}

interface CampaignWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (strategy: any) => void;
  connectedPlatforms: string[];
}

const WIZARD_STEPS = [
  { id: 1, title: 'Campaign Goal', icon: Target },
  { id: 2, title: 'Platform & Timing', icon: Layers },
  { id: 3, title: 'Campaign Targets', icon: BarChart3 },
  { id: 4, title: 'Campaign Details', icon: FileText },
  { id: 5, title: 'Review & Generate', icon: CheckCircle2 }
];

const STORAGE_KEY = 'campaign_wizard_draft';

const defaultWizardData: CampaignWizardData = {
  primaryGoal: '',
  secondaryGoals: [],
  primaryPlatform: '',
  additionalPlatforms: [],
  durationDays: 30,
  startDate: new Date(Date.now() + 86400000), // Tomorrow
  targetImpressions: null,
  targetEngagementRate: null,
  targetConversions: null,
  targetFollowers: null,
  budgetRange: '',
  urgencyLevel: 'standard',
  campaignThemes: [],
  seasonalType: '',
  seasonalDetails: '',
  specialRequirements: '',
  campaignDifferentiation: ''
};

export function CampaignWizardModal({ 
  isOpen, 
  onClose, 
  onComplete,
  connectedPlatforms 
}: CampaignWizardModalProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<CampaignWizardData>(defaultWizardData);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('');
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Load business info and check for draft
  useEffect(() => {
    if (isOpen && user) {
      loadBusinessInfo();
      checkForDraft();
    }
  }, [isOpen, user]);

  const loadBusinessInfo = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('business_information')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      setBusinessInfo({
        business_name: data.business_name || '',
        industry: data.industry || '',
        target_age_min: data.target_age_min || 18,
        target_age_max: data.target_age_max || 65,
        brand_voice_traits: (data.brand_voice_traits as string[]) || [],
        company_size: data.company_size || '',
        unique_value_proposition: data.unique_value_proposition || ''
      });
    }
  };

  const checkForDraft = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.userId === user?.id) {
          setHasDraft(true);
        }
      } catch (e) {
        // Invalid draft
      }
    }
  };

  const loadDraft = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.userId === user?.id) {
          setWizardData({
            ...parsed.data,
            startDate: new Date(parsed.data.startDate)
          });
          setCurrentStep(parsed.step || 1);
          setHasDraft(false);
          toast.success('Draft restored!');
        }
      } catch (e) {
        toast.error('Failed to load draft');
      }
    }
  };

  const saveDraft = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      userId: user?.id,
      data: wizardData,
      step: currentStep,
      savedAt: new Date().toISOString()
    }));
    toast.success('Progress saved as draft');
  };

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasDraft(false);
  };

  const handleClose = () => {
    if (currentStep > 1 && !isGenerating) {
      setShowConfirmClose(true);
    } else {
      onClose();
      resetWizard();
    }
  };

  const confirmClose = (saveAsDraft: boolean) => {
    if (saveAsDraft) {
      saveDraft();
    }
    setShowConfirmClose(false);
    onClose();
    resetWizard();
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setWizardData(defaultWizardData);
    setIsGenerating(false);
    setGenerationProgress(0);
  };

  const updateWizardData = (updates: Partial<CampaignWizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!wizardData.primaryGoal;
      case 2:
        return !!wizardData.primaryPlatform && !!wizardData.startDate;
      case 3:
      case 4:
        return true; // All optional
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 5 && canProceed()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleGenerate = async () => {
    if (!user) return;
    
    setIsGenerating(true);
    clearDraft();
    
    try {
      // Save request to database
      const requestData = {
        user_id: user.id,
        primary_goal: wizardData.primaryGoal,
        secondary_goals: wizardData.secondaryGoals,
        primary_platform: wizardData.primaryPlatform,
        additional_platforms: wizardData.additionalPlatforms,
        duration_days: wizardData.durationDays,
        start_date: wizardData.startDate.toISOString().split('T')[0],
        target_impressions: wizardData.targetImpressions,
        target_engagement_rate: wizardData.targetEngagementRate,
        target_conversions: wizardData.targetConversions,
        target_followers: wizardData.targetFollowers,
        budget_range: wizardData.budgetRange || null,
        urgency_level: wizardData.urgencyLevel,
        campaign_themes: wizardData.campaignThemes,
        seasonal_type: wizardData.seasonalType || null,
        seasonal_details: wizardData.seasonalDetails || null,
        special_requirements: wizardData.specialRequirements || null,
        campaign_differentiation: wizardData.campaignDifferentiation || null,
        status: 'generating'
      };

      const { data: requestRecord, error: insertError } = await supabase
        .from('campaign_strategy_requests')
        .insert(requestData)
        .select()
        .single();

      if (insertError) throw insertError;

      // Simulate progress
      const progressSteps = [
        { step: 'Analyzing your business profile...', progress: 10 },
        { step: 'Understanding campaign objectives...', progress: 25 },
        { step: 'Researching platform best practices...', progress: 40 },
        { step: 'Generating 14 days of content...', progress: 60 },
        { step: 'Optimizing posting schedule...', progress: 80 },
        { step: 'Finalizing strategy...', progress: 95 }
      ];

      for (const ps of progressSteps) {
        setGenerationStep(ps.step);
        setGenerationProgress(ps.progress);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // Call edge function with questionnaire data
      const { data: strategyData, error } = await supabase.functions.invoke(
        'generate-comprehensive-campaign-strategy',
        {
          body: {
            userId: user.id,
            requestId: requestRecord.id,
            platform: wizardData.primaryPlatform,
            duration: wizardData.durationDays,
            objective: wizardData.primaryGoal,
            questionnaireData: wizardData
          }
        }
      );

      if (error) throw error;

      // Update request status
      await supabase
        .from('campaign_strategy_requests')
        .update({ 
          status: 'completed',
          generated_strategy_id: strategyData?.strategy?.id 
        })
        .eq('id', requestRecord.id);

      setGenerationProgress(100);
      setGenerationStep('Strategy generated successfully!');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onComplete(strategyData?.strategy);
      onClose();
      resetWizard();
      
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error('Failed to generate strategy. Please try again.');
      setIsGenerating(false);
    }
  };

  const progressPercentage = (currentStep / 5) * 100;

  if (isGenerating) {
    return (
      <Dialog open={isOpen}>
        <DialogContent className="max-w-2xl">
          <WizardLoadingState 
            progress={generationProgress} 
            currentStep={generationStep} 
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Create Campaign Strategy</h2>
                <p className="text-sm text-muted-foreground">
                  Estimated time: 3-4 minutes
                </p>
              </div>
              <Button aria-label="Close" variant="ghost" size="icon" onClick={handleClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-between">
              {WIZARD_STEPS.map((step, idx) => {
                const StepIcon = step.icon;
                const isCompleted = currentStep > step.id;
                const isActive = currentStep === step.id;
                
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <button
                      onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                      disabled={step.id > currentStep}
                      className={`flex flex-col items-center gap-1 transition-colors ${
                        isActive ? 'text-primary' : 
                        isCompleted ? 'text-green-500 cursor-pointer' : 
                        'text-muted-foreground'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isActive ? 'bg-primary text-primary-foreground' :
                        isCompleted ? 'bg-green-500 text-white' :
                        'bg-muted'
                      }`}>
                        {isCompleted ? <Check className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                      </div>
                      <span className="text-xs font-medium hidden sm:block">{step.title}</span>
                    </button>
                    {idx < WIZARD_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 ${
                        currentStep > step.id ? 'bg-green-500' : 'bg-muted'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
            <Progress value={progressPercentage} className="mt-4 h-1" />
          </div>

          {/* Draft Banner */}
          {hasDraft && currentStep === 1 && (
            <div className="mx-6 mt-4 p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-between">
              <p className="text-sm">You have an unfinished wizard. Resume where you left off?</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setHasDraft(false)}>
                  Start Fresh
                </Button>
                <Button size="sm" onClick={loadDraft}>
                  Resume
                </Button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
            {currentStep === 1 && (
              <Step1CampaignObjective
                data={wizardData}
                onChange={updateWizardData}
              />
            )}
            {currentStep === 2 && (
              <Step2PlatformTiming
                data={wizardData}
                onChange={updateWizardData}
                connectedPlatforms={connectedPlatforms}
              />
            )}
            {currentStep === 3 && (
              <Step3CampaignTargets
                data={wizardData}
                onChange={updateWizardData}
              />
            )}
            {currentStep === 4 && (
              <Step4CampaignDetails
                data={wizardData}
                onChange={updateWizardData}
              />
            )}
            {currentStep === 5 && (
              <Step5Review
                data={wizardData}
                businessInfo={businessInfo}
                onEdit={(step) => setCurrentStep(step)}
              />
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border flex items-center justify-between">
            <div>
              {currentStep > 1 && (
                <Button variant="outline" onClick={handlePrev}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {currentStep === 5 ? (
                <>
                  <Button variant="outline" onClick={saveDraft}>
                    Save as Draft
                  </Button>
                  <Button 
                    onClick={handleGenerate}
                    className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate My Strategy
                  </Button>
                </>
              ) : (
                <Button onClick={handleNext} disabled={!canProceed()}>
                  Continue
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Close Dialog */}
      <Dialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <DialogContent className="max-w-md">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Save your progress?</h3>
            <p className="text-muted-foreground">
              You can save your progress as a draft and continue later.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => confirmClose(false)}>
                Discard
              </Button>
              <Button onClick={() => confirmClose(true)}>
                Save Draft
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
