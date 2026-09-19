import React from 'react';
import { Link } from 'react-router-dom';
import { KorexMark } from '@/components/branding/KorexMark';
import { Seo } from '@/components/Seo';

const Privacy: React.FC = () => {
  return (
    <>
      <Seo
        title="Privacy Policy | Korex Intelligence Systems"
        description="How Korex Intelligence Systems collects, uses, shares and protects your data, including subprocessors, retention periods and your GDPR/CCPA rights."
        path="/privacy"
      />

      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <KorexMark className="w-8 h-8" />
                <span className="text-xl font-bold text-foreground">Korex</span>
              </Link>
              <nav className="flex items-center gap-4">
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </nav>
            </div>
          </div>
        </header>

        <main className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
            <p className="text-muted-foreground">Last Updated: July 18, 2026 · Effective: August 1, 2026</p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">1. WHO WE ARE</h2>
              <p className="text-muted-foreground leading-relaxed">
                Korex Intelligence Systems ("Korex", "we", "us", "our") operates the Korex marketing intelligence platform. When you use the Service, Korex is the "data controller" for account and billing data. When you upload analytics, brand assets, or client data for processing, Korex acts as a "data processor" on your behalf. Our contact details are at the end of this policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">2. DATA WE COLLECT</h2>

              <h3 className="text-lg font-medium text-foreground mt-6 mb-3">2.1 Account & billing</h3>
              <p className="text-muted-foreground leading-relaxed">Name, email address, password hash, workspace membership, subscription plan, and Stripe billing metadata (we never store full card numbers).</p>

              <h3 className="text-lg font-medium text-foreground mt-6 mb-3">2.2 Business & strategy inputs</h3>
              <p className="text-muted-foreground leading-relaxed">Business profile answers, target audience descriptions, promotions, brand assets, uploaded analytics screenshots and exports, and chat messages you send to the AI.</p>

              <h3 className="text-lg font-medium text-foreground mt-6 mb-3">2.3 Connected accounts</h3>
              <p className="text-muted-foreground leading-relaxed">When you connect a third-party platform, we store the OAuth tokens, account identifiers, and metadata necessary to perform the actions you request. Tokens are encrypted at rest.</p>

              <h3 className="text-lg font-medium text-foreground mt-6 mb-3">2.4 Usage & technical data</h3>
              <p className="text-muted-foreground leading-relaxed">IP address, browser and device information, pages viewed, features used, error logs, and cookies (see the <Link to="/cookies" className="text-primary hover:underline">Cookie Policy</Link>).</p>

              <h3 className="text-lg font-medium text-foreground mt-6 mb-3">2.5 Communications</h3>
              <p className="text-muted-foreground leading-relaxed">Support tickets, in-app messages, and marketing preferences.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">3. HOW WE USE DATA</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Provide and operate the Service, including AI strategy generation, insights, and publishing to connected platforms.</li>
                <li>Process billing and prevent fraud.</li>
                <li>Personalize AI output using your business context and past performance data (this happens per-account and is not shared across customers).</li>
                <li>Improve reliability, debug errors, and secure the Service.</li>
                <li>Send transactional emails (verification, billing, security) and — with consent — marketing emails.</li>
                <li>Comply with legal obligations.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                <strong className="text-foreground">Legal bases (GDPR).</strong> We rely on contract performance (delivering the Service), legitimate interests (security, product improvement), consent (marketing, non-essential cookies), and legal obligations (tax, fraud prevention).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">4. AI PROCESSING</h2>
              <p className="text-muted-foreground leading-relaxed">
                Prompts, uploaded assets, and business context you submit are sent to third-party AI providers to generate responses. We use zero-retention or short-retention API tiers where offered. <strong className="text-foreground">Your private business data is not used to train shared foundation models</strong> by Korex or, per their published policies, by our AI providers on their standard API endpoints. AI output may occasionally be inaccurate; you are responsible for reviewing it before use.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">5. SUBPROCESSORS</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">We rely on the following categories of subprocessors to run the Service:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-border rounded-lg">
                  <thead>
                    <tr className="bg-card">
                      <th className="text-left p-3 border-b border-border text-foreground">Provider</th>
                      <th className="text-left p-3 border-b border-border text-foreground">Purpose</th>
                      <th className="text-left p-3 border-b border-border text-foreground">Region</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr><td className="p-3 border-b border-border">Supabase (database, auth, storage)</td><td className="p-3 border-b border-border">Core application backend</td><td className="p-3 border-b border-border">US</td></tr>
                    <tr><td className="p-3 border-b border-border">Vercel</td><td className="p-3 border-b border-border">Web hosting & CDN</td><td className="p-3 border-b border-border">Global</td></tr>
                    <tr><td className="p-3 border-b border-border">Anthropic</td><td className="p-3 border-b border-border">Primary AI reasoning</td><td className="p-3 border-b border-border">US</td></tr>
                    <tr><td className="p-3 border-b border-border">Google (Gemini)</td><td className="p-3 border-b border-border">Caption variants, auxiliary AI</td><td className="p-3 border-b border-border">US</td></tr>
                    <tr><td className="p-3 border-b border-border">OpenAI</td><td className="p-3 border-b border-border">Image generation</td><td className="p-3 border-b border-border">US</td></tr>
                    <tr><td className="p-3 border-b border-border">ElevenLabs</td><td className="p-3 border-b border-border">Voice synthesis (opt-in features)</td><td className="p-3 border-b border-border">US</td></tr>
                    <tr><td className="p-3 border-b border-border">Stripe</td><td className="p-3 border-b border-border">Payments & subscription billing</td><td className="p-3 border-b border-border">US / Global</td></tr>
                    <tr><td className="p-3 border-b border-border">Resend</td><td className="p-3 border-b border-border">Transactional email delivery</td><td className="p-3 border-b border-border">US</td></tr>
                    <tr><td className="p-3 border-b border-border">Google Workspace</td><td className="p-3 border-b border-border">Inbound/outbound support email</td><td className="p-3 border-b border-border">US</td></tr>
                    <tr><td className="p-3">Sentry, Google Analytics</td><td className="p-3">Error monitoring & product analytics</td><td className="p-3">US</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground leading-relaxed mt-4">We update this list as our infrastructure evolves. Material additions will be communicated by email or in-app notice.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">6. HOW WE SHARE DATA</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                <li><strong className="text-foreground">Subprocessors</strong> listed above, under written data-processing agreements.</li>
                <li><strong className="text-foreground">Connected platforms</strong> you explicitly authorize (Meta, TikTok, Google, etc.), only for actions you request.</li>
                <li><strong className="text-foreground">Legal requirements</strong> when required by valid legal process.</li>
                <li><strong className="text-foreground">Business transfers</strong> in the event of a merger, acquisition, or asset sale, subject to equivalent protections.</li>
              </ul>
              <p className="text-primary font-semibold">We do not sell your personal information and do not share it for cross-context behavioral advertising.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">7. INTERNATIONAL TRANSFERS</h2>
              <p className="text-muted-foreground leading-relaxed">
                Data is stored primarily in the United States. Where we transfer personal data of individuals in the EEA, UK, or Switzerland outside those regions, we rely on the European Commission's Standard Contractual Clauses and equivalent UK/Swiss mechanisms. A Data Processing Addendum is available on request from <a href="mailto:privacy@korexintelligencesystems.com" className="text-primary hover:underline">privacy@korexintelligencesystems.com</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">8. SECURITY</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                <li>TLS encryption in transit and encryption at rest for databases and object storage.</li>
                <li>Row-Level Security policies enforcing per-user and per-workspace isolation.</li>
                <li>Optional TOTP two-factor authentication and account lockout on repeated failures.</li>
                <li>Least-privilege access for internal personnel and audited service roles.</li>
                <li>Automated dependency and security scans on our codebase.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Breach notification.</strong> If we become aware of a personal data breach affecting you, we will notify you and any competent authority within the timeframes required by applicable law (72 hours under GDPR).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">9. RETENTION</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Account and workspace data: retained while your account is active.</li>
                <li>Uploaded assets and strategy outputs: retained until you delete them or your account is closed.</li>
                <li>Billing records: retained for at least 7 years to satisfy tax and accounting laws.</li>
                <li>Backups: rolling 30-day encrypted backups.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">When you delete your account, we delete or irreversibly anonymize your personal data within 30 days, except records we must retain by law.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">10. YOUR RIGHTS</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">Depending on your location, you may have the right to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                <li>Access, correct, or delete your personal data.</li>
                <li>Export your data in a portable format (available from Settings → Exports).</li>
                <li>Restrict or object to certain processing.</li>
                <li>Withdraw consent for marketing at any time.</li>
                <li>Lodge a complaint with a supervisory authority (EEA/UK) or your state attorney general.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">To exercise these rights, use in-app controls or email <a href="mailto:privacy@korexintelligencesystems.com" className="text-primary hover:underline">privacy@korexintelligencesystems.com</a>. We respond within 30 days.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">11. CALIFORNIA (CCPA/CPRA)</h2>
              <p className="text-muted-foreground leading-relaxed">
                California residents have the right to know what personal information we collect, to request deletion or correction, to opt out of "sale" or "sharing" (we do neither), and to non-discrimination for exercising these rights. Categories collected in the past 12 months: identifiers, commercial information, internet activity, and inferences drawn from your business inputs.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">12. CHILDREN</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service is not directed to children under 18 and we do not knowingly collect data from them. If you believe a child has provided us data, contact us and we will delete it.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">13. CHANGES</h2>
              <p className="text-muted-foreground leading-relaxed">
                We will notify you of material changes to this policy by email or in-app notice at least 14 days before they take effect. Continued use after the effective date constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">14. CONTACT</h2>
              <div className="bg-card border border-border rounded-lg p-6">
                <p className="text-foreground mb-2">
                  <strong>Privacy:</strong>{' '}
                  <a href="mailto:privacy@korexintelligencesystems.com" className="text-primary hover:underline">
                    privacy@korexintelligencesystems.com
                  </a>
                </p>
                <p className="text-foreground mb-2">
                  <strong>Support:</strong>{' '}
                  <a href="mailto:support@korexintelligencesystems.com" className="text-primary hover:underline">
                    support@korexintelligencesystems.com
                  </a>
                </p>
                <p className="text-foreground">
                  <strong>Mailing address:</strong> Korex Intelligence Systems, Bradenton, Florida, United States
                </p>
              </div>
            </section>
          </div>
        </main>

        <footer className="border-t border-border bg-card/30 mt-12">
          <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                © 2026 Korex Intelligence Systems. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </Link>
                <Link to="/privacy" className="text-sm text-primary hover:underline">
                  Privacy Policy
                </Link>
                <Link to="/cookies" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Cookies
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Privacy;
