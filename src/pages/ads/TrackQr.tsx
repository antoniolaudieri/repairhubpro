import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function TrackQr() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const campaignId = searchParams.get('campaign');
  const cornerId = searchParams.get('corner');
  const destination = searchParams.get('url');

  useEffect(() => {
    const trackAndRedirect = async () => {
      if (!campaignId || !destination) {
        navigate('/');
        return;
      }

      try {
        // Track the QR scan
        await supabase.from('ad_qr_scans').insert({
          campaign_id: campaignId,
          corner_id: cornerId || null,
          user_agent: navigator.userAgent,
          referrer: document.referrer || null
        });
      } catch (error) {
        console.error('Error tracking QR scan:', error);
      }

      // Redirect to destination
      window.location.href = destination;
    };

    trackAndRedirect();
  }, [campaignId, cornerId, destination, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Reindirizzamento in corso...</p>
      </div>
    </div>
  );
}
