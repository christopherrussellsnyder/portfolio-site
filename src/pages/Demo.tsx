import { Link } from 'react-router-dom';
import { Upload, Brain, TrendingUp, ArrowRight, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { KorexLogoLockup } from '@/components/branding/KorexLogoLockup';
import { KorexMark } from '@/components/branding/KorexMark';
import { Seo } from '@/components/Seo';

// REPLACE WITH ACTUAL VIDEO URL WHEN READY
const DEMO_VIDEO_URL: string = '';

const VideoPlayer = () => {
  if (DEMO_VIDEO_URL && DEMO_VIDEO_URL.includes('youtube.com')) {
    const videoId = DEMO_VIDEO_URL.split('v=')[1]?.split('&')[0] || DEMO_VIDEO_URL.split('/').pop();
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        className="w-full aspect-video rounded-sm"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (DEMO_VIDEO_URL && DEMO_VIDEO_URL.endsWith('.mp4')) {
    return (
      <video controls className="w-full aspect-video rounded-sm">
        <source src={DEMO_VIDEO_URL} type="video/mp4" />
      </video>
    );
  }

  // Styled placeholder
  return (
    <div className="w-full aspect-video rounded-sm bg-card border border-[hsl(var(--primary)/0.3)] flex items-center justify-center relative overflow-hidden"
      style={{ boxShadow: '0 0 40px hsl(var(--primary) / 0.15)' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary)/0.1)] to-transparent" />
      <div className="relative z-10 text-center">
        <KorexMark className="h-12 w-12 mx-auto mb-6 opacity-40" />
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mx-auto cursor-pointer shadow-[0_0_30px_hsl(var(--primary) / 0.4)]"
        >
          <Play className="w-8 h-8 text-white ml-1" fill="white" />
        </motion.div>
        <p className="text-[hsl(var(--text-tertiary))] text-sm mt-4">Demo video coming soon</p>
      </div>
    </div>
  );
};

const steps = [
  {
    icon: Upload,
    title: 'Upload Your Analytics',
    description: 'Drop in a screenshot or export from any platform. Korex reads and interprets your data automatically.',
  },
  {
    icon: Brain,
    title: 'Get Your Strategy',
    description: 'In seconds, Korex generates a tailored marketing strategy based on your business goals, audience, and performance data.',
  },
  {
    icon: TrendingUp,
    title: 'Execute & Grow',
    description: 'Follow your AI-generated strategy, track performance, and let Korex help you continuously optimize.',
  },
];

export default function Demo() {
  return (
    <>
      <Seo
        title="Product Demo | Korex Intelligence Systems"
        description="Watch how Korex turns your analytics, website and goals into a complete evidence-based social media and paid advertising strategy."
        path="/demo"
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
              <Link to="/demo" className="text-primary">Demo</Link>
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

        {/* Hero + Video */}
        <section className="py-24 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-12">
              <h1 className="text-4xl sm:text-5xl font-semibold mb-4">
                The Korex Platform Demo
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                See exactly how Korex turns your analytics and goals into a complete marketing strategy.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
              <VideoPlayer />
            </motion.div>
          </div>
        </section>

        {/* 3-step breakdown */}
        <section className="py-24 px-4 bg-muted">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((step, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.15 }}
                  className="bg-card border border-border rounded-sm p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mx-auto mb-5 text-white font-semibold text-lg shadow-[0_0_20px_hsl(var(--primary) / 0.3)]">
                    {i + 1}
                  </div>
                  <step.icon className="w-6 h-6 text-primary mx-auto mb-3" />
                  <h3 className="text-lg font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-24 px-4 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary)/0.05)] to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-semibold mb-6">
              Ready to Try It Yourself?
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-[hsl(var(--primary-dark))] text-white font-bold rounded-sm hover:scale-105 transition-all shadow-[0_0_30px_hsl(var(--primary) / 0.3)]">
                Create Your Free Account <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/#pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm underline underline-offset-4">
                View Pricing
              </Link>
            </div>
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
