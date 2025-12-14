import { ReactNode, useEffect, useState } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

// Detect if running as PWA on iOS - animations cause white screen issues
const isIOSPWA = () => {
  if (typeof window === 'undefined') return false;
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

  // On iOS PWA, skip all animations to prevent white screen
  if (isIOSPWA()) {
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
