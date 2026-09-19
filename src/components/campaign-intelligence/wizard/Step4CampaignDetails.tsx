import { useState, KeyboardEvent } from 'react';
import { X, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CampaignWizardData } from './CampaignWizardModal';

interface Props {
  data: CampaignWizardData;
  onChange: (updates: Partial<CampaignWizardData>) => void;
}

const HOLIDAYS = [
  'Christmas', 'New Year', "Valentine's Day", 'Easter', 
  "Mother's Day", "Father's Day", 'Halloween', 'Thanksgiving', 
  'Black Friday', 'Cyber Monday', 'Other'
];

const SEASONS = [
  'Spring', 'Summer', 'Fall', 'Winter', 'Back-to-School', 'Tax Season'
];

export function Step4CampaignDetails({ data, onChange }: Props) {
  const [themeInput, setThemeInput] = useState('');

  const handleAddTheme = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && themeInput.trim()) {
      e.preventDefault();
      if (!data.campaignThemes.includes(themeInput.trim())) {
        onChange({ campaignThemes: [...data.campaignThemes, themeInput.trim()] });
      }
      setThemeInput('');
    }
  };

  const removeTheme = (theme: string) => {
    onChange({ campaignThemes: data.campaignThemes.filter(t => t !== theme) });
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">
          Tell us more about this specific campaign
        </h3>
      </div>

      {/* Campaign Themes */}
      <div className="space-y-3">
        <Label className="text-base font-medium flex items-center gap-2">
          Campaign Themes
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Key topics or angles for your campaign content</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Input
          value={themeInput}
          onChange={(e) => setThemeInput(e.target.value)}
          onKeyDown={handleAddTheme}
          placeholder="Add themes: summer sale, new product, customer appreciation..."
        />
        <p className="text-xs text-muted-foreground">Press Enter to add each theme</p>
        {data.campaignThemes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.campaignThemes.map((theme) => (
              <Badge key={theme} variant="secondary" className="flex items-center gap-1 px-3 py-1">
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

      {/* Seasonal Considerations */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Seasonal Considerations</Label>
        <RadioGroup
          value={data.seasonalType}
          onValueChange={(v) => onChange({ seasonalType: v, seasonalDetails: '' })}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <div 
            className={`flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer ${
              data.seasonalType === '' || !data.seasonalType
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => onChange({ seasonalType: '', seasonalDetails: '' })}
          >
            <RadioGroupItem value="" id="seasonal-none" />
            <Label htmlFor="seasonal-none" className="cursor-pointer">Not seasonal</Label>
          </div>
          <div 
            className={`flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer ${
              data.seasonalType === 'holiday'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => onChange({ seasonalType: 'holiday' })}
          >
            <RadioGroupItem value="holiday" id="seasonal-holiday" />
            <Label htmlFor="seasonal-holiday" className="cursor-pointer">Holiday</Label>
          </div>
          <div 
            className={`flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer ${
              data.seasonalType === 'seasonal'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => onChange({ seasonalType: 'seasonal' })}
          >
            <RadioGroupItem value="seasonal" id="seasonal-season" />
            <Label htmlFor="seasonal-season" className="cursor-pointer">Seasonal</Label>
          </div>
          <div 
            className={`flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer ${
              data.seasonalType === 'industry'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => onChange({ seasonalType: 'industry' })}
          >
            <RadioGroupItem value="industry" id="seasonal-industry" />
            <Label htmlFor="seasonal-industry" className="cursor-pointer">Industry-Specific</Label>
          </div>
        </RadioGroup>

        {data.seasonalType === 'holiday' && (
          <Select
            value={data.seasonalDetails}
            onValueChange={(v) => onChange({ seasonalDetails: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select holiday" />
            </SelectTrigger>
            <SelectContent>
              {HOLIDAYS.map((holiday) => (
                <SelectItem key={holiday} value={holiday}>{holiday}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {data.seasonalType === 'seasonal' && (
          <Select
            value={data.seasonalDetails}
            onValueChange={(v) => onChange({ seasonalDetails: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select season" />
            </SelectTrigger>
            <SelectContent>
              {SEASONS.map((season) => (
                <SelectItem key={season} value={season}>{season}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {data.seasonalType === 'industry' && (
          <Input
            value={data.seasonalDetails}
            onChange={(e) => onChange({ seasonalDetails: e.target.value })}
            placeholder="Which industry season? (e.g., tax season, wedding season)"
          />
        )}
      </div>

      {/* Special Requirements */}
      <div className="space-y-2">
        <Label className="text-base font-medium flex items-center gap-2">
          Special Requirements
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Any specific content needs or constraints</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Textarea
          value={data.specialRequirements}
          onChange={(e) => onChange({ specialRequirements: e.target.value.slice(0, 300) })}
          placeholder="Any specific requirements? E.g., 'Must highlight new feature X', 'Focus on video content', 'Include customer testimonials'..."
          className="resize-none"
          maxLength={300}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Help us understand what makes this campaign unique</span>
          <span>{data.specialRequirements.length}/300</span>
        </div>
      </div>

      {/* Campaign Differentiation */}
      <div className="space-y-2">
        <Label className="text-base font-medium">
          What makes this different?
          <Badge variant="outline" className="ml-2 text-xs">Optional</Badge>
        </Label>
        <Textarea
          value={data.campaignDifferentiation}
          onChange={(e) => onChange({ campaignDifferentiation: e.target.value.slice(0, 200) })}
          placeholder="What makes this different from your usual content?"
          className="resize-none"
          maxLength={200}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Helps us create content that stands out</span>
          <span>{data.campaignDifferentiation.length}/200</span>
        </div>
      </div>
    </div>
  );
}
