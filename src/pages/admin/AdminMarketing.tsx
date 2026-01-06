import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PlatformAdminLayout } from "@/layouts/PlatformAdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketingStats } from "@/components/admin/marketing/MarketingStats";
import { LeadsList } from "@/components/admin/marketing/LeadsList";
import { LeadDetailDialog } from "@/components/admin/marketing/LeadDetailDialog";
import { AddLeadDialog } from "@/components/admin/marketing/AddLeadDialog";
import { Target, Users, MessageSquare, Plus } from "lucide-react";
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
        <Tabs defaultValue="leads" className="space-y-4">
          <TabsList>
            <TabsTrigger value="leads" className="gap-2">
              <Users className="h-4 w-4" />
              Lead
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Template Messaggi
            </TabsTrigger>
          </TabsList>

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
            />
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <TemplatesSection />
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

// Templates Section Component
function TemplatesSection() {
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["marketing-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_templates")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-48 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {templates.map(template => (
        <div key={template.id} className="p-4 bg-card rounded-xl border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">{template.name}</h3>
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
              {template.type}
            </span>
          </div>
          {template.subject && (
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Oggetto:</strong> {template.subject}
            </p>
          )}
          <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
            {template.content.substring(0, 200)}...
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              navigator.clipboard.writeText(template.content);
              toast.success("Template copiato!");
            }}
          >
            Copia Template
          </Button>
        </div>
      ))}
    </div>
  );
}
