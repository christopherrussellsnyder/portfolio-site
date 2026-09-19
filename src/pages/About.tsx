import { Link } from 'react-router-dom';
import {
  Database, Sparkles, Zap, ArrowRight, Brain, Search, Video,
  Image as ImageIcon, Building2, FileBarChart,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { KorexLogoLockup } from '@/components/branding/KorexLogoLockup';
import { Seo } from '@/components/Seo';

const beliefs = [
  {
    icon: Database,
    title: 'Evidence Beats Opinion',
    description: 'Every recommendation should trace back to a real signal — live search demand, a running competitor ad, or your own performance data.',
  },
  {
    icon: Sparkles,
    title: 'The Process Is the Product',
    description: 'Anyone can output a content calendar. The value is in the research pipeline and the review pass that happen before it is written.',
  },
  {
    icon: Zap,
    title: 'Sophistication Should Be Legible',
    description: 'A deep system is worthless if you cannot understand what it did. We explain the reasoning in plain language, every time.',
  },
];

const capabilities = [
  {
    icon: Brain,
    title: 'Live-Data Strategy Engine',
    description: 'Strategies grounded in real search demand, competitor ad recon, community sentiment, and a crawl of your own product pages — then critiqued and rewritten before delivery.',
  },
  {
    icon: Search,
    title: 'Research Analysis',
    description: 'Industry trend intelligence and personalized market research so you act on what is working now, not last year.',
  },
  {
    icon: Video,
    title: 'AI Video Ads',
    description: 'Script, cast an AI actor and voice, render. Studio-grade UGC-style ads produced inside the same workspace as the strategy that called for them.',
  },
  {
    icon: ImageIcon,
    title: 'AI Image Studio',
    description: 'A two-stage pipeline — cinematic art direction, then flagship rendering — for creative that looks art-directed rather than auto-generated.',
  },
  {
    icon: Building2,
    title: 'Multi-Brand Workspaces',
    description: 'Isolated data, business context, and team seats for every brand or client you run.',
  },
  {
    icon: FileBarChart,
    title: 'White-Label Client Reports',
    description: 'Branded exports and shareable public links that turn raw performance into a deliverable.',
  },
];


export default function About() {
  return (
    <>
      <Seo
        title="About Korex Intelligence Systems"
        description="How Korex works: a live research pipeline, business-grounded strategy generation and a senior-strategist review pass on every marketing plan we produce."
        path="/about"
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
              <Link to="/demo" className="hover:text-foreground transition-colors">Demo</Link>
              <Link to="/about" className="text-primary">About</Link>
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
              We Built the Research Desk{' '}
              <span className="text-primary">Most Businesses Can't Afford</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Korex Intelligence Systems reads your market the way a well-resourced strategy team would — then explains its
              reasoning in language any owner can act on.
            </motion.p>
          </div>
        </section>

        {/* Mission */}
        <section className="py-24 px-4 bg-muted">
          <div className="max-w-3xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <h2 className="text-3xl font-semibold mb-6">Our Mission</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Large companies do not out-market small ones because they are more creative. They do it because they can pay
                for research: analysts watching search demand, teams tearing down competitor campaigns, strategists testing
                positioning against real data. That research layer is the advantage — and it has always been priced out of
                reach. Korex rebuilds it as software. The same evidence gathering, the same rigour, the same senior-level
                review of the work — running automatically for a business of any size, and explained clearly enough that you
                do not need a marketing background to use it.
              </p>
            </motion.div>
          </div>
        </section>

        {/* How it actually works */}
        <section className="py-24 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-semibold mb-4">How It Actually Works</h2>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mb-12">
              Our value is not the document you receive. It is everything that happens before it is written.
            </p>
            <div className="space-y-6">
              {[
                { n: '01', t: 'We gather evidence, not opinions', b: 'Live search demand, competitor ads currently running in your niche, and the language real buyers use to describe the problem — collected fresh, on a rolling 24-hour cycle.' },
                { n: '02', t: 'We ground it in your business', b: 'Your website is crawled for offer, pricing and positioning. Your uploaded analytics are parsed for what already works. Your stated audience and differentiators anchor the plan so it cannot drift generic.' },
                { n: '03', t: 'We apply platform mechanics', b: 'Each network distributes content differently. Format, hook length, posting cadence and paid campaign structure are chosen against how that platform actually ranks — not a one-size template.' },
                { n: '04', t: 'We review before you see it', b: 'A second model reads the draft like a senior strategist, challenges weak angles and rewrites them. You receive the revised version, with the reasoning attached.' },
              ].map((s) => (
                <div key={s.n} className="flex gap-6 border-t border-border pt-6">
                  <span className="text-primary font-semibold text-sm pt-1 shrink-0">{s.n}</span>
                  <div>
                    <h3 className="font-bold mb-2">{s.t}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-3xl">{s.b}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Beliefs */}
        <section className="py-24 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {beliefs.map((belief, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.15 }}
                  className="bg-card border border-border rounded-sm p-8 hover:border-[hsl(var(--primary)/0.5)] transition-all">
                  <div className="w-12 h-12 rounded-sm bg-[hsl(var(--primary)/0.1)] flex items-center justify-center mb-5">
                    <belief.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-3">{belief.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{belief.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Platform */}
        <section className="py-24 px-4 bg-muted">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-semibold mb-6">The Korex Platform</h2>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl">
              Korex Intelligence Systems is a full-stack marketing intelligence platform. It researches your market with live data, builds the strategy, writes the copy, produces the creative, and reports on the results — in one workspace.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
              {capabilities.map((c, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="bg-card border border-border rounded-sm p-6 hover:border-[hsl(var(--primary)/0.5)] transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <c.icon className="w-5 h-5 text-primary" />
                    <h3 className="font-bold">{c.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">{c.description}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-10">
              <Link to="/features" className="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all">
                See every feature <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>


        {/* Bottom CTA */}
        <section className="py-24 px-4 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary)/0.05)] to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-6">
              Join the future of marketing intelligence.
            </h2>
            <Link to="/signup" className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-primary to-[hsl(var(--primary-dark))] text-white text-lg font-bold rounded-sm hover:scale-105 transition-all shadow-[0_0_30px_hsl(var(--primary) / 0.3)]">
              Get Started Free <ArrowRight className="w-5 h-5" />
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
