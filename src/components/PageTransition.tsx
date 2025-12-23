import { ReactNode, useEffect, useState } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

// Detect if running as native app (Capacitor) or PWA on iOS
const shouldSkipAnimations = () => {
  if (typeof window === 'undefined') return false;
  
  // Check for Capacitor native app (Android/iOS)
  const isCapacitorNative = !!(window as any).Capacitor?.isNativePlatform?.();
  if (isCapacitorNative) return true;
  
  // Check for iOS PWA
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = (window.navigator as any).standalone === true || 
                       window.matchMedia('(display-mode: standalone)').matches;
  return isIOS && isStandalone;
};

export const PageTransition = ({ children }: PageTransitionProps) => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  // On native apps or iOS PWA, skip all animations to prevent crashes
  if (shouldSkipAnimations()) {
    return <div className="h-full">{children}</div>;
  }

  // For other platforms, simple fade without framer-motion
  return (
    <div 
      className="h-full transition-opacity duration-150"
      style={{ opacity: mounted ? 1 : 0 }}
    >
      {children}
    </div>
  );
};
