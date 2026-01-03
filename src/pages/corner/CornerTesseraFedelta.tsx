import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CornerLayout } from "@/layouts/CornerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  CreditCard, 
  Send, 
  Users, 
  Euro, 
  Clock, 
  CheckCircle2, 
  Mail,
  Phone,
  User,
  Loader2,
  Gift,
  TrendingUp,
  Smartphone,
  Shield,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Invitation {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  status: string;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  loyalty_card_id: string | null;
}

interface LoyaltyCardWithCorner {
  id: string;
  card_number: string | null;
  status: string;
  activated_at: string | null;
  corner_commission: number;
  corner_commission_paid: boolean;
  customer: {
    name: string;
    email: string | null;
  } | null;
}

interface LoyaltySettings {
  annual_price: number;
  max_devices: number;
  repair_discount_percent: number;
  diagnostic_fee: number;
}

export default function CornerTesseraFedelta() {
  const { user } = useAuth();
  const [cornerId, setCornerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [soldCards, setSoldCards] = useState<LoyaltyCardWithCorner[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [pendingEarnings, setPendingEarnings] = useState(0);
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings | null>(null);

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  useEffect(() => {
    if (user) {
      loadCornerData();
    }
  }, [user]);

  const loadCornerData = async () => {
    try {
      // Get corner ID
      const { data: corner } = await supabase
        .from("corners")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!corner) {
        toast.error("Corner non trovato");
        return;
      }

      setCornerId(corner.id);

      // Get centro partnership to find loyalty settings
      const { data: partnership } = await supabase
        .from("corner_partnerships")
        .select("provider_id")
        .eq("corner_id", corner.id)
        .eq("provider_type", "centro")
        .eq("is_active", true)
        .maybeSingle();

      if (partnership?.provider_id) {
        // Load loyalty program settings from the partner centro
        const { data: settings } = await supabase
          .from("loyalty_program_settings")
          .select("annual_price, max_devices, repair_discount_percent, diagnostic_fee")
          .eq("centro_id", partnership.provider_id)
          .eq("is_active", true)
          .maybeSingle();

        if (settings) {
          setLoyaltySettings(settings);
        }
      }

      // Load invitations
      const { data: invitationsData } = await supabase
        .from("corner_loyalty_invitations")
        .select("*")
        .eq("corner_id", corner.id)
        .order("created_at", { ascending: false });

      setInvitations(invitationsData || []);

      // Load sold cards with corner referral
      const { data: cardsData } = await supabase
        .from("loyalty_cards")
        .select(`
          id,
          card_number,
          status,
          activated_at,
          corner_commission,
          corner_commission_paid,
          customer:customers(name, email)
        `)
        .eq("referred_by_corner_id", corner.id)
        .eq("status", "active")
        .order("activated_at", { ascending: false });

      setSoldCards(cardsData as unknown as LoyaltyCardWithCorner[] || []);

      // Calculate earnings
      const total = (cardsData || []).reduce((sum, card) => sum + (card.corner_commission || 0), 0);
      const pending = (cardsData || []).filter(card => !card.corner_commission_paid).reduce((sum, card) => sum + (card.corner_commission || 0), 0);
      
      setTotalEarnings(total);
      setPendingEarnings(pending);

    } catch (error) {
      console.error("Error loading corner data:", error);
      toast.error("Errore nel caricamento dati");
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cornerId || !customerName || !customerEmail) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }

    setSending(true);
    try {
      // Create invitation
      const { data: invitation, error: insertError } = await supabase
        .from("corner_loyalty_invitations")
        .insert({
          corner_id: cornerId,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone || null,
          status: "pending"
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Send email via edge function
      const { error: emailError } = await supabase.functions.invoke("send-corner-loyalty-invite", {
        body: {
          invitation_id: invitation.id,
          customer_name: customerName,
          customer_email: customerEmail,
          corner_id: cornerId
        }
      });

      if (emailError) {
        console.error("Email error:", emailError);
        toast.warning("Invito creato ma email non inviata");
      } else {
        toast.success("Invito inviato con successo!");
      }

      // Reset form
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");

      // Reload data
      loadCornerData();

    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error("Errore nell'invio dell'invito");
    } finally {
      setSending(false);
    }
  };

  const resendInvitation = async (invitationId: string) => {
    try {
      const invitation = invitations.find(i => i.id === invitationId);
      if (!invitation) return;

      const { error } = await supabase.functions.invoke("send-corner-loyalty-invite", {
        body: {
          invitation_id: invitationId,
          customer_name: invitation.customer_name,
          customer_email: invitation.customer_email,
          corner_id: cornerId
        }
      });

      if (error) throw error;
      toast.success("Email reinviata!");
      loadCornerData();
    } catch (error) {
      console.error("Error resending:", error);
      toast.error("Errore nel reinvio");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" />In attesa</Badge>;
      case "sent":
        return <Badge variant="outline" className="text-blue-600 border-blue-600"><Mail className="w-3 h-3 mr-1" />Inviato</Badge>;
      case "clicked":
        return <Badge variant="outline" className="text-purple-600 border-purple-600"><User className="w-3 h-3 mr-1" />Visualizzato</Badge>;
      case "paid":
        return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Pagato</Badge>;
      case "expired":
        return <Badge variant="destructive"><Clock className="w-3 h-3 mr-1" />Scaduto</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <CornerLayout>
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/20">
              <CreditCard className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Tessera Fedeltà</CardTitle>
              <CardDescription className="text-base">
                Vendi tessere fedeltà ai tuoi clienti e guadagna €10 per ogni attivazione
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-background/60 backdrop-blur">
              <Euro className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">€{totalEarnings.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Guadagni totali</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-background/60 backdrop-blur">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-yellow-600">€{pendingEarnings.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">In attesa pagamento</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-background/60 backdrop-blur">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-primary">{soldCards.length}</p>
                <p className="text-sm text-muted-foreground">Tessere vendute</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vantaggi Tessera - Dinamici dal Centro */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Vantaggi Tessera Fedeltà con Antivirus
          </CardTitle>
          <CardDescription>
            Proponi questi vantaggi ai tuoi clienti - Prezzo: <span className="font-bold text-primary">€{loyaltySettings?.annual_price || 30}/anno</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-background border">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-green-100">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <h4 className="font-semibold">{loyaltySettings?.repair_discount_percent || 10}% Sconto</h4>
              </div>
              <p className="text-sm text-muted-foreground">Su tutte le riparazioni presso i centri convenzionati</p>
            </div>
            
            <div className="p-4 rounded-lg bg-background border">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-blue-100">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                </div>
                <h4 className="font-semibold">Fino a {loyaltySettings?.max_devices || 3} Dispositivi</h4>
              </div>
              <p className="text-sm text-muted-foreground">Proteggi smartphone, tablet e laptop con un solo abbonamento</p>
            </div>
            
            <div className="p-4 rounded-lg bg-background border">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-purple-100">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <h4 className="font-semibold">Antivirus Premium</h4>
              </div>
              <p className="text-sm text-muted-foreground">Scanner malware avanzato e protezione in tempo reale</p>
            </div>
            
            <div className="p-4 rounded-lg bg-background border">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-orange-100">
                  <CreditCard className="w-5 h-5 text-orange-600" />
                </div>
                <h4 className="font-semibold">Diagnostica €{loyaltySettings?.diagnostic_fee || 5}</h4>
              </div>
              <p className="text-sm text-muted-foreground">Controllo completo stato batteria, memoria e prestazioni</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Cosa Dire al Cliente
            </h4>
            <p className="text-sm text-muted-foreground italic">
              "Con soli <span className="font-semibold text-primary">€{loyaltySettings?.annual_price || 30} all'anno</span> hai: 
              protezione antivirus per {loyaltySettings?.max_devices || 3} dispositivi, 
              {loyaltySettings?.repair_discount_percent || 10}% di sconto su tutte le riparazioni, 
              diagnostica completa a soli €{loyaltySettings?.diagnostic_fee || 5}, 
              e monitoraggio continuo della salute del tuo smartphone!"
            </p>
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Come Funziona
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-primary">1</span>
              </div>
              <h4 className="font-medium mb-1">Inserisci Cliente</h4>
              <p className="text-sm text-muted-foreground">Nome, email e telefono del cliente</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-primary">2</span>
              </div>
              <h4 className="font-medium mb-1">Invio Email</h4>
              <p className="text-sm text-muted-foreground">Il cliente riceve l'invito via email</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-primary">3</span>
              </div>
              <h4 className="font-medium mb-1">Paga €{loyaltySettings?.annual_price || 30}/anno</h4>
              <p className="text-sm text-muted-foreground">Il cliente paga con Stripe</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <Euro className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-medium mb-1">Guadagni €10</h4>
              <p className="text-sm text-muted-foreground">Commissione versata dal Centro</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New Invitation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Nuovo Invito
            </CardTitle>
            <CardDescription>
              Inserisci i dati del cliente per inviargli l'invito ad attivare la tessera
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendInvitation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Cliente *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Mario Rossi"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="mario.rossi@email.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Telefono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+39 333 1234567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Invia Invito
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Invitations List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Inviti Inviati
            </CardTitle>
            <CardDescription>
              Stato degli inviti inviati ai clienti
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invitations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nessun invito inviato</p>
                <p className="text-sm">Compila il form per inviare il primo invito</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{invitation.customer_name}</p>
                      <p className="text-sm text-muted-foreground truncate">{invitation.customer_email}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(invitation.created_at), "d MMM yyyy, HH:mm", { locale: it })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(invitation.status)}
                      {invitation.status !== "paid" && invitation.status !== "expired" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => resendInvitation(invitation.id)}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sold Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Tessere Vendute
          </CardTitle>
          <CardDescription>
            Tessere attivate tramite i tuoi inviti
          </CardDescription>
        </CardHeader>
        <CardContent>
          {soldCards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Nessuna tessera venduta</p>
              <p className="text-sm">Le tessere appariranno qui dopo il pagamento</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {soldCards.map((card) => (
                <div key={card.id} className="p-4 rounded-lg border bg-gradient-to-br from-green-50 to-transparent dark:from-green-950/20">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium">{card.customer?.name || "Cliente"}</p>
                      <p className="text-sm text-muted-foreground">{card.card_number}</p>
                    </div>
                    <Badge className="bg-green-600">
                      <Euro className="w-3 h-3 mr-1" />
                      €{card.corner_commission}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {card.activated_at && format(new Date(card.activated_at), "d MMM yyyy", { locale: it })}
                    </span>
                    {card.corner_commission_paid ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Pagato
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        <Clock className="w-3 h-3 mr-1" />
                        In attesa
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </CornerLayout>
  );
}
