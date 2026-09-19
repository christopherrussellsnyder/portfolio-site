import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';

export interface ScheduledPost {
  id: string;
  user_id: string;
  campaign_id?: string | null;
  title: string;
  content: string;
  post_type: string;
  platforms: string[];
  scheduled_time: string;
  timezone?: string;
  recurrence?: string | null;
  recurrence_end_date?: string | null;
  status: string;
  published_at?: string | null;
  error_message?: string | null;
  media_urls?: string[] | null;
  impressions?: number | null;
  clicks?: number | null;
  engagements?: number | null;
  created_at?: string;
  updated_at?: string;
  is_recurring?: boolean;
  queue_position?: number | null;
}

export interface CreatePostData {
  title: string;
  content: string;
  platform: string;
  scheduled_time: string;
  status: string;
  post_type?: string;
  media_urls?: string[];
  is_recurring?: boolean;
  recurrence?: string;
  recurrence_end_date?: string;
}

export interface UpdatePostData {
  title?: string;
  content?: string;
  platforms?: string[];
  scheduled_time?: string;
  status?: string;
  media_urls?: string[];
  is_recurring?: boolean;
  recurrence?: string;
  recurrence_end_date?: string;
  queue_position?: number;
}

export function useScheduledPosts() {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const { toast } = useToast();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all posts from database
  const fetchPosts = useCallback(async () => {
    if (!user?.id || !activeWorkspaceId) {
      setPosts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('workspace_id', activeWorkspaceId)
        .order('scheduled_time', { ascending: true, nullsFirst: false });

      if (fetchError) {
        console.error('Error fetching posts:', fetchError);
        setError('Failed to load posts. Please try again.');
        toast({
          title: 'Error loading posts',
          description: fetchError.message,
          variant: 'destructive',
        });
        return;
      }

      // Transform database posts to match component interface
      const transformedPosts: ScheduledPost[] = (data || []).map(post => ({
        ...post,
        is_recurring: post.is_recurring ?? false,
      }));

      setPosts(transformedPosts);
    } catch (err) {
      console.error('Unexpected error fetching posts:', err);
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeWorkspaceId, toast]);

  // Create a new post
  const createPost = useCallback(async (postData: CreatePostData): Promise<ScheduledPost | null> => {
    if (!user?.id || !activeWorkspaceId) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to create posts.',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const insertData = {
        user_id: user.id,
        workspace_id: activeWorkspaceId,
        title: postData.title,
        content: postData.content,
        platforms: [postData.platform],
        post_type: postData.post_type || 'text',
        scheduled_time: postData.scheduled_time,
        status: postData.status,
        media_urls: postData.media_urls || null,
        is_recurring: postData.is_recurring || false,
        recurrence: postData.recurrence || null,
        recurrence_end_date: postData.recurrence_end_date || null,
      };

      const { data, error: insertError } = await supabase
        .from('scheduled_posts')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error('Error creating post:', insertError);
        
        // Handle specific error codes
        if (insertError.code === '42501') {
          toast({
            title: 'Permission denied',
            description: 'Please reconnect your account.',
            variant: 'destructive',
          });
        } else if (insertError.code === '23505') {
          toast({
            title: 'Duplicate post',
            description: 'A similar post already exists.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Failed to create post',
            description: insertError.message,
            variant: 'destructive',
          });
        }
        return null;
      }

      sonnerToast.success(postData.is_recurring ? 'Recurring series created!' : 'Post scheduled successfully!');
      
      // Optimistically add to local state (realtime will also trigger, but this is faster)
      const newPost: ScheduledPost = {
        ...data,
        is_recurring: data.is_recurring ?? false,
      };
      setPosts(prev => [...prev, newPost].sort((a, b) => 
        new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
      ));

      return newPost;
    } catch (err) {
      console.error('Unexpected error creating post:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while creating the post.',
        variant: 'destructive',
      });
      return null;
    }
  }, [user?.id, toast]);

  // Update an existing post
  const updatePost = useCallback(async (postId: string, updates: UpdatePostData): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error: updateError } = await supabase
        .from('scheduled_posts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating post:', updateError);
        toast({
          title: 'Failed to update post',
          description: updateError.message,
          variant: 'destructive',
        });
        return false;
      }

      sonnerToast.success('Post updated successfully!');
      
      // Optimistically update local state
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
      ).sort((a, b) => 
        new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
      ));

      return true;
    } catch (err) {
      console.error('Unexpected error updating post:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while updating the post.',
        variant: 'destructive',
      });
      return false;
    }
  }, [user?.id, toast]);

  // Delete a post
  const deletePost = useCallback(async (postId: string): Promise<boolean> => {
    if (!user?.id) return false;

    // Optimistically remove from UI
    const previousPosts = posts;
    setPosts(prev => prev.filter(p => p.id !== postId));

    try {
      const { error: deleteError } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error deleting post:', deleteError);
        // Revert optimistic update
        setPosts(previousPosts);
        toast({
          title: 'Failed to delete post',
          description: deleteError.message,
          variant: 'destructive',
        });
        return false;
      }

      sonnerToast.success('Post deleted successfully!');
      return true;
    } catch (err) {
      console.error('Unexpected error deleting post:', err);
      // Revert optimistic update
      setPosts(previousPosts);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while deleting the post.',
        variant: 'destructive',
      });
      return false;
    }
  }, [user?.id, posts, toast]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id || !activeWorkspaceId) return;

    // Initial fetch
    fetchPosts();

    // Set up real-time subscription scoped to active workspace
    const channel = supabase
      .channel(`scheduled_posts_${activeWorkspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_posts',
          filter: `workspace_id=eq.${activeWorkspaceId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newPost = payload.new as ScheduledPost;
            setPosts(prev => {
              if (prev.some(p => p.id === newPost.id)) return prev;
              return [...prev, { ...newPost, is_recurring: newPost.is_recurring ?? false }]
                .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedPost = payload.new as ScheduledPost;
            setPosts(prev => prev.map(p => 
              p.id === updatedPost.id ? { ...updatedPost, is_recurring: updatedPost.is_recurring ?? false } : p
            ).sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setPosts(prev => prev.filter(p => p.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, activeWorkspaceId, fetchPosts]);

  return {
    posts,
    loading,
    error,
    fetchPosts,
    createPost,
    updatePost,
    deletePost,
  };
}
