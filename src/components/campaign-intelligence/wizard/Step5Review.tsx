import { 
  Building2, Target, Layers, BarChart3, Calendar, 
  Settings, Edit, Users, Palette, Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, addDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { CampaignWizardData, BusinessInfo } from './CampaignWizardModal';

interface Props {
  data: CampaignWizardData;
  businessInfo: BusinessInfo | null;
  onEdit: (step: number) => void;
}

const GOAL_LABELS: Record<string, string> = {
  brand_awareness: 'Brand Awareness',
  lead_generation: 'Lead Generation',
  direct_sales: 'Direct Sales',
  product_launch: 'Product Launch',
  event_promotion: 'Event Promotion',
  community_building: 'Community Building'
};

const PLATFORM_LABELS: Record<string, { label: string; icon: string }> = {
  instagram: { label: 'Instagram', icon: '📸' },
  tiktok: { label: 'TikTok', icon: '🎵' },
  facebook: { label: 'Facebook', icon: '📘' },
  linkedin: { label: 'LinkedIn', icon: '💼' },
  twitter: { label: 'Twitter', icon: '🐦' },
  multi: { label: 'Multi-Platform', icon: '🌐' }
};

const URGENCY_LABELS: Record<string, string> = {
  exploratory: 'Exploratory',
  standard: 'Standard',
  high: 'High Priority',
  critical: 'Critical'
};

export function Step5Review({ data, businessInfo, onEdit }: Props) {
  const endDate = addDays(data.startDate, data.durationDays);
  const hasTargets = data.targetImpressions || data.targetEngagementRate || 
                     data.targetConversions || data.targetFollowers || 
                     data.budgetRange;
  const hasDetails = data.campaignThemes.length > 0 || data.seasonalType || 
                     data.specialRequirements || data.campaignDifferentiation;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">
          Review your campaign details
        </h3>
        <p className="text-muted-foreground">
          Everything look good?
        </p>
      </div>

      <div className="grid gap-4">
        {/* Business Context */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Business Context
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/settings?tab=profile">
                  <Settings className="w-3 h-3 mr-1" />
                  Edit in Settings
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {businessInfo ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Business Name</p>
                  <p className="font-medium">{businessInfo.business_name || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Industry</p>
                  <p className="font-medium">{businessInfo.industry || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Target Age</p>
                  <p className="font-medium">
                    {businessInfo.target_age_min}-{businessInfo.target_age_max}
                  </p>
                </div>
                {businessInfo.brand_voice_traits.length > 0 && (
                  <div className="col-span-2 md:col-span-3">
                    <p className="text-muted-foreground mb-1">Brand Voice</p>
                    <div className="flex flex-wrap gap-1">
                      {businessInfo.brand_voice_traits.slice(0, 4).map((trait) => (
                        <Badge key={trait} variant="outline" className="text-xs">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>No business information found.</p>
                <Button variant="link" asChild className="mt-1">
                  <Link to="/settings?tab=profile">Complete your profile</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign Details */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Campaign Details
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onEdit(1)}>
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Primary Goal</p>
                <p className="font-medium flex items-center gap-1">
                  <Check className="w-4 h-4 text-green-500" />
                  {GOAL_LABELS[data.primaryGoal] || data.primaryGoal}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Platform</p>
                <p className="font-medium">
                  {PLATFORM_LABELS[data.primaryPlatform]?.icon}{' '}
                  {PLATFORM_LABELS[data.primaryPlatform]?.label || data.primaryPlatform}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="font-medium">{data.durationDays} days</p>
              </div>
              <div>
                <p className="text-muted-foreground">Dates</p>
                <p className="font-medium">
                  {format(data.startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
                </p>
              </div>
              {data.secondaryGoals.length > 0 && (
                <div className="col-span-2">
                  <p className="text-muted-foreground mb-1">Secondary Goals</p>
                  <div className="flex flex-wrap gap-1">
                    {data.secondaryGoals.map((goal) => (
                      <Badge key={goal} variant="secondary" className="text-xs">
                        {GOAL_LABELS[goal] || goal}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Campaign Targets */}
        {hasTargets && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Campaign Targets
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onEdit(3)}>
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {data.targetImpressions && (
                  <div>
                    <p className="text-muted-foreground">Impressions Goal</p>
                    <p className="font-medium">{data.targetImpressions.toLocaleString()}</p>
                  </div>
                )}
                {data.targetEngagementRate && (
                  <div>
                    <p className="text-muted-foreground">Engagement Rate</p>
                    <p className="font-medium">{data.targetEngagementRate}%</p>
                  </div>
                )}
                {data.targetConversions && (
                  <div>
                    <p className="text-muted-foreground">Conversions</p>
                    <p className="font-medium">{data.targetConversions.toLocaleString()}</p>
                  </div>
                )}
                {data.targetFollowers && (
                  <div>
                    <p className="text-muted-foreground">New Followers</p>
                    <p className="font-medium">+{data.targetFollowers.toLocaleString()}</p>
                  </div>
                )}
                {data.budgetRange && data.budgetRange !== 'none' && (
                  <div>
                    <p className="text-muted-foreground">Budget</p>
                    <p className="font-medium capitalize">{data.budgetRange.replace(/-/g, ' ')}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Urgency</p>
                  <Badge variant={data.urgencyLevel === 'critical' ? 'destructive' : 'secondary'}>
                    {URGENCY_LABELS[data.urgencyLevel] || data.urgencyLevel}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Campaign Specifics */}
        {hasDetails && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  Campaign Specifics
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onEdit(4)}>
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {data.campaignThemes.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1">Themes</p>
                  <div className="flex flex-wrap gap-1">
                    {data.campaignThemes.map((theme) => (
                      <Badge key={theme} variant="secondary" className="text-xs">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {data.seasonalType && (
                <div>
                  <p className="text-muted-foreground">Seasonal</p>
                  <p className="font-medium">
                    {data.seasonalType === 'holiday' ? '🎄 ' : 
                     data.seasonalType === 'seasonal' ? '🌸 ' : '🏭 '}
                    {data.seasonalDetails || data.seasonalType}
                  </p>
                </div>
              )}
              {data.specialRequirements && (
                <div>
                  <p className="text-muted-foreground">Requirements</p>
                  <p className="text-sm">{data.specialRequirements}</p>
                </div>
              )}
              {data.campaignDifferentiation && (
                <div>
                  <p className="text-muted-foreground">Differentiation</p>
                  <p className="text-sm">{data.campaignDifferentiation}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Generation Info */}
      <div className="text-center text-sm text-muted-foreground">
        <p>Generation will take 60-90 seconds to complete</p>
      </div>
    </div>
  );
}
