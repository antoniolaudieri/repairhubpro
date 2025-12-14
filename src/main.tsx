import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// iOS PWA fix: Force a repaint when app resumes from background
const isIOSPWA = () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = (window.navigator as any).standalone === true || 
                       window.matchMedia('(display-mode: standalone)').matches;
  return isIOS && isStandalone;
};

if (isIOSPWA()) {
  // Force repaint when returning from background
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Force a repaint by toggling visibility
      document.body.style.display = 'none';
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      document.body.offsetHeight; // Trigger reflow
      document.body.style.display = '';
    }
  });
  
  // Also handle pageshow event for iOS PWA
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      window.location.reload();
    }
  });
}

// Remove initial loader once React is ready
const removeInitialLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.opacity = '0';
    loader.style.transition = 'opacity 0.3s';
    setTimeout(() => loader.remove(), 300);
  }
};

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
  
  // Remove loader after a small delay to ensure React has mounted
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      removeInitialLoader();
    });
  });
}
