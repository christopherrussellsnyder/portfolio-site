import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'korex-theme';

/**
 * Routes that live inside the authenticated Korex hub. Dark mode only ever
 * applies here — public marketing pages stay permanently light.
 */
const THEMED_ROUTE_PREFIXES = [
  '/ai-strategist',
  '/content-library',
  '/strategies',
  '/insights',
  '/media',
  '/research',
  '/content-generation',
  '/settings',
  '/reports',
  '/admin',
];

function isThemedRoute(pathname: string) {
  return THEMED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  /** True when the current route is allowed to render the dark theme. */
  themingEnabled: boolean;
  /** @internal used by ThemeRouteScope */
  setPathname: (pathname: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
  themingEnabled: false,
  setPathname: () => {},
});

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const [pathname, setPathname] = useState<string>(
    typeof window === 'undefined' ? '/' : window.location.pathname,
  );

  const themingEnabled = isThemedRoute(pathname);

  useEffect(() => {
    applyTheme(themingEnabled ? theme : 'light');
  }, [theme, themingEnabled]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, themingEnabled, setPathname }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Mount inside the router. Keeps the theme provider aware of the active route
 * so dark mode is confined to the authenticated hub.
 */
export function ThemeRouteScope() {
  const { pathname } = useLocation();
  const { setPathname } = useContext(ThemeContext);

  useEffect(() => {
    setPathname(pathname);
  }, [pathname, setPathname]);

  return null;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  return useContext(ThemeContext);
}
