import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, Loader2, Users, User } from "lucide-react";
import { toast } from "sonner";

interface SendTestNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendTestNotificationDialog({ open, onOpenChange }: SendTestNotificationDialogProps) {
  const [title, setTitle] = useState("Test Notifica 🔔");
  const [body, setBody] = useState("Questa è una notifica di test dalla piattaforma");
  const [targetType, setTargetType] = useState<"all" | "user">("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isSending, setIsSending] = useState(false);

  // Fetch users with push subscriptions
  const { data: subscribedUsers } = useQuery({
    queryKey: ["push-subscribed-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("user_id")
        .not("user_id", "is", null);
      
      if (error) throw error;
      
      // Get unique user IDs
      const uniqueUserIds = [...new Set(data?.map(d => d.user_id).filter(Boolean))] as string[];
      
      if (uniqueUserIds.length === 0) return [];
      
      // Fetch user details (profiles may not exist for all users)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", uniqueUserIds);
      
      // Return all subscribed users, with profile data if available
      return uniqueUserIds.map(userId => {
        const profile = profiles?.find(p => p.id === userId);
        return {
          id: userId,
          full_name: profile?.full_name || null
        };
      });
    },
    enabled: open,
  });

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Compila titolo e messaggio");
      return;
    }

    if (targetType === "user" && !selectedUserId) {
      toast.error("Seleziona un utente");
      return;
    }

    setIsSending(true);
    try {
      const payload: any = {
        title,
        body,
        data: { url: "/centro" }
      };

      if (targetType === "user") {
        payload.userId = selectedUserId;
      }

      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: payload
      });

      if (error) throw error;

      const successCount = data?.results?.filter((r: any) => r.success).length || 0;
      const failCount = data?.results?.filter((r: any) => !r.success).length || 0;

      if (successCount > 0) {
        toast.success(`Notifica inviata a ${successCount} dispositivo/i`);
      }
      if (failCount > 0) {
        toast.warning(`${failCount} invio/i fallito/i`);
      }
      if (successCount === 0 && failCount === 0) {
        toast.info("Nessun dispositivo registrato per le notifiche");
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sending notification:", error);
      toast.error(error.message || "Errore nell'invio della notifica");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Invia Notifica Push Test
          </DialogTitle>
          <DialogDescription>
            Invia una notifica push di test agli utenti registrati
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Target Selection */}
          <div className="space-y-2">
            <Label>Destinatario</Label>
            <Select value={targetType} onValueChange={(v: "all" | "user") => setTargetType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Tutti gli utenti registrati
                  </div>
                </SelectItem>
                <SelectItem value="user">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Utente specifico
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User Selection (if specific user) */}
          {targetType === "user" && (
            <div className="space-y-2">
              <Label>Seleziona Utente</Label>
              {subscribedUsers && subscribedUsers.length > 0 ? (
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona utente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {subscribedUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nessun utente con notifiche abilitate
                </p>
              )}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titolo</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titolo notifica..."
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Messaggio</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Contenuto della notifica..."
              rows={3}
            />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {subscribedUsers?.length || 0} utenti registrati
            </Badge>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Invio...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Invia Notifica
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
