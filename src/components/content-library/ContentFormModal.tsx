import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ContentItem, ContentFolder } from '@/pages/ContentLibrary';

interface ContentFormModalProps {
  content: ContentItem | null;
  folders: ContentFolder[];
  onClose: () => void;
  onSave: (data: any) => void;
}

const PLATFORMS = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube', 'multi'];
const CATEGORIES = ['product_launch', 'promotion', 'educational', 'announcement', 'engagement', 'testimonial'];
const CONTENT_TYPES = ['text', 'image', 'video', 'carousel', 'story'];
const TONES = ['professional', 'casual', 'humorous', 'inspirational', 'urgent', 'friendly'];

export default function ContentFormModal({ content, folders, onClose, onSave }: ContentFormModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    content_text: '',
    content_type: 'text',
    platform: '',
    category: '',
    tone: '',
    tags: [] as string[],
    hashtags: [] as string[],
    is_template: false,
    is_favorite: false,
    folder_id: null as string | null,
    generated_content: ''
  });
  const [tagInput, setTagInput] = useState('');
  const [hashtagInput, setHashtagInput] = useState('');

  useEffect(() => {
    if (content) {
      setFormData({
        title: content.title || '',
        content_text: content.content_text || '',
        content_type: content.content_type || 'text',
        platform: content.platform || '',
        category: content.category || '',
        tone: content.tone || '',
        tags: content.tags || [],
        hashtags: content.hashtags || [],
        is_template: content.is_template || false,
        is_favorite: content.is_favorite || false,
        folder_id: content.folder_id,
        generated_content: content.generated_content || ''
      });
    }
  }, [content]);

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleAddHashtag = () => {
    const cleaned = hashtagInput.trim().replace(/^#/, '');
    if (cleaned && !formData.hashtags.includes(cleaned)) {
      setFormData(prev => ({ ...prev, hashtags: [...prev.hashtags, cleaned] }));
      setHashtagInput('');
    }
  };

  const handleRemoveHashtag = (tag: string) => {
    setFormData(prev => ({ ...prev, hashtags: prev.hashtags.filter(t => t !== tag) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      generated_content: formData.content_text || formData.generated_content
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close form" className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            {content ? 'Edit Content' : 'Add Content'}
          </h2>
          <Button aria-label="Close" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Give your content a name"
                className="bg-secondary border-border"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Content *</label>
              <Textarea
                value={formData.content_text}
                onChange={(e) => setFormData(prev => ({ ...prev, content_text: e.target.value }))}
                placeholder="Your content text..."
                rows={5}
                className="bg-secondary border-border resize-none"
                required
              />
            </div>

            {/* Platform and Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Platform</label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-foreground"
                >
                  <option value="">Select platform</option>
                  {PLATFORMS.map(p => (
                    <option key={p} value={p} className="capitalize">{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Content Type</label>
                <select
                  value={formData.content_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, content_type: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-foreground"
                >
                  {CONTENT_TYPES.map(t => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category and Tone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-foreground"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tone</label>
                <select
                  value={formData.tone}
                  onChange={(e) => setFormData(prev => ({ ...prev, tone: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-foreground"
                >
                  <option value="">Select tone</option>
                  {TONES.map(t => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Folder */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Folder</label>
              <select
                value={formData.folder_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, folder_id: e.target.value || null }))}
                className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-foreground"
              >
                <option value="">No folder</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Tags</label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add a tag"
                  className="bg-secondary border-border"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, i) => (
                    <span key={i} className="text-sm px-3 py-1 rounded-full bg-primary/20 text-primary flex items-center gap-1">
                      {tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Hashtags */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Hashtags</label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  placeholder="Add hashtag"
                  className="bg-secondary border-border"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddHashtag())}
                />
                <Button type="button" variant="outline" onClick={handleAddHashtag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.hashtags.map((tag, i) => (
                    <span key={i} className="text-sm px-3 py-1 rounded-full bg-secondary text-foreground flex items-center gap-1">
                      #{tag}
                      <button type="button" onClick={() => handleRemoveHashtag(tag)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_template}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_template: e.target.checked }))}
                  className="w-4 h-4 rounded border-border bg-secondary text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">Save as template</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_favorite}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_favorite: e.target.checked }))}
                  className="w-4 h-4 rounded border-border bg-secondary text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">Add to favorites</span>
              </label>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>
            {content ? 'Update' : 'Save Content'}
          </Button>
        </div>
      </div>
    </div>
  );
}
