import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { STRIPE_TIERS } from '@/config/stripe.config';
import { toast } from 'sonner';
import { KorexLogoLockup } from '@/components/branding/KorexLogoLockup';
import { Seo } from '@/components/Seo';

const plans = [
  {
    key: 'pro' as const,
    name: 'Pro',
    monthlyPrice: 99,
    yearlyPrice: 831,
    popular: true,
    features: [
      'Unlimited AI strategies',
      'Unlimited analytics uploads',
      'All platforms supported',
      'Export to PDF',
      'Priority support',
      'Cancel anytime',
    ],
  },
  {
    key: 'agency' as const,
    name: 'Agency',
    monthlyPrice: 299,
    yearlyPrice: 2511,
    popular: false,
    features: [
      'Everything in Pro',
      'Multi-client management (coming soon)',
      'White-label reports (coming soon)',
      'API access (coming soon)',
      'Dedicated support',
    ],
    badge: 'Popular for agencies',
  },
];

export default function Pricing() {
  const [billingAnnual, setBillingAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { tier, subscribed, refreshSubscription } = useSubscription();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      toast.success('Subscription activated! Welcome to Korex.');
      refreshSubscription();
    }
  }, [searchParams, refreshSubscription]);

  const handleCheckout = async (planKey: 'pro' | 'agency') => {
    setLoadingPlan(planKey);
    const checkoutWindow = window.open('', '_blank');
    try {
      const interval = billingAnnual ? 'yearly' : 'monthly';
      const priceId = STRIPE_TIERS[planKey][interval].price_id;

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        if (checkoutWindow) {
          checkoutWindow.location.href = data.url;
        } else {
          window.location.href = data.url;
        }
      }
    } catch (err) {
      checkoutWindow?.close();
      toast.error('Failed to start checkout. Please try again.');
      console.error(err);
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManage = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
        if (isMobile) {
          window.location.href = data.url;
        } else {
          const opened = window.open(data.url, '_blank');
          if (!opened) window.location.href = data.url;
        }
      }
    } catch (err) {
      toast.error('Failed to open billing portal.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-20 px-4">
      <Seo
        title="Pricing | Korex Intelligence Systems"
        description="Simple pricing for AI marketing strategy: Pro at $99/month and Agency at $299/month, with 30% off annual plans. Start free with 2 strategy generations."
        path="/pricing"
        jsonLd={plans.map((plan) => ({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: `Korex ${plan.name}`,
          description: plan.features.join('. '),
          brand: { '@type': 'Brand', name: 'Korex Intelligence Systems' },
          offers: {
            '@type': 'Offer',
            price: String(plan.monthlyPrice),
            priceCurrency: 'USD',
            url: 'https://korexintelligencesystems.com/pricing',
            availability: 'https://schema.org/InStock',
          },
        }))}
      />
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Link to="/" className="inline-block mb-8">
            <KorexLogoLockup height={48} className="mx-auto" />
          </Link>
          <h1 className="text-3xl sm:text-[48px] font-semibold mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-muted-foreground mb-6">Free Starter plan includes 2 strategy generations. Upgrade anytime for unlimited access.</p>
          
          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm ${!billingAnnual ? 'text-white' : 'text-[hsl(var(--text-tertiary))]'}`}>Monthly</span>
            <button
              type="button"
              role="switch"
              aria-checked={billingAnnual}
              aria-label="Toggle between monthly and yearly billing"
              onClick={() => setBillingAnnual(!billingAnnual)}
              className={`relative w-12 h-6 rounded-full transition-colors ${billingAnnual ? 'bg-primary' : 'bg-border'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${billingAnnual ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
            <span className={`text-sm ${billingAnnual ? 'text-white' : 'text-[hsl(var(--text-tertiary))]'}`}>Yearly</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-opacity ${billingAnnual ? 'bg-[hsl(var(--primary)/0.2)] text-primary opacity-100' : 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary)/0.7)] opacity-100'}`}>Save 30%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan) => {
            const isCurrentPlan = tier === plan.key && subscribed;
            const displayPrice = billingAnnual ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
            const totalYearly = plan.yearlyPrice;
            const savings = plan.monthlyPrice * 12 - plan.yearlyPrice;

            return (
              <div
                key={plan.key}
                className={`relative bg-card rounded-sm p-8 h-full flex flex-col border transition-all duration-300 hover:-translate-y-1 ${
                  plan.popular ? 'border-primary shadow-[0_0_30px_hsl(var(--primary) / 0.15)]' : 'border-border hover:border-border'
                } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-[hsl(var(--primary-dark))] text-white text-xs font-bold px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Your Plan
                  </div>
                )}
                <h2 className="text-xl font-bold mb-2">{plan.name}</h2>
                <div className="mb-2">
                  <span className="text-4xl font-semibold">
                    ${displayPrice}
                  </span>
                  <span className="text-[hsl(var(--text-tertiary))] text-sm">/month</span>
                </div>
                {billingAnnual && (
                  <p className="text-xs text-[hsl(var(--text-tertiary))] mb-4">
                    ${totalYearly}/year · Save ${savings}
                  </p>
                )}
                {!billingAnnual && <div className="mb-4" />}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrentPlan ? (
                  <button
                    onClick={handleManage}
                    className="block text-center py-3 rounded-sm font-bold text-sm border border-green-500 text-green-400 hover:bg-green-500/10 transition-all w-full"
                  >
                    Manage Subscription
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckout(plan.key)}
                    disabled={loadingPlan === plan.key}
                    className={`block text-center py-3 rounded-sm font-bold text-sm transition-all w-full ${
                      plan.popular
                        ? 'bg-gradient-to-r from-primary to-[hsl(var(--primary-dark))] text-white hover:shadow-[0_0_20px_hsl(var(--primary) / 0.3)]'
                        : 'border border-border text-foreground hover:border-primary hover:text-primary'
                    }`}
                  >
                    {loadingPlan === plan.key ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Upgrade Now'}
                  </button>
                )}
                <p className="text-xs text-[hsl(var(--text-tertiary))] text-center mt-3">Cancel anytime</p>
                {plan.badge && <p className="text-xs text-muted-foreground text-center mt-1">{plan.badge}</p>}
              </div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Link to="/" className="text-[hsl(var(--text-tertiary))] hover:text-primary transition-colors text-sm">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
