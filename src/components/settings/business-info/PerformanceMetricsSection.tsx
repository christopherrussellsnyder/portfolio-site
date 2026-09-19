import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DollarSign, HelpCircle, Percent } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BusinessInformation } from '../BusinessInformationSection';

interface Props {
  businessInfo: BusinessInformation;
  setBusinessInfo: React.Dispatch<React.SetStateAction<BusinessInformation>>;
}

const CONTENT_PERFORMANCE_TYPES = [
  'Video',
  'Images',
  'Text Posts',
  'Stories',
  'Reels',
  'Carousels',
  'User-Generated Content',
  'Educational Content',
  'Promotional Content'
];

export const PerformanceMetricsSection: React.FC<Props> = ({ businessInfo, setBusinessInfo }) => {
  const togglePerformanceType = (type: string) => {
    setBusinessInfo(prev => ({
      ...prev,
      best_performing_content_types: prev.best_performing_content_types.includes(type)
        ? prev.best_performing_content_types.filter(t => t !== type)
        : [...prev.best_performing_content_types, type]
    }));
  };

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <HelpCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <p className="text-sm text-muted-foreground">
          All fields in this section are optional. Providing baseline metrics helps set realistic goals for your campaigns.
        </p>
      </div>

      {/* Traffic & Followers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Monthly Website Visitors
            <Badge variant="outline" className="text-xs">Optional</Badge>
          </Label>
          <Input
            type="number"
            min={0}
            value={businessInfo.monthly_website_visitors || ''}
            onChange={(e) => setBusinessInfo(prev => ({
              ...prev,
              monthly_website_visitors: e.target.value ? parseInt(e.target.value) : null
            }))}
            placeholder="e.g., 10000"
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Total Social Media Followers
            <Badge variant="outline" className="text-xs">Optional</Badge>
          </Label>
          <Input
            type="number"
            min={0}
            value={businessInfo.total_social_followers || ''}
            onChange={(e) => setBusinessInfo(prev => ({
              ...prev,
              total_social_followers: e.target.value ? parseInt(e.target.value) : null
            }))}
            placeholder="e.g., 5000"
          />
        </div>
      </div>

      {/* Engagement & Conversion Rates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Average Post Engagement Rate
            <Badge variant="outline" className="text-xs">Optional</Badge>
          </Label>
          <div className="relative">
            <Input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={businessInfo.avg_post_engagement_rate || ''}
              onChange={(e) => setBusinessInfo(prev => ({
                ...prev,
                avg_post_engagement_rate: e.target.value ? parseFloat(e.target.value) : null
              }))}
              placeholder="e.g., 3.5"
              className="pr-8"
            />
            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Current Conversion Rate
            <Badge variant="outline" className="text-xs">Optional</Badge>
          </Label>
          <div className="relative">
            <Input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={businessInfo.current_conversion_rate || ''}
              onChange={(e) => setBusinessInfo(prev => ({
                ...prev,
                current_conversion_rate: e.target.value ? parseFloat(e.target.value) : null
              }))}
              placeholder="e.g., 2.5"
              className="pr-8"
            />
            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* CAC & Email Subscribers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Customer Acquisition Cost
            <Badge variant="outline" className="text-xs">Optional</Badge>
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="number"
              min={0}
              step={0.01}
              value={businessInfo.customer_acquisition_cost || ''}
              onChange={(e) => setBusinessInfo(prev => ({
                ...prev,
                customer_acquisition_cost: e.target.value ? parseFloat(e.target.value) : null
              }))}
              placeholder="e.g., 25.00"
              className="pl-8"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Email Subscriber Count
            <Badge variant="outline" className="text-xs">Optional</Badge>
          </Label>
          <Input
            type="number"
            min={0}
            value={businessInfo.email_subscriber_count || ''}
            onChange={(e) => setBusinessInfo(prev => ({
              ...prev,
              email_subscriber_count: e.target.value ? parseInt(e.target.value) : null
            }))}
            placeholder="e.g., 2500"
          />
        </div>
      </div>

      {/* Best Performing Content Types */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          Best Performing Content Types
          <Badge variant="outline" className="text-xs">Optional</Badge>
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {CONTENT_PERFORMANCE_TYPES.map(type => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={`perf-${type}`}
                checked={businessInfo.best_performing_content_types.includes(type)}
                onCheckedChange={() => togglePerformanceType(type)}
              />
              <Label htmlFor={`perf-${type}`} className="text-sm font-normal cursor-pointer">
                {type}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
