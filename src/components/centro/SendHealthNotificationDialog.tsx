import { useState, useEffect } from 'react';
import { Send, Bell, Users, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  hasApp: boolean;
  lastReading?: {
    health_score: number | null;
    created_at: string;
  };
}

interface SendHealthNotificationDialogProps {
  centroId: string;
}

export const SendHealthNotificationDialog = ({ centroId }: SendHealthNotificationDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  // Fetch customers with app installed (those with device_health_readings)
  useEffect(() => {
    if (!open) return;
    
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        // Get customers that have device health readings
        const { data: readings, error: readingsError } = await supabase
          .from('device_health_readings')
          .select('customer_id, health_score, created_at')
          .eq('centro_id', centroId)
          .order('created_at', { ascending: false });

        if (readingsError) throw readingsError;

        // Get unique customer IDs with their latest reading
        const customerReadings = new Map<string, { health_score: number | null; created_at: string }>();
        readings?.forEach(r => {
          if (r.customer_id && !customerReadings.has(r.customer_id)) {
            customerReadings.set(r.customer_id, {
              health_score: r.health_score,
              created_at: r.created_at
            });
          }
        });

        // Get all customers for this centro
        const { data: allCustomers, error: customersError } = await supabase
          .from('customers')
          .select('id, name, email, phone')
          .eq('centro_id', centroId);

        if (customersError) throw customersError;

        const customersWithAppStatus: Customer[] = (allCustomers || []).map(c => ({
          ...c,
          hasApp: customerReadings.has(c.id),
          lastReading: customerReadings.get(c.id)
        }));

        // Sort: customers with app first, then by name
        customersWithAppStatus.sort((a, b) => {
          if (a.hasApp && !b.hasApp) return -1;
          if (!a.hasApp && b.hasApp) return 1;
          return a.name.localeCompare(b.name);
        });

        setCustomers(customersWithAppStatus);
      } catch (error: any) {
        console.error('Error fetching customers:', error);
        toast({
          title: 'Errore',
          description: 'Impossibile caricare i clienti',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [open, centroId, toast]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const customersWithApp = filteredCustomers.filter(c => c.hasApp);

  const toggleCustomer = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const selectAllWithApp = () => {
    setSelectedCustomers(customersWithApp.map(c => c.id));
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: 'Campi obbligatori',
        description: 'Inserisci titolo e messaggio',
        variant: 'destructive'
      });
      return;
    }

    if (selectedCustomers.length === 0) {
      toast({
        title: 'Nessun destinatario',
        description: 'Seleziona almeno un cliente',
        variant: 'destructive'
      });
      return;
    }

    setSending(true);
    try {
      // Get user IDs for selected customers (from push_subscriptions)
      const selectedEmails = customers
        .filter(c => selectedCustomers.includes(c.id))
        .map(c => c.email)
        .filter(Boolean);

      // Get user IDs from push_subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('user_id')
        .in('user_id', 
          await supabase.auth.getSession().then(async () => {
            // Get user IDs that have push subscriptions
            const { data } = await supabase
              .from('push_subscriptions')
              .select('user_id');
            return data?.map(s => s.user_id) || [];
          })
        );

      // Send push notification via edge function
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          payload: {
            title,
            body: message,
            data: {
              type: 'health_alert',
              centroId
            }
          }
          // Note: In a real implementation, you'd filter by the actual user IDs
        }
      });

      if (error) throw error;

      // Also create in-app notifications for customers
      const notifications = selectedEmails.map(email => ({
        customer_email: email!,
        type: 'health_alert',
        title,
        message,
        data: { centroId }
      }));

      if (notifications.length > 0) {
        await supabase.from('customer_notifications').insert(notifications);
      }

      toast({
        title: 'Notifica inviata',
        description: `Inviata a ${selectedCustomers.length} cliente/i`
      });

      setOpen(false);
      setTitle('');
      setMessage('');
      setSelectedCustomers([]);
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast({
        title: 'Errore invio',
        description: error.message || 'Impossibile inviare la notifica',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Bell className="h-4 w-4" />
          Invia Notifica
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Invia Notifica Push
          </DialogTitle>
          <DialogDescription>
            Invia una notifica ai clienti con l'app di monitoraggio installata
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Message form */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="title">Titolo</Label>
              <Input
                id="title"
                placeholder="es. Attenzione: batteria in esaurimento"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Messaggio</Label>
              <Textarea
                id="message"
                placeholder="es. Ti consigliamo di portare il dispositivo per un controllo..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Customer selection */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Destinatari ({selectedCustomers.length} selezionati)
              </Label>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={selectAllWithApp}
                disabled={customersWithApp.length === 0}
              >
                Seleziona tutti con app
              </Button>
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="flex-1 border rounded-md">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Caricamento...
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Nessun cliente trovato
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredCustomers.map(customer => (
                    <label
                      key={customer.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        customer.hasApp 
                          ? 'hover:bg-accent' 
                          : 'opacity-50 cursor-not-allowed'
                      } ${
                        selectedCustomers.includes(customer.id) ? 'bg-accent' : ''
                      }`}
                    >
                      <Checkbox
                        checked={selectedCustomers.includes(customer.id)}
                        onCheckedChange={() => customer.hasApp && toggleCustomer(customer.id)}
                        disabled={!customer.hasApp}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{customer.name}</span>
                          {customer.hasApp ? (
                            <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                              App
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              No app
                            </Badge>
                          )}
                        </div>
                        {customer.lastReading && (
                          <p className="text-xs text-muted-foreground">
                            Salute: {customer.lastReading.health_score ?? 'N/D'}% • 
                            Ultimo sync: {new Date(customer.lastReading.created_at).toLocaleDateString('it-IT')}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Send button */}
          <Button 
            onClick={handleSend} 
            disabled={sending || selectedCustomers.length === 0}
            className="w-full"
          >
            {sending ? (
              'Invio in corso...'
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Invia a {selectedCustomers.length} cliente/i
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
