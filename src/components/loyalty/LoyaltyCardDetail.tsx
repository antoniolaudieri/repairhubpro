import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, Calendar, Smartphone, Check, Percent, 
  ChevronDown, ChevronUp, Plus, AlertCircle 
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Device {
  id: string;
  device_type: string;
  brand: string;
  model: string;
}

interface LoyaltyCardDetailProps {
  card: {
    id: string;
    card_number: string | null;
    activated_at: string | null;
    expires_at: string | null;
    devices_used: number;
    max_devices: number;
    amount_paid: number;
    payment_method: string;
  };
  devices: Device[];
  onRefresh?: () => void;
}

export function LoyaltyCardDetail({ card, devices, onRefresh }: LoyaltyCardDetailProps) {
  const [expanded, setExpanded] = useState(true);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const expiresAt = card.expires_at ? new Date(card.expires_at) : null;
  const daysRemaining = expiresAt ? differenceInDays(expiresAt, new Date()) : null;
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0;
  const isExpired = daysRemaining !== null && daysRemaining <= 0;
  const canAddDevice = card.devices_used < card.max_devices;

  const handleAssignDevice = async (deviceId: string) => {
    if (!canAddDevice) {
      toast.error("Limite dispositivi raggiunto");
      return;
    }

    setAssigning(true);
    try {
      // Increment devices_used on the loyalty card
      const { error } = await supabase
        .from('loyalty_cards')
        .update({ devices_used: card.devices_used + 1 })
        .eq('id', card.id);

      if (error) throw error;

      // Record the usage
      await supabase.from('loyalty_card_usages').insert({
        loyalty_card_id: card.id,
        device_id: deviceId,
        discount_type: 'repair_discount',
        original_amount: 0,
        discounted_amount: 0,
        savings: 0,
      });

      toast.success("Dispositivo assegnato alla tessera");
      setShowAssignDialog(false);
      onRefresh?.();
    } catch (err: any) {
      toast.error("Errore nell'assegnazione: " + err.message);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <>
      <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base text-amber-900 dark:text-amber-100">
                  Tessera Fedeltà
                </CardTitle>
                {card.card_number && (
                  <p className="text-xs font-mono text-amber-700 dark:text-amber-300">
                    {card.card_number}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-8 w-8 p-0"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="pt-2 space-y-4">
            {/* Main Benefit */}
            <div className="p-3 rounded-lg bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200">
              <div className="flex items-start gap-2">
                <Smartphone className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-800 text-sm">Diagnosi GRATUITA per {card.max_devices} dispositivi</p>
                  <p className="text-xs text-green-700">Controllo completo dello stato di salute</p>
                </div>
              </div>
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                <Percent className="h-3 w-3 mr-1" />
                Sconto 10% riparazioni
              </Badge>
            </div>

            {/* Devices counter */}
            <div className="p-3 rounded-lg bg-background/60 border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Dispositivi coperti</span>
                </div>
                <span className="text-lg font-bold text-purple-600">
                  {card.devices_used}/{card.max_devices}
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all"
                  style={{ width: `${(card.devices_used / card.max_devices) * 100}%` }}
                />
              </div>

              {canAddDevice && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 border-purple-300 text-purple-700 hover:bg-purple-50"
                  onClick={() => setShowAssignDialog(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Assegna dispositivo ({card.max_devices - card.devices_used} rimasti)
                </Button>
              )}

              {!canAddDevice && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Tutti i dispositivi sono stati utilizzati
                </p>
              )}
            </div>

            {/* Expiration */}
            <div className={`p-3 rounded-lg border ${
              isExpired 
                ? 'bg-destructive/10 border-destructive/30' 
                : isExpiringSoon 
                  ? 'bg-warning/10 border-warning/30' 
                  : 'bg-background/60'
            }`}>
              <div className="flex items-center gap-2">
                <Calendar className={`h-4 w-4 ${
                  isExpired ? 'text-destructive' : isExpiringSoon ? 'text-warning' : 'text-muted-foreground'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">Scadenza</p>
                  {expiresAt && (
                    <p className={`text-xs ${
                      isExpired ? 'text-destructive' : isExpiringSoon ? 'text-warning' : 'text-muted-foreground'
                    }`}>
                      {format(expiresAt, "dd MMMM yyyy", { locale: it })}
                      {daysRemaining !== null && daysRemaining > 0 && (
                        <span className="ml-1">({daysRemaining} giorni)</span>
                      )}
                      {isExpired && <span className="ml-1 font-medium">(Scaduta)</span>}
                    </p>
                  )}
                </div>
                {isExpiringSoon && !isExpired && (
                  <AlertCircle className="h-4 w-4 text-warning" />
                )}
              </div>
            </div>

            {/* Activation info */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Attivata: {card.activated_at 
                  ? format(new Date(card.activated_at), "dd/MM/yyyy", { locale: it })
                  : 'N/D'
                }
              </span>
              <span>
                Pagamento: {card.payment_method === 'stripe' ? 'Carta' : 'Bonifico'}
              </span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Assign Device Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assegna Dispositivo alla Tessera</DialogTitle>
            <DialogDescription>
              Seleziona un dispositivo da coprire con la tessera fedeltà. 
              Rimangono {card.max_devices - card.devices_used} slot disponibili.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {devices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nessun dispositivo registrato per questo cliente
                </p>
              ) : (
                devices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{device.brand} {device.model}</p>
                        <p className="text-xs text-muted-foreground capitalize">{device.device_type}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={assigning}
                      onClick={() => handleAssignDevice(device.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Assegna
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
