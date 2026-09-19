import React, { useState, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BusinessInformation } from '../BusinessInformationSection';

interface Props {
  businessInfo: BusinessInformation;
  setBusinessInfo: React.Dispatch<React.SetStateAction<BusinessInformation>>;
}

export const CompanyDetailsSection: React.FC<Props> = ({ businessInfo, setBusinessInfo }) => {
  const [competitorInput, setCompetitorInput] = useState('');

  const handleAddCompetitor = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && competitorInput.trim()) {
      e.preventDefault();
      if (!businessInfo.top_competitors.includes(competitorInput.trim())) {
        setBusinessInfo(prev => ({
          ...prev,
          top_competitors: [...prev.top_competitors, competitorInput.trim()]
        }));
      }
      setCompetitorInput('');
    }
  };

  const removeCompetitor = (competitor: string) => {
    setBusinessInfo(prev => ({
      ...prev,
      top_competitors: prev.top_competitors.filter(c => c !== competitor)
    }));
  };

  return (
    <div className="space-y-6 pt-4">
      {/* Existing Fields Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Business Name</Label>
          <Input
            value={businessInfo.business_name}
            onChange={(e) => setBusinessInfo(prev => ({ ...prev, business_name: e.target.value }))}
            placeholder="Your company name"
          />
        </div>
        <div className="space-y-2">
          <Label>Business Type</Label>
          <Select
            value={businessInfo.business_type}
            onValueChange={(v) => setBusinessInfo(prev => ({ ...prev, business_type: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Agency">Agency</SelectItem>
              <SelectItem value="Brand">Brand</SelectItem>
              <SelectItem value="Freelancer">Freelancer</SelectItem>
              <SelectItem value="Small Business">Small Business</SelectItem>
              <SelectItem value="Enterprise">Enterprise</SelectItem>
              <SelectItem value="E-commerce">E-commerce</SelectItem>
              <SelectItem value="SaaS">SaaS</SelectItem>
              <SelectItem value="Non-Profit">Non-Profit</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Industry</Label>
          <Select
            value={businessInfo.industry}
            onValueChange={(v) => setBusinessInfo(prev => ({ ...prev, industry: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Marketing & Advertising">Marketing & Advertising</SelectItem>
              <SelectItem value="Technology">Technology</SelectItem>
              <SelectItem value="E-commerce">E-commerce</SelectItem>
              <SelectItem value="Healthcare">Healthcare</SelectItem>
              <SelectItem value="Finance">Finance</SelectItem>
              <SelectItem value="Education">Education</SelectItem>
              <SelectItem value="Entertainment">Entertainment</SelectItem>
              <SelectItem value="Real Estate">Real Estate</SelectItem>
              <SelectItem value="Food & Beverage">Food & Beverage</SelectItem>
              <SelectItem value="Fashion & Beauty">Fashion & Beauty</SelectItem>
              <SelectItem value="Travel & Hospitality">Travel & Hospitality</SelectItem>
              <SelectItem value="Fitness & Wellness">Fitness & Wellness</SelectItem>
              <SelectItem value="Professional Services">Professional Services</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Company Size</Label>
          <Select
            value={businessInfo.company_size}
            onValueChange={(v) => setBusinessInfo(prev => ({ ...prev, company_size: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Solo</SelectItem>
              <SelectItem value="2-10">2-10</SelectItem>
              <SelectItem value="11-50">11-50</SelectItem>
              <SelectItem value="51-200">51-200</SelectItem>
              <SelectItem value="201-500">201-500</SelectItem>
              <SelectItem value="500+">500+</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Website</Label>
          <Input
            value={businessInfo.website}
            onChange={(e) => setBusinessInfo(prev => ({ ...prev, website: e.target.value }))}
            placeholder="https://yourwebsite.com"
          />
        </div>
        <div className="space-y-2">
          <Label>Location</Label>
          <Input
            value={businessInfo.location}
            onChange={(e) => setBusinessInfo(prev => ({ ...prev, location: e.target.value }))}
            placeholder="City, State, Country"
          />
        </div>
      </div>

      {/* New Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            Business Stage
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Your business lifecycle stage helps us tailor growth strategies</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Select
            value={businessInfo.business_stage}
            onValueChange={(v) => setBusinessInfo(prev => ({ ...prev, business_stage: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="startup">Startup (0-2 years)</SelectItem>
              <SelectItem value="growth">Growth Stage (2-5 years)</SelectItem>
              <SelectItem value="established">Established (5-10 years)</SelectItem>
              <SelectItem value="mature">Mature (10+ years)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Years in Business</Label>
          <Input
            type="number"
            min={0}
            value={businessInfo.years_in_business || ''}
            onChange={(e) => setBusinessInfo(prev => ({ 
              ...prev, 
              years_in_business: e.target.value ? parseInt(e.target.value) : null 
            }))}
            placeholder="e.g., 5"
          />
        </div>
        <div className="space-y-2">
          <Label>Monthly Revenue Range</Label>
          <Select
            value={businessInfo.monthly_revenue_range}
            onValueChange={(v) => setBusinessInfo(prev => ({ ...prev, monthly_revenue_range: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0-10k">$0 - $10K</SelectItem>
              <SelectItem value="10k-50k">$10K - $50K</SelectItem>
              <SelectItem value="50k-100k">$50K - $100K</SelectItem>
              <SelectItem value="100k-500k">$100K - $500K</SelectItem>
              <SelectItem value="500k-1m">$500K - $1M</SelectItem>
              <SelectItem value="1m+">$1M+</SelectItem>
              <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Textareas */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Primary Products/Services</Label>
          <Textarea
            value={businessInfo.primary_products_services}
            onChange={(e) => setBusinessInfo(prev => ({ ...prev, primary_products_services: e.target.value.slice(0, 200) }))}
            placeholder="Describe your main offerings..."
            className="resize-none"
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground text-right">
            {businessInfo.primary_products_services.length}/200
          </p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            Unique Value Proposition
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">What makes you different from competitors? This helps craft unique messaging.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Textarea
            value={businessInfo.unique_value_proposition}
            onChange={(e) => setBusinessInfo(prev => ({ ...prev, unique_value_proposition: e.target.value.slice(0, 300) }))}
            placeholder="What makes you different from competitors?"
            className="resize-none"
            maxLength={300}
          />
          <p className="text-xs text-muted-foreground text-right">
            {businessInfo.unique_value_proposition.length}/300
          </p>
        </div>
      </div>

      {/* Competitors Tag Input */}
      <div className="space-y-2">
        <Label>Top 3 Competitors</Label>
        <Input
          value={competitorInput}
          onChange={(e) => setCompetitorInput(e.target.value)}
          onKeyDown={handleAddCompetitor}
          placeholder="Type competitor name and press Enter"
          disabled={businessInfo.top_competitors.length >= 3}
        />
        {businessInfo.top_competitors.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {businessInfo.top_competitors.map((competitor) => (
              <Badge key={competitor} variant="secondary" className="flex items-center gap-1">
                {competitor}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-destructive"
                  onClick={() => removeCompetitor(competitor)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Competitive Advantage */}
      <div className="space-y-2">
        <Label>Competitive Advantage</Label>
        <Textarea
          value={businessInfo.competitive_advantage}
          onChange={(e) => setBusinessInfo(prev => ({ ...prev, competitive_advantage: e.target.value.slice(0, 200) }))}
          placeholder="Why should customers choose you over competitors?"
          className="resize-none"
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground text-right">
          {businessInfo.competitive_advantage.length}/200
        </p>
      </div>
    </div>
  );
};
