import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BusinessInformation } from '../BusinessInformationSection';

interface Props {
  businessInfo: BusinessInformation;
  setBusinessInfo: React.Dispatch<React.SetStateAction<BusinessInformation>>;
}

const CONTENT_TYPES = [
  'Professional Photos',
  'User-Generated Content',
  'Product Videos',
  'Testimonial Videos',
  'Graphics/Designs',
  'Infographics',
  'Case Studies',
  'Customer Testimonials (Written)',
  'Behind-the-Scenes Content',
  'None Yet'
];

export const MarketingAssetsSection: React.FC<Props> = ({ businessInfo, setBusinessInfo }) => {
  const toggleContentType = (type: string) => {
    setBusinessInfo(prev => {
      // If selecting "None Yet", clear all others
      if (type === 'None Yet') {
        return { ...prev, available_content_types: ['None Yet'] };
      }
      // If selecting another type, remove "None Yet"
      const filtered = prev.available_content_types.filter(t => t !== 'None Yet');
      return {
        ...prev,
        available_content_types: filtered.includes(type)
          ? filtered.filter(t => t !== type)
          : [...filtered, type]
      };
    });
  };

  return (
    <div className="space-y-6 pt-4">
      {/* Available Content Types */}
      <div className="space-y-3">
        <Label className="flex items-center gap-1">
          Available Content Types
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">What content assets do you already have available?</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {CONTENT_TYPES.map(type => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={`content-${type}`}
                checked={businessInfo.available_content_types.includes(type)}
                onCheckedChange={() => toggleContentType(type)}
              />
              <Label htmlFor={`content-${type}`} className="text-sm font-normal cursor-pointer">
                {type}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Asset Counts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Professional Photos Available</Label>
          <Input
            type="number"
            min={0}
            value={businessInfo.professional_photos_count || ''}
            onChange={(e) => setBusinessInfo(prev => ({
              ...prev,
              professional_photos_count: e.target.value ? parseInt(e.target.value) : 0
            }))}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label>Videos Available</Label>
          <Input
            type="number"
            min={0}
            value={businessInfo.videos_available_count || ''}
            onChange={(e) => setBusinessInfo(prev => ({
              ...prev,
              videos_available_count: e.target.value ? parseInt(e.target.value) : 0
            }))}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label>Customer Testimonials</Label>
          <Input
            type="number"
            min={0}
            value={businessInfo.testimonials_count || ''}
            onChange={(e) => setBusinessInfo(prev => ({
              ...prev,
              testimonials_count: e.target.value ? parseInt(e.target.value) : 0
            }))}
            placeholder="0"
          />
        </div>
      </div>

      {/* Style & Capability Dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Photography Style</Label>
          <Select
            value={businessInfo.photography_style}
            onValueChange={(v) => setBusinessInfo(prev => ({ ...prev, photography_style: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="studio">Studio/Professional</SelectItem>
              <SelectItem value="lifestyle">Lifestyle/Candid</SelectItem>
              <SelectItem value="ugc">User-Generated Content</SelectItem>
              <SelectItem value="product">Product Focus</SelectItem>
              <SelectItem value="mixed">Mixed</SelectItem>
              <SelectItem value="none">Don't Have Photos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Video Production Capability</Label>
          <Select
            value={businessInfo.video_production_capability}
            onValueChange={(v) => setBusinessInfo(prev => ({ ...prev, video_production_capability: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select capability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Video Capability</SelectItem>
              <SelectItem value="basic">Basic Smartphone Videos</SelectItem>
              <SelectItem value="semi-pro">Semi-Professional</SelectItem>
              <SelectItem value="professional">Professional Production</SelectItem>
              <SelectItem value="mixed">Mixed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content Creation Frequency */}
      <div className="space-y-2">
        <Label>Content Creation Frequency</Label>
        <Select
          value={businessInfo.content_creation_frequency}
          onValueChange={(v) => setBusinessInfo(prev => ({ ...prev, content_creation_frequency: v }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="How often do you create content?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="multiple-weekly">Multiple times per week</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="as-needed">As needed</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
