import { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const DISMISS_KEY = 'korex_launch_banner_dismissed_v1';

export function LaunchBanner() {
  const [visible, setVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = window.localStorage.getItem(DISMISS_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  // Hide inside authenticated app routes (it should only show on marketing pages)
  const marketingRoutes = ['/', '/pricing', '/features', '/about', '/contact', '/demo'];
  if (!marketingRoutes.includes(location.pathname)) return null;
  if (!visible) return null;

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, '1');
    }
    setVisible(false);
  };

  return (
    <div className="relative z-50 w-full bg-gradient-to-r from-primary via-primary to-primary/80 text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Sparkles className="w-4 h-4 shrink-0" />
          <p className="truncate">
            <span className="font-semibold tracking-wide">LAUNCH OFFER</span>
            <span className="mx-2 opacity-70">·</span>
            <span>Use code <span className="font-bold tracking-wider bg-background/15 px-1.5 py-0.5 rounded">KOREX</span> for <span className="font-semibold">15% off your first month</span> <span className="opacity-70">(monthly plans)</span></span>
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link
            to="/pricing"
            className="hidden sm:inline-block text-xs font-semibold underline-offset-2 hover:underline"
          >
            View plans
          </Link>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss launch banner"
            className="p-1 rounded hover:bg-background/15 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
