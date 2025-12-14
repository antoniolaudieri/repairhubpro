import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

export default function SuccessoPubblicita() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const campaignId = searchParams.get('campaign_id');
  const sessionId = searchParams.get('session_id');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [campaign, setCampaign] = useState<any>(null);

  useEffect(() => {
    if (sessionId && campaignId) {
      confirmPayment();
    } else {
      setStatus('error');
    }
  }, [sessionId, campaignId]);

  const confirmPayment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('confirm-ad-payment', {
        body: { session_id: sessionId, campaign_id: campaignId }
      });

      if (error) throw error;

      if (data?.success) {
        setCampaign(data.campaign);
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          {status === 'loading' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <Loader2 className="h-16 w-16 text-primary mx-auto animate-spin mb-4" />
              <h2 className="text-xl font-semibold">Conferma Pagamento...</h2>
              <p className="text-muted-foreground mt-2">Stiamo verificando il tuo pagamento</p>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">Pagamento Completato!</h2>
              <p className="text-muted-foreground mb-6">
                La tua campagna "{campaign?.ad_title}" è stata creata con successo.
                Sarà attivata dopo l'approvazione del nostro team.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-left space-y-1 mb-6">
                <p><span className="text-muted-foreground">Periodo:</span> {campaign?.start_date} - {campaign?.end_date}</p>
                <p><span className="text-muted-foreground">Totale:</span> €{campaign?.total_price?.toFixed(2)}</p>
                <p><span className="text-muted-foreground">Stato:</span> In attesa di approvazione</p>
              </div>
              <Button onClick={() => navigate('/')} className="w-full">
                Torna alla Home <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-red-600 mb-2">Errore</h2>
              <p className="text-muted-foreground mb-6">
                Si è verificato un errore durante la conferma del pagamento.
                Contatta l'assistenza se il problema persiste.
              </p>
              <Button onClick={() => navigate('/ads/acquista')} variant="outline" className="w-full">
                Riprova
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
