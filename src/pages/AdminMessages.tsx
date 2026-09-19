import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Mail, Send, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface Submission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
  status: string;
  replied_at: string | null;
  reply_body: string | null;
}

export default function AdminMessages() {
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Submission | null>(null);
  const [reply, setReply] = useState('');
  const [subjectOverride, setSubjectOverride] = useState('');
  const [filter, setFilter] = useState<'all' | 'new' | 'replied'>('all');

  const roleQuery = useQuery({
    queryKey: ['user-role', user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user!.id);
      return (data ?? []).some((r) => r.role === 'owner' || r.role === 'admin');
    },
  });
  const allowed = roleQuery.data === true;

  const itemsQuery = useQuery({
    queryKey: ['contact_submissions'],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Submission[];
    },
  });
  const items = itemsQuery.data ?? [];

  const openReply = (s: Submission) => {
    setSelected(s);
    setSubjectOverride(`Re: ${s.subject || 'Your message'}`);
    setReply(`Hi ${s.name.split(' ')[0]},\n\nThanks for reaching out to Korex Intelligence Systems.\n\n\n\nBest,\nThe Korex Team`);
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !reply.trim()) throw new Error('Empty reply');
      const { data, error } = await supabase.functions.invoke('send-gmail-reply', {
        body: { submissionId: selected.id, body: reply.trim(), subject: subjectOverride.trim() },
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || 'Failed to send');
      }
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Reply sent', description: `Delivered to ${selected?.email}` });
      setSelected(null);
      setReply('');
      qc.invalidateQueries({ queryKey: ['contact_submissions'] });
    },
    onError: (e: any) => {
      toast({ title: 'Send failed', description: e.message, variant: 'destructive' });
    },
  });
  const sending = sendMutation.isPending;
  const sendReply = () => sendMutation.mutate();

  const checking = roleQuery.isLoading;


  if (authLoading || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login?redirect=/admin/messages" replace />;
  if (!allowed) return <Navigate to="/ai-strategist" replace />;

  const filtered = items.filter((i) => filter === 'all' ? true : i.status === filter);

  return (
    <>
      <Helmet><title>Admin — Contact Messages | Korex</title></Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/ai-strategist" className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
            <h1 className="text-lg font-bold">Contact Messages</h1>
          </div>
          <div className="flex gap-2 text-xs">
            {(['all', 'new', 'replied'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md border transition ${
                  filter === f ? 'bg-primary border-primary text-white' : 'border-border text-muted-foreground hover:text-foreground'
                }`}>
                {f[0].toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-[calc(100vh-65px)]">
          {/* List */}
          <div className="border-r border-border overflow-y-auto max-h-[calc(100vh-65px)]">
            {filtered.length === 0 && (
              <div className="p-8 text-center text-[hsl(var(--text-tertiary))] text-sm">No messages.</div>
            )}
            {filtered.map((s) => (
              <button key={s.id} onClick={() => openReply(s)}
                className={`w-full text-left p-5 border-b border-border hover:bg-card transition ${
                  selected?.id === s.id ? 'bg-card' : ''
                }`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">{s.name}</div>
                    <div className="text-xs text-[hsl(var(--text-tertiary))] truncate">{s.email}</div>
                  </div>
                  {s.status === 'replied' ? (
                    <span className="text-[10px] flex items-center gap-1 px-2 py-1 rounded bg-green-500/10 text-green-500 shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Replied
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-1 rounded bg-[hsl(var(--primary)/0.1)] text-primary shrink-0">New</span>
                  )}
                </div>
                <div className="text-xs font-medium text-muted-foreground mb-1">{s.subject}</div>
                <div className="text-xs text-[hsl(var(--text-tertiary))] line-clamp-2">{s.message}</div>
                <div className="text-[10px] text-[hsl(var(--text-tertiary))] mt-2">{new Date(s.created_at).toLocaleString()}</div>
              </button>
            ))}
          </div>

          {/* Detail / Reply */}
          <div className="p-6 overflow-y-auto max-h-[calc(100vh-65px)]">
            {!selected ? (
              <div className="h-full flex flex-col items-center justify-center text-[hsl(var(--text-tertiary))]">
                <Mail className="w-10 h-10 mb-3" />
                <p className="text-sm">Select a message to reply.</p>
              </div>
            ) : (
              <div className="space-y-5 max-w-2xl">
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-bold">{selected.name}</div>
                      <a href={`mailto:${selected.email}`} className="text-xs text-primary">{selected.email}</a>
                    </div>
                    <div className="text-xs text-[hsl(var(--text-tertiary))]">{new Date(selected.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">{selected.subject}</div>
                  <div className="text-sm text-foreground whitespace-pre-wrap">{selected.message}</div>
                </div>

                {selected.status === 'replied' && selected.reply_body && (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5">
                    <div className="text-xs text-green-500 font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Replied {selected.replied_at ? new Date(selected.replied_at).toLocaleString() : ''}
                    </div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">{selected.reply_body}</div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">Subject</label>
                  <input value={subjectOverride} onChange={(e) => setSubjectOverride(e.target.value)}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    {selected.status === 'replied' ? 'Send another reply' : 'Reply'}
                  </label>
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={10} maxLength={10000}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary resize-y font-mono" />
                  <div className="text-[10px] text-[hsl(var(--text-tertiary))] mt-1">Sent from korexintelligencesystems@gmail.com</div>
                </div>

                <button onClick={sendReply} disabled={sending || !reply.trim()}
                  className="w-full py-3 bg-gradient-to-r from-primary to-[hsl(var(--primary-dark))] text-white font-bold rounded-lg hover:shadow-[0_0_20px_hsl(var(--primary) / 0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Send Reply</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
