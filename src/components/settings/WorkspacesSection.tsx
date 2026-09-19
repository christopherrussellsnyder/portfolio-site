import React, { useState } from 'react';
import { Building2, Plus, Trash2, Pencil, Check, X, Lock, Star } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export function WorkspacesSection() {
  const {
    workspaces,
    activeWorkspaceId,
    workspaceLimit,
    canCreateMore,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
    switchWorkspace,
  } = useWorkspace();
  const { tier, subscribed } = useSubscription();
  const navigate = useNavigate();

  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const isAgency = subscribed && tier === 'agency';
  const limitLabel = workspaceLimit === 999 ? '∞' : workspaceLimit;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const ws = await createWorkspace(newName);
    setCreating(false);
    if (ws) setNewName('');
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const saveEdit = async () => {
    if (editingId && editName.trim()) {
      await renameWorkspace(editingId, editName);
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Workspaces</h2>
        <p className="text-sm text-muted-foreground">
          Manage separate brands or clients. Each workspace has its own business context, strategies, and analytics.
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Your Workspaces</CardTitle>
              <CardDescription>
                {workspaces.length} of {limitLabel} used
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-primary text-primary">
              {isAgency ? 'Agency plan' : subscribed ? 'Pro plan' : 'Starter plan'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {workspaces.map((w) => {
            const isEditing = editingId === w.id;
            const isActive = w.id === activeWorkspaceId;
            return (
              <div
                key={w.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  isActive ? 'border-primary bg-[hsl(var(--primary)/0.05)]' : 'border-border bg-background/50'
                }`}
              >
                <Building2 className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                {isEditing ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 h-9"
                    autoFocus
                  />
                ) : (
                  <div className="flex-1 flex items-center gap-2">
                    <span className="font-medium text-foreground">{w.name}</span>
                    {w.is_default && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Star className="h-3 w-3" /> Default
                      </Badge>
                    )}
                    {isActive && <Badge className="text-xs bg-primary">Active</Badge>}
                  </div>
                )}

                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <>
                      <Button aria-label="Save workspace name" size="icon" variant="ghost" onClick={saveEdit}>
                        <Check className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button aria-label="Cancel editing" size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {!isActive && (
                        <Button size="sm" variant="outline" onClick={() => switchWorkspace(w.id)}>
                          Switch
                        </Button>
                      )}
                      <Button aria-label="Rename workspace" size="icon" variant="ghost" onClick={() => startEdit(w.id, w.name)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!w.is_default && workspaces.length > 1 && (
                        <Button aria-label="Delete workspace"
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Delete workspace "${w.name}"? This will permanently remove all its data.`)) {
                              deleteWorkspace(w.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> Add a workspace
          </CardTitle>
          <CardDescription>
            {canCreateMore
              ? 'Create a new workspace for another brand or client.'
              : isAgency
              ? `You've reached the ${workspaceLimit}-workspace limit for the Agency plan.`
              : 'Multiple workspaces are an Agency-tier feature.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canCreateMore ? (
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Client Coffee Shop"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <Button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="bg-primary hover:bg-[hsl(var(--primary-dark))]"
              >
                {creating ? 'Creating…' : 'Create'}
              </Button>
            </div>
          ) : (
            <Button onClick={() => navigate('/pricing')} className="bg-primary hover:bg-[hsl(var(--primary-dark))]">
              <Lock className="h-4 w-4 mr-2" /> Upgrade to Agency
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
