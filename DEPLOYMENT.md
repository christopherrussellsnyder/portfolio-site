# Korex Intelligence Systems — Deployment Guide

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
# Required - AI runs directly through Anthropic's API
# (supabase/functions/_shared/llm-gateway.ts translates every caller's
# existing OpenAI-shaped request to Anthropic's Messages API)
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Meta (Facebook/Instagram) ad account connection -- the "Connect Ad
# Account" feature in Settings. See the "Meta App" section below for setup.
META_APP_ID=xxxxx
META_APP_SECRET=xxxxx
AD_TOKEN_ENCRYPTION_KEY=xxxxx

# Sentry (for error monitoring)
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Google Analytics
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# CORS allowlist for edge functions (comma-separated, no trailing slash).
# Defaults to korexintelligencesystems.com + the Lovable preview domain +
# localhost if unset — override this if you deploy under a different domain.
ALLOWED_ORIGINS=https://korexintelligencesystems.com,https://www.korexintelligencesystems.com
```

### 3. External Services Setup

#### Stripe
1. Create account at stripe.com
2. Create products and prices
3. Add webhook endpoint: `https://[project-id].supabase.co/functions/v1/stripe-webhook`
4. Copy API keys to Lovable Secrets

#### Meta App (powers "Connect Ad Account")
The whole OAuth flow is server-side (`supabase/functions/meta-oauth-callback`
and `fetch-meta-ad-performance`) -- there's no client-side Facebook SDK and
no frontend app-ID var, just the three backend secrets above.
1. Create an app at developers.facebook.com (type: Business).
2. Add the "Marketing API" product.
3. App Settings → Basic: copy the App ID and App Secret to `META_APP_ID` /
   `META_APP_SECRET` in Lovable Secrets.
4. Under the Marketing API / Facebook Login for Business settings, add this
   exact Valid OAuth Redirect URI:
   `https://[project-id].supabase.co/functions/v1/meta-oauth-callback`
5. Request/enable the `ads_read`, `read_insights`, and `business_management`
   permissions. Meta's App Review is only required once this needs to work
   for ad accounts you don't personally own/admin -- your own ad accounts
   work immediately in development mode.
6. Separately, generate `AD_TOKEN_ENCRYPTION_KEY` with `openssl rand -base64
   32` (unrelated to the Meta app itself -- it's the key connected accounts'
   OAuth tokens are encrypted with before being stored). Set it once and
   never rotate it after real accounts are connected: rotating it makes
   every already-stored token undecryptable, forcing everyone to reconnect.

#### Sentry (Error Monitoring)
1. Create account at sentry.io
2. Create new React project
3. Copy DSN to Lovable Secrets

#### Google Analytics
1. Create property at analytics.google.com
2. Copy Measurement ID to Lovable Secrets

### 4. Git Workflow — Production Branch

This repo's production branch (what Lovable builds and publishes from) is
**`claude/lovable-app-integration-0tpki6`**, not `main` — there is no
`main` branch. Any change that should go live has to land there via a
merged pull request. A change sitting on another branch, however
thoroughly tested, is not deployed and will be silently overwritten the
next time Lovable rebuilds from the production branch.

Edge function deploys made directly via `supabase functions deploy` from
a local checkout bypass this (they push straight to the live Supabase
project regardless of branch), but the frontend build and any
git-tracked config only ever come from the production branch. Don't rely
on a local CLI deploy as a substitute for merging — it drifts the two
apart and the next Lovable rebuild can revert it.

### 5. Email Deliverability

**Urgent, confirmed-broken as of this writing:** this project has a custom
"Send Email" Auth Hook (`supabase/functions/auth-email-hook`) built on
Lovable Cloud's own email infrastructure (`LOVABLE_API_KEY`), for branded
signup/reset/magic-link/invite emails. Outside Lovable Cloud there is no
working `LOVABLE_API_KEY`, so this hook 500s on every auth email attempt —
and if it's registered as the active Send Email Hook in your Supabase
project, that failure can block the triggering auth action itself (signup,
password reset, etc.), not just silently skip the email. Check immediately:
Supabase Dashboard → Authentication → Hooks → if "Send Email" is enabled
and points at `auth-email-hook`, disable it.

With that hook disabled, Supabase Auth's own built-in email sender is
rate-limited (a handful of emails/hour) — fine for development, not for
real signups. Before real users sign up, configure a production SMTP
provider (Resend, Postmark, SendGrid, etc.) under Supabase → Authentication
→ Settings → SMTP Settings. This makes signup confirmations, password
resets, magic links and invites work immediately using Supabase's own
default templates (not the custom React Email ones `auth-email-hook` would
have sent) — re-wiring those custom templates onto a non-Lovable provider
is separate, lower-urgency follow-up work.

This project's in-app transactional email queue (`process-email-queue`,
used for things like "your report is ready" notifications) is separate from
the above and already fixed to use Resend's HTTP API directly — set
`RESEND_API_KEY` as a Supabase Edge Function secret (see `.env.example`)
and it works independently of the Auth Hook question.

### 6. Custom Domain (Optional)

If deploying to Vercel:
1. Connect GitHub repository
2. Add custom domain in Vercel settings
3. Configure DNS records as shown

### 7. Post-Deployment Checklist

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
1. For changes made via git (not Lovable's in-app editor): revert the
   merge commit on `claude/lovable-app-integration-0tpki6` and push —
   Lovable rebuilds from whatever that branch's HEAD is.
2. For changes made via Lovable's in-app editor: use Lovable's version
   history to restore a previous state.
3. Check error logs in Sentry.
4. Review Edge Function logs directly in the Supabase dashboard
   (Edge Functions → [function] → Logs) — this is the real source of
   truth for backend errors regardless of which path deployed the code.

## Support

For deployment issues, use Lovable's built-in chat support.
