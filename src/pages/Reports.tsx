import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Copy, ExternalLink, FileText, Lock, Loader2, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const FOUNDER_EMAIL = 'chrissnyder3456@gmail.com';

interface Report {
  id: string;
  title: string;
  period_start: string;
  period_end: string;
  share_token: string;
  is_public: boolean;
  view_count: number;
  created_at: string;
  workspace_id: string;
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeWorkspace, activeWorkspaceId } = useWorkspace();
  const { tier, subscribed } = useSubscription();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(monthAgo);
  const [end, setEnd] = useState(today);

  const isFounder = user?.email?.toLowerCase() === FOUNDER_EMAIL;
  const isAgency = isFounder || (subscribed && tier === 'agency');

  const load = async () => {
    if (!activeWorkspaceId) return;
    setLoading(true);
    const { data } = await supabase
      .from('client_reports')
      .select('*')
      .eq('workspace_id', activeWorkspaceId)
      .order('created_at', { ascending: false });
    setReports((data ?? []) as Report[]);
    setLoading(false);
  };

  useEffect(() => { if (isAgency) load(); else setLoading(false); }, [activeWorkspaceId, isAgency]);

  const generate = async () => {
    if (!activeWorkspaceId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-client-report', {
        body: { workspace_id: activeWorkspaceId, period_start: start, period_end: end, title },
      });
      if (error) throw error;
      if (data?.report?.id) {
        // Auto-mark public
        await supabase.from('client_reports').update({ is_public: true }).eq('id', data.report.id);
        toast.success('Report generated');
        setDialogOpen(false);
        setTitle('');
        load();
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const togglePublic = async (r: Report) => {
    const { error } = await supabase.from('client_reports').update({ is_public: !r.is_public }).eq('id', r.id);
    if (error) toast.error(error.message);
    else { toast.success(r.is_public ? 'Link disabled' : 'Public link enabled'); load(); }
  };

  const deleteReport = async (r: Report) => {
    if (!confirm(`Delete "${r.title}"?`)) return;
    const { error } = await supabase.from('client_reports').delete().eq('id', r.id);
    if (error) toast.error(error.message);
    else { toast.success('Deleted'); load(); }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/r/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied');
  };

  if (!isAgency) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-2xl mx-auto text-center space-y-4 pt-20">
          <Lock className="h-12 w-12 mx-auto text-primary" />
          <h1 className="text-3xl font-bold">Reports are an Agency feature</h1>
          <p className="text-muted-foreground">Generate white-labeled client reports with your logo, colors, and a shareable public link.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/ai-strategist')}>Back</Button>
            <Button className="bg-primary hover:bg-[hsl(var(--primary-dark))]" onClick={() => navigate('/pricing')}>Upgrade to Agency</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button aria-label="Go back" variant="ghost" size="icon" onClick={() => navigate('/ai-strategist')}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-xl font-semibold">Client Reports</h1>
            <p className="text-xs text-muted-foreground">Workspace: {activeWorkspace?.name ?? '—'}</p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-[hsl(var(--primary-dark))]"><Plus className="h-4 w-4 mr-2" /> New report</Button>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : reports.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-12 text-center space-y-3">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-semibold">No reports yet</h3>
              <p className="text-sm text-muted-foreground">Generate your first branded client report to share performance highlights.</p>
              <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-[hsl(var(--primary-dark))]"><Plus className="h-4 w-4 mr-2" /> New report</Button>
            </CardContent>
          </Card>
        ) : (
          reports.map((r) => (
            <Card key={r.id} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">{r.title}</CardTitle>
                    <CardDescription>{r.period_start} → {r.period_end} · {r.view_count} views</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.is_public ? 'default' : 'outline'} className={r.is_public ? 'bg-primary' : ''}>
                      {r.is_public ? 'Public' : 'Private'}
                    </Badge>
                    <Switch checked={r.is_public} onCheckedChange={() => togglePublic(r)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => window.open(`/r/${r.share_token}`, '_blank')}>
                  <ExternalLink className="h-3 w-3 mr-2" /> Open
                </Button>
                <Button size="sm" variant="outline" onClick={() => copyLink(r.share_token)} disabled={!r.is_public}>
                  <Copy className="h-3 w-3 mr-2" /> Copy link
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteReport(r)} className="text-destructive ml-auto">
                  <Trash2 className="h-3 w-3 mr-2" /> Delete
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New client report</DialogTitle>
            <DialogDescription>Generates a branded report from this workspace's published posts, analytics, and strategies.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Title (optional)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Q4 Performance Recap" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start date</Label>
                <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div>
                <Label>End date</Label>
                <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={generate} disabled={generating} className="bg-primary hover:bg-[hsl(var(--primary-dark))]">
              {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</> : 'Generate report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
