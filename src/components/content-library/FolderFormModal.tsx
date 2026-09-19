import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FolderFormModalProps {
  onClose: () => void;
  onSave: (name: string, color: string, icon: string) => void;
}

const COLORS = [
  '#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6'
];

const ICONS = ['📁', '📂', '📋', '📝', '💡', '🎯', '🚀', '⭐', '💎', '🔥', '📊', '🎨'];

export default function FolderFormModal({ onClose, onSave }: FolderFormModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState(ICONS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), color, icon);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close form" className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl border border-border w-full max-w-md overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Create Folder</h2>
          <Button aria-label="Close" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Folder Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Product Launches"
              className="bg-secondary border-border"
              required
              autoFocus
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                    icon === i ? 'bg-primary ring-2 ring-primary ring-offset-2 ring-offset-card' : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-card' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-secondary/50 rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-2">Preview</p>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-card">
              <span className="text-lg">{icon}</span>
              <span className="text-foreground font-medium" style={{ color }}>{name || 'Folder Name'}</span>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>Create Folder</Button>
        </div>
      </div>
    </div>
  );
}
