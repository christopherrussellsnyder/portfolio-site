/**
 * Environment Configuration for MarketAI Platform
 * 
 * Note: Lovable Cloud automatically provides Supabase configuration.
 * Backend secrets (API keys) are managed via Supabase Edge Function secrets.
 * Only public/frontend variables should use VITE_ prefix.
 */

export const ENV_CONFIG = {
  // Application Settings
  app: {
    env: import.meta.env.MODE || 'development',
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD,
  },

  // Supabase Configuration (Auto-provided by Lovable Cloud)
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
    projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID || '',
  },

  // Facebook/Instagram Configuration (Public App ID only)
  facebook: {
    appId: import.meta.env.VITE_FACEBOOK_APP_ID || '',
    redirectUri: `${window.location.origin}/auth/callback`,
    apiVersion: 'v18.0',
  },

  // Feature Flags
  features: {
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enableAiContent: import.meta.env.VITE_ENABLE_AI_CONTENT !== 'false',
    enableSocialPosting: import.meta.env.VITE_ENABLE_SOCIAL_POSTING !== 'false',
    mockApiResponses: import.meta.env.VITE_MOCK_API_RESPONSES === 'true',
  },

  // Development Settings
  dev: {
    debug: import.meta.env.VITE_DEBUG === 'true',
    enableApiLogging: import.meta.env.VITE_ENABLE_API_LOGGING === 'true',
  },
} as const;

export type EnvConfig = typeof ENV_CONFIG;
