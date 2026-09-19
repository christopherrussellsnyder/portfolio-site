import React, { useState, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BusinessInformation } from '../BusinessInformationSection';

interface Props {
  businessInfo: BusinessInformation;
  setBusinessInfo: React.Dispatch<React.SetStateAction<BusinessInformation>>;
}

const VOICE_TRAITS = [
  'Professional',
  'Friendly',
  'Humorous',
  'Inspirational',
  'Educational',
  'Bold',
  'Authentic',
  'Luxury',
  'Playful',
  'Authoritative',
  'Compassionate',
  'Innovative'
];

const BRAND_VALUES = [
  'Quality',
  'Innovation',
  'Sustainability',
  'Affordability',
  'Customer Service',
  'Community',
  'Transparency',
  'Speed/Efficiency',
  'Tradition',
  'Cutting-edge'
];

export const BrandIdentitySection: React.FC<Props> = ({ businessInfo, setBusinessInfo }) => {
  const [themeInput, setThemeInput] = useState('');

  const toggleVoiceTrait = (trait: string) => {
    setBusinessInfo(prev => ({
      ...prev,
      brand_voice_traits: prev.brand_voice_traits.includes(trait)
        ? prev.brand_voice_traits.filter(t => t !== trait)
        : [...prev.brand_voice_traits, trait]
    }));
  };

  const toggleBrandValue = (value: string) => {
    setBusinessInfo(prev => ({
      ...prev,
      brand_values: prev.brand_values.includes(value)
        ? prev.brand_values.filter(v => v !== value)
        : [...prev.brand_values, value]
    }));
  };

  const handleAddTheme = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && themeInput.trim()) {
      e.preventDefault();
      if (!businessInfo.content_themes.includes(themeInput.trim())) {
        setBusinessInfo(prev => ({
          ...prev,
          content_themes: [...prev.content_themes, themeInput.trim()]
        }));
      }
      setThemeInput('');
    }
  };

  const removeTheme = (theme: string) => {
    setBusinessInfo(prev => ({
      ...prev,
      content_themes: prev.content_themes.filter(t => t !== theme)
    }));
  };

  return (
    <div className="space-y-6 pt-4">
      {/* Brand Voice Traits */}
      <div className="space-y-3">
        <Label className="flex items-center gap-1">
          Brand Voice Traits
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Select traits that define how your brand communicates</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {VOICE_TRAITS.map(trait => (
            <div key={trait} className="flex items-center space-x-2">
              <Checkbox
                id={`voice-${trait}`}
                checked={businessInfo.brand_voice_traits.includes(trait)}
                onCheckedChange={() => toggleVoiceTrait(trait)}
              />
              <Label htmlFor={`voice-${trait}`} className="text-sm font-normal cursor-pointer">
                {trait}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Tone Preference Sliders */}
      <div className="space-y-4">
        <Label>Tone Preferences</Label>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Formal</span>
              <span className="font-medium">{businessInfo.tone_formal_casual}/5</span>
              <span className="text-muted-foreground">Casual</span>
            </div>
            <Slider
              value={[businessInfo.tone_formal_casual]}
              onValueChange={([v]) => setBusinessInfo(prev => ({ ...prev, tone_formal_casual: v }))}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Serious</span>
              <span className="font-medium">{businessInfo.tone_serious_playful}/5</span>
              <span className="text-muted-foreground">Playful</span>
            </div>
            <Slider
              value={[businessInfo.tone_serious_playful]}
              onValueChange={([v]) => setBusinessInfo(prev => ({ ...prev, tone_serious_playful: v }))}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Informative</span>
              <span className="font-medium">{businessInfo.tone_informative_entertaining}/5</span>
              <span className="text-muted-foreground">Entertaining</span>
            </div>
            <Slider
              value={[businessInfo.tone_informative_entertaining]}
              onValueChange={([v]) => setBusinessInfo(prev => ({ ...prev, tone_informative_entertaining: v }))}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Brand Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Primary Brand Color</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={businessInfo.primary_brand_color || '#8B5CF6'}
              onChange={(e) => setBusinessInfo(prev => ({ ...prev, primary_brand_color: e.target.value }))}
              className="w-10 h-10 rounded-lg border border-border cursor-pointer"
            />
            <Input
              value={businessInfo.primary_brand_color || ''}
              onChange={(e) => setBusinessInfo(prev => ({ ...prev, primary_brand_color: e.target.value }))}
              placeholder="#8B5CF6"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Secondary Brand Color</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={businessInfo.secondary_brand_color || '#3B82F6'}
              onChange={(e) => setBusinessInfo(prev => ({ ...prev, secondary_brand_color: e.target.value }))}
              className="w-10 h-10 rounded-lg border border-border cursor-pointer"
            />
            <Input
              value={businessInfo.secondary_brand_color || ''}
              onChange={(e) => setBusinessInfo(prev => ({ ...prev, secondary_brand_color: e.target.value }))}
              placeholder="#3B82F6"
            />
          </div>
        </div>
      </div>

      {/* Content Themes */}
      <div className="space-y-2">
        <Label>Content Themes</Label>
        <Input
          value={themeInput}
          onChange={(e) => setThemeInput(e.target.value)}
          onKeyDown={handleAddTheme}
          placeholder="Topics you regularly cover: fitness, nutrition, wellness..."
        />
        {businessInfo.content_themes.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {businessInfo.content_themes.map((theme) => (
              <Badge key={theme} variant="secondary" className="flex items-center gap-1">
                {theme}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-destructive"
                  onClick={() => removeTheme(theme)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Content Restrictions */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          Content Restrictions
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Topics, competitors, or language to avoid in generated content</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Textarea
          value={businessInfo.content_restrictions}
          onChange={(e) => setBusinessInfo(prev => ({ ...prev, content_restrictions: e.target.value.slice(0, 200) }))}
          placeholder="Topics, competitors, or language to avoid in content..."
          className="resize-none"
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground text-right">
          {businessInfo.content_restrictions.length}/200
        </p>
      </div>

      {/* Brand Values */}
      <div className="space-y-3">
        <Label>Brand Values (select all that apply)</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {BRAND_VALUES.map(value => (
            <div key={value} className="flex items-center space-x-2">
              <Checkbox
                id={`value-${value}`}
                checked={businessInfo.brand_values.includes(value)}
                onCheckedChange={() => toggleBrandValue(value)}
              />
              <Label htmlFor={`value-${value}`} className="text-sm font-normal cursor-pointer">
                {value}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
