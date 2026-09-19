import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, Grid3X3, List, Search, Filter, FolderPlus, Star, Clock, 
  Image, Video, FileText, Trash2, Download, Copy, Edit2, MoreVertical,
  X, Check, ChevronRight, Folder, Plus, Eye, ArrowLeft, ExternalLink,
  RotateCw, Crop, Sun, Contrast, Palette, Type, Maximize, ZoomIn, ZoomOut,
  FlipHorizontal, FlipVertical, RotateCcw, Sparkles, HardDrive, AlertCircle,
  Play, Film, GalleryHorizontalEnd, Heart, ImagePlus, Camera, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MediaUploader } from '@/components/MediaUploader';

interface MediaItem {
  id: string;
  filename: string;
  original_filename: string;
  file_type: 'image' | 'video' | 'document' | 'gif';
  mime_type: string;
  file_size: number;
  storage_url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  duration?: number;
  folder_id?: string;
  tags: string[];
  title?: string;
  description?: string;
  alt_text?: string;
  times_used: number;
  last_used_at?: string;
  avg_engagement_rate: number;
  total_impressions: number;
  is_favorite: boolean;
  uploaded_at: string;
}

interface MediaFolder {
  id: string;
  name: string;
  color: string;
  icon?: string;
  parent_folder_id?: string;
  item_count: number;
  total_size: number;
}

