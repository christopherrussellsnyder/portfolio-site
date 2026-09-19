import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Brain, BarChart3, ChevronDown,
  Check, X, ArrowRight, Shield,
  Clock, DollarSign, Users, Zap,
  Lock, Globe, Award,
  Video, Search, Building2, FileBarChart, SplitSquareHorizontal,
  Image as ImageIcon,
} from 'lucide-react';

import { KorexLogoLockup } from '@/components/branding/KorexLogoLockup';
import { Seo } from '@/components/Seo';

// --- Section wrapper ---
const AnimatedSection = ({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, delay, ease: 'easeOut' }} className={className}>
      {children}
    </motion.div>
  );
};

// --- Data ---
const painPoints = [
  'Marketing advice based on opinion instead of current market evidence',
  'Generic AI that has never seen your website, your offer, or your numbers',
  'No visibility into what competitors in your niche are actually running',
  'Plans that ignore how each platform ranks and distributes content',
];

const howItWorks = [
  { icon: Search, title: 'We read the market', desc: 'Live search demand, competitor ads and community discussion in your niche are pulled in as evidence.' },
  { icon: Globe, title: 'We read your business', desc: 'Your site is crawled and your uploaded analytics parsed, so the plan is grounded in your real offer and real numbers.' },
  { icon: Brain, title: 'We build the plan', desc: 'Every post is written against platform ranking behaviour — hook, format, timing and campaign structure.' },
  { icon: Shield, title: 'We review it before you see it', desc: 'A senior-strategist critic pass challenges weak angles and rewrites the plan before delivery.' },
];

const comparisonData = [
  { label: 'Cost/Month', korex: '$99', agency: '$3-10K', freelancer: '$500-2K', chatgpt: '$20' },
  { label: 'Uses live market data', korex: true, agency: false, freelancer: false, chatgpt: false },
  { label: 'Competitor ad recon', korex: true, agency: true, freelancer: false, chatgpt: false },
  { label: 'Reads your own site & analytics', korex: true, agency: true, freelancer: false, chatgpt: false },
  { label: 'Platform ranking logic', korex: true, agency: false, freelancer: false, chatgpt: false },
  { label: 'Reviewed before delivery', korex: 'Critic pass', agency: 'Varies', freelancer: 'Rarely', chatgpt: 'Never' },
  { label: 'Shows its evidence', korex: true, agency: false, freelancer: false, chatgpt: false },
];

const techSteps = [
  { name: 'Demand capture', time: 'Search signals', details: ['Reads live search demand for your category', 'Separates what people are actively looking for from what is only trending'] },
  { name: 'Competitor ad recon', time: 'Paid signals', details: ['Pulls ads currently running in your niche', 'Breaks down the hooks, offers and formats behind them'] },
  { name: 'Sentiment mining', time: 'Community signals', details: ['Reads how real buyers describe the problem in their own words', 'Turns their language into hooks that sound human'] },
  { name: 'Business grounding', time: 'Your data', details: ['Crawls your website for offer, pricing and positioning', 'Parses uploaded analytics to learn what already performs for you'] },
  { name: 'Platform modelling', time: 'Distribution logic', details: ['Applies how each platform actually ranks content', 'Chooses format, hook length, posting cadence and campaign structure (CBO / ABO / Advantage+)'] },
  { name: 'Critic pass', time: 'Quality control', details: ['A second model attacks the draft like a senior strategist', 'Weak angles are rewritten before the plan reaches you'] },
];

const faqs = [
  { q: 'Is this just ChatGPT with a wrapper?', a: 'No. A general AI answers from memory. Korex runs a research pipeline first: it queries live search demand, pulls competitor ads currently running in your niche, mines how buyers describe the problem, crawls your own site, and parses your uploaded analytics. Only then does it write — and a second model reviews the draft before you see it.' },
  { q: 'Do I need to be tech-savvy?', a: 'No. The technical work happens on our side. You describe your business once, upload analytics if you have them, and read a plan written in plain language with the reasoning attached.' },
  { q: 'What platforms do you support?', a: 'Any platform you can screenshot or export. Instagram, Facebook, TikTok, Google Ads, LinkedIn, Twitter, YouTube, Pinterest, Shopify — if you have analytics, we can analyze them.' },
  { q: 'How is this different from a marketing agency?', a: 'An agency gives you a strategist\'s opinion, refreshed monthly. Korex gives you a research pipeline that re-reads your market every 24 hours, shows the evidence behind each recommendation, and lets you regenerate as often as you want — at $99/month instead of $3,000–$10,000.' },
  { q: 'What do I get with the free Starter plan?', a: 'You get 2 free strategy generations with no credit card required. After using them, you can upgrade to Pro for unlimited access or continue using basic features.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel in 2 clicks. No contracts, no commitments.' },
];

