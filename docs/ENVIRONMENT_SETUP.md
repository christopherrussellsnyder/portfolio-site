# MarketAI Platform - Environment Setup Guide

## 🔧 How Lovable Cloud Manages Configuration

Lovable Cloud automatically provides core configuration. Additional secrets are managed through:

1. **Frontend Variables** - Added via Lovable Settings (must start with `VITE_`)
2. **Backend Secrets** - Added via Cloud → Secrets (for Edge Functions)

---

## ✅ Auto-Configured (No Action Needed)

These are automatically provided by Lovable Cloud:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase public key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID |

---

## 🔑 Backend Secrets (Edge Functions)

### AI Generation (required)

| Secret Name | Required | Where to Get |
|-------------|----------|--------------|
| `ANTHROPIC_API_KEY` | Yes | [console.anthropic.com](https://console.anthropic.com) |

**This is not auto-configured and will not appear if you only look at
Lovable's Cloud → Secrets panel for something Lovable added itself** —
add it yourself in the same panel. An earlier version of this app ran AI
through `LOVABLE_API_KEY` / Lovable's AI Gateway; that key only ever
existed inside Lovable's own execution environment and was never a real,
independently retrievable Supabase secret, which is why every AI feature
worked inside Lovable's hosted preview but failed everywhere else
(`localhost`, a direct `supabase functions deploy`, etc.). The app now
calls Anthropic's API directly via `supabase/functions/_shared/llm-gateway.ts`
— `ANTHROPIC_API_KEY` set here is the only thing that key depends on.

Add these in **Cloud → Secrets** for social media integrations:

### Facebook/Instagram Integration

| Secret Name | Required | Where to Get |
|-------------|----------|--------------|
| `FACEBOOK_APP_ID` | Yes | [Facebook Developers](https://developers.facebook.com/apps) |
| `FACEBOOK_APP_SECRET` | Yes | Facebook Developers Portal |

### Future Integrations

| Secret Name | Platform | Where to Get |
|-------------|----------|--------------|
| `TWITTER_CLIENT_SECRET` | Twitter/X | [Twitter Developer Portal](https://developer.twitter.com) |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn | [LinkedIn Developers](https://www.linkedin.com/developers) |

---

## 🌐 Frontend Variables (Optional)

Add these in **Project Settings → Environment Variables**:

### Social Media (Public App IDs)

| Variable | Description |
|----------|-------------|
| `VITE_FACEBOOK_APP_ID` | Facebook App ID (public) |

### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_ENABLE_AI_CONTENT` | `true` | Enable AI content generation |
| `VITE_ENABLE_SOCIAL_POSTING` | `true` | Enable social media posting |
| `VITE_ENABLE_ANALYTICS` | `false` | Enable analytics tracking |
| `VITE_DEBUG` | `false` | Enable debug logging |

---

## 🚀 Quick Setup Checklist

### Minimum (Works out of box):
- [x] Supabase - Auto-configured ✅
- [ ] Anthropic AI - Add `ANTHROPIC_API_KEY` as a Supabase secret (not auto-configured)

### For Social Media Posting:
- [ ] Create Facebook App at developers.facebook.com
- [ ] Add `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` as secrets
- [ ] Configure OAuth redirect URI: `https://your-app.lovable.app/auth/callback`

---

## 🔍 Verification

Check browser console in development mode for:
```
🔧 MarketAI Environment Status
✅ Required environment variables configured
🎚️ Feature Flags:
   AI Content: ✅
   Social Posting: ✅
```

---

## ⚠️ Important Notes

1. **Never expose API secrets** - Keep them in backend Edge Function secrets
2. **VITE_ prefix** - Only for public, frontend-safe values
3. **Restart required** - After adding variables in Lovable dashboard

For more help: [Lovable Documentation](https://docs.lovable.dev/)
