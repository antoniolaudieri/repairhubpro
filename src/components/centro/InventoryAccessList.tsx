import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  Share2, 
  UserPlus, 
  Eye, 
  ShoppingCart,
  Trash2
} from "lucide-react";
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

interface InventoryAccess {
  id: string;
  can_view: boolean;
  can_reserve: boolean;
  is_active: boolean;
  riparatori?: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface InventoryAccessListProps {
  accesses: InventoryAccess[];
  centroId: string;
  isLoading: boolean;
  onRefresh: () => void;
}

export const InventoryAccessList = ({ 
  accesses, 
  centroId, 
  isLoading,
  onRefresh 
}: InventoryAccessListProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAccess, setNewAccess] = useState({
    email: "",
    can_view: true,
    can_reserve: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddAccess = async () => {
    if (!newAccess.email) {
      toast.error("Inserisci un'email valida");
      return;
    }

    setIsSubmitting(true);
    try {
      // Find riparatore by email
      const { data: riparatore, error: findError } = await supabase
        .from("riparatori")
        .select("id")
        .eq("email", newAccess.email)
        .eq("status", "approved")
        .single();

      if (findError || !riparatore) {
        toast.error("Riparatore non trovato o non approvato");
        return;
      }

      // Check if access already exists
      const { data: existing } = await supabase
        .from("inventory_access")
        .select("id")
        .eq("centro_id", centroId)
        .eq("riparatore_id", riparatore.id)
        .single();

      if (existing) {
        toast.error("Accesso già configurato per questo riparatore");
        return;
      }

      // Add access
      const { error } = await supabase.from("inventory_access").insert({
        centro_id: centroId,
        riparatore_id: riparatore.id,
        can_view: newAccess.can_view,
        can_reserve: newAccess.can_reserve,
        is_active: true,
      });

      if (error) throw error;

      toast.success("Accesso inventario configurato");
      setIsAddDialogOpen(false);
      setNewAccess({ email: "", can_view: true, can_reserve: false });
      onRefresh();
    } catch (error: any) {
      console.error("Error adding access:", error);
      toast.error("Errore nella configurazione dell'accesso");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePermission = async (
    accessId: string,
    field: "can_view" | "can_reserve",
    currentValue: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("inventory_access")
        .update({ [field]: !currentValue })
        .eq("id", accessId);

      if (error) throw error;
      onRefresh();
    } catch (error: any) {
      console.error("Error updating permission:", error);
      toast.error("Errore nell'aggiornamento dei permessi");
    }
  };

  const handleRemoveAccess = async (accessId: string) => {
    try {
      const { error } = await supabase
        .from("inventory_access")
        .update({ is_active: false })
        .eq("id", accessId);

      if (error) throw error;

      toast.success("Accesso rimosso");
      onRefresh();
    } catch (error: any) {
      console.error("Error removing access:", error);
      toast.error("Errore nella rimozione dell'accesso");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Accessi Inventario Condivisi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeAccesses = accesses.filter((a) => a.is_active);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Accessi Inventario ({activeAccesses.length})
        </CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Condividi
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Condividi Inventario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Email Riparatore</Label>
                <Input
                  placeholder="riparatore@email.com"
                  value={newAccess.email}
                  onChange={(e) =>
                    setNewAccess({ ...newAccess, email: e.target.value })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Può visualizzare</Label>
                  <p className="text-xs text-muted-foreground">
                    Vede disponibilità e prezzi
                  </p>
                </div>
                <Switch
                  checked={newAccess.can_view}
                  onCheckedChange={(checked) =>
                    setNewAccess({ ...newAccess, can_view: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Può prenotare</Label>
                  <p className="text-xs text-muted-foreground">
                    Prenota ricambi dal tuo magazzino
                  </p>
                </div>
                <Switch
                  checked={newAccess.can_reserve}
                  onCheckedChange={(checked) =>
                    setNewAccess({ ...newAccess, can_reserve: checked })
                  }
                />
              </div>
              <Button
                className="w-full"
                onClick={handleAddAccess}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Configurazione..." : "Configura Accesso"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {activeAccesses.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nessun accesso condiviso. Condividi il tuo inventario con i riparatori partner!
          </p>
        ) : (
          <div className="space-y-3">
            {activeAccesses.map((access) => (
              <div
                key={access.id}
                className="p-4 rounded-lg border border-border bg-card/50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {access.riparatori?.full_name || "N/D"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {access.riparatori?.email}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAccess(access.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Visualizza</span>
                    <Switch
                      checked={access.can_view}
                      onCheckedChange={() =>
                        handleTogglePermission(access.id, "can_view", access.can_view)
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Prenota</span>
                    <Switch
                      checked={access.can_reserve}
                      onCheckedChange={() =>
                        handleTogglePermission(access.id, "can_reserve", access.can_reserve)
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
