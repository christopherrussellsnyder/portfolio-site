import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { ConversationSidebar } from '@/components/strategist/ConversationSidebar';
import { ChatArea } from '@/components/strategist/ChatArea';
import { ContextSidebar } from '@/components/strategist/ContextSidebar';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BusinessProfile } from '@/hooks/useWebsiteAnalysis';
import { cn } from '@/lib/utils';
import { AnimatedDotGrid } from '@/components/strategist/AnimatedDotGrid';
import { GettingStartedCard } from '@/components/onboarding/GettingStartedCard';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: { type: string; url: string; name?: string }[];
  createdAt: Date;
}

export interface BusinessContext {
  id: string;
  website_url: string;
  business_profile: BusinessProfile | null;
  analyzed_at: string;
}

export interface AnalyticsUpload {
  id: string;
  platform: string;
  extracted_data: Record<string, any>;
  ai_insights: string;
  uploaded_at: string;
}

export default function AIStrategist() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['strategist-conversations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as Conversation[];
    },
  });

  // Fetch active business context
  const { data: businessContext } = useQuery({
    queryKey: ['business-context'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('business_context')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      
      return {
        id: data.id,
        website_url: data.website_url,
        business_profile: data.business_profile as unknown as BusinessProfile | null,
        analyzed_at: data.analyzed_at || data.last_updated || '',
      } as BusinessContext;
    },
  });

  // Fetch recent analytics
  const { data: recentAnalytics = [] } = useQuery({
    queryKey: ['recent-analytics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('uploaded_analytics')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return (data || []).map(item => ({
        id: item.id,
        platform: item.platform || 'unknown',
        extracted_data: (item.extracted_data as Record<string, any>) || {},
        ai_insights: item.ai_insights || '',
        uploaded_at: item.uploaded_at || '',
      })) as AnalyticsUpload[];
    },
  });

  const handleNewConversation = () => {
    setSelectedConversationId(undefined);
  };

  const handleConversationCreated = (id: string) => {
    setSelectedConversationId(id);
    queryClient.invalidateQueries({ queryKey: ['strategist-conversations'] });
  };

  const handleDeleteRequest = (id: string) => {
    setConversationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!conversationToDelete) return;
    
    setIsDeleting(true);
    
    // Optimistic update - remove from UI immediately
    const previousConversations = conversations;
    queryClient.setQueryData(['strategist-conversations'], (old: Conversation[] | undefined) =>
      old?.filter(c => c.id !== conversationToDelete) || []
    );
    
    // If deleting the active conversation, switch to empty state or next conversation
    if (selectedConversationId === conversationToDelete) {
      const remainingConversations = conversations.filter(c => c.id !== conversationToDelete);
      setSelectedConversationId(remainingConversations[0]?.id);
    }
    
    try {
      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('id', conversationToDelete);
      
      if (error) throw error;
      
      toast.success('Conversation deleted');
    } catch (error) {
      // Rollback on error
      queryClient.setQueryData(['strategist-conversations'], previousConversations);
      toast.error('Failed to delete conversation');
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  const handleRename = async (id: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from('ai_conversations')
        .update({ title: newTitle })
        .eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['strategist-conversations'] });
      toast.success('Conversation renamed');
    } catch (error) {
      toast.error('Failed to rename conversation');
    }
  };

  const handleFavorite = (id: string) => {
    toast.info('Favorite feature coming soon!');
  };

  const handleContextUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['business-context'] });
    queryClient.invalidateQueries({ queryKey: ['recent-analytics'] });
  };

  return (
    <>
      <Helmet>
        <title>Korex Intelligence | Intelligence Systems</title>
        <meta name="description" content="Chat with Korex Intelligence for personalized marketing strategies and insights" />
      </Helmet>

      <div className="relative flex h-screen bg-background overflow-hidden">
        <AnimatedDotGrid />
        
        {/* Top bar - workspace switcher + settings */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50">
          <WorkspaceSwitcher />
        </div>
        <div className="absolute top-3 right-3 z-50">
          <Button aria-label="Business settings" variant="ghost" size="icon" onClick={() => navigate('/settings')} className="text-muted-foreground hover:text-foreground hover:bg-card" title="Business Settings">
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {/* Left Sidebar - Conversations */}
        <ConversationSidebar
          conversations={conversations}
          selectedId={selectedConversationId}
          isLoading={conversationsLoading}
          isOpen={leftSidebarOpen}
          onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
          onSelect={setSelectedConversationId}
          onNewChat={handleNewConversation}
          onDelete={handleDeleteRequest}
          onRename={handleRename}
          onFavorite={handleFavorite}
        />

        {/* Main Chat Area */}
        <ChatArea
          conversationId={selectedConversationId}
          businessContext={businessContext}
          recentAnalytics={recentAnalytics}
          onConversationCreated={handleConversationCreated}
          onContextUpdate={handleContextUpdate}
          className="flex-1"
        />

        {/* Right Sidebar - Context */}
        <ContextSidebar
          businessContext={businessContext}
          recentAnalytics={recentAnalytics}
          isOpen={rightSidebarOpen}
          onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
          onReanalyze={handleContextUpdate}
        />

        {/* Getting Started checklist */}
        <div className="hidden md:block absolute bottom-4 left-1/2 -translate-x-1/2 z-40">
          <GettingStartedCard />
        </div>
      </div>


      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This conversation will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
