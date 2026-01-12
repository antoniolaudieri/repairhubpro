import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PlatformAdminLayout } from "@/layouts/PlatformAdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketingStats } from "@/components/admin/marketing/MarketingStats";
import { LeadsList } from "@/components/admin/marketing/LeadsList";
import { LeadDetailDialog } from "@/components/admin/marketing/LeadDetailDialog";
import { AddLeadDialog } from "@/components/admin/marketing/AddLeadDialog";
import { AutomationTab } from "@/components/admin/marketing/AutomationTab";
import { ScanZonesTab } from "@/components/admin/marketing/ScanZonesTab";
import { SequencesTab } from "@/components/admin/marketing/SequencesTab";
import { FunnelTab } from "@/components/admin/marketing/FunnelTab";
import { EmailQueueTab } from "@/components/admin/marketing/EmailQueueTab";
import { AnalyticsTab } from "@/components/admin/marketing/AnalyticsTab";
import { TemplatesManager } from "@/components/admin/marketing/TemplatesManager";
import { Target, Users, MessageSquare, Plus, Zap, MapPin, Mail, Filter, BarChart3, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type MarketingLead = {
  id: string;
  source: string;
  business_name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  business_type: string;
  status: string;
  notes: string | null;
  assigned_to: string | null;
  contacted_at: string | null;
  last_interaction_at: string | null;
  next_followup_at: string | null;
  conversion_date: string | null;
  converted_entity_type: string | null;
  converted_entity_id: string | null;
  created_at: string;
  updated_at: string;
};

export default function AdminMarketing() {
  const [selectedLead, setSelectedLead] = useState<MarketingLead | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  // Fetch leads
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["marketing-leads", statusFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("marketing_leads")
        .select("*")
        .not("email", "is", null)
        .neq("email", "")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }
      if (typeFilter !== "all") {
        query = query.eq("business_type", typeFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MarketingLead[];
    },
  });

  // Stats
  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === "new").length,
    contacted: leads.filter(l => l.status === "contacted").length,
    interested: leads.filter(l => l.status === "interested").length,
    demo: leads.filter(l => l.status === "demo_scheduled").length,
    converted: leads.filter(l => l.status === "converted").length,
  };

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MarketingLead> }) => {
      const { error } = await supabase
        .from("marketing_leads")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-leads"] });
      toast.success("Lead aggiornato");
    },
    onError: () => {
      toast.error("Errore nell'aggiornamento");
    },
  });

  // Delete lead mutation
  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketing_leads")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-leads"] });
      toast.success("Lead eliminato");
      setSelectedLead(null);
    },
    onError: () => {
      toast.error("Errore nell'eliminazione");
    },
  });

  // Delete all leads mutation
  const deleteAllLeadsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("marketing_leads")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all rows
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-leads"] });
      toast.success("Tutti i lead sono stati eliminati");
    },
    onError: () => {
      toast.error("Errore nell'eliminazione dei lead");
    },
  });

  return (
    <PlatformAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Marketing</h1>
              <p className="text-sm text-muted-foreground">Acquisisci nuovi centri e corner</p>
            </div>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuovo Lead
          </Button>
        </div>

        {/* Stats */}
        <MarketingStats stats={stats} />

        {/* Tabs */}
        <Tabs defaultValue="automation" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="automation" className="gap-2">
              <Zap className="h-4 w-4" />
              Automazione
            </TabsTrigger>
            <TabsTrigger value="zones" className="gap-2">
              <MapPin className="h-4 w-4" />
              Zone Scansione
            </TabsTrigger>
            <TabsTrigger value="sequences" className="gap-2">
              <Mail className="h-4 w-4" />
              Sequenze
            </TabsTrigger>
            <TabsTrigger value="funnel" className="gap-2">
              <Filter className="h-4 w-4" />
              Funnel
            </TabsTrigger>
            <TabsTrigger value="queue" className="gap-2">
              <Send className="h-4 w-4" />
              Coda Email
            </TabsTrigger>
            <TabsTrigger value="leads" className="gap-2">
              <Users className="h-4 w-4" />
              Lead
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Template
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="automation" className="space-y-4">
            <AutomationTab />
          </TabsContent>

          <TabsContent value="zones" className="space-y-4">
            <ScanZonesTab />
          </TabsContent>

          <TabsContent value="sequences" className="space-y-4">
            <SequencesTab />
          </TabsContent>

          <TabsContent value="funnel" className="space-y-4">
            <FunnelTab />
          </TabsContent>

          <TabsContent value="queue" className="space-y-4">
            <EmailQueueTab />
          </TabsContent>

          <TabsContent value="leads" className="space-y-4">
            <LeadsList
              leads={leads}
              isLoading={isLoading}
              statusFilter={statusFilter}
              typeFilter={typeFilter}
              onStatusFilterChange={setStatusFilter}
              onTypeFilterChange={setTypeFilter}
              onSelectLead={setSelectedLead}
              onUpdateStatus={(id, status) => updateLeadMutation.mutate({ id, updates: { status } })}
              onDeleteAll={() => deleteAllLeadsMutation.mutate()}
              isDeletingAll={deleteAllLeadsMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <TemplatesManager />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <AnalyticsTab />
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <LeadDetailDialog
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={(id, updates) => updateLeadMutation.mutate({ id, updates })}
          onDelete={(id) => deleteLeadMutation.mutate(id)}
        />

        <AddLeadDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
        />
      </div>
    </PlatformAdminLayout>
  );
}
