import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Clock, DollarSign, Wrench, Handshake, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { KorexLogoLockup } from '@/components/branding/KorexLogoLockup';
import { Seo } from '@/components/Seo';

const contactReasons = [
  { icon: DollarSign, title: 'Sales & Pricing', description: 'Questions about plans, enterprise, or custom pricing.' },
  { icon: Wrench, title: 'Technical Support', description: 'Help with your account, features, or integrations.' },
  { icon: Handshake, title: 'Partnerships', description: 'Interested in partnering or reselling Korex.' },
];

const allowedSubjects = ['General Inquiry', 'Sales & Pricing', 'Technical Support', 'Partnership', 'Other'];

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('General Inquiry');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      setError('Please fill in all required fields.');
      return;
    }

    if (trimmedName.length > 100) {
      setError('Name must be less than 100 characters.');
      return;
    }

    if (trimmedMessage.length > 5000) {
      setError('Message must be less than 5000 characters.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!allowedSubjects.includes(subject)) {
      setError('Please select a valid subject.');
      return;
    }

    // Rate limit: 3 per hour per session
    const now = Date.now();
    const submissions: number[] = JSON.parse(sessionStorage.getItem('contact_submissions') || '[]');
    const recentSubmissions = submissions.filter(t => now - t < 3600000);
    if (recentSubmissions.length >= 3) {
      setError('You\'ve submitted too many messages. Please try again later.');
      return;
    }

    setLoading(true);
    try {
      const { error: dbError } = await supabase
        .from('contact_submissions')
        .insert({ name: trimmedName, email: trimmedEmail, subject, message: trimmedMessage });

      if (dbError) throw dbError;

      // Send notification email (don't block success on email failure)
      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'contact-form-notification',
            recipientEmail: 'korexintelligencesystems@gmail.com',
            templateData: {
              name: trimmedName,
              email: trimmedEmail,
              subject,
              message: trimmedMessage,
            },
          },
        });
      } catch (emailErr) {
        console.error('Failed to send contact notification email:', emailErr);
      }

      recentSubmissions.push(now);
      sessionStorage.setItem('contact_submissions', JSON.stringify(recentSubmissions));
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Seo
        title="Contact Korex Intelligence Systems"
        description="Questions about features, pricing, or partnerships? Contact the Korex Intelligence Systems team and get a reply from a human, usually within one business day."
        path="/contact"
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
              <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
              <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
              <Link to="/contact" className="text-primary">Contact</Link>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
              <Link to="/signup" className="text-sm px-4 py-2 bg-primary text-white rounded-sm hover:bg-[hsl(var(--primary-dark))] transition-colors">Get Started</Link>
            </div>
          </div>
        </nav>

        <section className="py-24 px-4">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Left */}
            <div>
              <h1 className="text-4xl sm:text-5xl font-semibold mb-6">
                Get In Touch
              </h1>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                Whether you have a question about features, pricing, enterprise plans, or anything else — our team is ready to help.
              </p>

              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-5 h-5 text-primary" />
                <a href="mailto:support@korexintelligencesystems.com" className="text-muted-foreground hover:text-foreground transition-colors">
                  support@korexintelligencesystems.com
                </a>
              </div>
              <div className="flex items-center gap-3 mb-10">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-[hsl(var(--text-tertiary))] text-sm">We typically respond within 24 hours.</span>
              </div>

              <div className="space-y-4">
                {contactReasons.map((reason, i) => (
                  <div key={i} className="bg-card border border-border rounded-sm p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-sm bg-[hsl(var(--primary)/0.1)] flex items-center justify-center shrink-0">
                      <reason.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm mb-1">{reason.title}</h3>
                      <p className="text-[hsl(var(--text-tertiary))] text-xs">{reason.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Form */}
            <div className="bg-card border border-border rounded-sm p-8">
              {submitted ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
                    <Mail className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Your message has been sent.</h3>
                  <p className="text-muted-foreground text-sm">We'll be in touch within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="contact-name" className="block text-sm font-medium text-muted-foreground mb-2">Full Name *</label>
                    <input
                      id="contact-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100}
                      className="w-full bg-muted border border-border rounded-sm px-4 py-3 text-white placeholder-[hsl(var(--text-tertiary))] focus:outline-none focus:border-primary transition-colors"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="block text-sm font-medium text-muted-foreground mb-2">Email Address *</label>
                    <input
                      id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255}
                      className="w-full bg-muted border border-border rounded-sm px-4 py-3 text-white placeholder-[hsl(var(--text-tertiary))] focus:outline-none focus:border-primary transition-colors"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-subject" className="block text-sm font-medium text-muted-foreground mb-2">Subject</label>
                    <select
                      id="contact-subject" value={subject} onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-muted border border-border rounded-sm px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                    >
                      {allowedSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="contact-message" className="block text-sm font-medium text-muted-foreground mb-2">Message *</label>
                    <textarea
                      id="contact-message" value={message} onChange={(e) => setMessage(e.target.value)} required rows={4} maxLength={5000}
                      className="w-full bg-muted border border-border rounded-sm px-4 py-3 text-white placeholder-[hsl(var(--text-tertiary))] focus:outline-none focus:border-primary transition-colors resize-none"
                      placeholder="How can we help?"
                    />
                  </div>

                  {error && <p className="text-red-500 text-sm">{error}</p>}

                  <button type="submit" disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-primary to-[hsl(var(--primary-dark))] text-white font-bold rounded-sm hover:shadow-[0_0_20px_hsl(var(--primary) / 0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? 'Sending...' : <>Send Message <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>
              )}
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
