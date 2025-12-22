import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Gift, 
  Check, 
  Percent, 
  Smartphone, 
  Loader2,
  Sparkles 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface Centro {
  id: string;
  business_name: string;
  logo_url: string | null;
}

interface LoyaltyCardActivationProps {
  customerEmail: string;
  existingCardCentroIds: string[];
}

export function LoyaltyCardActivation({ customerEmail, existingCardCentroIds }: LoyaltyCardActivationProps) {
  const [centri, setCentri] = useState<Centro[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingCentroId, setActivatingCentroId] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableCentri();
  }, [customerEmail, existingCardCentroIds]);

  const fetchAvailableCentri = async () => {
    try {
      // Trova tutti i customer records per questa email
      const { data: customers } = await supabase
        .from('customers')
        .select('id, centro_id')
        .eq('email', customerEmail);

      if (!customers || customers.length === 0) {
        setLoading(false);
        return;
      }

      const customerIds = customers.map(c => c.id);

      // Trova TUTTE le loyalty cards attive per questo cliente (qualsiasi centro)
      const { data: activeCards } = await supabase
        .from('loyalty_cards')
        .select('centro_id')
        .in('customer_id', customerIds)
        .eq('status', 'active');

      const activeCentroIds = activeCards?.map(c => c.centro_id) || [];
      
      // Combina con existingCardCentroIds passati come prop
      const allExistingCentroIds = [...new Set([...existingCardCentroIds, ...activeCentroIds])];

      // Filtra solo quelli con centro_id e senza card attiva
      const centroIds = customers
        .filter(c => c.centro_id)
        .map(c => c.centro_id as string)
        .filter(id => !allExistingCentroIds.includes(id));

      if (centroIds.length === 0) {
        setLoading(false);
        return;
      }

      // Carica i dati dei Centri
      const { data: centriData } = await supabase
        .from('centri_assistenza')
        .select('id, business_name, logo_url')
        .in('id', centroIds)
        .eq('status', 'approved');

      setCentri(centriData || []);
    } catch (error) {
      console.error('Error fetching centri:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (centro: Centro) => {
    setActivatingCentroId(centro.id);
    try {
      // Trova il customer_id per questo centro
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', customerEmail)
        .eq('centro_id', centro.id)
        .single();

      if (!customer) {
        throw new Error('Cliente non trovato');
      }

      // Crea checkout session
      const { data, error } = await supabase.functions.invoke('create-loyalty-checkout', {
        body: {
          customer_id: customer.id,
          centro_id: centro.id,
          customer_email: customerEmail
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast({
          title: 'Checkout avviato',
          description: 'Completa il pagamento nella nuova scheda per attivare la tessera.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile avviare il checkout',
        variant: 'destructive',
      });
    } finally {
      setActivatingCentroId(null);
    }
  };

  if (loading) {
    return null;
  }

  if (centri.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
        <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
        Attiva la Tessera Fedeltà
      </h2>
      
      <div className="grid gap-4 md:grid-cols-2">
        {centri.map((centro) => (
          <Card key={centro.id} className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                {centro.logo_url ? (
                  <img 
                    src={centro.logo_url} 
                    alt={centro.business_name}
                    className="w-12 h-12 rounded-lg object-contain bg-white p-1"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-amber-600" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-lg">{centro.business_name}</CardTitle>
                  <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
                    <Gift className="h-3 w-3 mr-1" />
                    €30/anno
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Benefits */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-background/50">
                  <Check className="h-4 w-4 mx-auto text-green-600 mb-1" />
                  <p className="text-xs font-medium">Diagnosi €10</p>
                  <p className="text-[10px] text-muted-foreground line-through">€15</p>
                </div>
                <div className="p-2 rounded-lg bg-background/50">
                  <Percent className="h-4 w-4 mx-auto text-blue-600 mb-1" />
                  <p className="text-xs font-medium">-10%</p>
                  <p className="text-[10px] text-muted-foreground">riparazioni</p>
                </div>
                <div className="p-2 rounded-lg bg-background/50">
                  <Smartphone className="h-4 w-4 mx-auto text-purple-600 mb-1" />
                  <p className="text-xs font-medium">3 dispositivi</p>
                  <p className="text-[10px] text-muted-foreground">coperti</p>
                </div>
              </div>

              <Button 
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                onClick={() => handleActivate(centro)}
                disabled={activatingCentroId === centro.id}
              >
                {activatingCentroId === centro.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Attivazione...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Attiva Tessera
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