const platforms = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'Twitter', 'YouTube', 'Pinterest', 'Google Ads', 'Shopify'];

const capabilities = [
  { icon: Brain, title: 'Live-Data Strategy Engine', desc: 'Real search demand, competitor ad recon, and community sentiment feed every plan — then a CMO-grade critic pass rewrites it before you see it.' },
  { icon: Search, title: 'Research Analysis', desc: 'Industry trend reports and personalized market research for your exact niche.' },
  { icon: Video, title: 'AI Video Ads', desc: 'Script, cast an AI actor and voice, render. Studio-grade UGC ads without a film crew.' },
  { icon: ImageIcon, title: 'AI Image Studio', desc: 'Cinematic art direction plus flagship rendering for creative that looks art-directed.' },
  { icon: SplitSquareHorizontal, title: 'Caption A/B Variants', desc: 'Multiple hook angles per post, scored for strength, so you test copy instead of guessing.' },
  { icon: Building2, title: 'Multi-Brand Workspaces', desc: 'Run every brand or client side by side with isolated data and team seats.' },
  { icon: FileBarChart, title: 'White-Label Reports', desc: 'Branded client exports and shareable public report links.' },
  { icon: BarChart3, title: 'Analytics Intelligence', desc: 'Upload any platform export or screenshot — Korex scores it and feeds the wins back into your next strategy.' },
];

const pricing = [
  {
    name: 'Pro', monthlyPrice: 99, yearlyPrice: 831, popular: true,
    features: ['Unlimited AI strategies', 'Research analysis + live market data', 'AI image studio & video ads', 'Unlimited analytics uploads', 'Caption A/B variants', 'Priority support'],
  },
  {
    name: 'Agency', monthlyPrice: 299, yearlyPrice: 2511, popular: false,
    features: ['Everything in Pro', 'Multi-brand workspaces', 'Team seats', 'White-label client reports', 'Public report sharing', 'Dedicated support'],
    badge: 'Popular for agencies',
  },
];


const CellValue = ({ value }: { value: string | boolean }) => {
  if (typeof value === 'boolean') {
    return value ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-[hsl(var(--text-tertiary))] mx-auto" />;
  }
  return <span>{value}</span>;
};

