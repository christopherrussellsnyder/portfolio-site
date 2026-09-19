import { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Trash2, Mail, Copy, Loader2, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const FOUNDER_EMAIL = 'chrissnyder3456@gmail.com';
const SEAT_LIMIT = 10;

interface Member {
  user_id: string;
  role: string;
  email?: string;
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export function TeamMembersSection() {
  const { user } = useAuth();
  const { activeWorkspace, activeWorkspaceId } = useWorkspace();
  const { tier, subscribed } = useSubscription();
  const isFounder = user?.email?.toLowerCase() === FOUNDER_EMAIL;
  const isAgency = isFounder || (subscribed && tier === 'agency');

  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'manager'>('viewer');

  const isOwner = activeWorkspace?.owner_id === user?.id;

  const load = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setLoading(true);
    const [{ data: mems }, { data: invs }] = await Promise.all([
      supabase
        .from('workspace_members')
        .select('user_id, role, created_at')
        .eq('workspace_id', activeWorkspaceId),
      supabase
        .from('workspace_invitations')
        .select('*')
        .eq('workspace_id', activeWorkspaceId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);
    setMembers((mems || []) as Member[]);
    setInvitations((invs || []) as Invitation[]);
    setLoading(false);
  }, [activeWorkspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-workspace-member', {
        body: { workspace_id: activeWorkspaceId, email, role: inviteRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(
        data?.emailSent
          ? `Invitation sent to ${email}`
          : `Invite created — share the link manually`
      );
      setInviteEmail('');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const revoke = async (id: string) => {
    const { error } = await supabase
      .from('workspace_invitations')
      .update({ status: 'revoked' })
      .eq('id', id);
    if (error) return toast.error('Failed to revoke');
    toast.success('Invitation revoked');
    load();
  };

  const removeMember = async (userId: string) => {
    if (!activeWorkspaceId) return;
    if (userId === activeWorkspace?.owner_id) {
      toast.error("You can't remove the workspace owner");
      return;
    }
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', activeWorkspaceId)
      .eq('user_id', userId);
    if (error) return toast.error('Failed to remove');
    toast.success('Member removed');
    load();
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/accept-workspace-invite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Invite link copied');
  };

  const seatsUsed = members.length + invitations.length;

  if (!isAgency) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-8 text-center space-y-3">
          <Lock className="h-8 w-8 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-semibold">Team seats are an Agency feature</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Upgrade to Agency to invite up to 10 teammates per workspace with viewer or manager access.
          </p>
          <Button asChild className="bg-primary hover:bg-[hsl(var(--primary)/0.9)]">
            <a href="/pricing">Upgrade to Agency</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Team</h2>
        <p className="text-sm text-muted-foreground">
          Invite teammates to collaborate on <strong>{activeWorkspace?.name}</strong>. Up to {SEAT_LIMIT} seats per workspace.
        </p>
      </div>

      {isOwner && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Invite a teammate
            </CardTitle>
            <CardDescription>
              {seatsUsed} of {SEAT_LIMIT} seats used
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              placeholder="teammate@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={inviting || seatsUsed >= SEAT_LIMIT}
              className="flex-1"
            />
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim() || seatsUsed >= SEAT_LIMIT}
              className="bg-primary hover:bg-[hsl(var(--primary)/0.9)]"
            >
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send invite'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[hsl(var(--primary)/0.2)] flex items-center justify-center text-xs text-primary font-semibold">
                    {m.user_id.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {m.user_id === user?.id ? 'You' : `User ${m.user_id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{m.role}</Badge>
                  {isOwner && m.user_id !== activeWorkspace?.owner_id && (
                    <Button aria-label="Remove team member"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMember(m.user_id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {invitations.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" /> Pending invitations ({invitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50"
              >
                <div>
                  <p className="text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.role} · expires {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-1">
                    <Button aria-label="Copy invitation link" variant="ghost" size="icon" onClick={() => copyLink(inv.token)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button aria-label="Revoke invitation"
                      variant="ghost"
                      size="icon"
                      onClick={() => revoke(inv.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
