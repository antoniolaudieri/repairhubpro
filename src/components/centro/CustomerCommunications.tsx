import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Mail, MessageSquare, Plus, Clock, FileText, 
  CheckCircle2, AlertCircle, Send, X, StickyNote
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Communication {
  id: string;
  type: string;
  subject: string | null;
  content: string | null;
  template_name: string | null;
  status: string;
  metadata: any;
  created_at: string;
}

interface CustomerCommunicationsProps {
  customerId: string;
  centroId: string;
  customerEmail?: string | null;
}

const templateLabels: Record<string, string> = {
  quote_sent: "Preventivo Inviato",
  status_update: "Aggiornamento Stato",
  welcome: "Benvenuto",
  repair_completed: "Riparazione Completata",
  parts_received: "Ricambi Arrivati",
  loyalty_activation: "Attivazione Tessera",
  account_created: "Account Creato",
  partnership_invite: "Invito Partnership",
};

const typeIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  note: <StickyNote className="h-4 w-4" />,
  sms: <MessageSquare className="h-4 w-4" />,
};

const statusConfig: Record<string, { icon: React.ReactNode; className: string }> = {
  sent: { icon: <Send className="h-3 w-3" />, className: "bg-primary/10 text-primary" },
  delivered: { icon: <CheckCircle2 className="h-3 w-3" />, className: "bg-accent/10 text-accent" },
  failed: { icon: <AlertCircle className="h-3 w-3" />, className: "bg-destructive/10 text-destructive" },
  opened: { icon: <CheckCircle2 className="h-3 w-3" />, className: "bg-info/10 text-info" },
};

export function CustomerCommunications({ customerId, centroId, customerEmail }: CustomerCommunicationsProps) {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [noteSubject, setNoteSubject] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [saving, setSaving] = useState(false);

  const loadCommunications = async () => {
    try {
      const { data, error } = await supabase
        .from("customer_communications")
        .select("*")
        .eq("customer_id", customerId)
        .eq("centro_id", centroId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCommunications(data || []);
    } catch (error: any) {
      console.error("Error loading communications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommunications();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`communications-${customerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customer_communications",
          filter: `customer_id=eq.${customerId}`,
        },
        () => {
          loadCommunications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId, centroId]);

  const handleAddNote = async () => {
    if (!noteContent.trim()) {
      toast.error("Inserisci il contenuto della nota");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("customer_communications").insert({
        customer_id: customerId,
        centro_id: centroId,
        type: "note",
        subject: noteSubject.trim() || null,
        content: noteContent.trim(),
        status: "sent",
      });

      if (error) throw error;

      toast.success("Nota aggiunta");
      setNoteSubject("");
      setNoteContent("");
      setAddNoteOpen(false);
      loadCommunications();
    } catch (error: any) {
      toast.error(error.message || "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const emailCount = communications.filter(c => c.type === "email").length;
  const noteCount = communications.filter(c => c.type === "note").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Comunicazioni</CardTitle>
              <p className="text-xs text-muted-foreground">
                {emailCount} email • {noteCount} note
              </p>
            </div>
          </div>
          <Dialog open={addNoteOpen} onOpenChange={setAddNoteOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Nota
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Aggiungi Nota</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Input
                    placeholder="Oggetto (opzionale)"
                    value={noteSubject}
                    onChange={(e) => setNoteSubject(e.target.value)}
                  />
                </div>
                <div>
                  <Textarea
                    placeholder="Scrivi la nota... (chiamata, visita, promemoria, ecc.)"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAddNoteOpen(false)}>
                    Annulla
                  </Button>
                  <Button onClick={handleAddNote} disabled={saving}>
                    {saving ? "Salvataggio..." : "Salva Nota"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : communications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nessuna comunicazione registrata</p>
            <p className="text-xs mt-1">Le email inviate appariranno qui automaticamente</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              <AnimatePresence>
                {communications.map((comm, index) => (
                  <motion.div
                    key={comm.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative pl-6 pb-3 border-l-2 border-border last:pb-0"
                  >
                    {/* Timeline dot */}
                    <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-background flex items-center justify-center ${
                      comm.type === "email" ? "bg-primary" : "bg-warning"
                    }`}>
                      {typeIcons[comm.type] && (
                        <span className="text-white scale-75">
                          {comm.type === "email" ? <Mail className="h-2 w-2" /> : <StickyNote className="h-2 w-2" />}
                        </span>
                      )}
                    </div>

                    <div className="bg-muted/30 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] h-5">
                            {comm.type === "email" ? "Email" : "Nota"}
                          </Badge>
                          {comm.template_name && (
                            <Badge variant="secondary" className="text-[10px] h-5">
                              {templateLabels[comm.template_name] || comm.template_name}
                            </Badge>
                          )}
                          {comm.type === "email" && (
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] h-5 ${statusConfig[comm.status]?.className || ""}`}
                            >
                              {statusConfig[comm.status]?.icon}
                              <span className="ml-1 capitalize">{comm.status}</span>
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {format(new Date(comm.created_at), "dd MMM HH:mm", { locale: it })}
                        </span>
                      </div>

                      {comm.subject && (
                        <p className="text-sm font-medium mb-1">{comm.subject}</p>
                      )}

                      {comm.content && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {comm.content.replace(/<[^>]*>/g, "").substring(0, 150)}
                          {comm.content.length > 150 && "..."}
                        </p>
                      )}

                      {comm.metadata && Object.keys(comm.metadata).length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {comm.metadata.repair_id && (
                            <Badge variant="outline" className="text-[10px]">
                              <FileText className="h-2.5 w-2.5 mr-1" />
                              Riparazione
                            </Badge>
                          )}
                          {comm.metadata.quote_id && (
                            <Badge variant="outline" className="text-[10px]">
                              <FileText className="h-2.5 w-2.5 mr-1" />
                              Preventivo
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}