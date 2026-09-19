import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UpgradePromptModal } from "@/components/upgrade/UpgradePromptModal";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider, ThemeRouteScope } from "@/contexts/ThemeContext";

import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorFallback } from "@/components/ErrorFallback";
import { usePageTracking } from "@/lib/analytics";
import { lazy, Suspense, Component, ReactNode } from "react";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Lazy load components
const AIStrategist = lazy(() => import("./pages/AIStrategist"));
const ContentLibrary = lazy(() => import("./pages/ContentLibrary"));
const ContentStrategies = lazy(() => import("./pages/ContentStrategies"));
const Insights = lazy(() => import("./pages/Insights"));
const MediaLibrary = lazy(() => import("./pages/MediaLibrary"));
const Settings = lazy(() => import("./pages/Settings"));
const Research = lazy(() => import("./pages/Research"));
const ContentGeneration = lazy(() => import("./pages/ContentGeneration"));


const HealthCheck = lazy(() => import("./pages/HealthCheck"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Cookies = lazy(() => import("./pages/Cookies"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Features = lazy(() => import("./pages/Features"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Demo = lazy(() => import("./pages/Demo"));
const AuthConfirm = lazy(() => import("./pages/AuthConfirm"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const AdminMessages = lazy(() => import("./pages/AdminMessages"));
const AdminPredictionAccuracy = lazy(() => import("./pages/AdminPredictionAccuracy"));
const Reports = lazy(() => import("./pages/Reports"));
const PublicReport = lazy(() => import("./pages/PublicReport"));
const AcceptWorkspaceInvite = lazy(() => import("./pages/AcceptWorkspaceInvite"));

import { EmailFunnelOptInPrompt } from "@/components/EmailFunnelOptInPrompt";
import { LaunchBanner } from "@/components/LaunchBanner";
import { SupportWidget } from "@/components/SupportWidget";



const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (import.meta.env.DEV) console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <ErrorFallback 
          error={this.state.error} 
          resetError={() => this.setState({ hasError: false, error: null })} 
        />
      );
    }

    return this.props.children;
  }
}

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
    <div className="text-center">
      <div className="arasaka-spinner mx-auto mb-4 w-12 h-12"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Analytics tracker component
const AnalyticsTracker = ({ children }: { children: ReactNode }) => {
  usePageTracking();
  return <>{children}</>;
};

const App = () => (
  <HelmetProvider>
    <ThemeProvider>
    <QueryClientProvider client={queryClient}>

      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <ErrorBoundary>
          <AuthProvider>
            <SubscriptionProvider>
            <WorkspaceProvider>
            <AnalyticsTracker>
              <LaunchBanner />
              <EmailFunnelOptInPrompt />
              <SupportWidget />
              <Suspense fallback={<LoadingFallback />}>

                <ThemeRouteScope />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/features" element={<Features />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/demo" element={<Demo />} />
                  <Route path="/auth/confirm" element={<AuthConfirm />} />
                  <Route path="/unsubscribe" element={<Unsubscribe />} />
                  <Route path="/admin/messages" element={<ProtectedRoute><AdminMessages /></ProtectedRoute>} />
                  <Route path="/admin/prediction-accuracy" element={<ProtectedRoute><AdminPredictionAccuracy /></ProtectedRoute>} />
                  <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                  <Route path="/r/:token" element={<PublicReport />} />
                  <Route path="/accept-workspace-invite/:token" element={<AcceptWorkspaceInvite />} />
                  
                  {/* Admin-only health check */}
                  <Route
                    path="/health"
                    element={
                      <ProtectedRoute>
                        <HealthCheck />
                      </ProtectedRoute>
                    }
                  />
                  
                  {/* Backward-compatible redirects */}
                  <Route path="/dashboard" element={<Navigate to="/ai-strategist" replace />} />
                  <Route path="/scheduler" element={<Navigate to="/ai-strategist" replace />} />
                  <Route path="/campaigns" element={<Navigate to="/ai-strategist" replace />} />
                  <Route path="/analytics" element={<Navigate to="/insights" replace />} />
                  <Route path="/ab-testing" element={<Navigate to="/ai-strategist" replace />} />
                  <Route path="/audience" element={<Navigate to="/ai-strategist" replace />} />
                  <Route path="/content-ai" element={<Navigate to="/ai-strategist" replace />} />
                  <Route path="/ai-analytics" element={<Navigate to="/insights" replace />} />
                  <Route path="/audience-intelligence" element={<Navigate to="/ai-strategist" replace />} />
                  <Route path="/ai-assistant" element={<Navigate to="/ai-strategist" replace />} />
                  <Route path="/intelligence" element={<Navigate to="/ai-strategist" replace />} />
                  <Route path="/media-library" element={<Navigate to="/media" replace />} />
                  <Route path="/business-settings" element={<Navigate to="/settings" replace />} />
                  <Route path="/accept-invite/:token" element={<Navigate to="/ai-strategist" replace />} />
                  
                  {/* Main Routes (5 core pages) */}
                  <Route
                    path="/ai-strategist"
                    element={
                      <ProtectedRoute>
                        <AIStrategist />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/content-library"
                    element={
                      <ProtectedRoute>
                        <ContentLibrary />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/strategies"
                    element={
                      <ProtectedRoute>
                        <ContentStrategies />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/strategies/:id"
                    element={
                      <ProtectedRoute>
                        <ContentStrategies />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/insights"
                    element={
                      <ProtectedRoute>
                        <Insights />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/media"
                    element={
                      <ProtectedRoute>
                        <MediaLibrary />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/research"
                    element={
                      <ProtectedRoute>
                        <Research />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/content-generation"
                    element={
                      <ProtectedRoute>
                        <ContentGeneration />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/video-ads" element={<Navigate to="/content-generation" replace />} />

                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    }
                  />
                  
                  {/* Static Pages */}
                  <Route path="/help" element={<HelpCenter />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/cookies" element={<Cookies />} />
                  
                  {/* Catch-all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <UpgradePromptModal />
            </AnalyticsTracker>
            </WorkspaceProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>

);

export default App;
