import { Link } from 'react-router-dom';
import {
  Brain, BarChart3, MessageSquare, Users, FileText, Video,
  Image as ImageIcon, Search, SplitSquareHorizontal, Building2,
  FileBarChart, Tag, ArrowRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { KorexLogoLockup } from '@/components/branding/KorexLogoLockup';
import { Seo } from '@/components/Seo';

const features = [
  {
    icon: Brain,
    title: 'Ultra-Intelligence Strategy Engine',
    description: 'Every strategy is grounded in live signal: real search demand, competitor ad recon from public ad libraries, Reddit voice-of-customer mining, and a deep crawl of your own product pages — then scored and rewritten by a "CMO Critic" pass before you ever see it.',
  },
  {
    icon: Search,
    title: 'Research Analysis',
    description: 'Industry trend reports and personalized market research built for your niche, so you know what is actually working right now instead of guessing from last year\'s playbook.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Intelligence',
    description: 'Upload screenshots or exports from Meta, Instagram, TikTok, Google and beyond. Korex extracts the metrics, scores performance health, surfaces trends, and feeds those wins back into your next strategy.',
  },
  {
    icon: Video,
    title: 'AI Video Ads',
    description: 'Studio-grade UGC-style video ads from a three-step flow: script, cast your AI actor and voice, render. Production quality on par with the best dedicated ad-video tools — inside the same workspace as your strategy.',
  },
  {
    icon: ImageIcon,
    title: 'AI Image Studio',
    description: 'A two-stage generation pipeline — cinematic art direction first, flagship image model second — for on-brand creative that looks art-directed, not auto-generated.',
  },
  {
    icon: SplitSquareHorizontal,
    title: 'Caption A/B Variants',
    description: 'Every post ships with multiple caption angles and hook framings scored for strength, so you can test copy instead of committing to one guess.',
  },
  {
    icon: FileText,
    title: 'Organic, Paid, or Hybrid Modes',
    description: 'Choose how you want to grow. Korex builds organic content plans, paid campaign structures with CBO/ABO recommendations, or a hybrid of both — matched to your budget and stage.',
  },
  {
    icon: Users,
    title: 'Audience & Demographic Targeting',
    description: 'Define exact age ranges, behaviors, and buying motivations. Strategies are anchored to your specific audience and product differentiators, so no two businesses in the same niche get the same plan.',
  },
  {
    icon: Tag,
    title: 'Promotions & Offer Awareness',
    description: 'Add your live sales, discounts, and seasonal offers to your business context and Korex weaves them into the calendar at the right moments.',
  },
  {
    icon: MessageSquare,
    title: 'AI Strategist Chat',
    description: 'Ask anything, any time. Korex holds your full business context — brand, audience, analytics, past strategies — and answers like a strategist who already knows the account.',
  },
  {
    icon: Building2,
    title: 'Multi-Brand Workspaces',
    description: 'Run multiple brands or clients side by side with isolated data, separate business context, and team seats for collaborators.',
  },
  {
    icon: FileBarChart,
    title: 'White-Label Client Reports',
    description: 'Export branded reports or share a public link. Agencies deliver polished, client-ready intelligence without rebuilding a deck every month.',
  },
];


export default function Features() {
  return (
    <>
      <Seo
        title="Marketing Intelligence Features | Korex"
        description="Live-data AI strategy generation, market research analysis, AI video ads, image studio, caption A/B testing, multi-brand workspaces and white-label reports."
        path="/features"
      />

      <div className="min-h-screen bg-background text-foreground">
        {/* Navbar */}
        <nav className="border-b border-border px-4 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link to="/">
              <KorexLogoLockup height={32} showTagline={false} />
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/features" className="text-primary">Features</Link>
              <Link to="/how-it-works" className="hover:text-foreground transition-colors">How It Works</Link>
              <Link to="/demo" className="hover:text-foreground transition-colors">Demo</Link>
              <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
              <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
              <Link to="/signup" className="text-sm px-4 py-2 bg-primary text-white rounded-sm hover:bg-[hsl(var(--primary-dark))] transition-colors">Get Started</Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="py-24 px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="text-4xl sm:text-5xl lg:text-[56px] font-semibold mb-6">
              One Platform From Strategy to{' '}
              <span className="text-primary">Finished Ad Creative</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              Every output starts with evidence: live search demand, competitor ad recon, buyer language, your own site and
              your own analytics. Korex builds the strategy from that, produces the creative, and reports on what worked.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}>
              <Link to="/signup" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-[hsl(var(--primary-dark))] text-white text-lg font-bold rounded-sm hover:scale-105 transition-all shadow-[0_0_30px_hsl(var(--primary) / 0.3)]">
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Under the hood */}
        <section className="py-20 px-4 border-y border-border">
          <div className="max-w-5xl mx-auto">
            <p className="eyebrow mb-4">Under the hood</p>
            <h2 className="text-3xl font-semibold mb-4 max-w-3xl">Two engines do the heavy lifting</h2>
            <p className="text-muted-foreground max-w-3xl leading-relaxed mb-12">
              Most tools are a prompt with a nice interface. Korex runs a research pipeline before any writing happens, and
              a review pass after. Here is what each engine is actually doing, without the jargon.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-sm p-7">
                <div className="flex items-center gap-3 mb-4">
                  <Search className="w-5 h-5 text-primary" />
                  <h3 className="font-bold">Research Analysis engine</h3>
                </div>
                <ol className="space-y-3 text-sm text-muted-foreground leading-relaxed list-decimal pl-4">
                  <li>Queries live search demand to see what your market is actively looking for right now.</li>
                  <li>Pulls ads currently running in your niche from public ad libraries and breaks down their hooks, offers and formats.</li>
                  <li>Mines community discussion so we capture the exact words buyers use to describe the problem.</li>
                  <li>Extracts the organic patterns performing per platform — hook style, format, length, cadence.</li>
                  <li>De-duplicates, scores relevance and discards anything that cannot be traced to a source.</li>
                  <li>Caches the result per niche and refreshes it on a rolling 24-hour cycle.</li>
                </ol>
              </div>

              <div className="bg-card border border-border rounded-sm p-7">
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="w-5 h-5 text-primary" />
                  <h3 className="font-bold">Strategy generation engine</h3>
                </div>
                <ol className="space-y-3 text-sm text-muted-foreground leading-relaxed list-decimal pl-4">
                  <li>Crawls your website to learn your real offer, pricing, positioning and proof.</li>
                  <li>Parses any analytics you have uploaded to learn what already performs for your audience.</li>
                  <li>Layers in your stated audience demographics and differentiators so two businesses in one niche never get the same plan.</li>
                  <li>Applies platform distribution logic — how each network ranks and surfaces content — to choose format, hook and timing.</li>
                  <li>Selects the paid campaign structure that fits your budget and stage (CBO, ABO or Advantage+).</li>
                  <li>Hands the draft to a critic model that attacks weak angles and rewrites them before delivery.</li>
                </ol>
              </div>
            </div>

            <div className="border-l-2 border-[hsl(var(--accent-gold))] pl-6 py-2 mt-10 max-w-3xl">
              <p className="text-foreground leading-relaxed">
                The short version: we do not ask an AI what it thinks might work. We collect what is already working in your
                market, prove it against your own business data, and only then write the plan.
              </p>
            </div>
          </div>
        </section>


        {/* Features Grid */}
        <section className="py-24 px-4 bg-muted">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="bg-card border border-border rounded-sm p-8 hover:border-[hsl(var(--primary)/0.5)] transition-all group">
                  <div className="w-14 h-14 rounded-sm bg-[hsl(var(--primary)/0.1)] flex items-center justify-center mb-6 group-hover:bg-[hsl(var(--primary)/0.2)] transition-colors">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-24 px-4 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary)/0.05)] to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-semibold mb-6">
              Ready to Outperform Your Competition?
            </h2>
            <Link to="/signup" className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-primary to-[hsl(var(--primary-dark))] text-white text-lg font-bold rounded-sm hover:scale-105 transition-all shadow-[0_0_30px_hsl(var(--primary) / 0.3)]">
              Start Free Today <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-background border-t border-border py-8 px-4">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[hsl(var(--text-tertiary))]">© 2026 Korex Intelligence Systems. All rights reserved.</p>
            <div className="flex items-center gap-4 text-xs text-[hsl(var(--text-tertiary))]">
              <Link to="/features" className="hover:text-primary transition-colors">Features</Link>
              <Link to="/about" className="hover:text-primary transition-colors">About</Link>
              <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
              <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
