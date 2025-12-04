import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CornerLayout } from "@/layouts/CornerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, User, MapPin, Phone, Mail, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Partnership {
  id: string;
  provider_type: string;
  provider_id: string;
  is_active: boolean;
  priority: number;
  provider_name?: string;
  provider_address?: string;
  provider_phone?: string;
  provider_email?: string;
}

interface AvailableProvider {
  id: string;
  type: "centro" | "riparatore";
  name: string;
  address: string | null;
  phone: string;
  email: string;
}

export default function CornerPartnership() {
  const { user } = useAuth();
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [availableProviders, setAvailableProviders] = useState<AvailableProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [cornerId, setCornerId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadCornerAndPartnerships();
    }
  }, [user]);

  const loadCornerAndPartnerships = async () => {
    try {
      const { data: corner } = await supabase
        .from("corners")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (corner) {
        setCornerId(corner.id);
        await Promise.all([loadPartnerships(corner.id), loadAvailableProviders(corner.id)]);
      }
    } catch (error) {
      console.error("Error loading corner:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPartnerships = async (cornerId: string) => {
    const { data, error } = await supabase
      .from("corner_partnerships")
      .select("*")
      .eq("corner_id", cornerId)
      .order("priority", { ascending: true });

    if (error) {
      console.error("Error loading partnerships:", error);
      return;
    }

    // Load provider details
    const partnershipsWithDetails = await Promise.all(
      (data || []).map(async (p) => {
        if (p.provider_type === "centro") {
          const { data: centro } = await supabase
            .from("centri_assistenza")
            .select("business_name, address, phone, email")
            .eq("id", p.provider_id)
            .single();
          return {
            ...p,
            provider_name: centro?.business_name,
            provider_address: centro?.address,
            provider_phone: centro?.phone,
            provider_email: centro?.email,
          };
        } else {
          const { data: riparatore } = await supabase
            .from("riparatori")
            .select("full_name, address, phone, email")
            .eq("id", p.provider_id)
            .single();
          return {
            ...p,
            provider_name: riparatore?.full_name,
            provider_address: riparatore?.address,
            provider_phone: riparatore?.phone,
            provider_email: riparatore?.email,
          };
        }
      })
    );

    setPartnerships(partnershipsWithDetails);
  };

  const loadAvailableProviders = async (cornerId: string) => {
    // Get existing partnership provider IDs
    const { data: existingPartnerships } = await supabase
      .from("corner_partnerships")
      .select("provider_id, provider_type")
      .eq("corner_id", cornerId);

    const existingCentroIds = (existingPartnerships || [])
      .filter((p) => p.provider_type === "centro")
      .map((p) => p.provider_id);
    const existingRiparatoreIds = (existingPartnerships || [])
      .filter((p) => p.provider_type === "riparatore")
      .map((p) => p.provider_id);

    // Load approved centri not in partnerships
    const { data: centri } = await supabase
      .from("centri_assistenza")
      .select("id, business_name, address, phone, email")
      .eq("status", "approved");

    // Load approved riparatori not in partnerships
    const { data: riparatori } = await supabase
      .from("riparatori")
      .select("id, full_name, address, phone, email")
      .eq("status", "approved");

    const providers: AvailableProvider[] = [
      ...(centri || [])
        .filter((c) => !existingCentroIds.includes(c.id))
        .map((c) => ({
          id: c.id,
          type: "centro" as const,
          name: c.business_name,
          address: c.address,
          phone: c.phone,
          email: c.email,
        })),
      ...(riparatori || [])
        .filter((r) => !existingRiparatoreIds.includes(r.id))
        .map((r) => ({
          id: r.id,
          type: "riparatore" as const,
          name: r.full_name,
          address: r.address,
          phone: r.phone,
          email: r.email,
        })),
    ];

    setAvailableProviders(providers);
  };

  const addPartnership = async (provider: AvailableProvider) => {
    if (!cornerId) return;

    const { error } = await supabase.from("corner_partnerships").insert({
      corner_id: cornerId,
      provider_type: provider.type,
      provider_id: provider.id,
      priority: partnerships.length + 1,
    });

    if (error) {
      toast.error("Errore nell'aggiunta della partnership");
      return;
    }

    toast.success("Partnership aggiunta");
    await Promise.all([loadPartnerships(cornerId), loadAvailableProviders(cornerId)]);
  };

  const togglePartnership = async (partnershipId: string, isActive: boolean) => {
    const { error } = await supabase
      .from("corner_partnerships")
      .update({ is_active: !isActive })
      .eq("id", partnershipId);

    if (error) {
      toast.error("Errore nell'aggiornamento");
      return;
    }

    toast.success(isActive ? "Partnership disattivata" : "Partnership attivata");
    if (cornerId) await loadPartnerships(cornerId);
  };

  const removePartnership = async (partnershipId: string) => {
    const { error } = await supabase.from("corner_partnerships").delete().eq("id", partnershipId);

    if (error) {
      toast.error("Errore nella rimozione");
      return;
    }

    toast.success("Partnership rimossa");
    if (cornerId) {
      await Promise.all([loadPartnerships(cornerId), loadAvailableProviders(cornerId)]);
    }
  };

  if (loading) {
    return (
      <CornerLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </CornerLayout>
    );
  }

  return (
    <CornerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Partnership</h1>
          <p className="text-muted-foreground">
            Gestisci le tue collaborazioni con Centri Assistenza e Riparatori
          </p>
        </div>

        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-sm">
              <strong>Come funziona:</strong> Aggiungi partnership con Centri Assistenza o Riparatori
              per assegnare loro le segnalazioni. I partner attivi appariranno nella lista di
              assegnazione quando crei una nuova segnalazione.
            </p>
          </CardContent>
        </Card>

        {/* Current Partnerships */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Partnership Attive ({partnerships.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {partnerships.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nessuna partnership attiva. Aggiungi un Centro o Riparatore dalla lista sottostante.
              </p>
            ) : (
              <div className="space-y-3">
                {partnerships.map((partnership) => (
                  <div
                    key={partnership.id}
                    className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-lg border gap-3 ${
                      !partnership.is_active ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          partnership.provider_type === "centro"
                            ? "bg-blue-500/10 text-blue-600"
                            : "bg-purple-500/10 text-purple-600"
                        }`}
                      >
                        {partnership.provider_type === "centro" ? (
                          <Building2 className="h-5 w-5" />
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{partnership.provider_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {partnership.provider_type === "centro" ? "Centro" : "Riparatore"}
                          </Badge>
                          {!partnership.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              Disattivato
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1 mt-1">
                          {partnership.provider_address && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {partnership.provider_address}
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {partnership.provider_phone}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {partnership.provider_email}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePartnership(partnership.id, partnership.is_active)}
                      >
                        {partnership.is_active ? (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Disattiva
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Attiva
                          </>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removePartnership(partnership.id)}
                      >
                        Rimuovi
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Providers */}
        {availableProviders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Provider Disponibili</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {availableProviders.map((provider) => (
                  <div
                    key={provider.id}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-lg border gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          provider.type === "centro"
                            ? "bg-blue-500/10 text-blue-600"
                            : "bg-purple-500/10 text-purple-600"
                        }`}
                      >
                        {provider.type === "centro" ? (
                          <Building2 className="h-5 w-5" />
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{provider.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {provider.type === "centro" ? "Centro" : "Riparatore"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {provider.address && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {provider.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button size="sm" onClick={() => addPartnership(provider)}>
                      Aggiungi Partnership
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </CornerLayout>
  );
}
