import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { 
  Search, Filter, Grid, List, Plus, Star, Folder, ChevronRight, 
  MoreVertical, Copy, Trash2, Edit, Calendar, Eye, X, Upload,
  ArrowLeft, FolderPlus, Heart, Tag, Sparkles, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import ContentCard from '@/components/content-library/ContentCard';
import ContentDetailModal from '@/components/content-library/ContentDetailModal';
import ContentFormModal from '@/components/content-library/ContentFormModal';
import FolderFormModal from '@/components/content-library/FolderFormModal';

export interface ContentItem {
  id: string;
  user_id: string;
  title: string | null;
  content_text: string | null;
  content_type: string;
  platform: string | null;
  media_urls: any;
  hashtags: string[] | null;
  tone: string | null;
  category: string | null;
  tags: string[] | null;
  is_template: boolean | null;
  is_favorite: boolean | null;
  performance_score: number | null;
  times_used: number | null;
  last_used_at: string | null;
  folder_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  generated_content: string;
}

export interface ContentFolder {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  parent_folder_id: string | null;
  created_at: string;
  updated_at: string;
}

const PLATFORMS = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube', 'multi'];
const CATEGORIES = ['product_launch', 'promotion', 'educational', 'announcement', 'engagement', 'testimonial'];
const CONTENT_TYPES = ['text', 'image', 'video', 'carousel', 'story'];

export default function ContentLibrary() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  
  // Data state
  const [content, setContent] = useState<ContentItem[]>([]);
  const [folders, setFolders] = useState<ContentFolder[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'used' | 'performance' | 'az'>('recent');
  const [filterBy, setFilterBy] = useState<'all' | 'favorites' | 'templates'>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // Modal state
  const [showContentModal, setShowContentModal] = useState(false);
  const [showContentForm, setShowContentForm] = useState(false);
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);

  useEffect(() => {
    if (user) {
      fetchContent();
      fetchFolders();
    }
  }, [user, activeWorkspaceId]);

  const fetchContent = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let q = supabase
        .from('content_library')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (activeWorkspaceId) q = q.eq('workspace_id', activeWorkspaceId);
      const { data, error } = await q;

      if (error) throw error;
      setContent(data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('content_folders')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setFolders(data || []);
    } catch (error: any) {
      console.error('Error fetching folders:', error);
    }
  };

  const filteredContent = useMemo(() => {
    let filtered = [...content];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.title?.toLowerCase().includes(query) ||
        item.content_text?.toLowerCase().includes(query) ||
        item.generated_content?.toLowerCase().includes(query) ||
        item.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by type
    if (filterBy === 'favorites') {
      filtered = filtered.filter(item => item.is_favorite);
    } else if (filterBy === 'templates') {
      filtered = filtered.filter(item => item.is_template);
    }

    // Platform filter
    if (selectedPlatform) {
      filtered = filtered.filter(item => item.platform === selectedPlatform);
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Folder filter
    if (selectedFolder) {
      filtered = filtered.filter(item => item.folder_id === selectedFolder);
    }

    // Sort
    switch (sortBy) {
      case 'used':
        filtered.sort((a, b) => (b.times_used || 0) - (a.times_used || 0));
        break;
      case 'performance':
        filtered.sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0));
        break;
      case 'az':
        filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      default:
        filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }

    return filtered;
  }, [content, searchQuery, filterBy, selectedPlatform, selectedCategory, selectedFolder, sortBy]);

  const toggleFavorite = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('content_library')
        .update({ is_favorite: !currentValue })
        .eq('id', id);

      if (error) throw error;
      setContent(prev => prev.map(item => 
        item.id === id ? { ...item, is_favorite: !currentValue } : item
      ));
      toast({ title: currentValue ? 'Removed from favorites' : 'Added to favorites' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const deleteContent = async (id: string) => {
    if (!confirm('Delete this content?')) return;
    try {
      const { error } = await supabase
        .from('content_library')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setContent(prev => prev.filter(item => item.id !== id));
      toast({ title: 'Content deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const duplicateContent = async (item: ContentItem) => {
    try {
      const { data, error } = await supabase
        .from('content_library')
        .insert({
          user_id: user!.id,
          title: `${item.title || 'Untitled'} (Copy)`,
          content_text: item.content_text,
          content_type: item.content_type,
          platform: item.platform,
          media_urls: item.media_urls,
          hashtags: item.hashtags,
          tone: item.tone,
          category: item.category,
          tags: item.tags,
          is_template: item.is_template,
          is_favorite: false,
          folder_id: item.folder_id,
          generated_content: item.generated_content
        })
        .select()
        .single();

      if (error) throw error;
      setContent(prev => [data, ...prev]);
      toast({ title: 'Content duplicated' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const handleCreateFolder = async (name: string, color: string, icon: string) => {
    try {
      const { data, error } = await supabase
        .from('content_folders')
        .insert({ user_id: user!.id, name, color, icon })
        .select()
        .single();

      if (error) throw error;
      setFolders(prev => [...prev, data]);
      setShowFolderForm(false);
      toast({ title: 'Folder created' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleSaveContent = async (contentData: any) => {
    try {
      if (editingContent) {
        const { error } = await supabase
          .from('content_library')
          .update(contentData)
          .eq('id', editingContent.id);

        if (error) throw error;
        setContent(prev => prev.map(item => 
          item.id === editingContent.id ? { ...item, ...contentData } : item
        ));
        toast({ title: 'Content updated' });
      } else {
        const { data, error } = await supabase
          .from('content_library')
          .insert({ ...contentData, user_id: user!.id })
          .select()
          .single();

        if (error) throw error;
        setContent(prev => [data, ...prev]);
        toast({ title: 'Content saved' });
      }
      setShowContentForm(false);
      setEditingContent(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    content.forEach(item => {
      if (item.platform) {
        counts[item.platform] = (counts[item.platform] || 0) + 1;
      }
    });
    return counts;
  }, [content]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    content.forEach(item => {
      if (item.category) {
        counts[item.category] = (counts[item.category] || 0) + 1;
      }
    });
    return counts;
  }, [content]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button aria-label="Go back" variant="ghost" size="icon" onClick={() => navigate('/ai-strategist')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Content Library</h1>
                <p className="text-sm text-muted-foreground">{content.length} items</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setShowFolderForm(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </Button>
              <Button onClick={() => { setEditingContent(null); setShowContentForm(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                New Content
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <div className="bg-card rounded-xl border border-border p-4 sticky top-24">
              {/* Quick filters */}
              <div className="space-y-1 mb-6">
                <button
                  onClick={() => { setFilterBy('all'); setSelectedFolder(null); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    filterBy === 'all' && !selectedFolder ? 'bg-primary/20 text-primary' : 'hover:bg-secondary text-foreground'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  All Content
                  <span className="ml-auto text-muted-foreground">{content.length}</span>
                </button>
                <button
                  onClick={() => { setFilterBy('favorites'); setSelectedFolder(null); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    filterBy === 'favorites' ? 'bg-primary/20 text-primary' : 'hover:bg-secondary text-foreground'
                  }`}
                >
                  <Star className="h-4 w-4" />
                  Favorites
                  <span className="ml-auto text-muted-foreground">{content.filter(c => c.is_favorite).length}</span>
                </button>
                <button
                  onClick={() => { setFilterBy('templates'); setSelectedFolder(null); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    filterBy === 'templates' ? 'bg-primary/20 text-primary' : 'hover:bg-secondary text-foreground'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  Templates
                  <span className="ml-auto text-muted-foreground">{content.filter(c => c.is_template).length}</span>
                </button>
              </div>

              {/* Folders */}
              <div className="border-t border-border pt-4 mb-6">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Folders</h3>
                <div className="space-y-1">
                  {folders.map(folder => (
                    <button
                      key={folder.id}
                      onClick={() => { setSelectedFolder(folder.id); setFilterBy('all'); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedFolder === folder.id ? 'bg-primary/20 text-primary' : 'hover:bg-secondary text-foreground'
                      }`}
                    >
                      <span>{folder.icon}</span>
                      <span className="truncate">{folder.name}</span>
                      <span className="ml-auto text-muted-foreground">
                        {content.filter(c => c.folder_id === folder.id).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Platform filter */}
              <div className="border-t border-border pt-4 mb-6">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Platforms</h3>
                <div className="space-y-1">
                  {PLATFORMS.filter(p => platformCounts[p]).map(platform => (
                    <button
                      key={platform}
                      onClick={() => setSelectedPlatform(selectedPlatform === platform ? null : platform)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm capitalize transition-colors ${
                        selectedPlatform === platform ? 'bg-primary/20 text-primary' : 'hover:bg-secondary text-foreground'
                      }`}
                    >
                      {platform}
                      <span className="ml-auto text-muted-foreground">{platformCounts[platform]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Category filter */}
              <div className="border-t border-border pt-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Categories</h3>
                <div className="space-y-1">
                  {CATEGORIES.filter(c => categoryCounts[c]).map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm capitalize transition-colors ${
                        selectedCategory === category ? 'bg-primary/20 text-primary' : 'hover:bg-secondary text-foreground'
                      }`}
                    >
                      {category.replace('_', ' ')}
                      <span className="ml-auto text-muted-foreground">{categoryCounts[category]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {/* Search and controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-card border-border"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-10 px-3 rounded-lg bg-card border border-border text-foreground text-sm"
                >
                  <option value="recent">Most Recent</option>
                  <option value="used">Most Used</option>
                  <option value="performance">Best Performance</option>
                  <option value="az">A-Z</option>
                </select>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-secondary'}`}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-secondary'}`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content grid/list */}
            {loading ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
                    <div className="h-4 bg-secondary rounded w-3/4 mb-3" />
                    <div className="h-20 bg-secondary rounded mb-3" />
                    <div className="h-4 bg-secondary rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredContent.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-xl border border-border">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No content found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Try a different search term' : 'Start building your content library'}
                </p>
                <Button onClick={() => { setEditingContent(null); setShowContentForm(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Content
                </Button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredContent.map(item => (
                  <ContentCard
                    key={item.id}
                    item={item}
                    onView={() => { setSelectedContent(item); setShowContentModal(true); }}
                    onEdit={() => { setEditingContent(item); setShowContentForm(true); }}
                    onDuplicate={() => duplicateContent(item)}
                    onDelete={() => deleteContent(item.id)}
                    onToggleFavorite={() => toggleFavorite(item.id, item.is_favorite || false)}
                    onCopy={() => copyToClipboard(item.content_text || item.generated_content)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Content</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Platform</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Used</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Score</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredContent.map(item => (
                      <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <button onClick={() => toggleFavorite(item.id, item.is_favorite || false)}>
                              <Star className={`h-4 w-4 ${item.is_favorite ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`} />
                            </button>
                            <div>
                              <p className="font-medium text-foreground truncate max-w-xs">{item.title || 'Untitled'}</p>
                              <p className="text-sm text-muted-foreground truncate max-w-xs">
                                {item.content_text || item.generated_content}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm capitalize text-foreground">{item.platform || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm capitalize text-foreground">{item.category?.replace('_', ' ') || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-foreground">{item.times_used || 0}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-foreground">{item.performance_score || '-'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button aria-label="View content" variant="ghost" size="icon" onClick={() => { setSelectedContent(item); setShowContentModal(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button aria-label="Edit content" variant="ghost" size="icon" onClick={() => { setEditingContent(item); setShowContentForm(true); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button aria-label="Copy content" variant="ghost" size="icon" onClick={() => copyToClipboard(item.content_text || item.generated_content)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button aria-label="Delete content" variant="ghost" size="icon" onClick={() => deleteContent(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Modals */}
      {showContentModal && selectedContent && (
        <ContentDetailModal
          content={selectedContent}
          onClose={() => { setShowContentModal(false); setSelectedContent(null); }}
          onEdit={() => { setShowContentModal(false); setEditingContent(selectedContent); setShowContentForm(true); }}
          onCopy={() => copyToClipboard(selectedContent.content_text || selectedContent.generated_content)}
        />
      )}

      {showContentForm && (
        <ContentFormModal
          content={editingContent}
          folders={folders}
          onClose={() => { setShowContentForm(false); setEditingContent(null); }}
          onSave={handleSaveContent}
        />
      )}

      {showFolderForm && (
        <FolderFormModal
          onClose={() => setShowFolderForm(false)}
          onSave={handleCreateFolder}
        />
      )}
    </div>
  );
}
