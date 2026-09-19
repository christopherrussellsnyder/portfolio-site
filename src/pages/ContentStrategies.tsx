import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowLeft, Plus, Calendar, Lightbulb, Loader2, 
  Trash2, Download, FileJson, Table, Search, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useStrategyGeneration, StrategyPost, StrategyOverview } from '@/hooks/useStrategyGeneration';
import { StrategyOverviewCard } from '@/components/strategy/StrategyOverviewCard';
import { CampaignStructureCard } from '@/components/strategy/CampaignStructureCard';
import { StrategyPostCard } from '@/components/strategy/StrategyPostCard';
import { OutcomeTrackingPanel } from '@/components/strategy/OutcomeTrackingPanel';
import { StrategyCalendarView } from '@/components/strategy/StrategyCalendarView';
import { exportStrategyToCSV, exportStrategyToJSON } from '@/components/strategy/StrategyExport';
import { StrategyDialog } from '@/components/strategist/StrategyDialog';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

export default function ContentStrategies() {
  const navigate = useNavigate();
  const { id: strategyId } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const { 
    fetchAllStrategies, 
    fetchStrategy, 
    deleteStrategy,
    generateStrategy,
    isGenerating,
    progress
  } = useStrategyGeneration();

  const [strategies, setStrategies] = useState<any[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<{
    strategy: StrategyOverview & { id: string; created_at: string };
    posts: StrategyPost[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [strategyToDelete, setStrategyToDelete] = useState<string | null>(null);

  const { activeWorkspaceId } = useWorkspace();

  useEffect(() => {
    if (user) {
      loadStrategies();
    }
  }, [user, activeWorkspaceId]);

  useEffect(() => {
    if (strategyId) {
      loadStrategyDetails(strategyId);
    } else {
      setSelectedStrategy(null);
    }
  }, [strategyId]);

  const loadStrategies = async () => {
    setLoading(true);
    const data = await fetchAllStrategies();
    setStrategies(data);
    setLoading(false);
  };

  const loadStrategyDetails = async (id: string) => {
    setLoading(true);
    const data = await fetchStrategy(id);
    if (data) {
      setSelectedStrategy({
        strategy: data.strategy as any,
        posts: data.posts,
      });
    }
    setLoading(false);
  };

  const handleGenerateStrategy = async (platform: string, duration: number, contentMode: 'organic' | 'paid' | 'hybrid' = 'hybrid') => {
    setShowGenerateDialog(false);
    const result = await generateStrategy(platform, duration, undefined, undefined, undefined, contentMode);
    if (result) {
      await loadStrategies();
      navigate(`/strategies/${result.strategyId}`);
    }
  };

  const handleDeleteStrategy = async () => {
    if (!strategyToDelete) return;
    
    const success = await deleteStrategy(strategyToDelete);
    if (success) {
      setStrategies(prev => prev.filter(s => s.id !== strategyToDelete));
      if (selectedStrategy?.strategy.id === strategyToDelete) {
        navigate('/strategies');
      }
    }
    setDeleteDialogOpen(false);
    setStrategyToDelete(null);
  };

  const filteredStrategies = strategies.filter(s => {
    const matchesSearch = !searchQuery || 
      s.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = platformFilter === 'all' || s.platform === platformFilter;
    return matchesSearch && matchesPlatform;
  });

  // Detail view when a strategy is selected
  if (selectedStrategy) {
    return (
      <>
        <Helmet>
          <title>{selectedStrategy.strategy.title} | MarketAI</title>
        </Helmet>

        <div className="min-h-screen bg-background">
          <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button aria-label="Go back" variant="ghost" size="icon" onClick={() => navigate('/strategies')}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <h1 className="text-xl font-semibold tracking-tight text-foreground">
                      {selectedStrategy.strategy.title}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedStrategy.strategy.start_date), 'MMM d')} - 
                      {format(new Date(selectedStrategy.strategy.end_date), 'MMM d, yyyy')} • 
                      {selectedStrategy.posts.length} posts
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportStrategyToCSV(selectedStrategy.strategy, selectedStrategy.posts)}
                  >
                    <Table className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sidebar - Strategy Overview */}
              <div className="lg:col-span-1">
                <div className="sticky top-24 space-y-4">
                  <StrategyOverviewCard
                    strategy={selectedStrategy.strategy}
                    postsCount={selectedStrategy.posts.length}
                    onExportCSV={() => exportStrategyToCSV(selectedStrategy.strategy, selectedStrategy.posts)}
                  />
                  <CampaignStructureCard
                    data={(selectedStrategy.strategy as any).recommended_campaign_structure}
                    platform={selectedStrategy.strategy.platform}
                  />
                </div>
              </div>

              {/* Main Content - Posts */}
              <div className="lg:col-span-2 space-y-4">
                <OutcomeTrackingPanel strategyId={selectedStrategy.strategy.id} />
                {selectedStrategy.posts.map(post => (
                  <StrategyPostCard key={post.id} post={post} />
                ))}
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  // List view
  return (
    <>
      <Helmet>
        <title>Content Strategies | Korex</title>
        <meta name="description" content="View and manage your Korex-generated content strategies" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button aria-label="Go back" variant="ghost" size="icon" onClick={() => navigate('/ai-strategist')}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-foreground">Content Strategies</h1>
                  <p className="text-sm text-muted-foreground">
                    {strategies.length} strategies created
                  </p>
                </div>
              </div>
              <Button onClick={() => setShowGenerateDialog(true)} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating ({progress}%)
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    New Strategy
                  </>
                )}
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search strategies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="twitter">Twitter/X</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredStrategies.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="p-4 rounded-full bg-primary/20 mb-4">
                  <Lightbulb className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {searchQuery || platformFilter !== 'all' 
                    ? 'No strategies found' 
                    : 'No strategies yet'}
                </h3>
                <p className="text-muted-foreground text-center mb-4 max-w-md">
                  {searchQuery || platformFilter !== 'all'
                    ? 'Try adjusting your filters.'
                    : 'Generate your first intelligence-driven content strategy to get personalized post ideas, captions, and timing recommendations.'}
                </p>
                {!searchQuery && platformFilter === 'all' && (
                  <Button onClick={() => setShowGenerateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Strategy
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStrategies.map(strategy => (
                <Card 
                  key={strategy.id} 
                  className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/strategies/${strategy.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Badge variant="secondary" className="capitalize">
                        {strategy.platform}
                      </Badge>
                      <Button aria-label="Delete strategy"
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStrategyToDelete(strategy.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <CardTitle className="text-lg">{strategy.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Duration</span>
                        <span className="text-foreground">{strategy.duration_days} days</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Date Range</span>
                        <span className="text-foreground">
                          {format(new Date(strategy.start_date), 'MMM d')} - 
                          {format(new Date(strategy.end_date), 'MMM d')}
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Created</span>
                        <span className="text-foreground">
                          {format(new Date(strategy.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Generate Strategy Dialog */}
      <StrategyDialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
        onSubmit={handleGenerateStrategy}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Strategy?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the strategy and all its posts. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteStrategy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
