import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MarketingLead } from "@/pages/admin/AdminMarketing";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  Calendar,
  MessageSquare,
  Trash2,
  Save,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface LeadDetailDialogProps {
  lead: MarketingLead | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<MarketingLead>) => void;
  onDelete: (id: string) => void;
}

const statusOptions = [
  { value: "new", label: "Nuovo" },
  { value: "contacted", label: "Contattato" },
  { value: "interested", label: "Interessato" },
  { value: "demo_scheduled", label: "Demo Programmata" },
  { value: "converted", label: "Convertito" },
  { value: "rejected", label: "Rifiutato" },
];

export function LeadDetailDialog({ lead, onClose, onUpdate, onDelete }: LeadDetailDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editedLead, setEditedLead] = useState<Partial<MarketingLead>>({});
  const [newInteractionNote, setNewInteractionNote] = useState("");
  const [newInteractionType, setNewInteractionType] = useState("note");

  // Fetch interactions
  const { data: interactions = [] } = useQuery({
    queryKey: ["lead-interactions", lead?.id],
    queryFn: async () => {
      if (!lead?.id) return [];
      const { data, error } = await supabase
        .from("marketing_interactions")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!lead?.id,
  });

  // Add interaction mutation
  const addInteractionMutation = useMutation({
    mutationFn: async () => {
      if (!lead?.id || !newInteractionNote.trim()) return;
      const { error } = await supabase
        .from("marketing_interactions")
        .insert({
          lead_id: lead.id,
          interaction_type: newInteractionType as any,
          notes: newInteractionNote,
          created_by: user?.id,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-interactions", lead?.id] });
      queryClient.invalidateQueries({ queryKey: ["marketing-leads"] });
      setNewInteractionNote("");
      toast.success("Interazione aggiunta");
    },
    onError: () => {
      toast.error("Errore nell'aggiunta");
    },
  });

  if (!lead) return null;

  const handleSave = () => {
    if (Object.keys(editedLead).length > 0) {
      onUpdate(lead.id, editedLead);
      setEditedLead({});
    }
  };

  const currentStatus = editedLead.status || lead.status;
  const currentNotes = editedLead.notes !== undefined ? editedLead.notes : lead.notes;

  return (
    <Dialog open={!!lead} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {lead.business_name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="info" className="flex-1">Info</TabsTrigger>
            <TabsTrigger value="interactions" className="flex-1">
              Interazioni ({interactions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            {/* Status */}
            <div>
              <label className="text-sm font-medium mb-2 block">Stato</label>
              <Select
                value={currentStatus}
                onValueChange={(value) => setEditedLead(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contact info */}
            <div className="grid gap-4 sm:grid-cols-2">
              {lead.phone && (
                <a 
                  href={`tel:${lead.phone}`}
                  className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="text-sm">{lead.phone}</span>
                </a>
              )}
              {lead.email && (
                <a 
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-sm truncate">{lead.email}</span>
                </a>
              )}
              {lead.address && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg sm:col-span-2">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm">{lead.address}</span>
                </div>
              )}
              {lead.website && (
                <a 
                  href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <Globe className="h-4 w-4 text-primary" />
                  <span className="text-sm truncate">{lead.website}</span>
                </a>
              )}
            </div>

            {/* Next followup */}
            <div>
              <label className="text-sm font-medium mb-2 block">Prossimo Follow-up</label>
              <Input
                type="date"
                value={editedLead.next_followup_at?.split('T')[0] || lead.next_followup_at?.split('T')[0] || ""}
                onChange={(e) => setEditedLead(prev => ({ 
                  ...prev, 
                  next_followup_at: e.target.value ? new Date(e.target.value).toISOString() : null 
                }))}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium mb-2 block">Note</label>
              <Textarea
                value={currentNotes || ""}
                onChange={(e) => setEditedLead(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Aggiungi note sul lead..."
                rows={4}
              />
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">
                Fonte: {lead.source}
              </Badge>
              <Badge variant="outline">
                Creato: {format(new Date(lead.created_at), "d MMM yyyy", { locale: it })}
              </Badge>
              {lead.contacted_at && (
                <Badge variant="outline">
                  Contattato: {format(new Date(lead.contacted_at), "d MMM", { locale: it })}
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleSave} disabled={Object.keys(editedLead).length === 0}>
                <Save className="h-4 w-4 mr-2" />
                Salva Modifiche
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  if (confirm("Sei sicuro di voler eliminare questo lead?")) {
                    onDelete(lead.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="interactions" className="space-y-4 mt-4">
            {/* Add interaction */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex gap-2">
                <Select value={newInteractionType} onValueChange={setNewInteractionType}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Nota</SelectItem>
                    <SelectItem value="call">Chiamata</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="meeting">Incontro</SelectItem>
                    <SelectItem value="demo">Demo</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={newInteractionNote}
                  onChange={(e) => setNewInteractionNote(e.target.value)}
                  placeholder="Descrivi l'interazione..."
                  className="flex-1"
                />
                <Button 
                  size="icon"
                  onClick={() => addInteractionMutation.mutate()}
                  disabled={!newInteractionNote.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Interactions list */}
            {interactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nessuna interazione registrata
              </p>
            ) : (
              <div className="space-y-3">
                {interactions.map(interaction => (
                  <div key={interaction.id} className="p-3 bg-card border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <Badge variant="outline" className="text-xs">
                        {interaction.interaction_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {format(new Date(interaction.created_at), "d MMM HH:mm", { locale: it })}
                      </span>
                    </div>
                    <p className="text-sm">{interaction.notes}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
