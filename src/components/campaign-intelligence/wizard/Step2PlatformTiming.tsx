import { useState } from 'react';
import { Check, AlertTriangle, Settings } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, addDays } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { CampaignWizardData } from './CampaignWizardModal';
import { Link } from 'react-router-dom';

interface Props {
  data: CampaignWizardData;
  onChange: (updates: Partial<CampaignWizardData>) => void;
  connectedPlatforms: string[];
}

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'facebook', label: 'Facebook', icon: '📘' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'twitter', label: 'Twitter', icon: '🐦' }
];

const DURATIONS = [
  { days: 7, label: '7 Days', description: '1 week sprint' },
  { days: 14, label: '14 Days', description: '2 week campaign' },
  { days: 30, label: '30 Days', description: 'Full month', recommended: true },
  { days: 60, label: '60 Days', description: 'Extended campaign' },
  { days: 0, label: 'Custom', description: 'Choose your own' }
];

export function Step2PlatformTiming({ data, onChange, connectedPlatforms }: Props) {
  const [showCustomDays, setShowCustomDays] = useState(
    !DURATIONS.slice(0, -1).some(d => d.days === data.durationDays)
  );
  const [customDays, setCustomDays] = useState(data.durationDays);

  const isMultiPlatform = data.primaryPlatform === 'multi';
  const hasAnyConnected = connectedPlatforms.length > 0;

  const handlePlatformSelect = (platformId: string) => {
    if (platformId === 'multi') {
      onChange({ primaryPlatform: 'multi', additionalPlatforms: [] });
    } else {
      onChange({ 
        primaryPlatform: platformId, 
        additionalPlatforms: [] 
      });
    }
  };

  const toggleAdditionalPlatform = (platformId: string) => {
    const current = data.additionalPlatforms;
    if (current.includes(platformId)) {
      onChange({ additionalPlatforms: current.filter(p => p !== platformId) });
    } else {
      onChange({ additionalPlatforms: [...current, platformId] });
    }
  };

  const handleDurationSelect = (days: number) => {
    if (days === 0) {
      setShowCustomDays(true);
    } else {
      setShowCustomDays(false);
      onChange({ durationDays: days });
    }
  };

  const endDate = addDays(data.startDate, data.durationDays);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">
          Where and when will this campaign run?
        </h3>
      </div>

      {/* Platform Warning */}
      {!hasAnyConnected && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-500">No accounts connected</p>
            <p className="text-sm text-muted-foreground">
              Connect your social accounts in Settings to publish directly.
            </p>
            <Button variant="link" asChild className="px-0 h-auto text-primary">
              <Link to="/settings?tab=connections">
                <Settings className="w-3 h-3 mr-1" />
                Go to Settings
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Platform Selection */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Primary Platform</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PLATFORMS.map((platform) => {
            const isConnected = connectedPlatforms.includes(platform.id);
            const isSelected = data.primaryPlatform === platform.id;
            
            return (
              <button
                key={platform.id}
                onClick={() => handlePlatformSelect(platform.id)}
                className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {isConnected && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                )}
                <span className="text-2xl mb-2 block">{platform.icon}</span>
                <span className="font-medium text-sm">{platform.label}</span>
                {isConnected && (
                  <Badge variant="outline" className="mt-1 text-xs bg-green-500/10 text-green-500 border-green-500/30">
                    Connected
                  </Badge>
                )}
              </button>
            );
          })}
          <button
            onClick={() => handlePlatformSelect('multi')}
            className={`relative p-4 rounded-xl border-2 text-left transition-all ${
              isMultiPlatform 
                ? 'border-primary bg-primary/10' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            <span className="text-2xl mb-2 block">🌐</span>
            <span className="font-medium text-sm">Multi-Platform</span>
            <p className="text-xs text-muted-foreground">Select multiple below</p>
          </button>
        </div>
      </div>

      {/* Multi-platform checkboxes */}
      {isMultiPlatform && (
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
          <Label className="text-sm">Select platforms:</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {PLATFORMS.map((platform) => (
              <div key={platform.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`multi-${platform.id}`}
                  checked={data.additionalPlatforms.includes(platform.id)}
                  onCheckedChange={() => toggleAdditionalPlatform(platform.id)}
                />
                <Label htmlFor={`multi-${platform.id}`} className="text-sm cursor-pointer">
                  {platform.icon} {platform.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duration Selection */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Campaign Duration</Label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {DURATIONS.map((duration) => {
            const isSelected = showCustomDays 
              ? duration.days === 0 
              : data.durationDays === duration.days;
            
            return (
              <button
                key={duration.days}
                onClick={() => handleDurationSelect(duration.days)}
                className={`relative p-3 rounded-xl border-2 text-center transition-all ${
                  isSelected 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {duration.recommended && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs">
                    Recommended
                  </Badge>
                )}
                <span className="font-semibold block">{duration.label}</span>
                <span className="text-xs text-muted-foreground">{duration.description}</span>
              </button>
            );
          })}
        </div>
        
        {showCustomDays && (
          <div className="flex items-center gap-2">
            <Label>Days:</Label>
            <Input
              type="number"
              min={1}
              max={90}
              value={customDays}
              onChange={(e) => {
                const days = parseInt(e.target.value) || 30;
                setCustomDays(days);
                onChange({ durationDays: days });
              }}
              className="w-24"
            />
          </div>
        )}
      </div>

      {/* Start Date */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Campaign Start Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(data.startDate, 'PPP')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={data.startDate}
              onSelect={(date) => date && onChange({ startDate: date })}
              disabled={(date) => date < new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <p className="text-sm text-muted-foreground">
          Campaign will run from {format(data.startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
        </p>
      </div>
    </div>
  );
}
