import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";
import { initGoogleAnalytics } from "./lib/analytics";
import { initPerformanceMonitoring } from "./lib/performance";

// Initialize monitoring in production
if (import.meta.env.PROD) {
  initSentry();
  initGoogleAnalytics();
  initPerformanceMonitoring();
}



const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(<App />);
} else {
  console.error("Root element not found!");
}
