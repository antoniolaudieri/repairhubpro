import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Search, CreditCard, User, Calendar, Smartphone, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LoyaltyCardWithCustomer {
  id: string;
  card_number: string | null;
  status: string;
  activated_at: string | null;
  expires_at: string | null;
  devices_used: number;
  max_devices: number;
  amount_paid: number;
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string;
  };
}

interface ActiveLoyaltyCardsListProps {
  centroId: string | null;
}

export function ActiveLoyaltyCardsList({ centroId }: ActiveLoyaltyCardsListProps) {
  const [cards, setCards] = useState<LoyaltyCardWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchCards = async () => {
    if (!centroId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("loyalty_cards")
      .select(`
        id,
        card_number,
        status,
        activated_at,
        expires_at,
        devices_used,
        max_devices,
        amount_paid,
        customer:customers!loyalty_cards_customer_id_fkey (
          id,
          name,
          email,
          phone
        )
      `)
      .eq("centro_id", centroId)
      .eq("status", "active")
      .order("activated_at", { ascending: false });

    if (!error && data) {
      setCards(data as unknown as LoyaltyCardWithCustomer[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCards();
  }, [centroId]);

  const filteredCards = cards.filter(card => {
    const search = searchTerm.toLowerCase();
    return (
      card.customer?.name?.toLowerCase().includes(search) ||
      card.customer?.email?.toLowerCase().includes(search) ||
      card.customer?.phone?.includes(search) ||
      card.card_number?.toLowerCase().includes(search)
    );
  });

  const isExpiringSoon = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const daysUntilExpiry = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome, email, telefono o numero tessera..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon" onClick={fetchCards}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        {filteredCards.length} tessere attive
      </div>

      <div className="space-y-3">
        {filteredCards.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nessuna tessera fedeltà attiva trovata</p>
            </CardContent>
          </Card>
        ) : (
          filteredCards.map((card) => (
            <Card key={card.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {card.customer?.name?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {card.customer?.name}
                        {isExpiringSoon(card.expires_at) && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                            Scade presto
                          </Badge>
                        )}
                        {isExpired(card.expires_at) && (
                          <Badge variant="destructive" className="text-xs">
                            Scaduta
                          </Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {card.customer?.email || card.customer?.phone}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {card.card_number || "N/A"}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      Attivata: {card.activated_at ? format(new Date(card.activated_at), "dd MMM yyyy", { locale: it }) : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      Scade: {card.expires_at ? format(new Date(card.expires_at), "dd MMM yyyy", { locale: it }) : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Smartphone className="h-3.5 w-3.5" />
                    <span>
                      Dispositivi: {card.devices_used}/{card.max_devices}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
