import { useState } from 'react';
import { format, addDays } from 'date-fns';
import {
  Calendar, Clock, Image, Video, MessageSquare, Hash,
  ChevronDown, ChevronUp, Edit2, RefreshCw, Send, Check,
  Eye, Target, TrendingUp, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface ContentPost {
  id?: string;
  day_number: number;
  post_date?: string;
  post_time_recommended?: string;
  platform: string;
  content_hook: string;
  content_body: string;
  content_cta: string;
  content_type: string;
  content_theme: string;
  target_audience_segment?: string;
  expected_engagement_score?: number;
  reasoning?: string;
  post_status?: string;
  ml_confidence_score?: number;
  platform_specific_tips?: string[];
  hashtags?: string[];
  media_suggestions?: string;
}

interface ContentCalendarViewProps {
  posts: ContentPost[];
  startDate: Date;
  platform: string;
  onSchedulePost: (post: ContentPost) => void;
  onRegeneratePost: (dayNumber: number) => void;
  onUpdatePost: (post: ContentPost) => void;
  onScheduleAll: () => void;
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸',
  facebook: '📘',
  twitter: '🐦',
  linkedin: '💼',
  tiktok: '🎵'
};

const CONTENT_TYPE_ICONS: Record<string, typeof Image> = {
  image: Image,
  video: Video,
  carousel: Image,
  story: Image,
  text: MessageSquare,
  reel: Video
};

const THEME_COLORS: Record<string, string> = {
  awareness: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  education: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  engagement: 'bg-green-500/20 text-green-400 border-green-500/30',
  trust: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  conversion: 'bg-red-500/20 text-red-400 border-red-500/30',
  promotion: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
};

export function ContentCalendarView({
  posts,
  startDate,
  platform,
  onSchedulePost,
  onRegeneratePost,
  onUpdatePost,
  onScheduleAll
}: ContentCalendarViewProps) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null);
  const [editedContent, setEditedContent] = useState({ hook: '', body: '', cta: '' });

  const getPostDate = (dayNumber: number) => {
    return addDays(startDate, dayNumber - 1);
  };

  const getWeekNumber = (dayNumber: number) => {
    return Math.ceil(dayNumber / 7);
  };

  const getWeekTheme = (weekNumber: number) => {
    const themes = ['Awareness & Education', 'Engagement & Trust', 'Consideration & Desire', 'Conversion & Action'];
    return themes[weekNumber - 1] || 'General';
  };

  const openEditModal = (post: ContentPost) => {
    setEditingPost(post);
    setEditedContent({
      hook: post.content_hook,
      body: post.content_body,
      cta: post.content_cta
    });
  };

  const saveEditedPost = () => {
    if (!editingPost) return;
    onUpdatePost({
      ...editingPost,
      content_hook: editedContent.hook,
      content_body: editedContent.body,
      content_cta: editedContent.cta
    });
    setEditingPost(null);
  };

  const weeklyPosts = [1, 2, 3, 4, 5].map(week => ({
    week,
    theme: getWeekTheme(week),
    posts: posts.filter(p => getWeekNumber(p.day_number) === week)
  }));

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            14-Day Content Calendar
          </h3>
          <p className="text-sm text-muted-foreground">
            {format(startDate, 'MMM d')} - {format(addDays(startDate, 29), 'MMM d, yyyy')} • {posts.length} posts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Hash className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={onScheduleAll}>
            <Send className="w-4 h-4 mr-2" />
            Schedule All 30 Posts
          </Button>
        </div>
      </div>

      {/* Weekly Breakdown */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
          <TabsTrigger value="weekly">Weekly View</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {posts.map(post => {
                const isExpanded = expandedDay === post.day_number;
                const postDate = getPostDate(post.day_number);
                const ContentIcon = CONTENT_TYPE_ICONS[post.content_type] || MessageSquare;
                const themeColor = THEME_COLORS[post.content_theme?.toLowerCase()] || 'bg-muted';
                
                return (
                  <Card 
                    key={post.day_number} 
                    className={`transition-all ${isExpanded ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
                  >
                    <CardContent className="p-4">
                      <div 
                        className="flex items-start gap-4 cursor-pointer"
                        onClick={() => setExpandedDay(isExpanded ? null : post.day_number)}
                      >
                        {/* Day Badge */}
                        <div className="flex flex-col items-center min-w-[60px]">
                          <span className="text-2xl font-bold text-primary">
                            {post.day_number}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(postDate, 'EEE')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(postDate, 'MMM d')}
                          </span>
                        </div>

                        {/* Content Preview */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{PLATFORM_ICONS[platform]}</span>
                            <Badge variant="outline" className="text-xs">
                              <ContentIcon className="w-3 h-3 mr-1" />
                              {post.content_type}
                            </Badge>
                            <Badge variant="outline" className={themeColor}>
                              {post.content_theme}
                            </Badge>
                            {post.post_time_recommended && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {post.post_time_recommended}
                              </span>
                            )}
                          </div>
                          
                          <p className="font-medium text-foreground line-clamp-1">
                            {post.content_hook}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {post.content_body.substring(0, 100)}...
                          </p>
                        </div>

                        {/* Metrics */}
                        <div className="flex flex-col items-end gap-1">
                          {post.expected_engagement_score && (
                            <Badge className="bg-gradient-to-r from-primary/80 to-purple-500/80">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              {post.expected_engagement_score}% expected
                            </Badge>
                          )}
                          <Button aria-label="Toggle day details" variant="ghost" size="icon">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs text-muted-foreground">Hook</Label>
                              <p className="font-medium">{post.content_hook}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Call to Action</Label>
                              <p className="font-medium">{post.content_cta}</p>
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-xs text-muted-foreground">Full Content</Label>
                            <p className="text-sm mt-1 whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                              {post.content_body}
                            </p>
                          </div>

                          {post.hashtags && post.hashtags.length > 0 && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Hashtags</Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {post.hashtags.map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    #{tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {post.reasoning && (
                            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                              <Label className="text-xs text-primary flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Why This Content Today
                              </Label>
                              <p className="text-sm mt-1">{post.reasoning}</p>
                            </div>
                          )}

                          {post.platform_specific_tips && post.platform_specific_tips.length > 0 && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Platform Tips</Label>
                              <ul className="text-sm mt-1 space-y-1">
                                {post.platform_specific_tips.map((tip, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <Check className="w-3 h-3 text-green-500 mt-0.5" />
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            <Button size="sm" onClick={() => onSchedulePost(post)}>
                              <Send className="w-4 h-4 mr-2" />
                              Schedule This Post
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openEditModal(post)}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => onRegeneratePost(post.day_number)}>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Regenerate
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="weekly">
          <div className="grid md:grid-cols-2 gap-4">
            {weeklyPosts.filter(w => w.posts.length > 0).map(week => (
              <Card key={week.week} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-purple-500/10 pb-3">
                  <CardTitle className="text-base">Week {week.week}</CardTitle>
                  <CardDescription>{week.theme}</CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {week.posts.map(post => (
                      <div 
                        key={post.day_number}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => setExpandedDay(expandedDay === post.day_number ? null : post.day_number)}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="w-8 h-6 justify-center">
                            {post.day_number}
                          </Badge>
                          <span className="text-sm line-clamp-1">{post.content_hook}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {post.content_type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t text-center text-sm text-muted-foreground">
                    {week.posts.length} posts scheduled
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <Dialog open={!!editingPost} onOpenChange={() => setEditingPost(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Day {editingPost?.day_number} Content</DialogTitle>
            <DialogDescription>
              Customize this post before scheduling
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Hook (First Line)</Label>
              <Input
                value={editedContent.hook}
                onChange={(e) => setEditedContent(prev => ({ ...prev, hook: e.target.value }))}
                placeholder="Attention-grabbing opening..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Body Content</Label>
              <Textarea
                value={editedContent.body}
                onChange={(e) => setEditedContent(prev => ({ ...prev, body: e.target.value }))}
                rows={8}
                placeholder="Main content..."
              />
              <p className="text-xs text-muted-foreground text-right">
                {editedContent.body.length} characters
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Call to Action</Label>
              <Input
                value={editedContent.cta}
                onChange={(e) => setEditedContent(prev => ({ ...prev, cta: e.target.value }))}
                placeholder="Clear CTA..."
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingPost(null)}>
              Cancel
            </Button>
            <Button onClick={saveEditedPost}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}