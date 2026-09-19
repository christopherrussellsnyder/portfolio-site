import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Send, Bot, Loader2, ImagePlus, Globe, Lightbulb, 
  Sparkles, Settings2, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScreenshotUploader } from '@/components/chat/ScreenshotUploader';
import { WebsiteAnalyzer } from '@/components/chat/WebsiteAnalyzer';
import { useScreenshotAnalysis } from '@/hooks/useScreenshotAnalysis';
import { BusinessProfile } from '@/hooks/useWebsiteAnalysis';
import { ChatMessageList } from './ChatMessageList';
import { IntelligenceCards } from './IntelligenceCards';
import { QuickActions } from './QuickActions';
import { StrategyDialog } from './StrategyDialog';
import { SmartSuggestions, SmartSuggestion } from './SmartSuggestions';
import { ConversationStarters } from './ConversationStarters';
import { Message, BusinessContext, AnalyticsUpload } from '@/pages/AIStrategist';
import { useStrategyGeneration } from '@/hooks/useStrategyGeneration';
import { useNavigate } from 'react-router-dom';
import { detectUserIntent, getIntentSuggestion } from '@/lib/intentDetection';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { KorexMark } from '@/components/branding/KorexMark';

interface ChatAreaProps {
  conversationId?: string;
  businessContext: BusinessContext | null | undefined;
  recentAnalytics: AnalyticsUpload[];
  onConversationCreated: (id: string) => void;
  onContextUpdate: () => void;
  className?: string;
}

interface ContextPreferences {
  response_style: 'concise' | 'detailed' | 'balanced';
  tone_preference: 'formal' | 'casual' | 'balanced';
  include_examples: boolean;
}

