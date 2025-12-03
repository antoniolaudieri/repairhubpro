import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Phone, 
  Percent,
  MoreVertical,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Collaborator {
  id: string;
  role: string;
  commission_share: number;
  is_active: boolean;
  user_id: string | null;
  riparatore_id: string | null;
  profiles?: {
    full_name: string;
    phone: string | null;
  };
  riparatori?: {
    full_name: string;
    phone: string;
    email: string;
  };
}

interface CollaboratorsListProps {
  collaborators: Collaborator[];
  centroId: string;
  isLoading: boolean;
  onRefresh: () => void;
}

export const CollaboratorsList = ({ 
  collaborators, 
  centroId, 
  isLoading,
  onRefresh 
}: CollaboratorsListProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCollaborator, setNewCollaborator] = useState({
    email: "",
    role: "employee",
    commission_share: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddCollaborator = async () => {
    if (!newCollaborator.email) {
      toast.error("Inserisci un'email valida");
      return;
    }

    setIsSubmitting(true);
    try {
      // Find riparatore by email
      const { data: riparatore, error: findError } = await supabase
        .from("riparatori")
        .select("id")
        .eq("email", newCollaborator.email)
        .eq("status", "approved")
        .single();

      if (findError || !riparatore) {
        toast.error("Riparatore non trovato o non approvato");
        return;
      }

      // Add collaborator
      const { error } = await supabase.from("centro_collaboratori").insert({
        centro_id: centroId,
        riparatore_id: riparatore.id,
        role: newCollaborator.role,
        commission_share: newCollaborator.commission_share,
        is_active: true,
      });

      if (error) throw error;

      toast.success("Collaboratore aggiunto con successo");
      setIsAddDialogOpen(false);
      setNewCollaborator({ email: "", role: "employee", commission_share: 0 });
      onRefresh();
    } catch (error: any) {
      console.error("Error adding collaborator:", error);
      toast.error("Errore nell'aggiunta del collaboratore");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    try {
      const { error } = await supabase
        .from("centro_collaboratori")
        .update({ is_active: false })
        .eq("id", collaboratorId);

      if (error) throw error;

      toast.success("Collaboratore rimosso");
      onRefresh();
    } catch (error: any) {
      console.error("Error removing collaborator:", error);
      toast.error("Errore nella rimozione");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Collaboratori
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeCollaborators = collaborators.filter((c) => c.is_active);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Collaboratori ({activeCollaborators.length})
        </CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Aggiungi
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aggiungi Collaboratore</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Email Riparatore</Label>
                <Input
                  placeholder="riparatore@email.com"
                  value={newCollaborator.email}
                  onChange={(e) =>
                    setNewCollaborator({ ...newCollaborator, email: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Il riparatore deve essere già registrato e approvato
                </p>
              </div>
              <div className="space-y-2">
                <Label>Percentuale Commissione (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={newCollaborator.commission_share}
                  onChange={(e) =>
                    setNewCollaborator({
                      ...newCollaborator,
                      commission_share: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <Button
                className="w-full"
                onClick={handleAddCollaborator}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Aggiunta in corso..." : "Aggiungi Collaboratore"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {activeCollaborators.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nessun collaboratore. Aggiungi il tuo primo tecnico!
          </p>
        ) : (
          <div className="space-y-3">
            {activeCollaborators.map((collaborator) => {
              const name =
                collaborator.riparatori?.full_name ||
                collaborator.profiles?.full_name ||
                "N/D";
              const phone =
                collaborator.riparatori?.phone ||
                collaborator.profiles?.phone ||
                "";
              const email = collaborator.riparatori?.email || "";

              return (
                <div
                  key={collaborator.id}
                  className="p-4 rounded-lg border border-border bg-card/50 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {collaborator.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {email}
                        </span>
                      )}
                      {phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        {collaborator.commission_share}%
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleRemoveCollaborator(collaborator.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Rimuovi
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
