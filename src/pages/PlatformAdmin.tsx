import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Store, 
  Wrench, 
  Building2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Users,
  TrendingUp,
  Euro,
  MapPin,
  Phone,
  Mail,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CommissionAnalytics } from "@/components/admin/CommissionAnalytics";

interface Corner {
  id: string;
  user_id: string;
  business_name: string;
  address: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
  commission_rate: number;
}

interface Riparatore {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  address: string | null;
  service_radius_km: number;
  is_mobile: boolean;
  status: string;
  created_at: string;
  commission_rate: number;
  specializations: string[];
}

interface Centro {
  id: string;
  owner_user_id: string;
  business_name: string;
  vat_number: string | null;
  address: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
  commission_rate: number;
}

const statusColors: Record<string, string> = {
  pending: "bg-warning/20 text-warning border-warning/30",
  approved: "bg-success/20 text-success border-success/30",
  suspended: "bg-destructive/20 text-destructive border-destructive/30",
};

const statusLabels: Record<string, string> = {
  pending: "In Attesa",
  approved: "Approvato",
  suspended: "Sospeso",
};

export default function PlatformAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("corners");

  // Check if user is platform admin
  const { data: isPlatformAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-platform-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "platform_admin")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id,
  });

  // Fetch corners
  const { data: corners = [], isLoading: loadingCorners } = useQuery({
    queryKey: ["admin-corners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("corners")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Corner[];
    },
    enabled: isPlatformAdmin === true,
  });

  // Fetch riparatori
  const { data: riparatori = [], isLoading: loadingRiparatori } = useQuery({
    queryKey: ["admin-riparatori"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("riparatori")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Riparatore[];
    },
    enabled: isPlatformAdmin === true,
  });

  // Fetch centri
  const { data: centri = [], isLoading: loadingCentri } = useQuery({
    queryKey: ["admin-centri"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("centri_assistenza")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Centro[];
    },
    enabled: isPlatformAdmin === true,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      table, 
      id, 
      status 
    }: { 
      table: "corners" | "riparatori" | "centri_assistenza"; 
      id: string; 
      status: string;
    }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === "approved") {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user?.id;
      }
      
      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq("id", id);
      
      if (error) throw error;

      // If approving, also add the role to user_roles
      if (status === "approved") {
        let roleToAdd: string;
        let userId: string | undefined;

        if (table === "corners") {
          roleToAdd = "corner";
          const corner = corners.find(c => c.id === id);
          userId = corner?.user_id;
        } else if (table === "riparatori") {
          roleToAdd = "riparatore";
          const riparatore = riparatori.find(r => r.id === id);
          userId = riparatore?.user_id;
        } else {
          roleToAdd = "centro_admin";
          const centro = centri.find(c => c.id === id);
          userId = centro?.owner_user_id;
        }

        if (userId) {
          await supabase
            .from("user_roles")
            .upsert({ user_id: userId, role: roleToAdd }, { onConflict: "user_id,role" });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-corners"] });
      queryClient.invalidateQueries({ queryKey: ["admin-riparatori"] });
      queryClient.invalidateQueries({ queryKey: ["admin-centri"] });
      toast.success("Stato aggiornato con successo");
    },
    onError: () => {
      toast.error("Errore nell'aggiornamento dello stato");
    },
  });

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const pendingCorners = corners.filter(c => c.status === "pending").length;
  const pendingRiparatori = riparatori.filter(r => r.status === "pending").length;
  const pendingCentri = centri.filter(c => c.status === "pending").length;
  const totalPending = pendingCorners + pendingRiparatori + pendingCentri;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Admin Piattaforma
            </h1>
            <p className="text-muted-foreground">
              Gestione approvazioni e monitoraggio marketplace
            </p>
          </div>
          {totalPending > 0 && (
            <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30 text-sm px-3 py-1">
              <Clock className="h-4 w-4 mr-1" />
              {totalPending} richieste in attesa
            </Badge>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{corners.length}</p>
                  <p className="text-xs text-muted-foreground">Corner</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10">
                  <Wrench className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{riparatori.length}</p>
                  <p className="text-xs text-muted-foreground">Riparatori</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Building2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{centri.length}</p>
                  <p className="text-xs text-muted-foreground">Centri</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalPending}</p>
                  <p className="text-xs text-muted-foreground">In Attesa</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="corners" className="relative">
              <Store className="h-4 w-4 mr-2" />
              Corner
              {pendingCorners > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-warning text-warning-foreground text-xs flex items-center justify-center">
                  {pendingCorners}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="riparatori" className="relative">
              <Wrench className="h-4 w-4 mr-2" />
              Riparatori
              {pendingRiparatori > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-warning text-warning-foreground text-xs flex items-center justify-center">
                  {pendingRiparatori}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="centri" className="relative">
              <Building2 className="h-4 w-4 mr-2" />
              Centri
              {pendingCentri > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-warning text-warning-foreground text-xs flex items-center justify-center">
                  {pendingCentri}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Corners Tab */}
          <TabsContent value="corners" className="space-y-4">
            {loadingCorners ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : corners.length === 0 ? (
              <Card className="bg-card/50">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun corner registrato</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {corners.map((corner) => (
                  <Card key={corner.id} className="bg-card/50 backdrop-blur border-border/50">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{corner.business_name}</h3>
                            <Badge className={statusColors[corner.status]}>
                              {statusLabels[corner.status]}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {corner.address}
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {corner.phone}
                            </div>
                            <div className="flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {corner.email}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Commissione: {corner.commission_rate}%</span>
                            <span>Registrato: {format(new Date(corner.created_at), "dd MMM yyyy", { locale: it })}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {corner.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-success border-success/30 hover:bg-success/10"
                                onClick={() => updateStatusMutation.mutate({ 
                                  table: "corners", 
                                  id: corner.id, 
                                  status: "approved" 
                                })}
                                disabled={updateStatusMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approva
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => updateStatusMutation.mutate({ 
                                  table: "corners", 
                                  id: corner.id, 
                                  status: "suspended" 
                                })}
                                disabled={updateStatusMutation.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Rifiuta
                              </Button>
                            </>
                          )}
                          {corner.status === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => updateStatusMutation.mutate({ 
                                table: "corners", 
                                id: corner.id, 
                                status: "suspended" 
                              })}
                              disabled={updateStatusMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Sospendi
                            </Button>
                          )}
                          {corner.status === "suspended" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-success border-success/30 hover:bg-success/10"
                              onClick={() => updateStatusMutation.mutate({ 
                                table: "corners", 
                                id: corner.id, 
                                status: "approved" 
                              })}
                              disabled={updateStatusMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Riattiva
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Riparatori Tab */}
          <TabsContent value="riparatori" className="space-y-4">
            {loadingRiparatori ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : riparatori.length === 0 ? (
              <Card className="bg-card/50">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun riparatore registrato</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {riparatori.map((riparatore) => (
                  <Card key={riparatore.id} className="bg-card/50 backdrop-blur border-border/50">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{riparatore.full_name}</h3>
                            <Badge className={statusColors[riparatore.status]}>
                              {statusLabels[riparatore.status]}
                            </Badge>
                            {riparatore.is_mobile && (
                              <Badge variant="outline" className="text-xs">
                                Domicilio
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                            {riparatore.address && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {riparatore.address}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {riparatore.phone}
                            </div>
                            <div className="flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {riparatore.email}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Commissione: {riparatore.commission_rate}%</span>
                            <span>Raggio: {riparatore.service_radius_km} km</span>
                            <span>Registrato: {format(new Date(riparatore.created_at), "dd MMM yyyy", { locale: it })}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {riparatore.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-success border-success/30 hover:bg-success/10"
                                onClick={() => updateStatusMutation.mutate({ 
                                  table: "riparatori", 
                                  id: riparatore.id, 
                                  status: "approved" 
                                })}
                                disabled={updateStatusMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approva
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => updateStatusMutation.mutate({ 
                                  table: "riparatori", 
                                  id: riparatore.id, 
                                  status: "suspended" 
                                })}
                                disabled={updateStatusMutation.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Rifiuta
                              </Button>
                            </>
                          )}
                          {riparatore.status === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => updateStatusMutation.mutate({ 
                                table: "riparatori", 
                                id: riparatore.id, 
                                status: "suspended" 
                              })}
                              disabled={updateStatusMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Sospendi
                            </Button>
                          )}
                          {riparatore.status === "suspended" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-success border-success/30 hover:bg-success/10"
                              onClick={() => updateStatusMutation.mutate({ 
                                table: "riparatori", 
                                id: riparatore.id, 
                                status: "approved" 
                              })}
                              disabled={updateStatusMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Riattiva
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Centri Tab */}
          <TabsContent value="centri" className="space-y-4">
            {loadingCentri ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : centri.length === 0 ? (
              <Card className="bg-card/50">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun centro assistenza registrato</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {centri.map((centro) => (
                  <Card key={centro.id} className="bg-card/50 backdrop-blur border-border/50">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{centro.business_name}</h3>
                            <Badge className={statusColors[centro.status]}>
                              {statusLabels[centro.status]}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {centro.address}
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {centro.phone}
                            </div>
                            <div className="flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {centro.email}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {centro.vat_number && <span>P.IVA: {centro.vat_number}</span>}
                            <span>Commissione: {centro.commission_rate}%</span>
                            <span>Registrato: {format(new Date(centro.created_at), "dd MMM yyyy", { locale: it })}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {centro.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-success border-success/30 hover:bg-success/10"
                                onClick={() => updateStatusMutation.mutate({ 
                                  table: "centri_assistenza", 
                                  id: centro.id, 
                                  status: "approved" 
                                })}
                                disabled={updateStatusMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approva
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => updateStatusMutation.mutate({ 
                                  table: "centri_assistenza", 
                                  id: centro.id, 
                                  status: "suspended" 
                                })}
                                disabled={updateStatusMutation.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Rifiuta
                              </Button>
                            </>
                          )}
                          {centro.status === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => updateStatusMutation.mutate({ 
                                table: "centri_assistenza", 
                                id: centro.id, 
                                status: "suspended" 
                              })}
                              disabled={updateStatusMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Sospendi
                            </Button>
                          )}
                          {centro.status === "suspended" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-success border-success/30 hover:bg-success/10"
                              onClick={() => updateStatusMutation.mutate({ 
                                table: "centri_assistenza", 
                                id: centro.id, 
                                status: "approved" 
                              })}
                              disabled={updateStatusMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Riattiva
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <CommissionAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
