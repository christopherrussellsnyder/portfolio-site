import { HelpCircle, DollarSign, Percent } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CampaignWizardData } from './CampaignWizardModal';

interface Props {
  data: CampaignWizardData;
  onChange: (updates: Partial<CampaignWizardData>) => void;
}

const BUDGET_OPTIONS = [
  { value: '', label: 'Select budget range' },
  { value: 'organic', label: 'No budget / Organic only' },
  { value: 'small', label: 'Small budget ($100-$500)' },
  { value: 'medium', label: 'Medium budget ($500-$2,000)' },
  { value: 'large', label: 'Large budget ($2,000-$5,000)' },
  { value: 'major', label: 'Major budget ($5,000+)' },
  { value: 'private', label: 'Prefer not to say' }
];

const URGENCY_OPTIONS = [
  { 
    value: 'exploratory', 
    label: 'Exploratory', 
    description: 'Just testing and learning' 
  },
  { 
    value: 'standard', 
    label: 'Standard', 
    description: 'Normal timeline and expectations' 
  },
  { 
    value: 'high', 
    label: 'High Priority', 
    description: 'Launching soon, need strong results' 
  },
  { 
    value: 'critical', 
    label: 'Critical', 
    description: 'Must succeed quickly, high stakes' 
  }
];

export function Step3CampaignTargets({ data, onChange }: Props) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">
          Set your campaign goals and metrics
        </h3>
        <p className="text-muted-foreground">
          Optional but helps us create realistic strategies
        </p>
      </div>

      {/* Target Metrics */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Target Metrics</Label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Target Impressions/Reach
              <Badge variant="outline" className="text-xs">Optional</Badge>
            </Label>
            <Input
              type="number"
              min={0}
              value={data.targetImpressions || ''}
              onChange={(e) => onChange({ 
                targetImpressions: e.target.value ? parseInt(e.target.value) : null 
              })}
              placeholder="e.g., 50000"
            />
            <p className="text-xs text-muted-foreground">
              How many people should see your content?
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Target Engagement Rate
              <Badge variant="outline" className="text-xs">Optional</Badge>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Average engagement rate on social is 1-5%</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={data.targetEngagementRate || ''}
                onChange={(e) => onChange({ 
                  targetEngagementRate: e.target.value ? parseFloat(e.target.value) : null 
                })}
                placeholder="e.g., 3.5"
                className="pr-8"
              />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              What engagement rate are you aiming for?
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Target Conversions/Sales
              <Badge variant="outline" className="text-xs">Optional</Badge>
            </Label>
            <Input
              type="number"
              min={0}
              value={data.targetConversions || ''}
              onChange={(e) => onChange({ 
                targetConversions: e.target.value ? parseInt(e.target.value) : null 
              })}
              placeholder="e.g., 100"
            />
            <p className="text-xs text-muted-foreground">
              How many conversions or sales do you want?
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Target New Followers
              <Badge variant="outline" className="text-xs">Optional</Badge>
            </Label>
            <Input
              type="number"
              min={0}
              value={data.targetFollowers || ''}
              onChange={(e) => onChange({ 
                targetFollowers: e.target.value ? parseInt(e.target.value) : null 
              })}
              placeholder="e.g., 500"
            />
            <p className="text-xs text-muted-foreground">
              How many new followers do you want to gain?
            </p>
          </div>
        </div>
      </div>

      {/* Budget */}
      <div className="space-y-3">
        <Label className="text-base font-medium flex items-center gap-2">
          Campaign Budget
          <Badge variant="outline" className="text-xs">Optional</Badge>
        </Label>
        <Select
          value={data.budgetRange}
          onValueChange={(v) => onChange({ budgetRange: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select budget range" />
          </SelectTrigger>
          <SelectContent>
            {BUDGET_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value || 'none'}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Urgency Level */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Urgency Level</Label>
        <RadioGroup
          value={data.urgencyLevel}
          onValueChange={(v) => onChange({ urgencyLevel: v })}
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          {URGENCY_OPTIONS.map((option) => (
            <div 
              key={option.value}
              className={`relative flex items-start space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                data.urgencyLevel === option.value
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => onChange({ urgencyLevel: option.value })}
            >
              <RadioGroupItem value={option.value} id={`urgency-${option.value}`} className="mt-0.5" />
              <div>
                <Label htmlFor={`urgency-${option.value}`} className="font-medium cursor-pointer">
                  {option.label}
                </Label>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}
