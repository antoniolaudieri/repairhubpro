import { createRoot } from "react-dom/client";
import "./index.css";

// Remove initial loader once React is ready
const removeInitialLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.opacity = '0';
    loader.style.transition = 'opacity 0.3s';
    setTimeout(() => loader.remove(), 300);
  }
};

// Check if running in native Capacitor environment
const isNative = () => {
  try {
    return !!(window as any).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
};

const renderApp = async () => {
  const rootElement = document.getElementById("root");
  if (!rootElement) return;
  
  const root = createRoot(rootElement);
  
  if (isNative()) {
    // Native app: use simple minimal version
    const { default: NativeApp } = await import("./NativeApp.tsx");
    root.render(<NativeApp />);
  } else {
    // Web app: use full version with routing
    const { default: App } = await import("./App.tsx");
    root.render(<App />);
  }
  
  // Remove loader
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      removeInitialLoader();
    });
  });
};

renderApp();
