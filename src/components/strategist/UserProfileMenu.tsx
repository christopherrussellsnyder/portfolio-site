import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, User, HelpCircle, LogOut, CreditCard, ChevronUp, BarChart3, FileText, Image, Sparkles, Clapperboard, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { supabase } from '@/integrations/supabase/client';
import { KorexMark } from '@/components/branding/KorexMark';

export function UserProfileMenu() {
  const { user, loading, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { planLabel, subscribed, tier } = useSubscription();
  const navigate = useNavigate();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (loading) {
    return (
      <div className="p-4 border-t border-[hsl(var(--border-subtle))] flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const email = user.email || '';
  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const avatarUrl = user.user_metadata?.avatar_url;

  const badgeColor = subscribed
    ? 'bg-green-500/20 text-green-400'
    : 'bg-border text-[hsl(var(--text-tertiary))]';

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to log out. Please try again.');
    } finally {
      setIsLoggingOut(false);
      setLogoutDialogOpen(false);
    }
  };

  const handleManageBilling = async () => {
    if (!subscribed) {
      navigate('/pricing');
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch {
      navigate('/pricing');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="w-full flex items-center gap-3 p-4 border-t border-[hsl(var(--border-subtle))] bg-secondary hover:bg-surface-tertiary transition-colors duration-200 cursor-pointer focus:outline-none group"
            aria-label="User profile menu"
          >
            <div className="relative flex-shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-transparent group-hover:border-primary/30 transition-all duration-200 group-hover:shadow-[0_0_12px_hsl(var(--primary) / 0.3)]"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-sm font-bold tracking-wider border-2 border-transparent group-hover:border-primary/30 transition-all duration-200 group-hover:shadow-[0_0_12px_hsl(var(--primary) / 0.3)]">
                  {initials}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-secondary" />
            </div>

            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-foreground truncate tracking-wide">
                {fullName}
              </p>
              <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badgeColor}`}>
                {planLabel}
              </span>
            </div>

            <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 group-hover:text-foreground transition-colors" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="top"
          align="start"
          sideOffset={4}
          className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[240px] bg-secondary border border-[hsl(var(--border-subtle))] rounded-lg shadow-xl p-1"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-3 py-3 border-b border-[hsl(var(--border-subtle))] mb-1">
            <KorexMark className="w-6 h-6" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
          </div>

          <DropdownMenuItem
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md hover:bg-surface-tertiary focus:bg-surface-tertiary transition-colors"
            onClick={() => navigate('/insights')}
          >
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Insights</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md hover:bg-surface-tertiary focus:bg-surface-tertiary transition-colors"
            onClick={() => navigate('/strategies')}
          >
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Strategies</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md hover:bg-surface-tertiary focus:bg-surface-tertiary transition-colors"
            onClick={() => navigate('/research')}
          >
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Research</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md hover:bg-surface-tertiary focus:bg-surface-tertiary transition-colors"
            onClick={() => navigate('/content-generation')}
          >
            <Clapperboard className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Content Generation</span>
          </DropdownMenuItem>


          <DropdownMenuItem
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md hover:bg-surface-tertiary focus:bg-surface-tertiary transition-colors"
            onClick={() => navigate('/media')}
          >
            <Image className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Media</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-[hsl(var(--border-subtle))]" />

          <DropdownMenuItem
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md hover:bg-surface-tertiary focus:bg-surface-tertiary transition-colors"
            onSelect={(e) => {
              e.preventDefault();
              toggleTheme();
            }}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Moon className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
              {theme}
            </span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-[hsl(var(--border-subtle))]" />


          <DropdownMenuItem
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md hover:bg-surface-tertiary focus:bg-surface-tertiary transition-colors"
            onClick={() => navigate('/settings')}
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Settings</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md hover:bg-surface-tertiary focus:bg-surface-tertiary transition-colors"
            onClick={handleManageBilling}
          >
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{subscribed ? 'Manage Billing' : 'Upgrade Plan'}</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-[hsl(var(--border-subtle))]" />

          <DropdownMenuItem
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md hover:bg-surface-tertiary focus:bg-surface-tertiary transition-colors"
            onClick={() => navigate('/help')}
          >
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Get Help</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-[hsl(var(--border-subtle))]" />

          <DropdownMenuItem
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md text-error hover:bg-error/10 focus:bg-error/10 focus:text-error transition-colors"
            onClick={() => setLogoutDialogOpen(true)}
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Log Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Logout confirmation */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out of Korex?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out? You'll need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoggingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="bg-error hover:bg-error/90"
            >
              {isLoggingOut ? 'Logging out...' : 'Log Out'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
