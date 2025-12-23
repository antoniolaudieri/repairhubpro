import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Simple redirect page for native app startup
 * Immediately redirects to /device-monitor
 */
const NativeRedirectPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Small delay to ensure navigation is ready
    const timer = setTimeout(() => {
      navigate('/device-monitor', { replace: true });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">
        Caricamento...
      </div>
    </div>
  );
};

export default NativeRedirectPage;
