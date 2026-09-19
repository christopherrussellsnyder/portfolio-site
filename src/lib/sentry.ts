/**
 * Sentry Error Monitoring
 * Initialize in production for error tracking and performance monitoring
 */

// Type declarations for Sentry
declare global {
  interface Window {
    Sentry?: {
      init: (config: SentryConfig) => void;
      captureException: (error: Error, context?: Record<string, unknown>) => void;
      captureMessage: (message: string, level?: string) => void;
      setUser: (user: SentryUser | null) => void;
      addBreadcrumb: (breadcrumb: SentryBreadcrumb) => void;
    };
  }
}

interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate?: number;
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
  beforeSend?: (event: unknown) => unknown | null;
  ignoreErrors?: string[];
  denyUrls?: RegExp[];
}

interface SentryUser {
  id: string;
  email?: string;
  username?: string;
}

interface SentryBreadcrumb {
  message: string;
  data?: Record<string, unknown>;
  level?: string;
}

let sentryInitialized = false;

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  // Only initialize in production with a valid DSN
  if (!import.meta.env.PROD || !dsn) {
    console.log('Sentry: Skipping initialization (dev mode or no DSN)');
    return;
  }

  // Load Sentry SDK dynamically
  const script = document.createElement('script');
  script.src = 'https://browser.sentry-cdn.com/7.99.0/bundle.min.js';
  script.crossOrigin = 'anonymous';
  script.onload = () => {
    if (window.Sentry) {
      window.Sentry.init({
        dsn,
        environment: import.meta.env.MODE,
        release: import.meta.env.VITE_APP_VERSION || '1.0.0',
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        beforeSend(event) {
          // Filter out common noise
          return event;
        },
        ignoreErrors: [
          'ResizeObserver loop limit exceeded',
          'ResizeObserver loop completed with undelivered notifications',
          'Non-Error promise rejection captured',
          'Network request failed',
          'Failed to fetch',
          'NetworkError',
          'cancelled',
          'AbortError'
        ],
        denyUrls: [
          /extensions\//i,
          /^chrome:\/\//i,
          /^chrome-extension:\/\//i,
        ],
      });
      sentryInitialized = true;
      console.log('Sentry: Initialized successfully');
    }
  };
  document.head.appendChild(script);
}

export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (sentryInitialized && window.Sentry) {
    window.Sentry.captureException(error, context);
  }
  // Always log to console
  console.error('Error captured:', error, context);
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (sentryInitialized && window.Sentry) {
    window.Sentry.captureMessage(message, level);
  }
  console.log(`[${level}]`, message);
}

export function setUserContext(user: { id: string; email?: string; username?: string }): void {
  if (sentryInitialized && window.Sentry) {
    window.Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username
    });
  }
}

export function clearUserContext(): void {
  if (sentryInitialized && window.Sentry) {
    window.Sentry.setUser(null);
  }
}

export function addBreadcrumb(message: string, data?: Record<string, unknown>): void {
  if (sentryInitialized && window.Sentry) {
    window.Sentry.addBreadcrumb({
      message,
      data,
      level: 'info',
    });
  }
}
