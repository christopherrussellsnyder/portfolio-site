# MarketAI Deployment Guide

## Prerequisites

- Lovable Cloud account (handles Supabase automatically)
- Vercel account (for custom deployment) or use Lovable's built-in hosting
- Domain name (optional)

## Production Setup Checklist

### 1. Lovable Cloud (Automatic)

Lovable Cloud automatically handles:
- ✅ Database setup and migrations
- ✅ Edge function deployment
- ✅ Environment variable management
- ✅ SSL certificates
- ✅ Hosting

### 2. Environment Variables

Add these via Lovable Cloud → Secrets:

```bash
# Optional - only if using direct OpenAI
VITE_OPENAI_API_KEY=sk-proj-xxxxx

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Facebook/Instagram
FACEBOOK_APP_SECRET=xxxxx

# Sentry (for error monitoring)
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Google Analytics
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 3. External Services Setup

#### Stripe
1. Create account at stripe.com
2. Create products and prices
3. Add webhook endpoint: `https://[project-id].supabase.co/functions/v1/stripe-webhook`
4. Copy API keys to Lovable Secrets

#### Facebook App
1. Create app at developers.facebook.com
2. Add Facebook Login and Instagram Graph API products
3. Configure OAuth redirect URIs
4. Copy App ID and Secret to Lovable Secrets

#### Sentry (Error Monitoring)
1. Create account at sentry.io
2. Create new React project
3. Copy DSN to Lovable Secrets

#### Google Analytics
1. Create property at analytics.google.com
2. Copy Measurement ID to Lovable Secrets

### 4. Custom Domain (Optional)

If deploying to Vercel:
1. Connect GitHub repository
2. Add custom domain in Vercel settings
3. Configure DNS records as shown

### 5. Post-Deployment Checklist

- [ ] Test all features in production
- [ ] Verify payment processing with test cards
- [ ] Test email notifications
- [ ] Check social media integrations
- [ ] Run Lighthouse audit
- [ ] Test on multiple devices/browsers
- [ ] Set up uptime monitoring

## Monitoring URLs

- Lovable Dashboard: https://lovable.dev/projects
- Sentry Dashboard: https://sentry.io
- Google Analytics: https://analytics.google.com
- Stripe Dashboard: https://dashboard.stripe.com

## Rollback Plan

If issues occur:
1. Use Lovable's version history to restore previous state
2. Check error logs in Sentry
3. Review Edge Function logs in Lovable Cloud

## Support

For deployment issues, use Lovable's built-in chat support.
