import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Seo } from '@/components/Seo';

const Cookies: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <Seo
        title="Cookie Policy | Korex Intelligence Systems"
        description="Which cookies Korex Intelligence Systems sets, why we use them, how long they last, and how you can control or disable them in your browser."
        path="/cookies"
      />

      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <Button aria-label="Go back" variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold ml-4">Cookie Policy</h1>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="prose prose-invert max-w-none">
            <p className="text-muted-foreground mb-8">Last Updated: July 18, 2026 · Effective: August 1, 2026</p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">1. What Are Cookies</h2>
              <p className="text-muted-foreground">
                Cookies are small text files stored on your device when you visit a website. Similar technologies include local storage, session storage, and pixel tags. We use "cookies" as a shorthand for all of these.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">2. Categories We Use</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-border rounded-lg">
                  <thead>
                    <tr className="bg-card">
                      <th className="text-left p-3 border-b border-border text-foreground">Category</th>
                      <th className="text-left p-3 border-b border-border text-foreground">Purpose</th>
                      <th className="text-left p-3 border-b border-border text-foreground">Examples</th>
                      <th className="text-left p-3 border-b border-border text-foreground">Retention</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr>
                      <td className="p-3 border-b border-border"><strong className="text-foreground">Strictly necessary</strong></td>
                      <td className="p-3 border-b border-border">Authentication, session security, load balancing. The Service will not work without these.</td>
                      <td className="p-3 border-b border-border">Supabase auth token, CSRF token, active workspace</td>
                      <td className="p-3 border-b border-border">Session – 1 year</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-b border-border"><strong className="text-foreground">Functional</strong></td>
                      <td className="p-3 border-b border-border">Remember preferences such as theme, dismissed banners, and onboarding progress.</td>
                      <td className="p-3 border-b border-border">theme, hasSeenTour, launchPromoDismissed</td>
                      <td className="p-3 border-b border-border">Up to 1 year</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-b border-border"><strong className="text-foreground">Analytics</strong></td>
                      <td className="p-3 border-b border-border">Aggregate product usage and performance measurement.</td>
                      <td className="p-3 border-b border-border">Google Analytics (_ga, _gid)</td>
                      <td className="p-3 border-b border-border">Up to 2 years</td>
                    </tr>
                    <tr>
                      <td className="p-3"><strong className="text-foreground">Security & error monitoring</strong></td>
                      <td className="p-3">Detect abuse, debug errors.</td>
                      <td className="p-3">Sentry session identifier</td>
                      <td className="p-3">Up to 30 days</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground mt-4">We do not use advertising or cross-site tracking cookies.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">3. Managing Cookies</h2>
              <p className="text-muted-foreground mb-4">
                You can accept, reject, or delete cookies through your browser settings. In the EEA and UK, non-essential cookies are only set after you consent through our banner; you can withdraw consent at any time by clearing your browser storage or by contacting us. Blocking strictly necessary cookies will prevent core features like login from working.
              </p>
              <p className="text-muted-foreground">
                We respect "Global Privacy Control" (GPC) signals as an opt-out of any sharing for cross-context behavioral advertising (we do not engage in such sharing).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">4. Changes</h2>
              <p className="text-muted-foreground">
                We may update this Cookie Policy from time to time. Material changes will be posted here with an updated effective date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">5. Contact</h2>
              <p className="text-muted-foreground">
                Questions? Email{' '}
                <a href="mailto:privacy@korexintelligencesystems.com" className="text-primary hover:underline">
                  privacy@korexintelligencesystems.com
                </a>
                . See also our{' '}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> and{' '}
                <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>.
              </p>
            </section>
          </div>
        </main>
      </div>
    </>
  );
};

export default Cookies;
