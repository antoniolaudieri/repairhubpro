import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Gift, Percent, Smartphone, Check, Copy, ExternalLink, Loader2, Mail, Send } from 'lucide-react';
import { useLoyaltyCard } from '@/hooks/useLoyaltyCard';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface LoyaltyCardProposalProps {
  customerId: string;
  centroId: string;
  customerEmail?: string;
  customerName?: string;
  centroIban?: string;
  onSuccess?: () => void;
}

export function LoyaltyCardProposal({
  customerId,
  centroId,
  customerEmail,
  customerName,
  centroIban,
  onSuccess,
}: LoyaltyCardProposalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { benefits, programSettings, activateWithBonifico } = useLoyaltyCard(customerId, centroId);

  const handleStripeEmailProposal = async () => {
    if (!customerEmail) {
      toast.error('Il cliente non ha un indirizzo email');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-loyalty-proposal-email', {
        body: { 
          customer_id: customerId, 
          centro_id: centroId, 
          customer_email: customerEmail,
          customer_name: customerName,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Email inviata a ${customerEmail} con il link di pagamento!`);
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(data?.error || 'Errore nell\'invio dell\'email');
      }
    } catch (error: any) {
      console.error('Error sending loyalty proposal email:', error);
      toast.error(error?.message || 'Errore durante l\'invio dell\'email');
    } finally {
      setLoading(false);
    }
  };

  const handleBonificoConfirm = async () => {
    setLoading(true);
    try {
      const success = await activateWithBonifico();
      if (success) {
        toast.success('Tessera fedeltà attivata con successo!');
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error('Errore nell\'attivazione della tessera');
      }
    } catch (error) {
      toast.error('Errore durante l\'attivazione');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiato negli appunti!');
  };

  // Calculate commission (5% platform)
  const platformCommissionRate = 0.05;
  const platformCommission = programSettings.annual_price * platformCommissionRate;
  const centroNetRevenue = programSettings.annual_price - platformCommission;

  if (benefits.hasActiveCard) {
    return (
      <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
        <CreditCard className="h-3 w-3 mr-1" />
        Cliente Fedeltà
      </Badge>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Gift className="h-4 w-4" />
          Proponi Tessera Fedeltà
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-amber-500" />
            Tessera Fedeltà
          </DialogTitle>
          <DialogDescription>
            Proponi la tessera fedeltà a {customerName || 'questo cliente'}
          </DialogDescription>
        </DialogHeader>

        {/* Benefits Preview */}
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-600" />
              Benefici inclusi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-2.5 rounded-lg bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200">
              <div className="flex items-start gap-2">
                <Smartphone className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-800">
                    Diagnosi a €{programSettings.diagnostic_fee} per {programSettings.max_devices} dispositivi
                  </p>
                  <p className="text-xs text-green-700">Controllo completo dello stato di salute del dispositivo</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span><strong>{programSettings.repair_discount_percent}% di sconto</strong> su ogni riparazione</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>Validità <strong>{programSettings.validity_months} mesi</strong> dalla data di attivazione</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>Priorità nelle prenotazioni</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-2 py-2">
          <span className="text-2xl font-bold text-foreground">€{programSettings.annual_price}</span>
          <span className="text-muted-foreground">/anno</span>
        </div>

        <Tabs defaultValue="stripe" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stripe">💳 Carta/Stripe</TabsTrigger>
            <TabsTrigger value="bonifico">🏦 Bonifico</TabsTrigger>
          </TabsList>
          
          <TabsContent value="stripe" className="space-y-4 mt-4">
            {customerEmail ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm font-medium">Email al cliente:</span>
                  </div>
                  <p className="text-sm text-blue-700 mt-1">{customerEmail}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Invia un'email al cliente con il link di pagamento sicuro per l'abbonamento annuale.
                </p>
                <Button 
                  onClick={handleStripeEmailProposal} 
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Invia Email con Link Pagamento
                </Button>
              </>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <p className="text-sm text-yellow-800">
                  ⚠️ Il cliente non ha un indirizzo email registrato. 
                  Aggiungi l'email al profilo cliente per inviare la proposta.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="bonifico" className="space-y-4 mt-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Importo</p>
                <p className="font-mono font-bold">€{programSettings.annual_price.toFixed(2)}</p>
              </div>
              {centroIban && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">IBAN</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm">{centroIban}</p>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(centroIban)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Causale</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm">Tessera Fedeltà - {customerName || 'Cliente'}</p>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(`Tessera Fedeltà - ${customerName || 'Cliente'}`)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Una volta ricevuto il bonifico, conferma l'attivazione della tessera.
            </p>
            
            <Button 
              onClick={handleBonificoConfirm}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Conferma Bonifico Ricevuto e Attiva
            </Button>
          </TabsContent>
        </Tabs>

        <p className="text-xs text-muted-foreground text-center">
          Commissione piattaforma: 5% (€{platformCommission.toFixed(2)}) • Tuo guadagno netto: €{centroNetRevenue.toFixed(2)}
        </p>
      </DialogContent>
    </Dialog>
  );
}
