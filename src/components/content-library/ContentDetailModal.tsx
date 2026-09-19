import { X, Copy, Edit, Calendar, Tag, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ContentItem } from '@/pages/ContentLibrary';

interface ContentDetailModalProps {
  content: ContentItem;
  onClose: () => void;
  onEdit: () => void;
  onCopy: () => void;
}

export default function ContentDetailModal({ content, onClose, onEdit, onCopy }: ContentDetailModalProps) {
  const displayContent = content.content_text || content.generated_content || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close details" className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-foreground">{content.title || 'Untitled Content'}</h2>
            {content.is_favorite && <Star className="h-5 w-5 fill-amber-500 text-amber-500" />}
          </div>
          <Button aria-label="Close" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Metadata */}
          <div className="flex flex-wrap gap-2 mb-4">
            {content.platform && (
              <span className="text-sm px-3 py-1 rounded-full bg-primary/20 text-primary capitalize">
                {content.platform}
              </span>
            )}
            {content.content_type && (
              <span className="text-sm px-3 py-1 rounded-full bg-secondary text-foreground capitalize">
                {content.content_type}
              </span>
            )}
            {content.category && (
              <span className="text-sm px-3 py-1 rounded-full bg-secondary text-foreground capitalize">
                {content.category.replace('_', ' ')}
              </span>
            )}
            {content.tone && (
              <span className="text-sm px-3 py-1 rounded-full bg-secondary text-foreground capitalize">
                {content.tone}
              </span>
            )}
            {content.is_template && (
              <span className="text-sm px-3 py-1 rounded-full bg-amber-500/20 text-amber-400">
                Template
              </span>
            )}
          </div>

          {/* Main content */}
          <div className="bg-secondary/50 rounded-xl p-4 mb-6">
            <p className="text-foreground whitespace-pre-wrap">{displayContent}</p>
          </div>

          {/* Hashtags */}
          {content.hashtags && content.hashtags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Tag className="h-4 w-4" /> Hashtags
              </h3>
              <div className="flex flex-wrap gap-2">
                {content.hashtags.map((tag, i) => (
                  <span key={i} className="text-sm px-3 py-1 rounded-full bg-secondary text-foreground">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {content.tags && content.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {content.tags.map((tag, i) => (
                  <span key={i} className="text-sm px-3 py-1 rounded-full bg-primary/10 text-primary">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-secondary/30 rounded-xl">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{content.times_used || 0}</p>
              <p className="text-sm text-muted-foreground">Times Used</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{content.performance_score || '-'}</p>
              <p className="text-sm text-muted-foreground">Performance</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground flex items-center justify-center gap-1">
                <Calendar className="h-4 w-4" />
                {content.created_at && new Date(content.created_at).toLocaleDateString()}
              </p>
              <p className="text-sm text-muted-foreground">Created</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
}
