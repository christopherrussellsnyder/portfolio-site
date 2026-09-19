import React, { useState } from 'react';
import { Globe, Loader2, CheckCircle2, AlertCircle, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useWebsiteAnalysis, BusinessProfile } from '@/hooks/useWebsiteAnalysis';

interface WebsiteAnalyzerProps {
  onAnalysisComplete: (profile: BusinessProfile) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function WebsiteAnalyzer({ onAnalysisComplete, onCancel, disabled }: WebsiteAnalyzerProps) {
  const [url, setUrl] = useState('');
  const { analyzeWebsite, isAnalyzing, progress, currentStep, getProgressMessage } = useWebsiteAnalysis();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isAnalyzing) return;

    const profile = await analyzeWebsite(url.trim());
    if (profile) {
      onAnalysisComplete(profile);
    }
  };

  const isValidUrl = (input: string): boolean => {
    if (!input) return false;
    // Basic URL validation - just needs to look like a domain
    const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/i;
    return urlPattern.test(input);
  };

  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/10">
            <Globe className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">Analyze Your Website</h3>
            <p className="text-sm text-muted-foreground">
              AI will scrape and analyze your business
            </p>
          </div>
        </div>
        {!isAnalyzing && (
          <Button aria-label="Cancel analysis" variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {isAnalyzing ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {currentStep === 'complete' ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : currentStep === 'error' ? (
              <AlertCircle className="w-5 h-5 text-destructive" />
            ) : (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            )}
            <span className="text-sm font-medium">{getProgressMessage()}</span>
          </div>
          
          <Progress value={progress} className="h-2" />
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p className={cn(currentStep !== 'idle' && 'text-foreground')}>
              {progress >= 10 && '✓'} Connecting to website...
            </p>
            <p className={cn(progress >= 30 && 'text-foreground')}>
              {progress >= 50 && '✓'} Scraping pages (up to 10)...
            </p>
            <p className={cn(progress >= 60 && 'text-foreground')}>
              {progress >= 90 && '✓'} Analyzing with AI...
            </p>
            <p className={cn(progress >= 95 && 'text-foreground')}>
              {progress === 100 && '✓'} Saving business profile...
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="example.com"
              disabled={disabled}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={disabled || !isValidUrl(url)}
              className="gap-2"
            >
              Analyze
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter your website URL. We'll scrape up to 10 pages and analyze your business, 
            target audience, brand voice, and more.
          </p>
        </form>
      )}
    </div>
  );
}