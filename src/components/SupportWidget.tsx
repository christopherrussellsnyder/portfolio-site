import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle, X, Send, Loader2, LifeBuoy, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  escalated?: boolean;
}

const GREETING: Msg = {
  role: 'assistant',
  content:
    "Hi — I'm Korex Support. I can answer questions about strategies, billing, your account, the platform, and most common issues. What's on your mind?",
};

// Routes where the support widget should NOT show (chat-heavy pages)
const HIDDEN_ROUTES = ['/ai-strategist'];

export function SupportWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [hasEscalation, setHasEscalation] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Hide on marketing pages (not signed in) and on AI Strategist
  if (!user) return null;
  if (HIDDEN_ROUTES.some((r) => location.pathname.startsWith(r))) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newMessages: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('support-chat', {
        body: {
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          conversationId,
        },
      });
      if (error) throw error;
      if (data?.conversationId) setConversationId(data.conversationId);
      if (data?.escalate) setHasEscalation(true);

      setMessages([
        ...newMessages,
        { role: 'assistant', content: data?.reply || 'Sorry, no response.', escalated: data?.escalate },
      ]);
    } catch (e: any) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content:
            "I'm having trouble reaching the support service right now. Please use the contact form and our team will follow up directly.",
          escalated: true,
        },
      ]);
      setHasEscalation(true);
    } finally {
      setLoading(false);
    }
  };

  const goToContact = () => {
    setOpen(false);
    navigate('/contact');
  };

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Korex Support"
          className="fixed bottom-6 right-6 z-50 group flex items-center gap-2 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all px-4 py-3 hover:scale-105"
        >
          <LifeBuoy className="w-5 h-5" />
          <span className="text-sm font-semibold hidden sm:inline">Support</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50 w-[calc(100vw-3rem)] sm:w-[400px] max-w-[420px]',
            'h-[600px] max-h-[calc(100vh-3rem)]',
            'bg-card border border-border rounded-2xl shadow-2xl shadow-black/40 flex flex-col overflow-hidden'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <HelpCircle className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground tracking-tight">Korex Support</h3>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  AI-assisted · escalates to humans
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close support"
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'flex',
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md'
                  )}
                >
                  {m.role === 'assistant' ? (
                    <div className="prose prose-sm prose-invert max-w-none [&>*]:my-1">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-3.5 py-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Escalation CTA */}
          {hasEscalation && (
            <div className="px-4 pb-2">
              <button
                onClick={goToContact}
                className="w-full flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-md bg-primary/10 border border-primary/30 text-primary hover:bg-primary/15 transition-colors"
              >
                <span className="font-semibold">Send this to our support team</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Composer */}
          <div className="p-3 border-t border-border bg-background/50">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Ask about strategies, billing, your account..."
                rows={1}
                className="flex-1 resize-none bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 max-h-32"
                disabled={loading}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                aria-label="Send"
                className="p-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              AI answers may need verification. Complex issues are routed to our team.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