// Removed mock data - now using real Supabase data

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const MediaLibrary: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  
  // Editor state
  const [editorBrightness, setEditorBrightness] = useState(0);
  const [editorContrast, setEditorContrast] = useState(0);
  const [editorSaturation, setEditorSaturation] = useState(0);
  const [editorRotation, setEditorRotation] = useState(0);
  const [editorFlipH, setEditorFlipH] = useState(false);
  const [editorFlipV, setEditorFlipV] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [savingChanges, setSavingChanges] = useState(false);
  
  // Stock Images Modal
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [stockImages, setStockImages] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  
  // Folder form state
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState('#8B5CF6');

  // Load media from Supabase
  const loadMedia = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('media_library')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      const mappedMedia: MediaItem[] = (data || []).map(item => ({
        id: item.id,
        filename: item.filename,
        original_filename: item.original_filename,
        file_type: item.file_type as MediaItem['file_type'],
        mime_type: item.mime_type,
        file_size: Number(item.file_size),
        storage_url: item.storage_url,
        thumbnail_url: item.thumbnail_url || undefined,
        width: item.width || undefined,
        height: item.height || undefined,
        duration: item.duration || undefined,
        folder_id: item.folder_id || undefined,
        tags: item.tags || [],
        title: item.title || undefined,
        description: item.description || undefined,
        alt_text: item.alt_text || undefined,
        times_used: item.times_used || 0,
        last_used_at: item.last_used_at || undefined,
        avg_engagement_rate: Number(item.avg_engagement_rate) || 0,
        total_impressions: item.total_impressions || 0,
        is_favorite: item.is_favorite || false,
        uploaded_at: item.uploaded_at || new Date().toISOString()
      }));

      setMedia(mappedMedia);
    } catch (error) {
      console.error('Error loading media:', error);
      toast.error('Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load folders from Supabase
  const loadFolders = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('media_folders')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;

      const mappedFolders: MediaFolder[] = (data || []).map(folder => ({
        id: folder.id,
        name: folder.name,
        color: folder.color || '#8B5CF6',
        icon: folder.icon || undefined,
        parent_folder_id: folder.parent_folder_id || undefined,
        item_count: folder.item_count || 0,
        total_size: Number(folder.total_size) || 0
      }));

      setFolders(mappedFolders);
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  }, [user]);

  useEffect(() => {
    loadMedia();
    loadFolders();
  }, [loadMedia, loadFolders]);

  // Calculate storage stats
  const totalStorage = useMemo(() => {
    return media.reduce((acc, item) => acc + item.file_size, 0);
  }, [media]);
  
  const maxStorage = 25 * 1024 * 1024 * 1024; // 25 GB
  const storagePercentage = (totalStorage / maxStorage) * 100;
  
  const mediaStats = useMemo(() => {
    return {
      images: media.filter(m => m.file_type === 'image').length,
      videos: media.filter(m => m.file_type === 'video').length,
      documents: media.filter(m => m.file_type === 'document').length,
      gifs: media.filter(m => m.file_type === 'gif').length
    };
  }, [media]);

  // Filter and sort media
  const filteredMedia = useMemo(() => {
    let result = [...media];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.filename.toLowerCase().includes(query) ||
        item.title?.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Folder filter
    if (selectedFolder === 'favorites') {
      result = result.filter(item => item.is_favorite);
    } else if (selectedFolder === 'unused') {
      result = result.filter(item => item.times_used === 0);
    } else if (selectedFolder === 'recent') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      result = result.filter(item => new Date(item.uploaded_at) >= thirtyDaysAgo);
    } else if (selectedFolder && selectedFolder !== 'all') {
      result = result.filter(item => item.folder_id === selectedFolder);
    }
    
    // Type filter
    if (selectedType !== 'all') {
      result = result.filter(item => item.file_type === selectedType);
    }
    
    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime());
        break;
      case 'name':
        result.sort((a, b) => a.filename.localeCompare(b.filename));
        break;
      case 'size':
        result.sort((a, b) => b.file_size - a.file_size);
        break;
      case 'used':
        result.sort((a, b) => b.times_used - a.times_used);
        break;
    }
    
    return result;
  }, [media, searchQuery, selectedFolder, selectedType, sortBy]);

  // Handlers
  const handleToggleFavorite = async (id: string) => {
    const item = media.find(m => m.id === id);
    if (!item) return;
    
    try {
      const { error } = await supabase
        .from('media_library')
        .update({ is_favorite: !item.is_favorite })
        .eq('id', id);

      if (error) throw error;

      setMedia(prev => prev.map(m => 
        m.id === id ? { ...m, is_favorite: !m.is_favorite } : m
      ));
      toast.success(item.is_favorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      console.error('Error updating favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const handleDeleteMedia = async (id: string) => {
    const item = media.find(m => m.id === id);
    if (!item) return;
    
    try {
      // Extract the file path from the storage URL
      const urlParts = item.storage_url.split('/media/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('media')
          .remove([filePath]);

        if (storageError) {
          console.warn('Storage delete error:', storageError);
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('media_library')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      setMedia(prev => prev.filter(m => m.id !== id));
      setSelectedItems(prev => prev.filter(itemId => itemId !== id));
      toast.success('Media deleted');
    } catch (error) {
      console.error('Error deleting media:', error);
      toast.error('Failed to delete media');
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard');
  };

  const handleSelectItem = (id: string, selected: boolean) => {
    if (selected) {
      setSelectedItems(prev => [...prev, id]);
    } else {
      setSelectedItems(prev => prev.filter(itemId => itemId !== id));
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredMedia.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredMedia.map(m => m.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    
    try {
      // Delete each selected item
      for (const id of selectedItems) {
        await handleDeleteMedia(id);
      }
      setSelectedItems([]);
      toast.success(`${selectedItems.length} items deleted`);
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete some items');
    }
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim() || !user) return;
    
    try {
      const { data, error } = await supabase
        .from('media_folders')
        .insert({
          user_id: user.id,
          name: folderName.trim(),
          color: folderColor,
          item_count: 0,
          total_size: 0
        })
        .select()
        .single();

      if (error) throw error;

      const newFolder: MediaFolder = {
        id: data.id,
        name: data.name,
        color: data.color || '#8B5CF6',
        item_count: data.item_count || 0,
        total_size: Number(data.total_size) || 0
      };
      
      setFolders(prev => [...prev, newFolder]);
      setFolderName('');
      setFolderColor('#8B5CF6');
      setFolderModalOpen(false);
      toast.success('Folder created');
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    }
  };

  const openMediaDetail = (item: MediaItem) => {
    setSelectedMedia(item);
    setDetailModalOpen(true);
  };

  const openEditor = (item: MediaItem) => {
    setSelectedMedia(item);
    setEditorBrightness(0);
    setEditorContrast(0);
    setEditorSaturation(0);
    setEditorRotation(0);
    setEditorFlipH(false);
    setEditorFlipV(false);
    setSelectedFilter('none');
    setEditorModalOpen(true);
  };

  // Download media file
  const handleDownload = async (item: MediaItem) => {
    try {
      toast.info('Starting download...');
      
      const response = await fetch(item.storage_url);
      if (!response.ok) throw new Error('Failed to fetch file');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = item.original_filename || item.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  // Save editor changes (applies CSS filters as metadata - for demo purposes)
  const handleSaveEditorChanges = async () => {
    if (!selectedMedia) return;
    
    setSavingChanges(true);
    try {
      // In a real app, you'd process the image server-side
      // For now, we store the edit settings as metadata
      const editSettings = {
        brightness: editorBrightness,
        contrast: editorContrast,
        saturation: editorSaturation,
        rotation: editorRotation,
        flipH: editorFlipH,
        flipV: editorFlipV,
        filter: selectedFilter
      };
      
      // Update media with description containing edit info
      const { error } = await supabase
        .from('media_library')
        .update({ 
          description: `Edited: ${JSON.stringify(editSettings)}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedMedia.id);

      if (error) throw error;

      toast.success('Changes saved successfully');
      setEditorModalOpen(false);
      loadMedia();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setSavingChanges(false);
    }
  };

  // Search stock images (using Picsum as a free placeholder - in production, use Unsplash/Pexels API)
  const searchStockImages = async (query: string) => {
    if (!query.trim()) {
      setStockImages([]);
      return;
    }
    
    setLoadingStock(true);
    try {
      // Using Lorem Picsum for demo - in production, integrate with Unsplash or Pexels API
      // This generates random images based on a seed from the search query
      const images = Array.from({ length: 12 }, (_, i) => ({
        id: `stock-${i}-${query}`,
        url: `https://picsum.photos/seed/${encodeURIComponent(query)}${i}/400/300`,
        downloadUrl: `https://picsum.photos/seed/${encodeURIComponent(query)}${i}/1920/1080`,
        author: `Photographer ${i + 1}`,
        description: `${query} - Stock image ${i + 1}`
      }));
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setStockImages(images);
    } catch (error) {
      console.error('Stock search error:', error);
      toast.error('Failed to search stock images');
    } finally {
      setLoadingStock(false);
    }
  };

  // Import stock image to library
  const handleImportStockImage = async (stockImage: any) => {
    if (!user) return;
    
    try {
      toast.info('Importing image...');
      
      // Fetch the image
      const response = await fetch(stockImage.downloadUrl);
      const blob = await response.blob();
      
      // Generate filename
      const filename = `stock_${Date.now()}.jpg`;
      const filePath = `${user.id}/${filename}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      // Add to media library
      const { error: dbError } = await supabase
        .from('media_library')
        .insert({
          user_id: user.id,
          filename: filename,
          original_filename: filename,
          file_type: 'image',
          mime_type: 'image/jpeg',
          file_size: blob.size,
          storage_url: publicUrl,
          title: stockImage.description,
          tags: ['stock', 'imported'],
          is_favorite: false,
          times_used: 0
        });

      if (dbError) throw dbError;

      toast.success('Image imported to library');
      loadMedia();
      setStockModalOpen(false);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import image');
    }
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      case 'gif': return <GalleryHorizontalEnd className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getFileTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      image: 'bg-blue-500/20 text-blue-400',
      video: 'bg-purple-500/20 text-purple-400',
      document: 'bg-orange-500/20 text-orange-400',
      gif: 'bg-green-500/20 text-green-400'
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  const getEditorFilterStyle = () => {
    let filters = [];
    if (editorBrightness !== 0) filters.push(`brightness(${100 + editorBrightness}%)`);
    if (editorContrast !== 0) filters.push(`contrast(${100 + editorContrast}%)`);
    if (editorSaturation !== 0) filters.push(`saturate(${100 + editorSaturation}%)`);
    
    switch (selectedFilter) {
      case 'grayscale': filters.push('grayscale(100%)'); break;
      case 'sepia': filters.push('sepia(100%)'); break;
      case 'vintage': filters.push('sepia(50%) contrast(90%)'); break;
      case 'cool': filters.push('hue-rotate(180deg) saturate(80%)'); break;
      case 'warm': filters.push('hue-rotate(-30deg) saturate(120%)'); break;
    }
    
    const transforms = [];
    if (editorRotation !== 0) transforms.push(`rotate(${editorRotation}deg)`);
    if (editorFlipH) transforms.push('scaleX(-1)');
    if (editorFlipV) transforms.push('scaleY(-1)');
    
    return {
      filter: filters.join(' ') || 'none',
      transform: transforms.join(' ') || 'none'
    };
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/ai-strategist')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Media Library</h1>
                <p className="text-muted-foreground text-sm">Manage your images, videos, and media assets</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => setUploadModalOpen(true)}
                
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium">{media.length} items</span>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Storage:</span>
              <span className="font-medium">{formatFileSize(totalStorage)} / 25 GB</span>
              <Progress value={storagePercentage} className="w-24 h-2" />
            </div>
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1">
                <Image className="w-4 h-4" /> {mediaStats.images}
              </span>
              <span className="flex items-center gap-1">
                <Video className="w-4 h-4" /> {mediaStats.videos}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" /> {mediaStats.documents}
              </span>
              <span className="flex items-center gap-1">
                <GalleryHorizontalEnd className="w-4 h-4" /> {mediaStats.gifs}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex">
        {/* Sidebar */}
        <div className="w-64 border-r border-border p-4 sticky top-[120px] h-[calc(100vh-120px)] overflow-y-auto">
          {/* Quick Actions */}
          <div className="mb-6">
            <Button 
              onClick={() => setUploadModalOpen(true)}
              className="w-full mb-2"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Media
            </Button>
            <Button 
              variant="outline"
              className="w-full border-border hover:bg-muted"
              onClick={() => setStockModalOpen(true)}
            >
              <Camera className="w-4 h-4 mr-2" />
              Browse Stock Images
            </Button>
          </div>

          {/* Quick Filters */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Filters</h3>
            <div className="space-y-1">
              <Button
                variant="ghost"
                className={`w-full justify-start ${selectedFolder === 'all' || !selectedFolder ? 'bg-muted' : ''}`}
                onClick={() => setSelectedFolder('all')}
              >
                <Grid3X3 className="w-4 h-4 mr-2" />
                All Media
                <span className="ml-auto text-muted-foreground">{media.length}</span>
              </Button>
              <Button
                variant="ghost"
                className={`w-full justify-start ${selectedFolder === 'recent' ? 'bg-muted' : ''}`}
                onClick={() => setSelectedFolder('recent')}
              >
                <Clock className="w-4 h-4 mr-2" />
                Recent
              </Button>
              <Button
                variant="ghost"
                className={`w-full justify-start ${selectedFolder === 'favorites' ? 'bg-muted' : ''}`}
                onClick={() => setSelectedFolder('favorites')}
              >
                <Star className="w-4 h-4 mr-2" />
                Favorites
                <span className="ml-auto text-muted-foreground">{media.filter(m => m.is_favorite).length}</span>
              </Button>
              <Button
                variant="ghost"
                className={`w-full justify-start ${selectedFolder === 'unused' ? 'bg-muted' : ''}`}
                onClick={() => setSelectedFolder('unused')}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Unused
                <span className="ml-auto text-muted-foreground">{media.filter(m => m.times_used === 0).length}</span>
              </Button>
            </div>
          </div>

          {/* Folders */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">Folders</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setFolderModalOpen(true)}
                className="h-6 w-6 p-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-1">
              {folders.map(folder => (
                <Button
                  key={folder.id}
                  variant="ghost"
                  className={`w-full justify-start ${selectedFolder === folder.id ? 'bg-muted' : ''}`}
                  onClick={() => setSelectedFolder(folder.id)}
                >
                  <Folder className="w-4 h-4 mr-2" style={{ color: folder.color }} />
                  <span className="truncate">{folder.name}</span>
                  <span className="ml-auto text-muted-foreground text-xs">{folder.item_count}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* File Types */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">File Types</h3>
            <div className="space-y-1">
              {[
                { type: 'all', label: 'All Types', count: media.length },
                { type: 'image', label: 'Images', count: mediaStats.images },
                { type: 'video', label: 'Videos', count: mediaStats.videos },
                { type: 'document', label: 'Documents', count: mediaStats.documents },
                { type: 'gif', label: 'GIFs', count: mediaStats.gifs }
              ].map(item => (
                <Button
                  key={item.type}
                  variant="ghost"
                  className={`w-full justify-start ${selectedType === item.type ? 'bg-muted' : ''}`}
                  onClick={() => setSelectedType(item.type)}
                >
                  {item.type !== 'all' && getFileTypeIcon(item.type)}
                  {item.type === 'all' && <Grid3X3 className="w-4 h-4" />}
                  <span className="ml-2">{item.label}</span>
                  <span className="ml-auto text-muted-foreground">{item.count}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Toolbar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search media..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card border-border"
              />
            </div>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 bg-card border-border">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="size">Largest First</SelectItem>
                <SelectItem value="used">Most Used</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border border-border rounded-lg overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-none ${viewMode === 'grid' ? 'bg-muted' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-none ${viewMode === 'list' ? 'bg-muted' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            
            {selectedItems.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedItems.length === filteredMedia.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredMedia.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Image className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No media found</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery ? 'Try a different search term' : 'Upload your first file to get started'}
              </p>
              <Button 
                onClick={() => setUploadModalOpen(true)}
                
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Media
              </Button>
            </div>
          )}

          {/* Media Grid */}
          {!loading && filteredMedia.length > 0 && viewMode === 'grid' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredMedia.map(item => (
                <div
                  key={item.id}
                  className={`group relative bg-card rounded-lg overflow-hidden border ${
                    selectedItems.includes(item.id) ? 'border-primary' : 'border-border'
                  } hover:border-border transition-all`}
                >
                  {/* Thumbnail */}
                  <div 
                    className="aspect-square relative cursor-pointer"
                    onClick={() => openMediaDetail(item)}
                  >
                    {item.file_type === 'image' || item.file_type === 'gif' ? (
                      <img
                        src={item.thumbnail_url || item.storage_url}
                        alt={item.title || item.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : item.file_type === 'video' ? (
                      <div className="w-full h-full bg-muted flex items-center justify-center relative">
                        {item.thumbnail_url ? (
                          <img
                            src={item.thumbnail_url}
                            alt={item.title || item.filename}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Video className="w-12 h-12 text-muted-foreground" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="w-12 h-12 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <FileText className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Type Badge */}
                    <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium ${getFileTypeBadge(item.file_type)}`}>
                      {item.file_type.toUpperCase()}
                    </div>
                    
                    {/* Selection Checkbox */}
                    <div 
                      className={`absolute top-2 right-2 ${selectedItems.includes(item.id) || 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                        className="bg-card/80 border-border"
                      />
                    </div>
                    
                    {/* Favorite */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(item.id);
                      }}
                      className={`absolute bottom-2 right-2 p-1 rounded ${
                        item.is_favorite ? 'text-primary' : 'text-white/60 opacity-0 group-hover:opacity-100'
                      } hover:text-yellow-400 transition-all`}
                    >
                      <Star className={`w-4 h-4 ${item.is_favorite ? 'fill-current' : ''}`} />
                    </button>
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="bg-white/10 hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMediaDetail(item);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {item.file_type === 'image' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="bg-white/10 hover:bg-white/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditor(item);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="bg-white/10 hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyUrl(item.storage_url);
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div className="p-3">
                    <p className="text-sm font-medium truncate">{item.title || item.filename}</p>
                    <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                      <span>{formatFileSize(item.file_size)}</span>
                      <span>Used {item.times_used}x</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Media List View */}
          {!loading && filteredMedia.length > 0 && viewMode === 'list' && (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="w-10 p-3">
                      <Checkbox
                        checked={selectedItems.length === filteredMedia.length && filteredMedia.length > 0}
                        onCheckedChange={() => handleSelectAll()}
                      />
                    </th>
                    <th className="w-16 p-3"></th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Size</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Used</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Uploaded</th>
                    <th className="w-10 p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMedia.map(item => (
                    <tr 
                      key={item.id} 
                      className="border-t border-border hover:bg-muted/50 cursor-pointer"
                      onClick={() => openMediaDetail(item)}
                    >
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                        />
                      </td>
                      <td className="p-3">
                        <div className="w-10 h-10 rounded bg-muted overflow-hidden">
                          {item.thumbnail_url ? (
                            <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {getFileTypeIcon(item.file_type)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {item.is_favorite && <Star className="w-4 h-4 text-yellow-400 fill-current" />}
                          <span className="truncate max-w-[200px]">{item.title || item.filename}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className={getFileTypeBadge(item.file_type)}>
                          {item.file_type}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{formatFileSize(item.file_size)}</td>
                      <td className="p-3 text-muted-foreground">{item.times_used}x</td>
                      <td className="p-3 text-muted-foreground">{formatDate(item.uploaded_at)}</td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openMediaDetail(item)}>
                              <Eye className="w-4 h-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            {item.file_type === 'image' && (
                              <DropdownMenuItem onClick={() => openEditor(item)}>
                                <Edit2 className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleCopyUrl(item.storage_url)}>
                              <Copy className="w-4 h-4 mr-2" /> Copy URL
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleFavorite(item.id)}>
                              <Star className="w-4 h-4 mr-2" /> {item.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteMedia(item.id)}
                              className="text-red-400"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredMedia.length === 0 && (
            <div className="text-center py-16">
              <Image className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No media found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Try adjusting your search or filters' : 'Upload your first media to get started'}
              </p>
              <Button onClick={() => setUploadModalOpen(true)} >
                <Upload className="w-4 h-4 mr-2" />
                Upload Media
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-muted border border-border rounded-lg px-4 py-3 flex items-center gap-4 shadow-xl z-50">
          <span className="text-sm">{selectedItems.length} items selected</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost">
              <Folder className="w-4 h-4 mr-2" /> Move
            </Button>
            <Button size="sm" variant="ghost">
              <Star className="w-4 h-4 mr-2" /> Favorite
            </Button>
            <Button size="sm" variant="ghost">
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={handleBulkDelete}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setSelectedItems([])}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Upload Media</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <MediaUploader 
              onMediaAdded={() => {
                loadMedia();
              }}
              onUploadComplete={() => {
                // Keep modal open to show completion
              }}
              maxSizeMB={100}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadModalOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Media Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-4xl bg-card border-border max-h-[90vh] overflow-hidden">
          {selectedMedia && (
            <div className="flex gap-6">
              {/* Preview */}
              <div className="flex-1 bg-muted rounded-lg overflow-hidden flex items-center justify-center min-h-[400px]">
                {selectedMedia.file_type === 'image' || selectedMedia.file_type === 'gif' ? (
                  <img
                    src={selectedMedia.storage_url}
                    alt={selectedMedia.title || selectedMedia.filename}
                    className="max-w-full max-h-[500px] object-contain"
                  />
                ) : selectedMedia.file_type === 'video' ? (
                  <video 
                    src={selectedMedia.storage_url}
                    controls
                    className="max-w-full max-h-[500px]"
                  />
                ) : (
                  <div className="text-center">
                    <FileText className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{selectedMedia.filename}</p>
                  </div>
                )}
              </div>
              
              {/* Details */}
              <div className="w-80 overflow-y-auto max-h-[70vh]">
                <h3 className="font-semibold text-lg mb-4">{selectedMedia.title || selectedMedia.filename}</h3>
                
                <div className="space-y-4">
                  {/* File Info */}
                  <div className="bg-muted rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Type</span>
                      <Badge className={getFileTypeBadge(selectedMedia.file_type)}>
                        {selectedMedia.file_type}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Size</span>
                      <span>{formatFileSize(selectedMedia.file_size)}</span>
                    </div>
                    {selectedMedia.width && selectedMedia.height && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Dimensions</span>
                        <span>{selectedMedia.width} × {selectedMedia.height}</span>
                      </div>
                    )}
                    {selectedMedia.duration && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Duration</span>
                        <span>{selectedMedia.duration}s</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Uploaded</span>
                      <span>{formatDate(selectedMedia.uploaded_at)}</span>
                    </div>
                  </div>
                  
                  {/* Usage Stats */}
                  <div className="bg-muted rounded-lg p-4 space-y-2">
                    <h4 className="font-medium mb-2">Usage & Performance</h4>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Times Used</span>
                      <span>{selectedMedia.times_used}</span>
                    </div>
                    {selectedMedia.times_used > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Avg. Engagement</span>
                          <span>{selectedMedia.avg_engagement_rate}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Impressions</span>
                          <span>{selectedMedia.total_impressions.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Tags */}
                  {selectedMedia.tags.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedMedia.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="bg-muted">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="pt-4 space-y-2">
                    <Button 
                      className="w-full"
                      onClick={() => handleCopyUrl(selectedMedia.storage_url)}
                    >
                      <Copy className="w-4 h-4 mr-2" /> Copy URL
                    </Button>
                    {selectedMedia.file_type === 'image' && (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setDetailModalOpen(false);
                          openEditor(selectedMedia);
                        }}
                      >
                        <Edit2 className="w-4 h-4 mr-2" /> Edit Image
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleDownload(selectedMedia)}
                    >
                      <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full text-red-400 hover:text-red-300 border-red-900 hover:border-red-800"
                      onClick={() => {
                        handleDeleteMedia(selectedMedia.id);
                        setDetailModalOpen(false);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Editor Modal */}
      <Dialog open={editorModalOpen} onOpenChange={setEditorModalOpen}>
        <DialogContent className="max-w-5xl bg-card border-border max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Image</DialogTitle>
          </DialogHeader>
          
          {selectedMedia && (
            <div className="flex gap-6">
              {/* Preview */}
              <div className="flex-1 bg-muted rounded-lg overflow-hidden flex items-center justify-center min-h-[400px]">
                <img
                  src={selectedMedia.storage_url}
                  alt={selectedMedia.title || selectedMedia.filename}
                  className="max-w-full max-h-[400px] object-contain transition-all"
                  style={getEditorFilterStyle()}
                />
              </div>
              
              {/* Editor Controls */}
              <div className="w-72 space-y-6">
                {/* Quick Actions */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Transform</h4>
                  <div className="grid grid-cols-4 gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setEditorRotation(r => r - 90)}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setEditorRotation(r => r + 90)}
                    >
                      <RotateCw className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setEditorFlipH(f => !f)}
                      className={editorFlipH ? 'border-primary bg-primary/10' : ''}
                    >
                      <FlipHorizontal className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setEditorFlipV(f => !f)}
                      className={editorFlipV ? 'border-primary bg-primary/10' : ''}
                    >
                      <FlipVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Adjustments */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Adjustments</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Brightness</span>
                        <span>{editorBrightness}</span>
                      </div>
                      <Slider
                        value={[editorBrightness]}
                        onValueChange={([v]) => setEditorBrightness(v)}
                        min={-100}
                        max={100}
                        step={1}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Contrast</span>
                        <span>{editorContrast}</span>
                      </div>
                      <Slider
                        value={[editorContrast]}
                        onValueChange={([v]) => setEditorContrast(v)}
                        min={-100}
                        max={100}
                        step={1}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Saturation</span>
                        <span>{editorSaturation}</span>
                      </div>
                      <Slider
                        value={[editorSaturation]}
                        onValueChange={([v]) => setEditorSaturation(v)}
                        min={-100}
                        max={100}
                        step={1}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Filters */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Filters</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {['none', 'grayscale', 'sepia', 'vintage', 'cool', 'warm'].map(filter => (
                      <button
                        key={filter}
                        className={`p-2 rounded border text-xs capitalize ${
                          selectedFilter === filter 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-border'
                        }`}
                        onClick={() => setSelectedFilter(filter)}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="pt-4 space-y-2">
                  <Button 
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      setEditorBrightness(0);
                      setEditorContrast(0);
                      setEditorSaturation(0);
                      setEditorRotation(0);
                      setEditorFlipH(false);
                      setEditorFlipV(false);
                      setSelectedFilter('none');
                    }}
                  >
                    Reset
                  </Button>
                  <Button 
                    className="w-full"
                    onClick={handleSaveEditorChanges}
                    disabled={savingChanges}
                  >
                    {savingChanges ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" /> Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Folder Modal */}
      <Dialog open={folderModalOpen} onOpenChange={setFolderModalOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Folder Name</Label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="e.g., Product Photos"
                className="mt-1.5 bg-muted border-border"
              />
            </div>
            
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1.5">
                {['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'].map(color => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      folderColor === color ? 'border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFolderColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              
              onClick={handleCreateFolder}
              disabled={!folderName.trim()}
            >
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Images Modal */}
      <Dialog open={stockModalOpen} onOpenChange={setStockModalOpen}>
        <DialogContent className="max-w-4xl bg-card border-border max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Browse Stock Images</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search for images (e.g., nature, business, technology)..."
                value={stockSearchQuery}
                onChange={(e) => setStockSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchStockImages(stockSearchQuery)}
                className="pl-10 bg-muted border-border"
              />
              <Button 
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => searchStockImages(stockSearchQuery)}
                disabled={loadingStock}
              >
                {loadingStock ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </Button>
            </div>

            {/* Quick Categories */}
            <div className="flex flex-wrap gap-2">
              {['Nature', 'Business', 'Technology', 'People', 'Abstract', 'Food', 'Travel'].map(cat => (
                <Button
                  key={cat}
                  size="sm"
                  variant="outline"
                  className="border-border hover:bg-muted"
                  onClick={() => {
                    setStockSearchQuery(cat);
                    searchStockImages(cat);
                  }}
                >
                  {cat}
                </Button>
              ))}
            </div>

            {/* Results */}
            <div className="max-h-[50vh] overflow-y-auto">
              {loadingStock ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : stockImages.length > 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {stockImages.map(img => (
                    <div
                      key={img.id}
                      className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border hover:border-primary transition-colors cursor-pointer group"
                      onClick={() => handleImportStockImage(img)}
                    >
                      <img
                        src={img.url}
                        alt={img.description}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button size="sm" >
                          <Plus className="w-4 h-4 mr-1" /> Import
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : stockSearchQuery ? (
                <div className="text-center py-12">
                  <Image className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No images found. Try a different search term.</p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Search for stock images to import into your library</p>
                  <p className="text-muted-foreground text-sm mt-1">Try: "nature", "office", "technology"</p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MediaLibrary;
