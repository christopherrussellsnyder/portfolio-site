import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Database, Sparkles, LineChart, Layers, Shield, Repeat, Target, Zap } from 'lucide-react';
import { KorexLogoLockup } from '@/components/branding/KorexLogoLockup';
import { Seo } from '@/components/Seo';

const pipelineSteps = [
  {
    icon: Database,
    title: '1. Context Ingestion',
    body: 'Korex pulls your website analysis, business profile, target audience demographics, active promotions, past uploaded analytics, and top-performing historical posts. Every strategy starts anchored in your specific business — not a generic niche template.',
  },
  {
    icon: Shield,
    title: '2. Anti-Oversaturation Layer',
    body: 'Your unique differentiators — audience age, buying behavior, product angles, brand values — are injected directly into the prompt. Two fitness coaches in the same niche receive completely different strategies from Korex.',
  },
  {
    icon: Repeat,
    title: '3. Insights Feedback Loop',
    body: 'The AI queries your own historical winners (from uploaded analytics) and calibrates predictions against your baseline. You get compounding returns as you upload more results.',
  },
  {
    icon: Target,
    title: '4. Live Campaign Intelligence',
    body: 'Korex maintains a refreshed database of what CBO / ABO / Advantage+ / Performance Max structures are currently outperforming per platform and niche — refreshed automatically each week.',
  },
  {
    icon: Sparkles,
    title: '5. Post-by-Post Generation',
    body: 'Gemini 3 Flash generates 7 or 14 days of posts in batches of 10 — each with a hook, caption, hashtag strategy, CTA, visual guidance, predicted metrics, and strategic rationale tied back to a real business input.',
  },
  {
    icon: Layers,
    title: '6. Versioning + Storage',
    body: 'Every strategy is saved with a version number so you can iterate, compare, and learn from what actually performs. Nothing is throwaway — everything compounds.',
  },
];

const otherFeatures = [
  {
    icon: Sparkles,
    title: 'Research Analysis (standalone)',
    body: 'A dedicated research dashboard that continuously surfaces what is actually working right now on every major platform — trending hooks, top-performing formats, content patterns, hashtag strategy, CTA templates, and paid campaign intelligence. Refreshed every 24 hours and reused inside every strategy generation so your plans are always calibrated to current-market signals, not last year\'s playbook.',
  },
  {
    icon: LineChart,
    title: 'Insights (Analytics Analysis)',
    body: 'Upload a screenshot, PDF, or CSV from Meta, TikTok, or Google. Gemini Vision extracts the metrics, runs a 10-step analysis framework, and produces a 1-10 health score, benchmark comparison, trend detection, and specific recommendations that feed directly back into future strategy generations.',
  },
  {
    icon: Zap,
    title: 'AI Strategist Chat (Organic + Paid)',
    body: 'Every strategy can be generated as organic-only, paid-only, or a hybrid — you pick per plan. A four-level business context hierarchy plus your communication preferences are injected into every prompt so answers stay grounded in your business.',
  },
  {
    icon: Database,
    title: 'Website Analysis',
    body: 'A 10-phase audit that crawls up to 15 priority pages, extracts brand voice, offers, positioning, and audience signals — then feeds it all into the business context that powers every AI call.',
  },
];

const edges = [
  { edge: 'Real analytics ingestion', competitor: 'Most tools guess. Korex extracts insights from the actual screenshots you upload.' },
  { edge: 'Anti-oversaturation directive', competitor: 'Competitors give 10 users in the same niche the same output. Korex explicitly rejects it.' },
  { edge: 'Feedback loop on your own winners', competitor: 'Others rely on generic benchmarks. Korex learns from your data.' },
  { edge: 'Campaign structure intelligence', competitor: 'Most content tools ignore CBO / ABO / Advantage+ entirely.' },
  { edge: 'Promotions-aware generation', competitor: 'Strategies bake in your active discounts, launch dates, and codes automatically.' },
  { edge: 'Multi-brand workspaces + white label', competitor: 'Rare at this price point. Agencies run every client in one place.' },
];

export default function HowItWorks() {
  return (
    <>
      <Seo
        title="How Korex Builds a Marketing Strategy"
        description="See the pipeline behind every plan: analytics ingestion, competitor ad recon, anti-oversaturation logic, platform ranking models and a CMO-grade critic pass."
        path="/how-it-works"
      />

      <div className="min-h-screen bg-background text-foreground">
        {/* Navbar */}
        <nav className="border-b border-border px-4 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link to="/">
              <KorexLogoLockup height={32} showTagline={false} />
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/features" className="hover:text-foreground transition-colors">Features</Link>
              <Link to="/how-it-works" className="text-primary">How It Works</Link>
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="inline-block px-3 py-1 text-xs uppercase tracking-widest text-primary border border-[hsl(var(--primary)/0.3)] rounded-full mb-6">
                Under the Hood
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-semibold mb-6">
                How Korex{' '}
                <span className="text-primary">Actually Works</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                No black box. Here's exactly how we turn your business data into marketing strategies that beat generic AI output.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Pipeline */}
        <section className="py-16 px-4 bg-muted">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-semibold mb-3">
                The Strategy Generation Pipeline
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">Six stages, running every time you click "Generate Strategy."</p>
            </div>
            <div className="space-y-4">
              {pipelineSteps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="flex gap-5 bg-card border border-border rounded-sm p-6 hover:border-[hsl(var(--primary)/0.4)] transition-all"
                >
                  <div className="shrink-0 w-12 h-12 rounded-sm bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1.5">{step.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{step.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Other features */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-semibold mb-3">
                Beyond Strategy Generation
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">Every feature is built on the same principle: real data in, personalized output out.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {otherFeatures.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="bg-card border border-border rounded-sm p-6"
                >
                  <div className="w-12 h-12 rounded-sm bg-[hsl(var(--primary)/0.1)] flex items-center justify-center mb-4">
                    <f.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Competitive Edge */}
        <section className="py-20 px-4 bg-muted">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-semibold mb-3">
                Why Korex Beats Generic AI Tools
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">What we do differently — and why it produces measurably better strategies.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {edges.map((e, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="bg-card border border-border rounded-sm p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-2 h-2 mt-2 rounded-full bg-primary" />
                    <div>
                      <h4 className="font-bold text-foreground mb-1">{e.edge}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{e.competitor}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-4 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary)/0.05)] to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-semibold mb-6">
              See It Run on Your Business
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Run the full research pipeline on your own business and see the evidence behind every recommendation. Free to start — no credit card required.
            </p>
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
              <Link to="/how-it-works" className="hover:text-primary transition-colors">How It Works</Link>
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
