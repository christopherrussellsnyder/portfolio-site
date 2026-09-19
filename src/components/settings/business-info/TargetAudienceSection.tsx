import React, { useState, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { X, HelpCircle, DollarSign, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BusinessInformation } from '../BusinessInformationSection';

interface Props {
  businessInfo: BusinessInformation;
  setBusinessInfo: React.Dispatch<React.SetStateAction<BusinessInformation>>;
}

const EDUCATION_OPTIONS = [
  'High School',
  'Some College',
  "Bachelor's Degree",
  'Graduate Degree',
  'Technical/Vocational',
  'Not Relevant'
];

const INCOME_OPTIONS = [
  { value: 'budget', label: 'Budget-conscious' },
  { value: 'middle', label: 'Middle-income' },
  { value: 'affluent', label: 'Affluent' },
  { value: 'high-net-worth', label: 'High-net-worth' },
  { value: 'mixed', label: 'Mixed' }
];

const BUYING_BEHAVIOR_OPTIONS = [
  { value: 'impulse', label: 'Impulse Buyer' },
  { value: 'researcher', label: 'Researcher' },
  { value: 'deal-seeker', label: 'Deal Seeker' },
  { value: 'brand-loyal', label: 'Brand Loyal' },
  { value: 'early-adopter', label: 'Early Adopter' }
];

export const TargetAudienceSection: React.FC<Props> = ({ businessInfo, setBusinessInfo }) => {
  const [locationInput, setLocationInput] = useState('');

  const handleAddLocation = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && locationInput.trim()) {
      e.preventDefault();
      if (!businessInfo.geographic_focus.includes(locationInput.trim())) {
        setBusinessInfo(prev => ({
          ...prev,
          geographic_focus: [...prev.geographic_focus, locationInput.trim()]
        }));
      }
      setLocationInput('');
    }
  };

  const removeLocation = (location: string) => {
    setBusinessInfo(prev => ({
      ...prev,
      geographic_focus: prev.geographic_focus.filter(l => l !== location)
    }));
  };

  const toggleEducation = (level: string) => {
    setBusinessInfo(prev => ({
      ...prev,
      education_levels: prev.education_levels.includes(level)
        ? prev.education_levels.filter(e => e !== level)
        : [...prev.education_levels, level]
    }));
  };

  const handleGenderChange = (gender: 'male' | 'female' | 'other', value: number) => {
    const currentTotal = Object.values(businessInfo.gender_distribution).reduce((a, b) => a + b, 0);
    const diff = value - businessInfo.gender_distribution[gender];
    
    // Adjust other values proportionally
    const others = (['male', 'female', 'other'] as const).filter(g => g !== gender);
    const otherTotal = others.reduce((sum, g) => sum + businessInfo.gender_distribution[g], 0);
    
    const newDistribution = { ...businessInfo.gender_distribution, [gender]: value };
    
    if (otherTotal > 0) {
      others.forEach(g => {
        const proportion = businessInfo.gender_distribution[g] / otherTotal;
        newDistribution[g] = Math.max(0, Math.round(businessInfo.gender_distribution[g] - (diff * proportion)));
      });
    }
    
    // Normalize to 100
    const total = Object.values(newDistribution).reduce((a, b) => a + b, 0);
    if (total !== 100 && total > 0) {
      const scale = 100 / total;
      (Object.keys(newDistribution) as Array<'male' | 'female' | 'other'>).forEach(k => {
        newDistribution[k] = Math.round(newDistribution[k] * scale);
      });
    }
    
    setBusinessInfo(prev => ({ ...prev, gender_distribution: newDistribution }));
  };

  const genderTotal = Object.values(businessInfo.gender_distribution).reduce((a, b) => a + b, 0);
  const isGenderValid = genderTotal === 100;

  return (
    <div className="space-y-6 pt-4">
      {/* Age Range Dual Slider */}
      <div className="space-y-4">
        <Label className="flex items-center gap-1">
          Primary Age Range
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">The age range of your primary target customers</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <div className="px-2">
          <Slider
            value={[businessInfo.target_age_min, businessInfo.target_age_max]}
            onValueChange={([min, max]) => setBusinessInfo(prev => ({
              ...prev,
              target_age_min: min,
              target_age_max: max
            }))}
            min={18}
            max={65}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>{businessInfo.target_age_min} years</span>
            <span className="font-medium text-foreground">
              {businessInfo.target_age_min} - {businessInfo.target_age_max === 65 ? '65+' : businessInfo.target_age_max}
            </span>
            <span>{businessInfo.target_age_max === 65 ? '65+' : businessInfo.target_age_max} years</span>
          </div>
        </div>
      </div>

      {/* Gender Distribution */}
      <div className="space-y-4">
        <Label className="flex items-center gap-2">
          Gender Distribution
          {!isGenderValid && (
            <span className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Must total 100%
            </span>
          )}
        </Label>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <span className="text-sm w-16">Male</span>
            <Slider
              value={[businessInfo.gender_distribution.male]}
              onValueChange={([v]) => handleGenderChange('male', v)}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-sm w-12 text-right">{businessInfo.gender_distribution.male}%</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm w-16">Female</span>
            <Slider
              value={[businessInfo.gender_distribution.female]}
              onValueChange={([v]) => handleGenderChange('female', v)}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-sm w-12 text-right">{businessInfo.gender_distribution.female}%</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm w-16">Other</span>
            <Slider
              value={[businessInfo.gender_distribution.other]}
              onValueChange={([v]) => handleGenderChange('other', v)}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-sm w-12 text-right">{businessInfo.gender_distribution.other}%</span>
          </div>
        </div>
      </div>

      {/* Income Level */}
      <div className="space-y-3">
        <Label>Income Level</Label>
        <RadioGroup
          value={businessInfo.income_level}
          onValueChange={(v) => setBusinessInfo(prev => ({ ...prev, income_level: v }))}
          className="grid grid-cols-2 md:grid-cols-3 gap-2"
        >
          {INCOME_OPTIONS.map(option => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`income-${option.value}`} />
              <Label htmlFor={`income-${option.value}`} className="text-sm font-normal cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Education Level */}
      <div className="space-y-3">
        <Label>Education Level (select all that apply)</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {EDUCATION_OPTIONS.map(level => (
            <div key={level} className="flex items-center space-x-2">
              <Checkbox
                id={`edu-${level}`}
                checked={businessInfo.education_levels.includes(level)}
                onCheckedChange={() => toggleEducation(level)}
              />
              <Label htmlFor={`edu-${level}`} className="text-sm font-normal cursor-pointer">
                {level}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Geographic Focus */}
      <div className="space-y-2">
        <Label>Geographic Focus</Label>
        <Input
          value={locationInput}
          onChange={(e) => setLocationInput(e.target.value)}
          onKeyDown={handleAddLocation}
          placeholder="Add primary markets (cities/countries)"
        />
        {businessInfo.geographic_focus.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {businessInfo.geographic_focus.map((location) => (
              <Badge key={location} variant="secondary" className="flex items-center gap-1">
                {location}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-destructive"
                  onClick={() => removeLocation(location)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Customer Pain Points */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          Customer Pain Points
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Understanding pain points helps create resonant content</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Textarea
          value={businessInfo.customer_pain_points}
          onChange={(e) => setBusinessInfo(prev => ({ ...prev, customer_pain_points: e.target.value.slice(0, 300) }))}
          placeholder="What problems do your customers face that you solve?"
          className="resize-none"
          maxLength={300}
        />
        <p className="text-xs text-muted-foreground text-right">
          {businessInfo.customer_pain_points.length}/300
        </p>
      </div>

      {/* Buying Behavior */}
      <div className="space-y-3">
        <Label>Buying Behavior</Label>
        <RadioGroup
          value={businessInfo.buying_behavior}
          onValueChange={(v) => setBusinessInfo(prev => ({ ...prev, buying_behavior: v }))}
          className="grid grid-cols-2 md:grid-cols-3 gap-2"
        >
          {BUYING_BEHAVIOR_OPTIONS.map(option => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`behavior-${option.value}`} />
              <Label htmlFor={`behavior-${option.value}`} className="text-sm font-normal cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Customer Lifetime Value */}
      <div className="space-y-2">
        <Label>Average Customer Lifetime Value</Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="number"
            min={0}
            value={businessInfo.customer_lifetime_value || ''}
            onChange={(e) => setBusinessInfo(prev => ({
              ...prev,
              customer_lifetime_value: e.target.value ? parseFloat(e.target.value) : null
            }))}
            placeholder="e.g., 500"
            className="pl-8"
          />
        </div>
      </div>
    </div>
  );
};