export function ChatArea({
  conversationId,
  businessContext,
  recentAnalytics,
  onConversationCreated,
  onContextUpdate,
  className,
}: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [showWebsiteAnalyzer, setShowWebsiteAnalyzer] = useState(false);
  const [showStrategyDialog, setShowStrategyDialog] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(conversationId);
  const [hasStrategies, setHasStrategies] = useState(false);
  const [settingsComplete, setSettingsComplete] = useState(true);
  const [pendingStrategy, setPendingStrategy] = useState<{ platform: string; duration: number; contentMode: 'organic' | 'paid' | 'hybrid' } | null>(null);
  const [preferences, setPreferences] = useState<ContextPreferences>({
    response_style: 'balanced',
    tone_preference: 'balanced',
    include_examples: true,
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { uploadScreenshot, analyzeFile, isProcessing } = useScreenshotAnalysis();
  const { generateStrategy, isGenerating } = useStrategyGeneration();
  const navigate = useNavigate();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Update local conversation ID when prop changes
  useEffect(() => {
    setCurrentConversationId(conversationId);
    if (conversationId) {
      loadMessages(conversationId);
    } else {
      setMessages([]);
    }
  }, [conversationId]);

  // Check if user has strategies and settings completeness
  useEffect(() => {
    const checkData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ count }, { data: settingsData }] = await Promise.all([
        supabase.from('content_strategies').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('user_business_settings').select('business_name, industry, target_audience').eq('user_id', user.id).maybeSingle(),
      ]);

      setHasStrategies((count || 0) > 0);
      
      if (settingsData) {
        const ta = (settingsData.target_audience as any) || {};
        setSettingsComplete(!!(settingsData.business_name && settingsData.industry && ta.age_range));
      } else {
        setSettingsComplete(false);
      }
    };
    checkData();
  }, []);

  const loadMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load messages:', error);
      return;
    }

    setMessages(data.map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      attachments: msg.attachments as any,
      createdAt: new Date(msg.created_at || new Date()),
    })));
  };

  const createConversation = async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: user.id,
        title: 'New Conversation',
      })
      .select()
      .single();

    if (error) throw error;
    
    setCurrentConversationId(data.id);
    onConversationCreated(data.id);
    return data.id;
  };

  const saveMessage = async (
    convId: string, 
    role: 'user' | 'assistant', 
    content: string,
    attachments?: any[]
  ) => {
    const { data, error } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: convId,
        role,
        content,
        attachments: attachments || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save message:', error);
      throw error;
    }

    return data;
  };

  // Check if a message is a strategy confirmation
  const isStrategyConfirmation = (text: string): boolean => {
    const confirmKeywords = /^(yes|confirmed|proceed|generate it|looks good|that'?s correct|approve|go ahead|do it|confirm|let'?s go|start|deploy|yes please|absolutely|sure|ok|okay)\b/i;
    return confirmKeywords.test(text.trim());
  };

  const isStrategyCancellation = (text: string): boolean => {
    const cancelKeywords = /^(cancel|nevermind|never mind|stop|no|don'?t|nah|nope|start over)\b/i;
    return cancelKeywords.test(text.trim());
  };

  const triggerStrategyGeneration = async (platform: string, duration: number, contentMode: 'organic' | 'paid' | 'hybrid' = 'hybrid') => {
    setPendingStrategy(null);

    const modeLabel = contentMode === 'organic' ? 'organic-only' : contentMode === 'paid' ? 'paid-ads' : 'hybrid';
    const progressMsgId = `strategy-progress-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: progressMsgId,
      role: 'assistant',
      content: `🚀 **Generating your ${duration}-day ${modeLabel} ${platform} strategy...**\n\nThis will take 60-90 seconds for a comprehensive multi-platform plan.\n\n⏳ Analyzing business context...`,
      createdAt: new Date(),
    }]);

    try {
      const result = await generateStrategy(platform, duration, undefined, undefined, currentConversationId, contentMode);
      if (result) {
        setHasStrategies(true);
        const successContent = `✨ **Strategy Generated Successfully!**\n\nI've created your ${duration}-day ${modeLabel} ${platform} content strategy with **${result.postsCount} posts**.\n\n**Predicted Results:**\n- 📈 Total Reach: ${result.strategy.predicted_metrics?.total_reach?.toLocaleString() || 'N/A'}\n- 💬 Avg Engagement: ${result.strategy.predicted_metrics?.avg_engagement_rate || 'N/A'}%\n- 👥 Follower Growth: +${result.strategy.predicted_metrics?.expected_follower_growth || 'N/A'}\n\n[View Full Strategy](/strategies/${result.strategyId})`;

        setMessages(prev => prev.map(m =>
          m.id === progressMsgId ? { ...m, content: successContent } : m
        ));

        if (currentConversationId) {
          await saveMessage(currentConversationId, 'assistant', successContent);
        }
      } else {
        setMessages(prev => prev.map(m =>
          m.id === progressMsgId
            ? { ...m, content: '❌ **Strategy generation failed.** Please try again or use a shorter duration (14 days) for better reliability.' }
            : m
        ));
      }
    } catch (error) {
      console.error('Strategy generation error:', error);
      setMessages(prev => prev.map(m =>
        m.id === progressMsgId
          ? { ...m, content: `❌ **Strategy generation failed:** ${error instanceof Error ? error.message : 'Unknown error'}\n\nTry generating via chat by typing "Generate a ${duration}-day ${platform} strategy".` }
          : m
      ));
    }
  };

  const sendMessage = async (messageContent?: string, attachments?: any[]) => {
    const content = messageContent || input.trim();
    if (!content && !attachments?.length) return;

    // Check if user is confirming a pending strategy
    if (pendingStrategy && isStrategyConfirmation(content)) {
      setInput('');
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      
      if (currentConversationId) {
        await saveMessage(currentConversationId, 'user', content);
      }
      
      await triggerStrategyGeneration(pendingStrategy.platform, pendingStrategy.duration, pendingStrategy.contentMode);
      return;
    }

    // Check if user is cancelling a pending strategy
    if (pendingStrategy && isStrategyCancellation(content)) {
      setPendingStrategy(null);
      setInput('');
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      
      if (currentConversationId) {
        await saveMessage(currentConversationId, 'user', content);
      }
      
      const cancelMsg: Message = {
        id: `cancel-${Date.now()}`,
        role: 'assistant',
        content: '✅ Strategy generation cancelled. You can request a new strategy anytime by clicking the strategy button or asking me.',
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, cancelMsg]);
      
      if (currentConversationId) {
        await saveMessage(currentConversationId, 'assistant', cancelMsg.content);
      }
      return;
    }

    setIsLoading(true);
    setInput('');

    try {
      let convId = currentConversationId;
      if (!convId) {
        convId = await createConversation();
      }

      // Detect intent and check for suggestions
      const intent = detectUserIntent(content);
      const hasAnalytics = recentAnalytics.length > 0;
      const hasProfile = !!businessContext?.business_profile;
      const suggestion = getIntentSuggestion(intent, hasAnalytics, hasProfile);

      // Add user message to UI
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content,
        attachments,
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      // Save user message
      await saveMessage(convId, 'user', content, attachments);

      // Update conversation title with first message
      if (messages.length === 0) {
        const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
        await supabase
          .from('ai_conversations')
          .update({ title, updated_at: new Date().toISOString() })
          .eq('id', convId);
      }

      // Prepare context for AI
      const allMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const { data: { user } } = await supabase.auth.getUser();

      const profile = businessContext?.business_profile;
      const contextData = {
        businessProfile: profile ? {
          businessName: profile.businessName,
          industry: profile.industry,
          businessType: profile.businessType,
          summary: profile.summary,
          targetAudience: profile.targetAudience,
          brandIdentity: profile.brandIdentity,
          productsServices: profile.productsServices,
          marketingMaturity: profile.marketingMaturity,
          priceRange: profile.priceRange,
          geographicFocus: profile.geographicFocus,
        } : null,
        recentAnalytics: recentAnalytics.map(a => ({
          platform: a.platform,
          metrics: a.extracted_data,
          insights: a.ai_insights,
          healthScore: a.extracted_data?.overall_health_score,
          performanceRating: a.extracted_data?.performance_rating,
          trendAnalysis: a.extracted_data?.trend_analysis,
          recommendations: a.extracted_data?.recommendations,
        })),
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            messages: allMessages,
            userId: user?.id,
            conversationId: convId,
            businessContext: contextData,
            context_preferences: preferences,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        if (response.status === 402) {
          throw new Error('AI credits exhausted. Please add credits to continue.');
        }
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantMessageId = `assistant-${Date.now()}`;

      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        createdAt: new Date(),
      }]);

      let textBuffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) {
              assistantContent += deltaContent;
              setMessages(prev => prev.map(m => 
                m.id === assistantMessageId 
                  ? { ...m, content: assistantContent }
                  : m
              ));
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Save assistant message
      if (assistantContent) {
        await saveMessage(convId, 'assistant', assistantContent);
        await supabase
          .from('ai_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', convId);
      }

    } catch (error) {
      console.error('Send message error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileAnalyze = async (file: File) => {
    setShowUploader(false);
    setIsLoading(true);
    
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const label = ['csv', 'xlsx', 'xls'].includes(ext) ? 'spreadsheet' : ext === 'pdf' ? 'PDF' : 'screenshot';
    
    // Create or get conversation
    let convId = currentConversationId;
    if (!convId) {
      convId = await createConversation();
    }

    // Add user message
    const userMsg: Message = {
      id: `user-upload-${Date.now()}`,
      role: 'user',
      content: `Analyze this analytics ${label}: ${file.name}`,
      attachments: [{ type: file.type.startsWith('image/') ? 'image' : 'file', url: '', name: file.name }],
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    await saveMessage(convId, 'user', userMsg.content, userMsg.attachments);

    if (messages.length === 0) {
      const title = `Analytics: ${file.name}`.slice(0, 50);
      await supabase.from('ai_conversations').update({ title, updated_at: new Date().toISOString() }).eq('id', convId);
    }

    // Show single processing message that updates in-place
    const processingId = `analysis-${Date.now()}`;
    const progressStages = [
      '📤 Uploading file...',
      '🔍 Processing image...',
      '📊 Extracting metrics...',
      '🧠 Running performance analysis...',
      '💡 Generating actionable insights...',
    ];
    
    let stageIdx = 0;
    setMessages(prev => [...prev, {
      id: processingId,
      role: 'assistant',
      content: `⏳ **Analyzing your analytics ${label}...**\n\n${progressStages[0]}\n\n_Estimated: 30-45 seconds_`,
      createdAt: new Date(),
    }]);

    // Cycle through progress stages
    const stageInterval = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, progressStages.length - 1);
      const progress = progressStages.slice(0, stageIdx + 1).map((s, i) => 
        i < stageIdx ? `✅ ${s.slice(2)}` : s
      ).join('\n');
      setMessages(prev => prev.map(m => 
        m.id === processingId 
          ? { ...m, content: `⏳ **Analyzing your analytics ${label}...**\n\n${progress}\n\n_Processing..._` }
          : m
      ));
    }, 5000);

    try {
      const result = await analyzeFile(file);
      clearInterval(stageInterval);

      if (result?.analysis) {
        // Build unified response with analytics + collapsed business context
        let finalContent = result.analysis;
        
        // Add quick action buttons as markdown
        finalContent += `\n\n---\n\n**📋 Next Steps:**\n- 🚀 Ask me to "Generate a strategy based on this data"\n- 📊 Upload another file to compare periods\n- 💬 Ask any question about these insights\n\n<sub>_These insights are based on your current business profile. Need to update? Click ⚙️ Settings in the top right._</sub>`;

        // Transform processing message into final result (in-place update)
        setMessages(prev => prev.map(m => 
          m.id === processingId 
            ? { ...m, content: finalContent }
            : m
        ));
        await saveMessage(convId, 'assistant', finalContent);
        await supabase.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId);
      } else {
        // Analysis returned no result
        setMessages(prev => prev.map(m => 
          m.id === processingId 
            ? { ...m, content: '❌ Analysis could not extract meaningful data from this file. Please try:\n1. A clearer screenshot\n2. Exporting as CSV from your platform\n3. A different file format' }
            : m
        ));
      }
      onContextUpdate();
    } catch (error) {
      clearInterval(stageInterval);
      console.error('Analysis error:', error);
      setMessages(prev => prev.map(m => 
        m.id === processingId 
          ? { ...m, content: `❌ **Analysis Failed**\n\n${error instanceof Error ? error.message : 'An error occurred'}\n\nPlease try uploading again or use a different file format.` }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleWebsiteAnalysisComplete = async (profile: BusinessProfile) => {
    setShowWebsiteAnalyzer(false);
    onContextUpdate();

    const summaryMessage = `I've analyzed your website and here's what I found:

**${profile.businessName}** - ${profile.industry}

${profile.summary || ''}

**Target Audience:** ${profile.targetAudience?.ageRange || 'N/A'} | ${profile.targetAudience?.customerType || 'N/A'}

**Brand Voice:** ${profile.brandIdentity?.toneCharacteristics?.join(', ') || 'N/A'}

**Value Proposition:** ${profile.brandIdentity?.valueProposition || 'N/A'}

**Marketing Maturity:** Website Quality ${profile.marketingMaturity?.websiteQuality || 'N/A'}/10 | SEO: ${profile.marketingMaturity?.seoLevel || 'N/A'}

I'll use this context to provide personalized marketing recommendations. You can ask me anything about your marketing strategy!`;

    let convId = currentConversationId;
    if (!convId) {
      convId = await createConversation();
    }

    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: '🌐 Analyzed my website',
      createdAt: new Date(),
    }]);
    await saveMessage(convId, 'user', '🌐 Analyzed my website');

    setMessages(prev => [...prev, {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: summaryMessage,
      createdAt: new Date(),
    }]);
    await saveMessage(convId, 'assistant', summaryMessage);
  };

  const handleStrategyRequest = async (platform: string, duration: number, contentMode: 'organic' | 'paid' | 'hybrid' = 'hybrid') => {
    setShowStrategyDialog(false);

    // Phase 1: Only send chat message for AI confirmation — do NOT generate yet
    setPendingStrategy({ platform, duration, contentMode });
    const modeLabel = contentMode === 'organic' ? 'organic-only' : contentMode === 'paid' ? 'paid-ads' : 'hybrid organic + paid';
    const userMessage = `Generate a ${duration}-day ${modeLabel} content strategy for ${platform}. Please review my business context and show me a confirmation before generating.`;
    await sendMessage(userMessage);
  };

  const handleSmartSuggestion = (suggestion: SmartSuggestion) => {
    switch (suggestion.action) {
      case 'upload_analytics':
        setShowUploader(true);
        break;
      case 'analyze_website':
        setShowWebsiteAnalyzer(true);
        break;
      case 'create_strategy':
        setShowStrategyDialog(true);
        break;
      case 'ask_question':
        sendMessage(suggestion.prompt);
        break;
    }
  };

  const handleAction = (action: string, data?: any) => {
    switch (action) {
      case 'create_strategy':
        setShowStrategyDialog(true);
        break;
      case 'confirm_strategy':
        if (pendingStrategy) {
          triggerStrategyGeneration(pendingStrategy.platform, pendingStrategy.duration, pendingStrategy.contentMode);
        }
        break;
      case 'cancel_strategy':
        setPendingStrategy(null);
        {
          const cancelMsg: Message = {
            id: `cancel-${Date.now()}`,
            role: 'assistant',
            content: '✅ Strategy generation cancelled. You can request a new strategy anytime.',
            createdAt: new Date(),
          };
          setMessages(prev => [...prev, cancelMsg]);
          if (currentConversationId) {
            saveMessage(currentConversationId, 'assistant', cancelMsg.content);
          }
        }
        break;
      case 'edit_settings':
        navigate('/settings');
        break;
      case 'upload_analytics':
        setShowUploader(true);
        break;
      case 'analyze_website':
        setShowWebsiteAnalyzer(true);
        break;
      case 'save_content':
        toast({
          title: 'Content Saved',
          description: 'Content has been saved to your library',
        });
        break;
      case 'request_revision':
        setInput('Can you revise that? ');
        textareaRef.current?.focus();
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isDisabled = isLoading || isProcessing || isGenerating;

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Settings incomplete banner */}
      {!settingsComplete && (
        <div className="mx-4 mt-3 bg-gradient-to-r from-primary/10 to-korex-red-dark/10 border border-primary/30 rounded-lg p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground font-medium">Recommendation:</span> Complete your business settings for more accurate strategies.
          </p>
          <Button size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10 shrink-0" onClick={() => navigate('/settings')}>
            <Settings className="w-3.5 h-3.5 mr-1.5" />
            Complete Settings
          </Button>
        </div>
      )}

      {/* Messages area */}
      <ScrollArea className="flex-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 px-6">
            {/* Korex logo hero */}
            <div className="relative mb-8">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl scale-150" />
              <div className="relative p-5 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 backdrop-blur-sm">
                <KorexMark className="w-8 h-8" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2 tracking-tight">Korex Intelligence</h2>
            <p className="text-muted-foreground max-w-md mb-8 text-sm leading-relaxed">
              Get personalized marketing strategies, content ideas, and data-driven insights for your business.
            </p>

            {/* Smart Suggestions */}
            <div className="w-full max-w-2xl mb-8">
              <SmartSuggestions
                businessContext={businessContext}
                recentAnalytics={recentAnalytics}
                hasStrategies={hasStrategies}
                onSuggestionClick={handleSmartSuggestion}
              />
            </div>
            
            {/* Quick action cards - sleek glassmorphism style */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl w-full mb-10">
              <button
                className="group p-5 rounded-2xl border border-subtle bg-secondary/50 backdrop-blur-sm hover:border-primary/30 hover:bg-secondary/80 transition-all duration-300 text-left"
                onClick={() => setShowWebsiteAnalyzer(true)}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-3 group-hover:shadow-glow transition-shadow duration-300">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1">Analyze Website</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Let Korex analyze your business
                </p>
              </button>
              
              <button
                className="group p-5 rounded-2xl border border-subtle bg-secondary/50 backdrop-blur-sm hover:border-primary/30 hover:bg-secondary/80 transition-all duration-300 text-left"
                onClick={() => setShowUploader(true)}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-3 group-hover:shadow-glow transition-shadow duration-300">
                  <ImagePlus className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1">Upload Analytics</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Extract insights from screenshots
                </p>
              </button>
              
              <button
                className="group p-5 rounded-2xl border border-subtle bg-secondary/50 backdrop-blur-sm hover:border-primary/30 hover:bg-secondary/80 transition-all duration-300 text-left"
                onClick={() => setShowStrategyDialog(true)}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-3 group-hover:shadow-glow transition-shadow duration-300">
                  <Lightbulb className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1">Generate Strategy</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Get a custom content plan
                </p>
              </button>
            </div>

            {/* Conversation Starters */}
            <div className="w-full max-w-2xl">
              <ConversationStarters
                onStarterClick={(prompt) => {
                  setInput(prompt);
                  setTimeout(() => sendMessage(prompt), 100);
                }}
                businessName={businessContext?.business_profile?.businessName}
                platform={recentAnalytics[0]?.platform}
              />
            </div>
          </div>
        ) : (
          <>
            <IntelligenceCards />
            <ChatMessageList 
              messages={messages} 
              isLoading={isLoading}
              messagesEndRef={messagesEndRef}
              onAction={handleAction}
              onQuickSuggestion={(prompt) => sendMessage(prompt)}
              hasPendingStrategy={!!pendingStrategy}
            />
          </>
        )}
      </ScrollArea>

      {/* Website analyzer panel */}
      {showWebsiteAnalyzer && (
        <div className="p-4 border-t bg-muted/50">
          <WebsiteAnalyzer
            onAnalysisComplete={handleWebsiteAnalysisComplete}
            onCancel={() => setShowWebsiteAnalyzer(false)}
            disabled={isDisabled}
          />
        </div>
      )}

      {/* Upload panel */}
      {showUploader && (
        <div className="p-4 border-t bg-muted/50">
          <ScreenshotUploader
            onFileAnalyze={handleFileAnalyze}
            disabled={isDisabled}
          />
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setShowUploader(false)}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Strategy dialog */}
      <StrategyDialog
        open={showStrategyDialog}
        onOpenChange={setShowStrategyDialog}
        onSubmit={handleStrategyRequest}
      />

      {/* Input area - sleek modern design */}
      <div className="p-4 border-t border-subtle bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto">
          {/* Pending strategy indicator */}
          {pendingStrategy && (
            <div className="mb-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                ⏳ <span className="text-foreground font-medium">Strategy confirmation pending</span> — {pendingStrategy.duration}-day {pendingStrategy.platform} plan
              </span>
              <button 
                className="text-primary hover:text-primary/80 font-medium"
                onClick={() => {
                  setPendingStrategy(null);
                  const cancelMsg: Message = {
                    id: `cancel-${Date.now()}`,
                    role: 'assistant',
                    content: '✅ Strategy generation cancelled.',
                    createdAt: new Date(),
                  };
                  setMessages(prev => [...prev, cancelMsg]);
                }}
              >
                Dismiss
              </button>
            </div>
          )}
          {/* Main input container - pill-like design */}
          <div className="relative flex items-end gap-2 p-2 rounded-2xl bg-secondary/60 border border-subtle focus-within:border-primary/40 focus-within:shadow-glow transition-all duration-300">
            {/* Quick action buttons inline */}
            <div className="flex items-center gap-1 pl-1 pb-1">
              <QuickActions
                onUploadClick={() => setShowUploader(!showUploader)}
                onWebsiteClick={() => setShowWebsiteAnalyzer(!showWebsiteAnalyzer)}
                onStrategyClick={() => setShowStrategyDialog(true)}
                disabled={isDisabled}
              />
            </div>
            
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your marketing strategy..."
              disabled={isDisabled}
              className="min-h-[40px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none text-sm placeholder:text-muted-foreground/50 py-2"
              rows={1}
            />
            
            <div className="flex items-center gap-1 pr-1 pb-1">
              {/* Preferences popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button aria-label="Chat options" variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
                    <Settings2 className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Response Preferences</h4>
                    
                    <div className="space-y-2">
                      <Label className="text-xs">Response Style</Label>
                      <Select
                        value={preferences.response_style}
                        onValueChange={(v) => setPreferences(p => ({ ...p, response_style: v as any }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="concise">Concise</SelectItem>
                          <SelectItem value="balanced">Balanced</SelectItem>
                          <SelectItem value="detailed">Detailed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Tone</Label>
                      <Select
                        value={preferences.tone_preference}
                        onValueChange={(v) => setPreferences(p => ({ ...p, tone_preference: v as any }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="formal">Formal</SelectItem>
                          <SelectItem value="balanced">Balanced</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Include Examples</Label>
                      <Switch
                        checked={preferences.include_examples}
                        onCheckedChange={(v) => setPreferences(p => ({ ...p, include_examples: v }))}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Send button */}
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isDisabled}
                size="icon"
                className="h-9 w-9 rounded-xl flex-shrink-0 bg-gradient-to-br from-primary to-arasaka-red-dark hover:shadow-glow transition-all duration-300"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          
          <p className="text-[10px] text-muted-foreground/40 mt-2 text-center">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
