/**
 * Performance Monitoring
 * Track Core Web Vitals and API performance
 */

export function initPerformanceMonitoring(): void {
  if (!('PerformanceObserver' in window)) {
    console.log('Performance: PerformanceObserver not supported');
    return;
  }

  // Largest Contentful Paint (LCP)
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number; loadTime?: number };
      const value = lastEntry.renderTime || lastEntry.loadTime || 0;
      
      console.log('Performance [LCP]:', value.toFixed(0), 'ms', value < 2500 ? '✓ Good' : '⚠ Needs improvement');
      
      reportWebVital('LCP', value, value < 2500 ? 'good' : 'needs_improvement');
    });
    
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {
    // Browser doesn't support this metric
  }

  // First Input Delay (FID)
  try {
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: PerformanceEntry & { processingStart?: number }) => {
        const value = (entry.processingStart || 0) - entry.startTime;
        
        console.log('Performance [FID]:', value.toFixed(0), 'ms', value < 100 ? '✓ Good' : '⚠ Needs improvement');
        
        reportWebVital('FID', value, value < 100 ? 'good' : 'needs_improvement');
      });
    });
    
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch (e) {
    // Browser doesn't support this metric
  }

  // Cumulative Layout Shift (CLS)
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: PerformanceEntry & { hadRecentInput?: boolean; value?: number }) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value || 0;
        }
      });
      
      console.log('Performance [CLS]:', clsValue.toFixed(3), clsValue < 0.1 ? '✓ Good' : '⚠ Needs improvement');
      
      reportWebVital('CLS', clsValue, clsValue < 0.1 ? 'good' : 'needs_improvement');
    });
    
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch (e) {
    // Browser doesn't support this metric
  }
  
  console.log('Performance: Monitoring initialized');
}

function reportWebVital(name: string, value: number, rating: string): void {
  // Report to Google Analytics if available
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'web_vitals', {
      metric_name: name,
      metric_value: Math.round(name === 'CLS' ? value * 1000 : value),
      metric_rating: rating
    });
  }
}

// Log slow API calls
export function monitorAPIPerformance(endpoint: string, duration: number): void {
  if (duration > 3000) {
    console.warn(`Slow API call: ${endpoint} took ${duration}ms`);
    
    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', 'slow_api_call', {
        endpoint,
        duration: Math.round(duration),
      });
    }
  }
}

// Fetch wrapper with performance monitoring
export async function fetchWithMonitoring(
  url: string, 
  options?: RequestInit
): Promise<Response> {
  const startTime = performance.now();
  
  try {
    const response = await fetch(url, options);
    const duration = performance.now() - startTime;
    
    monitorAPIPerformance(url, duration);
    
    return response;
  } catch (error) {
    const duration = performance.now() - startTime;
    monitorAPIPerformance(url, duration);
    throw error;
  }
}

// Query performance monitoring
type QueryMetrics = {
  name: string;
  duration: number;
  timestamp: number;
  success: boolean;
};

class PerformanceMonitor {
  private metrics: QueryMetrics[] = [];
  private slowQueryThreshold = 1000; // 1 second

  async trackQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    let success = true;

    try {
      const result = await queryFn();
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = performance.now() - start;

      this.metrics.push({
        name: queryName,
        duration,
        timestamp: Date.now(),
        success
      });

      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        console.warn(`[Slow Query] ${queryName}: ${duration.toFixed(2)}ms`);
      }

      // Keep only last 100 metrics
      if (this.metrics.length > 100) {
        this.metrics = this.metrics.slice(-100);
      }
    }
  }

  getMetrics() {
    return [...this.metrics];
  }

  getAverageQueryTime(queryName?: string): number {
    const filtered = queryName
      ? this.metrics.filter(m => m.name === queryName)
      : this.metrics;

    if (filtered.length === 0) return 0;

    const total = filtered.reduce((sum, m) => sum + m.duration, 0);
    return total / filtered.length;
  }

  getSlowQueries(): QueryMetrics[] {
    return this.metrics.filter(m => m.duration > this.slowQueryThreshold);
  }

  clearMetrics() {
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Convenience function for monitoring queries
export async function monitorQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return performanceMonitor.trackQuery(queryName, queryFn);
}
