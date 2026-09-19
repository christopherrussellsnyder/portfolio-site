import React, { useState } from 'react';
import { Check, ChevronDown, Plus, Building2, Lock } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';

interface Props {
  compact?: boolean;
  className?: string;
}

export function WorkspaceSwitcher({ compact = false, className = '' }: Props) {
  const {
    workspaces,
    activeWorkspace,
    switchWorkspace,
    createWorkspace,
    canCreateMore,
    workspaceLimit,
  } = useWorkspace();
  const { tier, subscribed } = useSubscription();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const isAgency = subscribed && tier === 'agency';

  if (!activeWorkspace) return null;

  const handleCreate = async () => {
    setCreating(true);
    const ws = await createWorkspace(newName);
    setCreating(false);
    if (ws) {
      setNewName('');
      setDialogOpen(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={`h-9 gap-2 px-3 border border-border bg-muted hover:bg-card text-white ${className}`}
          >
            <Building2 className="h-4 w-4 text-primary" />
            {!compact && (
              <span className="text-sm font-medium truncate max-w-[160px]">
                {activeWorkspace.name}
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 bg-muted border-border">
          <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
            Your Workspaces ({workspaces.length}/{workspaceLimit === 999 ? '∞' : workspaceLimit})
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border" />
          {workspaces.map((w) => (
            <DropdownMenuItem
              key={w.id}
              onClick={() => switchWorkspace(w.id)}
              className="cursor-pointer text-white hover:bg-card focus:bg-card"
            >
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="flex-1 truncate">{w.name}</span>
              {w.id === activeWorkspace.id && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="bg-border" />
          {canCreateMore ? (
            <DropdownMenuItem
              onClick={() => setDialogOpen(true)}
              className="cursor-pointer text-white hover:bg-card focus:bg-card"
            >
              <Plus className="h-4 w-4 mr-2 text-primary" />
              New workspace
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => navigate('/pricing')}
              className="cursor-pointer text-muted-foreground hover:bg-card focus:bg-card"
            >
              <Lock className="h-4 w-4 mr-2" />
              {isAgency ? 'Workspace limit reached' : 'Upgrade to Agency for multiple brands'}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => navigate('/settings?tab=workspaces')}
            className="cursor-pointer text-muted-foreground hover:bg-card focus:bg-card"
          >
            Manage workspaces
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-muted border-border text-white">
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Each workspace has its own business context, strategies, and content library.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="ws-name">Workspace name</Label>
            <Input
              id="ws-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Client Coffee Shop"
              className="bg-background border-border"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) handleCreate();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="bg-primary hover:bg-[hsl(var(--primary-dark))]"
            >
              {creating ? 'Creating…' : 'Create workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