const Index = () => {
  const [billingAnnual, setBillingAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showFloatingCta, setShowFloatingCta] = useState(false);
  const [floatingDismissed, setFloatingDismissed] = useState(false);


  useEffect(() => {
    const onScroll = () => setShowFloatingCta(window.scrollY > 800);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Seo
        title="AI Marketing Strategy Software | Korex Intelligence"
        description="Korex builds evidence-based social media and paid ad strategies from live search demand, competitor ad recon and your own analytics. 2 strategies free."
        path="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />

      {/* =================== HERO — editorial masthead =================== */}
      <section className="relative bg-muted border-b border-border px-6 sm:px-8 pt-16 pb-14 lg:pt-24 lg:pb-20">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="mb-12 flex w-full justify-center lg:mb-16">
            <KorexLogoLockup height={88} mdHeight={106} lgHeight={124} />
          </motion.div>

          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            <div className="lg:col-span-8">
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="eyebrow mb-5">
                Marketing Intelligence Platform
              </motion.p>

              <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
                className="text-4xl sm:text-5xl lg:text-[64px] font-semibold tracking-tight leading-[1.05] mb-7">
                Marketing strategy built from evidence,{' '}
                <span className="text-primary">not opinion.</span>
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35 }}
                className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed mb-9">
                Before Korex writes a single post, it reads live search demand, the ads your competitors are running right now,
                how real buyers talk about the problem, your own website and your own analytics. Then a second model reviews
                the plan like a senior strategist and rewrites what is weak. You see the reasoning, not just the output.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}
                className="flex flex-wrap gap-4">
                <Link to="/signup"
                  className="px-8 py-4 bg-primary text-primary-foreground font-semibold text-sm uppercase tracking-widest rounded-sm hover:bg-[hsl(var(--primary-dark))] transition-colors">
                  Start Free
                </Link>
                <Link to="/features"
                  className="px-8 py-4 border border-[hsl(var(--foreground)/0.2)] text-foreground font-semibold text-sm uppercase tracking-widest rounded-sm hover:bg-[hsl(var(--foreground)/0.05)] transition-colors">
                  View Capabilities
                </Link>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                className="flex items-center gap-6 text-sm text-[hsl(var(--text-tertiary))] flex-wrap mt-6">
                <span>No credit card required</span>
                <span className="hidden sm:inline w-px h-4 bg-border" />
                <span>2 free strategy generations</span>
                <span className="hidden sm:inline w-px h-4 bg-border" />
                <span>Cancel anytime</span>
              </motion.div>
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
              className="lg:col-span-4 lg:pt-14">
              <div className="border-l border-[hsl(var(--accent-gold))] pl-6 py-2">
                <p className="eyebrow mb-3">Built for operators</p>
                <p className="text-foreground text-sm leading-relaxed">
                  Used by founders, in-house marketers and agencies to replace $3,000–$10,000 monthly retainers with
                  research-backed strategy they own outright.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Credibility strip */}
          <div className="border-y border-[hsl(var(--foreground)/0.1)] mt-16 py-8">
            <div className="flex flex-wrap justify-between items-center gap-8">
              {[
                { v: '5', l: 'Live data sources per strategy' },
                { v: '9', l: 'Platforms modelled' },
                { v: '24h', l: 'Market intelligence refresh' },
                { v: 'Critic', l: 'Review pass on every plan' },
              ].map((s) => (
                <div key={s.l} className="flex flex-col">
                  <span className="text-foreground text-2xl font-semibold tracking-tight">{s.v}</span>
                  <span className="text-[hsl(var(--text-tertiary))] text-xs uppercase tracking-widest mt-1">{s.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* =================== THE PROBLEM =================== */}
      <section className="py-24 px-4 bg-muted">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-3xl sm:text-[40px] font-semibold mb-4">
              Most Marketing Plans Are Written Without Evidence
            </h2>
            <p className="text-lg text-muted-foreground">The problem is not effort. It is what the plan was built on:</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {painPoints.map((point, i) => (
              <AnimatedSection key={i} delay={i * 0.1}>
                <div className="flex items-start gap-3 bg-card border border-border rounded-sm p-5">
                  <X className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground text-sm">{point}</span>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection className="text-center" delay={0.4}>
            <p className="text-2xl font-bold text-primary">A strategy is only as good as the evidence underneath it.</p>
          </AnimatedSection>
        </div>
      </section>

      {/* =================== THE SOLUTION =================== */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-[42px] font-semibold mb-4">
              What Happens{' '}
              <span className="text-primary">Before You Get a Plan</span>
            </h2>
            <p className="text-muted-foreground text-lg mt-4">Four stages run on every generation. Plain English, no jargon required.</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((step, i) => (
              <AnimatedSection key={i} delay={i * 0.1}>
                <div className="bg-card border border-border rounded-sm p-6 text-center hover:border-[hsl(var(--primary)/0.5)] transition-all h-full">
                  <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mx-auto mb-4 text-white font-semibold text-lg shadow-[0_0_20px_hsl(var(--primary) / 0.3)]">
                    {i + 1}
                  </div>
                  <step.icon className="w-6 h-6 text-primary mx-auto mb-3" />
                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>

        </div>
      </section>

      {/* =================== CAPABILITIES =================== */}
      <section className="py-24 px-6 sm:px-8 bg-muted border-y border-border">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="max-w-2xl mb-14">
            <p className="eyebrow mb-4">Capabilities</p>
            <h2 className="text-3xl sm:text-[40px] font-semibold tracking-tight leading-tight mb-4">
              From market research to{' '}
              <span className="text-primary">finished ad creative</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Korex researches, plans, writes, produces the creative and reports on the results — one accountable system
              rather than a folder of disconnected tools.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border-t border-l border-[hsl(var(--foreground)/0.1)] bg-card">
            {capabilities.map((c, i) => (
              <AnimatedSection key={i} delay={(i % 4) * 0.08}>
                <div className="p-8 h-full border-r border-b border-[hsl(var(--foreground)/0.1)] hover:bg-muted/60 transition-colors">
                  <span className="eyebrow block mb-6">{String(i + 1).padStart(2, '0')}</span>
                  <c.icon className="w-5 h-5 text-primary mb-4" />
                  <h3 className="font-semibold text-lg tracking-tight mb-3">{c.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{c.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection className="mt-12">
            <Link to="/features" className="inline-flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-widest hover:gap-3 transition-all">
              Explore all capabilities <ArrowRight className="w-4 h-4" />
            </Link>
          </AnimatedSection>
        </div>
      </section>




      {/* =================== VALUE COMPARISON =================== */}
      <section className="py-24 px-4 bg-muted">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-3xl sm:text-[40px] font-semibold mb-4">
              Why Korex Outperforms Agencies, Freelancers, and Generic AI
            </h2>
          </AnimatedSection>

          <AnimatedSection>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-3 text-[hsl(var(--text-tertiary))] font-normal"></th>
                    <th className="py-4 px-3 text-primary font-bold">Korex</th>
                    <th className="py-4 px-3 text-[hsl(var(--text-tertiary))]">Agency</th>
                    <th className="py-4 px-3 text-[hsl(var(--text-tertiary))]">Freelancer</th>
                    <th className="py-4 px-3 text-[hsl(var(--text-tertiary))]">ChatGPT</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, i) => (
                    <tr key={i} className="border-b border-[hsl(var(--border)/0.5)]">
                      <td className="py-4 px-3 text-muted-foreground font-medium">{row.label}</td>
                      <td className="py-4 px-3 text-center text-white font-semibold"><CellValue value={row.korex} /></td>
                      <td className="py-4 px-3 text-center text-[hsl(var(--text-tertiary))]"><CellValue value={row.agency} /></td>
                      <td className="py-4 px-3 text-center text-[hsl(var(--text-tertiary))]"><CellValue value={row.freelancer} /></td>
                      <td className="py-4 px-3 text-center text-[hsl(var(--text-tertiary))]"><CellValue value={row.chatgpt} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AnimatedSection>

          <AnimatedSection className="mt-8" delay={0.2}>
            <div className="border border-[hsl(var(--primary)/0.3)] rounded-sm p-6 text-center bg-[hsl(var(--primary)/0.05)]">
              <p className="text-lg font-bold">The difference is the <span className="text-primary">inputs</span>, not the output format.</p>
              <p className="text-muted-foreground text-sm mt-1">Anyone can produce a content calendar. Korex shows you the market evidence each recommendation came from.</p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* =================== ALGORITHM SUPERIORITY =================== */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-3xl sm:text-[40px] font-semibold mb-4">
              Why It's Not 'Just Another AI Tool'
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <AnimatedSection>
              <div className="bg-card border border-border rounded-sm p-6 h-full">
                <h3 className="text-lg font-bold mb-4 text-[hsl(var(--text-tertiary))]">Generic AI (ChatGPT, etc.)</h3>
                <ul className="space-y-3">
                  {['Gives template responses', "Doesn't analyze your data", 'One-size-fits-all strategies', 'No platform optimization'].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[hsl(var(--text-tertiary))]">
                      <X className="w-4 h-4 shrink-0 mt-0.5" />{item}
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={0.1}>
              <div className="bg-card border border-[hsl(var(--primary)/0.3)] rounded-sm p-6 h-full">
                <h3 className="text-lg font-bold mb-4 text-primary">Korex Algorithm</h3>
                <ul className="space-y-3">
                  {['Analyzes 47 engagement signals from YOUR data', 'Cross-platform pattern recognition', 'Audience behavior prediction', 'Platform-specific ranking optimization', 'Trained on $10M+ in ad spend analysis'].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />{item}
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedSection>
          </div>

          <AnimatedSection delay={0.2}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-sm p-6">
                <p className="text-xs uppercase tracking-wider text-[hsl(var(--text-tertiary))] mb-2">ChatGPT says:</p>
                <p className="text-[hsl(var(--text-tertiary))] text-sm italic">"Here's a social media strategy template"</p>
              </div>
              <div className="bg-card border border-[hsl(var(--primary)/0.3)] rounded-sm p-6">
                <p className="text-xs uppercase tracking-wider text-primary mb-2">Korex says:</p>
                <p className="text-muted-foreground text-sm italic">"Based on your data, your audience engages 3.2x more with educational content on Tuesdays at 2pm. Here's your 14-day calendar optimized for this pattern."</p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* =================== RESEARCH ANALYSIS EXPLAINER =================== */}
      <section className="py-24 px-4 bg-muted">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="mb-12">
            <p className="eyebrow mb-4">Research Analysis</p>
            <h2 className="text-3xl sm:text-[40px] font-semibold mb-4 max-w-3xl">
              A standing intelligence desk for your niche
            </h2>
            <p className="text-muted-foreground text-lg max-w-3xl leading-relaxed">
              Research Analysis runs continuously in the background, not only when you ask for a strategy. It watches your
              category across every major platform and keeps a current picture of what is working — so when you do generate a
              plan, it is written against this week's market, not a model's memory of last year.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                t: 'What it collects',
                b: 'Search demand for your category, ads currently running by competitors, hooks and formats performing organically per platform, and how buyers describe the problem in their own words.',
              },
              {
                t: 'How it gets it',
                b: 'Live search and ad-library queries, platform-level content pattern extraction, community discussion mining, and a crawl of your own site for offer, pricing and positioning.',
              },
              {
                t: 'How it is cleaned',
                b: 'Raw signals are de-duplicated, scored for relevance to your niche and stripped of noise. Anything that cannot be tied back to a source is discarded rather than guessed.',
              },
              {
                t: 'Why it stays current',
                b: 'The intelligence layer refreshes on a rolling 24-hour cycle and is cached per niche, so every strategy and every ad script draws from the same fresh, shared evidence base.',
              },
            ].map((c, i) => (
              <AnimatedSection key={c.t} delay={i * 0.08}>
                <div className="bg-card border border-border rounded-sm p-6 h-full">
                  <h3 className="font-bold mb-2">{c.t}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{c.b}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection className="mt-8" delay={0.3}>
            <div className="border-l-2 border-[hsl(var(--accent-gold))] pl-6 py-2 max-w-3xl">
              <p className="text-foreground leading-relaxed">
                In plain terms: instead of asking an AI what it thinks might work, Korex goes and looks at what is already
                working in your market — then writes your plan from that.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>


      {/* =================== SOCIAL PROOF =================== */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-3xl sm:text-[40px] font-semibold mb-4">
              Built by Marketers, for Marketers
            </h2>
          </AnimatedSection>

          <AnimatedSection>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              {[
                { icon: DollarSign, value: '$10M+', label: 'Ad spend analyzed' },
                { icon: Users, value: '12', label: 'Industries covered' },
                { icon: Globe, value: '8', label: 'Social platforms' },
                { icon: Zap, value: '47', label: 'Engagement signals' },
              ].map((stat, i) => (
                <div key={i} className="bg-card border border-border rounded-sm p-5 text-center">
                  <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-semibold">{stat.value}</p>
                  <p className="text-xs text-[hsl(var(--text-tertiary))] mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="bg-card border border-[hsl(var(--primary)/0.2)] rounded-sm p-8 text-center">
              <p className="text-xl sm:text-2xl italic text-muted-foreground mb-6 leading-relaxed">
                "I spent six months studying what separates campaigns that work from campaigns that don't. Korex is that
                analysis, turned into a system that runs it for your business."
              </p>
              <p className="text-sm text-[hsl(var(--text-tertiary))]">— Founder, Korex Intelligence</p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* =================== TECHNOLOGY =================== */}
      <section className="py-24 px-4 bg-muted">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-3xl sm:text-[40px] font-semibold mb-4">
              Inside a Strategy Generation
            </h2>
            <p className="text-muted-foreground">Six stages run in sequence. Here is what each one is actually doing.</p>
          </AnimatedSection>

          <div className="space-y-4">
            {techSteps.map((step, i) => (
              <AnimatedSection key={i} delay={i * 0.1}>
                <div className="bg-card border border-border rounded-sm p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold">{step.name}</h3>
                      <span className="text-xs bg-border px-2 py-0.5 rounded-full text-[hsl(var(--text-tertiary))]">{step.time}</span>
                    </div>
                    <ul className="space-y-1">
                      {step.details.map((d, di) => (
                        <li key={di} className="text-sm text-[hsl(var(--text-tertiary))] flex items-start gap-2">
                          <span className="text-primary mt-1.5 text-xs">├─</span>{d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection className="mt-8 text-center" delay={0.5}>
            <div className="inline-flex items-center gap-4 bg-card border border-[hsl(var(--primary)/0.2)] rounded-sm px-6 py-3">
              <Clock className="w-5 h-5 text-primary" />
              <span className="text-sm">Market intelligence refreshed every <strong>24 hours</strong></span>
              <span className="text-border">|</span>
              <span className="text-sm text-muted-foreground">Every recommendation traceable to a <strong className="text-primary">source signal</strong></span>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* =================== PLATFORMS =================== */}
      <section className="py-16 border-y border-border overflow-hidden">
        <AnimatedSection className="text-center mb-10 px-4">
          <p className="text-muted-foreground text-lg">Works with every major social and advertising platform</p>
        </AnimatedSection>
        <div className="relative">
          <motion.div className="flex gap-12 items-center whitespace-nowrap"
            animate={{ x: ['0%', '-50%'] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}>
            {[...platforms, ...platforms].map((p, i) => (
              <div key={i} className="text-[hsl(var(--text-tertiary))] hover:text-foreground transition-colors text-lg font-semibold tracking-wider px-4 shrink-0">{p}</div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* =================== PRICING =================== */}
      <section className="py-24 px-4 bg-muted">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-3xl sm:text-[48px] font-semibold mb-4">
              Simple, Transparent Pricing
            </h2>
            <div className="flex items-center justify-center gap-3 mt-6">
              <span className={`text-sm ${!billingAnnual ? 'text-white' : 'text-[hsl(var(--text-tertiary))]'}`}>Monthly</span>
              <button onClick={() => setBillingAnnual(!billingAnnual)}
                className={`relative w-12 h-6 rounded-full transition-colors ${billingAnnual ? 'bg-primary' : 'bg-border'}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${billingAnnual ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
              <span className={`text-sm ${billingAnnual ? 'text-white' : 'text-[hsl(var(--text-tertiary))]'}`}>Yearly</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${billingAnnual ? 'bg-[hsl(var(--primary)/0.2)] text-primary' : 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary)/0.7)]'}`}>Save 30%</span>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {pricing.map((plan, i) => {
              const displayPrice = billingAnnual ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
              const savings = plan.monthlyPrice * 12 - plan.yearlyPrice;
              return (
                <AnimatedSection key={i} delay={i * 0.1}>
                  <div className={`relative bg-card rounded-sm p-8 h-full flex flex-col border transition-all duration-300 hover:-translate-y-1 ${plan.popular ? 'border-primary shadow-[0_0_30px_hsl(var(--primary) / 0.15)]' : 'border-border hover:border-border'}`}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-[hsl(var(--primary-dark))] text-white text-xs font-bold px-4 py-1 rounded-full">Most Popular</div>
                    )}
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    <div className="mb-2">
                      <span className="text-4xl font-semibold">${displayPrice}</span>
                      <span className="text-[hsl(var(--text-tertiary))] text-sm">/month</span>
                    </div>
                    {billingAnnual && <p className="text-xs text-[hsl(var(--text-tertiary))] mb-4">${plan.yearlyPrice}/year · Save ${savings}</p>}
                    {!billingAnnual && <div className="mb-4" />}
                    <ul className="space-y-3 mb-8 flex-1">
                      {plan.features.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />{f}
                        </li>
                      ))}
                    </ul>
                    <Link to="/signup" className={`block text-center py-3 rounded-sm font-bold text-sm transition-all ${plan.popular ? 'bg-gradient-to-r from-primary to-[hsl(var(--primary-dark))] text-white hover:shadow-[0_0_20px_hsl(var(--primary) / 0.3)]' : 'border border-border text-foreground hover:border-primary hover:text-primary'}`}>
                      Start Free
                    </Link>
                    <p className="text-xs text-[hsl(var(--text-tertiary))] text-center mt-3">No credit card required</p>
                    {plan.badge && <p className="text-xs text-muted-foreground text-center mt-1">{plan.badge}</p>}
                  </div>
                </AnimatedSection>
              );
            })}
          </div>

        </div>
      </section>

      {/* =================== FAQ =================== */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-3xl sm:text-[40px] font-semibold">
              Frequently Asked Questions
            </h2>
          </AnimatedSection>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <AnimatedSection key={i} delay={i * 0.05}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left bg-card border border-border rounded-sm p-5 hover:border-border transition-all">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-[hsl(var(--text-tertiary))] transition-transform shrink-0 ml-4 ${openFaq === i ? 'rotate-180' : ''}`} />
                  </div>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }} className="text-sm text-muted-foreground mt-3 leading-relaxed overflow-hidden">
                        {faq.a}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </button>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* =================== FINAL CTA =================== */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary)/0.05)] to-transparent pointer-events-none" />
        <AnimatedSection className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-5xl font-semibold mb-6">
            Stop Guessing. Start Working From Evidence.
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
            Generate your first strategy and see exactly what market data it was built from.
          </p>
          <Link to="/signup"
            className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-primary to-[hsl(var(--primary-dark))] text-white text-lg font-bold rounded-sm hover:scale-105 transition-all duration-300 shadow-[0_0_30px_hsl(var(--primary) / 0.3)]">
            Start Free — No Credit Card Required <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="flex items-center justify-center gap-6 text-sm text-[hsl(var(--text-tertiary))] mt-6 flex-wrap">
            <span>✓ 2 free strategy generations</span>
            <span>✓ No credit card required</span>
            <span>✓ Upgrade anytime</span>
          </div>
        </AnimatedSection>
      </section>

      {/* =================== TRUST BADGES =================== */}
      <section className="py-12 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-8 text-[hsl(var(--text-tertiary))]">
          {[
            { icon: Lock, label: 'Encrypted Data' },
            { icon: Shield, label: 'SOC 2 Compliant' },
            { icon: Globe, label: 'GDPR Ready' },
            { icon: Award, label: '99.9% Uptime' },
          ].map((badge, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <badge.icon className="w-4 h-4" /><span>{badge.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* =================== FOOTER =================== */}
      <footer className="bg-background border-t border-[hsl(var(--primary)/0.3)] pt-16 pb-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1 flex flex-col items-center md:items-start text-center md:text-left min-w-0">
              <KorexLogoLockup height={52} showTagline={false} className="mb-4 self-center" />
              <p className="text-sm text-[hsl(var(--text-tertiary))] leading-relaxed">Intelligence-driven marketing systems for modern teams.</p>
            </div>

            <div>
              <h4 className="font-bold text-sm mb-4 tracking-wider uppercase text-muted-foreground">Product</h4>
              <ul className="space-y-2 text-sm text-[hsl(var(--text-tertiary))]">
                <li><Link to="/features" className="hover:text-primary transition-colors">Features</Link></li>
                
                <li><Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-4 tracking-wider uppercase text-muted-foreground">Company</h4>
              <ul className="space-y-2 text-sm text-[hsl(var(--text-tertiary))]">
                <li><Link to="/about" className="hover:text-primary transition-colors">About</Link></li>
                <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-4 tracking-wider uppercase text-muted-foreground">Resources</h4>
              <ul className="space-y-2 text-sm text-[hsl(var(--text-tertiary))]">
                <li><Link to="/help" className="hover:text-primary transition-colors">Help Center</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-4 tracking-wider uppercase text-muted-foreground">Legal</h4>
              <ul className="space-y-2 text-sm text-[hsl(var(--text-tertiary))]">
                <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                <li><Link to="/cookies" className="hover:text-primary transition-colors">Cookies</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[hsl(var(--text-tertiary))]">© 2026 Korex Intelligence Systems. All rights reserved.</p>
            <div className="flex items-center gap-4 text-xs text-[hsl(var(--text-tertiary))]">
              <Link to="/health" className="hover:text-primary transition-colors">Status</Link>
              <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* =================== FLOATING CTA =================== */}
      <AnimatePresence>
        {showFloatingCta && !floatingDismissed && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
            <Link to="/signup"
              className="px-6 py-3 bg-gradient-to-r from-primary to-[hsl(var(--primary-dark))] text-white font-bold rounded-sm shadow-[0_0_20px_hsl(var(--primary) / 0.4)] hover:scale-105 transition-all text-sm">
              Start Free
            </Link>
            <button onClick={() => setFloatingDismissed(true)}
              className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-[hsl(var(--text-tertiary))] hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
