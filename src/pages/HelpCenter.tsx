import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Book, Video, MessageCircle, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Seo } from '@/components/Seo';

interface Article {
  id: string;
  category: string;
  title: string;
  description: string;
  content: string;
}

const articles: Article[] = [
  {
    id: '1',
    category: 'Getting Started',
    title: 'Quick Start Guide',
    description: 'Get started with Korex in 5 minutes',
    content: `Welcome to Korex Intelligence! Here's how to get started:

**Step 1: Connect Your Social Accounts**
Navigate to Settings → Connected Accounts and link your social media platforms.

**Step 2: Create Your First Post**
Go to the Scheduler and click "Create Post". Write your content or use AI to generate it.

**Step 3: Use AI Content Generation**
In the Content AI section, describe your topic and let AI create engaging content for you.

**Step 4: Schedule and Publish**
Choose when to publish your post and select which platforms to post to.

**Step 5: Track Performance**
Monitor your posts' performance in the Analytics dashboard.`
  },
  {
    id: '2',
    category: 'Content AI',
    title: 'AI Content Generator Guide',
    description: 'Master AI-powered content creation',
    content: `Learn how to create amazing content with AI:

**Using the AI Generator**
1. Navigate to Content AI
2. Enter a topic or description
3. Select your preferred tone (Professional, Casual, etc.)
4. Choose content length
5. Click Generate

**Tips for Better Results**
- Be specific about your topic
- Include relevant keywords
- Specify your target audience
- Mention any key points to include

**Saving Content**
Generated content is automatically saved to your Content Library for future use.`
  },
  {
    id: '3',
    category: 'Scheduler',
    title: 'Scheduling Posts',
    description: 'Learn all scheduling features',
    content: `Master the post scheduler:

**Creating a Scheduled Post**
1. Click "Create Post" in the Scheduler
2. Write or paste your content
3. Select target platforms
4. Choose date and time
5. Click Schedule

**Views**
- **Calendar View**: See all posts on a calendar
- **List View**: View posts in a list format
- **Queue View**: Manage your posting queue

**Best Times**
Korex suggests optimal posting times based on your audience engagement patterns.

**Recurring Posts**
Set up posts to repeat daily, weekly, or monthly.`
  },
  {
    id: '4',
    category: 'Analytics',
    title: 'Understanding Analytics',
    description: 'Track and improve performance',
    content: `Make data-driven decisions with analytics:

**Key Metrics**
- **Reach**: How many people saw your content
- **Engagement**: Likes, comments, shares
- **Click-through Rate**: Link clicks
- **Conversion Rate**: Goal completions

**Reports**
Generate custom reports for any date range and export as PDF or CSV.

**Insights**
AI-powered insights help you understand what content performs best.`
  },
  {
    id: '5',
    category: 'Troubleshooting',
    title: 'Common Issues & Solutions',
    description: 'Quick fixes for common problems',
    content: `Solutions to common issues:

**Connection Failed**
- Go to Settings → Connected Accounts
- Disconnect and reconnect the account
- Ensure you have the correct permissions

**Post Failed to Publish**
- Check your account connection status
- Verify content meets platform requirements
- Check for rate limits

**AI Generation Not Working**
- Check your usage quota
- Try a simpler prompt
- Upgrade your plan for more requests

**Need More Help?**
Contact support at support@korex.io`
  },
  {
    id: '6',
    category: 'Getting Started',
    title: 'Connecting Social Accounts',
    description: 'Link your social media platforms',
    content: `Connect your social media accounts:

**Supported Platforms**
- Facebook (Pages & Groups)
- Instagram (Business accounts)
- Twitter/X
- LinkedIn (Personal & Company pages)
- TikTok

**How to Connect**
1. Go to Settings → Connected Accounts
2. Click "Connect" next to the platform
3. Authorize Korex in the popup
4. Select which accounts to link

**Permissions Required**
- Read and write posts
- Access analytics
- Manage comments (optional)`
  }
];

export default function HelpCenter() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<Article | null>(null);
  const navigate = useNavigate();

  const categories = ['All', ...Array.from(new Set(articles.map(a => a.category)))];
  
  const filtered = articles.filter(a => 
    (category === 'All' || a.category === category) &&
    (search === '' || 
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase()))
  );

  if (selected) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => setSelected(null)} 
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Help Center
          </Button>
          
          <Card>
            <CardHeader>
              <span className="text-sm text-primary font-medium">{selected.category}</span>
              <CardTitle className="text-2xl">{selected.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-invert max-w-none">
                {selected.content.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <h3 key={i} className="text-lg font-semibold text-foreground mt-6 mb-2">{line.replace(/\*\*/g, '')}</h3>;
                  }
                  if (line.startsWith('- ')) {
                    return <li key={i} className="text-muted-foreground ml-4">{line.substring(2)}</li>;
                  }
                  if (line.match(/^\d\./)) {
                    return <li key={i} className="text-muted-foreground ml-4 list-decimal">{line.substring(3)}</li>;
                  }
                  return line ? <p key={i} className="text-muted-foreground mb-2">{line}</p> : <br key={i} />;
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <Seo
        title="Help Center | Korex Intelligence Systems"
        description="Guides and answers for Korex Intelligence Systems: getting started, generating strategies, analytics uploads, AI content generation, billing and account setup."
        path="/help"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: articles.map((a) => ({
            '@type': 'Question',
            name: a.title,
            acceptedAnswer: { '@type': 'Answer', text: a.description },
          })),
        }}
      />
      <div className="bg-primary py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-primary-foreground mb-6">How can we help?</h1>
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              aria-label="Search help articles"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for help articles..."
              className="w-full pl-12 py-6 text-lg bg-background"
            />
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setCategory('Getting Started')}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-primary/10 rounded-sm">
                <Book className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Getting Started</h3>
                <p className="text-sm text-muted-foreground">New to Korex? Start here</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setCategory('Content AI')}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-primary/10 rounded-sm">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Video Tutorials</h3>
                <p className="text-sm text-muted-foreground">Watch and learn</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/contact')}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-primary/10 rounded-sm">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Contact Support</h3>
                <p className="text-sm text-muted-foreground">Get personalized help</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(c => (
            <Button
              key={c}
              variant={category === c ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(c)}
            >
              {c}
            </Button>
          ))}
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(article => (
            <Card 
              key={article.id} 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setSelected(article)}
            >
              <CardContent className="p-6">
                <span className="text-xs text-primary font-medium">{article.category}</span>
                <h3 className="text-foreground font-semibold mt-2 mb-1">{article.title}</h3>
                <p className="text-sm text-muted-foreground">{article.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No articles found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
