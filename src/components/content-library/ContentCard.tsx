import { Star, Copy, Edit, Trash2, Eye, MoreVertical, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ContentItem } from '@/pages/ContentLibrary';

interface ContentCardProps {
  item: ContentItem;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onCopy: () => void;
}

const platformColors: Record<string, string> = {
  facebook: 'bg-blue-500/20 text-blue-400',
  instagram: 'bg-pink-500/20 text-pink-400',
  twitter: 'bg-sky-500/20 text-sky-400',
  linkedin: 'bg-blue-600/20 text-blue-300',
  tiktok: 'bg-fuchsia-500/20 text-fuchsia-400',
  youtube: 'bg-red-500/20 text-red-400',
  multi: 'bg-primary/20 text-primary',
};

export default function ContentCard({ item, onView, onEdit, onDuplicate, onDelete, onToggleFavorite, onCopy }: ContentCardProps) {
  const displayContent = item.content_text || item.generated_content || '';
  const truncatedContent = displayContent.length > 150 ? displayContent.slice(0, 150) + '...' : displayContent;

  return (
    <div className="group bg-card rounded-xl border border-border hover:border-primary/50 transition-all duration-200 overflow-hidden">
      {/* Content preview */}
      <div
        role="button"
        tabIndex={0}
        className="p-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
        onClick={onView}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onView();
          }
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground truncate">{item.title || 'Untitled'}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {item.platform && (
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${platformColors[item.platform] || 'bg-secondary text-foreground'}`}>
                  {item.platform}
                </span>
              )}
              {item.is_template && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Template
                </span>
              )}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className="p-1 hover:bg-secondary rounded-lg transition-colors"
          >
            <Star className={`h-4 w-4 ${item.is_favorite ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`} />
          </button>
        </div>

        {/* Content text */}
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {truncatedContent}
        </p>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                #{tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                +{item.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {item.times_used !== null && item.times_used > 0 && (
            <span>Used {item.times_used}x</span>
          )}
          {item.performance_score !== null && item.performance_score > 0 && (
            <span>Score: {item.performance_score}</span>
          )}
          <span className="ml-auto">
            {item.created_at && new Date(item.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-secondary/30 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1">
          <Button aria-label="View content" variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onView(); }}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button aria-label="Edit content" variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button aria-label="Copy content" variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onCopy(); }}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button aria-label="More options" variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
            <MoreVertical className="h-4 w-4" />
          </Button>
          <Button aria-label="Delete content" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
