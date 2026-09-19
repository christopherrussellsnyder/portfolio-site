/**
 * Google Analytics Integration
 * Track page views, events, and user interactions
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    gtag: (
      command: string,
      targetId: string | Date,
      config?: Record<string, unknown>
    ) => void;
    dataLayer: unknown[];
  }
}

let analyticsInitialized = false;

export function initGoogleAnalytics(): void {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  
  if (!measurementId || !import.meta.env.PROD) {
    console.log('Analytics: Skipping initialization (dev mode or no measurement ID)');
    return;
  }
  
  // Load gtag.js
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
  
  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(...args: unknown[]) {
    window.dataLayer.push(args);
  };
  
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: true,
    cookie_flags: 'SameSite=None;Secure'
  });
  
  analyticsInitialized = true;
  console.log('Analytics: Initialized successfully');
}

export function trackPageView(path: string): void {
  if (analyticsInitialized && typeof window.gtag !== 'undefined') {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title
    });
  }
}

export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (analyticsInitialized && typeof window.gtag !== 'undefined') {
    window.gtag('event', eventName, params);
  }
}

// Predefined analytics events
export const analytics = {
  // User events
  signUp: (method: string) => {
    trackEvent('sign_up', { method });
  },
  
  login: (method: string) => {
    trackEvent('login', { method });
  },
  
  // Post events
  postCreated: (platform: string) => {
    trackEvent('post_created', { platform });
  },
  
  postPublished: (platform: string) => {
    trackEvent('post_published', { platform });
  },
  
  postScheduled: (platform: string) => {
    trackEvent('post_scheduled', { platform });
  },
  
  // AI events
  aiContentGenerated: (type: string) => {
    trackEvent('ai_content_generated', { content_type: type });
  },
  
  // Campaign events
  campaignCreated: (goal: string) => {
    trackEvent('campaign_created', { goal });
  },
  
  campaignCompleted: (campaignId: string) => {
    trackEvent('campaign_completed', { campaign_id: campaignId });
  },
  
  // Feature usage
  featureUsed: (feature: string) => {
    trackEvent('feature_used', { feature_name: feature });
  },
  
  // Errors
  errorOccurred: (errorType: string, errorMessage: string) => {
    trackEvent('error', { 
      error_type: errorType,
      error_message: errorMessage 
    });
  }
};

// Set user properties
export function setUserProperties(userId: string, properties: Record<string, unknown>): void {
  if (analyticsInitialized && typeof window.gtag !== 'undefined') {
    window.gtag('set', 'user_properties', {
      user_id: userId,
      ...properties
    });
  }
}

// Track page views automatically with React Router
export function usePageTracking(): void {
  const location = useLocation();
  
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);
}
