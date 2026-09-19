import React from 'react';
import { Link } from 'react-router-dom';
import { KorexMark } from '@/components/branding/KorexMark';
import { Seo } from '@/components/Seo';

const Terms: React.FC = () => {
  return (
    <>
      <Seo
        title="Terms of Service | Korex Intelligence Systems"
        description="Read the Terms of Service governing your use of Korex Intelligence Systems, our marketing intelligence platform, subscriptions and refund policy."
        path="/terms"
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
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </nav>
            </div>
          </div>
        </header>

        <main className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
            <p className="text-muted-foreground">Last Updated: July 18, 2026 · Effective: August 1, 2026</p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">1. ACCEPTANCE OF TERMS</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms of Service (the "Terms") form a binding agreement between you ("you", "user", or "Customer") and Korex Intelligence Systems ("Korex", "we", "us", or "our") governing your access to and use of the Korex platform, websites, APIs, and related services (collectively, the "Service"). By creating an account, purchasing a subscription, or otherwise using the Service, you agree to these Terms. If you are entering into these Terms on behalf of a company or other entity, you represent that you have authority to bind that entity.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">2. SERVICE DESCRIPTION</h2>
              <p className="text-muted-foreground leading-relaxed">
                Korex is a marketing intelligence platform that uses artificial intelligence to generate content strategies, captions, creative concepts, and performance insights from data you upload or authorize us to access. The Service is provided on a subscription basis with tiered plans (Starter, Pro, and Agency). Features, quotas, and limits are described on our pricing page and may be updated from time to time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">3. ACCOUNTS & ELIGIBILITY</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You must be at least 18 years old to use the Service. You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. You agree to provide accurate information, verify your email address, and promptly notify us of any unauthorized access. We may require multi-factor authentication for sensitive actions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">4. SUBSCRIPTIONS, BILLING & AUTO-RENEWAL</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                <li><strong className="text-foreground">Billing.</strong> Paid subscriptions are billed in advance on a monthly or annual cycle through our payment processor, Stripe. You authorize us to charge your payment method for all fees.</li>
                <li><strong className="text-foreground">Auto-renewal.</strong> Subscriptions renew automatically at the then-current rate until cancelled. You may cancel at any time from Settings; cancellation takes effect at the end of the current billing period.</li>
                <li><strong className="text-foreground">Price changes.</strong> We will provide at least 30 days' notice of any price increase before it applies to your next renewal.</li>
                <li><strong className="text-foreground">Taxes.</strong> Fees are exclusive of applicable taxes, which you are responsible for.</li>
                <li><strong className="text-foreground">Failed payments.</strong> If a charge fails, we may suspend access after reasonable notice. Access is restored once payment succeeds.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">5. REFUND POLICY</h2>
              <p className="text-muted-foreground leading-relaxed">
                We offer a 7-day refund window on your first paid subscription purchase if you have not generated more than three (3) strategies. After that period, all fees are non-refundable except where required by law. Annual plans are eligible for a pro-rated refund within the first 14 days if usage is below the same threshold. To request a refund, email <a href="mailto:support@korexintelligencesystems.com" className="text-primary hover:underline">support@korexintelligencesystems.com</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">6. PLAN TIERS & FAIR USE</h2>
              <p className="text-muted-foreground leading-relaxed">
                Each tier includes a monthly AI credit and generation allowance. Excessive automated requests, scraping of the Service, or use that materially degrades performance for other users constitutes a breach of these Terms. Agency-tier workspaces and team seats are licensed for your own agency and its clients; sublicensing or resale of the underlying Service is prohibited without written consent.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">7. ACCEPTABLE USE</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">You agree not to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Use the Service for unlawful, deceptive, defamatory, harassing, or infringing purposes.</li>
                <li>Generate content that violates the community guidelines or terms of connected platforms (Meta, TikTok, Google, etc.).</li>
                <li>Generate sexual content involving minors, content that incites violence, or content that impersonates real people without authorization.</li>
                <li>Reverse engineer, decompile, or attempt to extract the underlying models, prompts, or source code of the Service.</li>
                <li>Circumvent tier limits, rate limits, or authentication controls.</li>
                <li>Upload malware or attempt to compromise the Service's security.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">8. USER CONTENT & AI OUTPUT</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong className="text-foreground">Your Content.</strong> You retain all rights in content you submit (uploads, prompts, analytics exports, brand assets). You grant Korex a worldwide, non-exclusive, royalty-free license to host, process, and transmit your content solely to operate and improve the Service for you. We do not use your private business data to train shared foundation models.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong className="text-foreground">AI Output.</strong> Subject to your compliance with these Terms and payment of fees, you own the strategies, captions, and creative outputs generated for you. AI output is generated probabilistically and may be inaccurate, may resemble output produced for other users, and is not legal, financial, or medical advice. You are solely responsible for reviewing output before publishing it and for compliance with advertising, disclosure, and platform rules applicable to your industry.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Warranty on inputs.</strong> You warrant that you have all necessary rights to the content you upload and that its processing by Korex and our subprocessors will not infringe any third party's rights.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">9. THIRD-PARTY PLATFORMS & INTEGRATIONS</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service integrates with third-party platforms and providers (including Meta, TikTok, Google, Anthropic, OpenAI, Stripe, Resend, and Supabase). Your use of those integrations is governed by their own terms. We are not responsible for changes, downtime, or policy decisions of third-party platforms, including account suspensions or reach limitations on connected accounts.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">10. INTELLECTUAL PROPERTY</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service, including its interface, algorithms, prompts, documentation, and trademarks, is owned by Korex and protected by intellectual property laws. We grant you a limited, non-exclusive, non-transferable, revocable license to use the Service in accordance with these Terms. All rights not expressly granted are reserved.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">11. DMCA & COPYRIGHT</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you believe content on the Service infringes your copyright, send a written notice complying with 17 U.S.C. § 512(c) to <a href="mailto:support@korexintelligencesystems.com" className="text-primary hover:underline">support@korexintelligencesystems.com</a> with the subject line "DMCA Notice". Repeat infringers will have their accounts terminated.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">12. PRIVACY & DATA PROTECTION</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> describes how we collect, use, and protect personal data. If you require a Data Processing Addendum (DPA) or Standard Contractual Clauses for GDPR/UK GDPR compliance, contact <a href="mailto:privacy@korexintelligencesystems.com" className="text-primary hover:underline">privacy@korexintelligencesystems.com</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">13. DISCLAIMERS</h2>
              <p className="text-muted-foreground leading-relaxed uppercase text-sm">
                The Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, non-infringement, or that AI output will be accurate, complete, or produce specific business results. Korex does not warrant uninterrupted or error-free operation.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">14. LIMITATION OF LIABILITY</h2>
              <p className="text-muted-foreground leading-relaxed uppercase text-sm">
                To the maximum extent permitted by law, Korex and its officers, employees, and suppliers shall not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or any loss of profits, revenue, data, goodwill, or business opportunities, arising out of or related to the Service. Our aggregate liability for any claim arising out of or relating to the Service shall not exceed the greater of (a) US$100 or (b) the fees you paid to Korex in the twelve (12) months preceding the event giving rise to the claim.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">15. INDEMNIFICATION</h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree to defend, indemnify, and hold harmless Korex from any claim, damage, or expense (including reasonable attorneys' fees) arising from (a) your content or use of AI output, (b) your violation of these Terms, (c) your violation of any law or third-party right, or (d) your use of connected third-party platforms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">16. TERMINATION</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may suspend or terminate your account for material breach of these Terms, misuse of the Service, non-payment, or where required by law. You may terminate at any time from Settings. Upon termination, your access ceases, scheduled operations are cancelled, and your data is deleted or anonymized per our Privacy Policy, subject to legal retention requirements. Sections 8-15, 17, and 18 survive termination.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">17. GOVERNING LAW & DISPUTE RESOLUTION</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                These Terms are governed by the laws of the State of Florida, USA, without regard to conflict-of-law rules. The parties consent to the exclusive jurisdiction of the state and federal courts located in Manatee County, Florida, subject to the arbitration clause below.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong className="text-foreground">Binding arbitration.</strong> Except for claims for injunctive relief or intellectual-property infringement, any dispute arising out of or relating to these Terms or the Service shall be resolved by binding arbitration administered by JAMS under its Streamlined Arbitration Rules, seated in Manatee County, Florida.
              </p>
              <p className="text-muted-foreground leading-relaxed uppercase text-sm">
                Class action waiver. You and Korex agree that each party may bring claims against the other only in your or its individual capacity and not as a plaintiff or class member in any purported class or representative proceeding.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">18. CHANGES TO TERMS</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update these Terms from time to time. Material changes will be notified by email or in-app notice at least 14 days before they take effect. Continued use of the Service after the effective date constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">19. CONTACT</h2>
              <div className="bg-card border border-border rounded-lg p-6">
                <p className="text-foreground mb-2">
                  <strong>Support:</strong>{' '}
                  <a href="mailto:support@korexintelligencesystems.com" className="text-primary hover:underline">
                    support@korexintelligencesystems.com
                  </a>
                </p>
                <p className="text-foreground mb-2">
                  <strong>Privacy / Legal:</strong>{' '}
                  <a href="mailto:privacy@korexintelligencesystems.com" className="text-primary hover:underline">
                    privacy@korexintelligencesystems.com
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
                <Link to="/terms" className="text-sm text-primary hover:underline">
                  Terms of Service
                </Link>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
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

export default Terms;
