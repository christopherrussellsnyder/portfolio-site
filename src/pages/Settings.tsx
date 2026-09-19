import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { 
  User, Palette, Bell, Settings as SettingsIcon, 
  CreditCard, Info, Loader2, Save, ArrowLeft,
  Upload, Globe, Sparkles, RefreshCw, Building2
} from 'lucide-react';
import { BusinessInformationSection } from '@/components/settings/BusinessInformationSection';
import { WorkspacesSection } from '@/components/settings/WorkspacesSection';
import { TeamMembersSection } from '@/components/settings/TeamMembersSection';
import { BrandKitSection } from '@/components/settings/BrandKitSection';
import { TwoFactorSection } from '@/components/settings/TwoFactorSection';
import { AdAccountsSection } from '@/components/settings/AdAccountsSection';
import { Users, Megaphone } from 'lucide-react';
import { KorexMark } from '@/components/branding/KorexMark';

type SettingsTab = 'profile' | 'workspaces' | 'team' | 'brandkit' | 'business' | 'ai' | 'ads' | 'notifications' | 'billing' | 'about';

interface UserProfile {
  fullName: string;
  email: string;
  avatarUrl: string;
}

interface AIPreferences {
  contentCreativity: number;
  copyLength: string;
  promotionalIntensity: number;
  autoHashtags: boolean;
  bestTimeSuggestions: boolean;
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const initialTab = (searchParams.get('tab') as SettingsTab) || 'profile';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    fullName: '',
    email: user?.email || '',
    avatarUrl: ''
  });
  
  // AI Preferences state
  const [aiPreferences, setAiPreferences] = useState<AIPreferences>({
    contentCreativity: 70,
    copyLength: 'medium',
    promotionalIntensity: 50,
    autoHashtags: true,
    bestTimeSuggestions: true
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    weeklyReport: true,
    strategyReminders: true
  });
  
  // Load all settings on mount
  useEffect(() => {
    if (user) {
      loadAllSettings();
    }
  }, [user]);

  const loadAllSettings = async () => {
    if (!user) return;
    setIsLoadingSettings(true);
    
    try {
      const { data: profileResult } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileResult) {
        setProfile(prev => ({
          ...prev,
          fullName: profileResult.full_name || '',
          avatarUrl: profileResult.avatar_url || ''
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPG, PNG, or GIF image.',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 5MB.',
        variant: 'destructive'
      });
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      setProfile(prev => ({ ...prev, avatarUrl: publicUrl }));
      
      toast({
        title: 'Photo uploaded',
        description: 'Your profile photo has been updated.'
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload photo.',
        variant: 'destructive'
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          full_name: profile.fullName,
          avatar_url: profile.avatarUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;

      // Also update auth user_metadata so avatar syncs across the app
      await supabase.auth.updateUser({
        data: {
          full_name: profile.fullName,
          avatar_url: profile.avatarUrl,
        }
      });
      
      toast({
        title: 'Settings saved',
        description: 'Your profile has been updated.'
      });
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error.message || 'Failed to save settings.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'workspaces' as const, label: 'Workspaces', icon: Building2 },
    { id: 'team' as const, label: 'Team', icon: Users },
    { id: 'brandkit' as const, label: 'Brand Kit', icon: Palette },
    { id: 'business' as const, label: 'Business Context', icon: Globe },
    { id: 'ai' as const, label: 'AI Preferences', icon: Sparkles },
    { id: 'ads' as const, label: 'Ad Accounts', icon: Megaphone },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'billing' as const, label: 'Billing', icon: CreditCard },
    { id: 'about' as const, label: 'About', icon: Info }
  ];

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Profile</h2>
        <p className="text-sm text-muted-foreground">Manage your personal information</p>
      </div>
      
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-3xl font-bold text-white overflow-hidden">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  profile.fullName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'
                )}
              </div>
              <input
                type="file"
                ref={photoInputRef}
                onChange={handlePhotoUpload}
                accept="image/jpeg,image/png,image/gif"
                className="hidden"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute -bottom-2 -right-2 rounded-full"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              </Button>
            </div>
            
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  placeholder="Enter your name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button onClick={saveProfile} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <TwoFactorSection />

      <Card className="bg-card border-border border-destructive/50">

        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sign Out</p>
              <p className="text-sm text-muted-foreground">Sign out of your account</p>
            </div>
            <Button variant="outline" onClick={() => signOut()}>
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderBusinessTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Business Context</h2>
        <p className="text-sm text-muted-foreground">
          This information helps AI generate better strategies. You can update it anytime or re-analyze your website.
        </p>
      </div>
      
      <BusinessInformationSection />
    </div>
  );

  const renderAIPreferencesTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">AI Preferences</h2>
        <p className="text-sm text-muted-foreground">Customize how AI generates content for you</p>
      </div>
      
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Content Style</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Content Creativity</Label>
              <span className="text-sm text-muted-foreground">{aiPreferences.contentCreativity}%</span>
            </div>
            <Slider
              value={[aiPreferences.contentCreativity]}
              onValueChange={([value]) => setAiPreferences({ ...aiPreferences, contentCreativity: value })}
              max={100}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Conservative</span>
              <span>Creative</span>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label>Default Copy Length</Label>
            <Select 
              value={aiPreferences.copyLength} 
              onValueChange={(v) => setAiPreferences({ ...aiPreferences, copyLength: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short (50-100 words)</SelectItem>
                <SelectItem value="medium">Medium (100-200 words)</SelectItem>
                <SelectItem value="long">Long (200+ words)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Promotional Intensity</Label>
              <span className="text-sm text-muted-foreground">{aiPreferences.promotionalIntensity}%</span>
            </div>
            <Slider
              value={[aiPreferences.promotionalIntensity]}
              onValueChange={([value]) => setAiPreferences({ ...aiPreferences, promotionalIntensity: value })}
              max={100}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Educational</span>
              <span>Sales-focused</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Smart Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-generate Hashtags</Label>
              <p className="text-sm text-muted-foreground">AI suggests relevant hashtags</p>
            </div>
            <Switch
              checked={aiPreferences.autoHashtags}
              onCheckedChange={(checked) => setAiPreferences({ ...aiPreferences, autoHashtags: checked })}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Best Time Suggestions</Label>
              <p className="text-sm text-muted-foreground">Show optimal posting times</p>
            </div>
            <Switch
              checked={aiPreferences.bestTimeSuggestions}
              onCheckedChange={(checked) => setAiPreferences({ ...aiPreferences, bestTimeSuggestions: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Notifications</h2>
        <p className="text-sm text-muted-foreground">Control your notification preferences</p>
      </div>
      
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Email Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive updates via email</p>
            </div>
            <Switch
              checked={notifications.emailNotifications}
              onCheckedChange={(checked) => setNotifications({ ...notifications, emailNotifications: checked })}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Weekly Performance Report</Label>
              <p className="text-sm text-muted-foreground">Get a summary every week</p>
            </div>
            <Switch
              checked={notifications.weeklyReport}
              onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyReport: checked })}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Strategy Reminders</Label>
              <p className="text-sm text-muted-foreground">Reminders to post content</p>
            </div>
            <Switch
              checked={notifications.strategyReminders}
              onCheckedChange={(checked) => setNotifications({ ...notifications, strategyReminders: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderBillingTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Billing</h2>
        <p className="text-sm text-muted-foreground">Manage your subscription and billing</p>
      </div>
      
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Badge className="bg-primary text-primary-foreground font-semibold mb-2">Free Plan</Badge>
              <p className="text-sm text-muted-foreground">Basic features included</p>
            </div>
            <Button>Upgrade Plan</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAboutTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">About Korex</h2>
        <p className="text-sm text-muted-foreground">Application information</p>
      </div>
      
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <KorexMark className="w-16 h-16 rounded-xl" />
            <div>
              <h3 className="text-xl font-bold">Korex</h3>
              <p className="text-sm text-muted-foreground">Intelligence Systems • Version 2.0.0</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Korex Intelligence Systems — Upload analytics, analyze your business, and generate winning content strategies.
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/help')}>
            Help Center
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/terms')}>
            Terms of Service
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/privacy')}>
            Privacy Policy
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'profile': return renderProfileTab();
      case 'workspaces': return <WorkspacesSection />;
      case 'team': return <TeamMembersSection />;
      case 'brandkit': return <BrandKitSection />;
      case 'business': return renderBusinessTab();
      case 'ai': return renderAIPreferencesTab();
      case 'ads': return <AdAccountsSection />;
      case 'notifications': return renderNotificationsTab();
      case 'billing': return renderBillingTab();
      case 'about': return renderAboutTab();
      default: return renderProfileTab();
    }
  };

  if (isLoadingSettings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button aria-label="Go back" variant="ghost" size="icon" onClick={() => navigate('/ai-strategist')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary border-l-2 border-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
