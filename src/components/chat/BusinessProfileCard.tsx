import React from 'react';
import { 
  Building2, Users, Palette, TrendingUp, Target, 
  MessageSquare, RefreshCw, Check, ChevronDown, ChevronUp 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { BusinessProfile } from '@/hooks/useWebsiteAnalysis';

interface BusinessProfileCardProps {
  profile: BusinessProfile;
  websiteUrl?: string;
  onReanalyze?: () => void;
  onEdit?: () => void;
  compact?: boolean;
}

export function BusinessProfileCard({ 
  profile, 
  websiteUrl, 
  onReanalyze,
  onEdit,
  compact = false 
}: BusinessProfileCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(!compact);

  if (compact) {
    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card className="bg-muted/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="py-3 cursor-pointer hover:bg-muted/80 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-medium">
                    {profile.businessName}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {profile.industry}
                  </Badge>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0 pb-3">
              <ProfileDetails profile={profile} onReanalyze={onReanalyze} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <CardTitle>{profile.businessName}</CardTitle>
          </div>
          <div className="flex gap-2">
            {onReanalyze && (
              <Button variant="outline" size="sm" onClick={onReanalyze}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Re-analyze
              </Button>
            )}
          </div>
        </div>
        {websiteUrl && (
          <p className="text-sm text-muted-foreground">{websiteUrl}</p>
        )}
      </CardHeader>
      <CardContent>
        <ProfileDetails profile={profile} />
      </CardContent>
    </Card>
  );
}

function ProfileDetails({ profile, onReanalyze }: { profile: BusinessProfile; onReanalyze?: () => void }) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      {profile.summary && (
        <p className="text-sm text-muted-foreground">{profile.summary}</p>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard 
          icon={<Building2 className="w-4 h-4" />}
          label="Business Type"
          value={profile.businessType}
        />
        <StatCard 
          icon={<Target className="w-4 h-4" />}
          label="Price Range"
          value={profile.priceRange}
        />
        <StatCard 
          icon={<Users className="w-4 h-4" />}
          label="Target Age"
          value={profile.targetAudience?.ageRange || 'N/A'}
        />
        <StatCard 
          icon={<TrendingUp className="w-4 h-4" />}
          label="Website Quality"
          value={`${profile.marketingMaturity?.websiteQuality || 'N/A'}/10`}
        />
      </div>

      {/* Products/Services */}
      {profile.productsServices && profile.productsServices.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Products/Services
          </h4>
          <div className="flex flex-wrap gap-2">
            {profile.productsServices.slice(0, 5).map((product, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {product.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Brand Identity */}
      {profile.brandIdentity && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Brand Voice
          </h4>
          <div className="flex flex-wrap gap-2">
            {profile.brandIdentity.toneCharacteristics?.slice(0, 4).map((tone, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {tone}
              </Badge>
            ))}
            <span className="text-xs text-muted-foreground">
              ({profile.brandIdentity.voiceScale}/10 casual)
            </span>
          </div>
          {profile.brandIdentity.valueProposition && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              "{profile.brandIdentity.valueProposition}"
            </p>
          )}
        </div>
      )}

      {/* Visual Identity */}
      {profile.visualIdentity && profile.visualIdentity.primaryColors && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Brand Colors
          </h4>
          <div className="flex gap-2">
            {profile.visualIdentity.primaryColors.slice(0, 5).map((color, i) => (
              <div 
                key={i}
                className="w-6 h-6 rounded-full border shadow-sm"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
            {profile.visualIdentity.secondaryColors?.slice(0, 3).map((color, i) => (
              <div 
                key={`sec-${i}`}
                className="w-6 h-6 rounded-full border shadow-sm opacity-70"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* Marketing Maturity */}
      {profile.marketingMaturity && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Marketing Status
          </h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              SEO: {profile.marketingMaturity.seoLevel}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Content: {profile.marketingMaturity.contentMarketing}
            </Badge>
            <Badge variant="outline" className="text-xs">
              CTA: {profile.marketingMaturity.ctaClarity}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-2 rounded-md bg-background border">
      <div className="flex items-center gap-1 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-medium capitalize">{value}</p>
    </div>
  );
}