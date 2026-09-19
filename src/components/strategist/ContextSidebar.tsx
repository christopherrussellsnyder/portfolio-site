import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, BarChart3, ChevronLeft, ChevronRight, 
  Globe, RefreshCw, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { BusinessContext, AnalyticsUpload } from '@/pages/AIStrategist';

interface ContextSidebarProps {
  businessContext: BusinessContext | null | undefined;
  recentAnalytics: AnalyticsUpload[];
  isOpen: boolean;
  onToggle: () => void;
  onReanalyze: () => void;
}

export function ContextSidebar({
  businessContext,
  recentAnalytics,
  isOpen,
  onToggle,
  onReanalyze,
}: ContextSidebarProps) {
  const navigate = useNavigate();
  const profile = businessContext?.business_profile;

  return (
    <div className={cn(
      'relative flex flex-col bg-muted/30 border-l transition-all duration-300',
      isOpen ? 'w-80' : 'w-0'
    )}>
      {/* Toggle button */}
      <Button aria-label="Toggle context panel"
        variant="ghost"
        size="icon"
        className={cn(
          'absolute -left-4 top-4 z-20 h-8 w-8 rounded-full border bg-background shadow-md',
          !isOpen && 'left-[-48px]'
        )}
        onClick={onToggle}
      >
        {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      {isOpen && (
        <>
          {/* Header */}
          <div className="p-4 border-b">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Business Context
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Korex Intelligence uses this context for personalized advice
            </p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Business Profile Section */}
              {profile ? (
                <Card className="bg-background">
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Globe className="w-4 h-4 text-primary" />
                        {profile.businessName}
                      </CardTitle>
                      <Button aria-label="Re-analyze business" 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={onReanalyze}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0 space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Industry</p>
                      <Badge variant="secondary" className="text-xs">
                        {profile.industry}
                      </Badge>
                    </div>
                    
                    {profile.businessType && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Type</p>
                        <p className="text-sm capitalize">{profile.businessType}</p>
                      </div>
                    )}
                    
                    {profile.targetAudience && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Target Audience</p>
                        <p className="text-sm">
                          {profile.targetAudience.ageRange || 'N/A'}
                          {profile.targetAudience.customerType && ` • ${profile.targetAudience.customerType}`}
                        </p>
                      </div>
                    )}

                    {profile.brandIdentity?.toneCharacteristics && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Brand Voice</p>
                        <div className="flex flex-wrap gap-1">
                          {profile.brandIdentity.toneCharacteristics.slice(0, 3).map((tone, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tone}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {businessContext.analyzed_at && (
                      <p className="text-xs text-muted-foreground pt-2 border-t">
                        Analyzed {formatDistanceToNow(new Date(businessContext.analyzed_at), { addSuffix: true })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-background border-dashed">
                  <CardContent className="py-6 text-center">
                    <Globe className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground mb-1">No website analyzed</p>
                    <p className="text-xs text-muted-foreground">
                      Use 🌐 to analyze your website
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Recent Analytics Section */}
              <Card className="bg-background">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Recent Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  {recentAnalytics.length > 0 ? (
                    <div className="space-y-3">
                      {recentAnalytics.map((upload) => (
                        <div key={upload.id} className="flex items-start gap-3 p-2 rounded-md bg-muted/50">
                          <div className="p-1.5 rounded bg-primary/10">
                            <TrendingUp className="w-3 h-3 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium capitalize">{upload.platform}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {formatDistanceToNow(new Date(upload.uploaded_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <BarChart3 className="w-6 h-6 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-xs text-muted-foreground">
                        No analytics uploaded yet
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Use 📎 to upload screenshots
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
