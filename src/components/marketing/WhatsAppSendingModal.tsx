import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Send, 
  Phone, 
  CheckCircle2, 
  Circle,
  ExternalLink,
  SkipForward,
  Pause,
  Play,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Recipient {
  id: string;
  customer_id: string;
  personalized_message: string;
  sent_at: string | null;
  status: string;
  customer: {
    name: string;
    phone: string;
  };
}

interface WhatsAppSendingModalProps {
  campaignId: string;
  onClose: () => void;
  onComplete: () => void;
}

export default function WhatsAppSendingModal({
  campaignId,
  onClose,
  onComplete,
}: WhatsAppSendingModalProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchRecipients();
    return () => {
      if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
    };
  }, [campaignId]);

  const fetchRecipients = async () => {
    const { data, error } = await supabase
      .from("whatsapp_campaign_recipients")
      .select(`
        id,
        customer_id,
        personalized_message,
        sent_at,
        status,
        customer:customers(name, phone)
      `)
      .eq("campaign_id", campaignId)
      .order("created_at");

    if (error) {
      toast.error("Errore nel caricare i destinatari");
      return;
    }

    if (data) {
      // Find first pending recipient to resume
      const formattedData = data.map(r => ({
        ...r,
        customer: Array.isArray(r.customer) ? r.customer[0] : r.customer
      })) as Recipient[];
      
      setRecipients(formattedData);
      
      const firstPendingIndex = formattedData.findIndex(r => r.status === "pending");
      setCurrentIndex(firstPendingIndex >= 0 ? firstPendingIndex : 0);
    }
    setLoading(false);
  };

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, "");
    
    // Add Italy country code if not present
    if (cleaned.startsWith("0")) {
      cleaned = "39" + cleaned.substring(1);
    } else if (!cleaned.startsWith("39") && cleaned.length === 10) {
      cleaned = "39" + cleaned;
    }
    
    return cleaned;
  };

  const openWhatsApp = (recipient: Recipient) => {
    const phone = formatPhoneNumber(recipient.customer.phone);
    const message = encodeURIComponent(recipient.personalized_message);
    const url = `https://wa.me/${phone}?text=${message}`;
    window.open(url, "_blank");
  };

  const markAsSent = async (recipientId: string) => {
    const { error } = await supabase
      .from("whatsapp_campaign_recipients")
      .update({
        status: "sent",
        sent_at: new Date().toISOString()
      })
      .eq("id", recipientId);

    if (error) {
      toast.error("Errore nell'aggiornare lo stato");
      return;
    }

    // Update local state
    setRecipients(prev => 
      prev.map(r => 
        r.id === recipientId 
          ? { ...r, status: "sent", sent_at: new Date().toISOString() }
          : r
      )
    );

    // Update campaign sent count
    await updateCampaignProgress();
  };

  const updateCampaignProgress = async () => {
    const sentCount = recipients.filter(r => r.status === "sent").length + 1;
    
    await supabase
      .from("whatsapp_campaigns")
      .update({
        sent_count: sentCount,
        status: sentCount >= recipients.length ? "completed" : "in_progress",
        completed_at: sentCount >= recipients.length ? new Date().toISOString() : null
      })
      .eq("id", campaignId);
  };

  const handleSendAndNext = async () => {
    const currentRecipient = recipients[currentIndex];
    if (!currentRecipient) return;

    // Open WhatsApp
    openWhatsApp(currentRecipient);

    // Mark as sent
    await markAsSent(currentRecipient.id);

    // Move to next
    if (currentIndex < recipients.length - 1) {
      setCurrentIndex(prev => prev + 1);
      
      if (autoAdvance) {
        // Auto-advance after 3 seconds
        const timer = setTimeout(() => {
          handleSendAndNext();
        }, 3000);
        setAutoAdvanceTimer(timer);
      }
    } else {
      // Campaign complete
      onComplete();
    }
  };

  const handleSkip = () => {
    if (currentIndex < recipients.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleManualMark = async (recipientId: string, sent: boolean) => {
    if (sent) {
      await markAsSent(recipientId);
    } else {
      // Mark as pending again
      await supabase
        .from("whatsapp_campaign_recipients")
        .update({
          status: "pending",
          sent_at: null
        })
        .eq("id", recipientId);

      setRecipients(prev => 
        prev.map(r => 
          r.id === recipientId 
            ? { ...r, status: "pending", sent_at: null }
            : r
        )
      );
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }
  };

  const sentCount = recipients.filter(r => r.status === "sent").length;
  const progress = recipients.length > 0 ? (sentCount / recipients.length) * 100 : 0;
  const currentRecipient = recipients[currentIndex];

  if (loading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-green-500" />
            Invio Campagna WhatsApp
          </DialogTitle>
          <DialogDescription>
            Invia i messaggi uno alla volta cliccando sul pulsante
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{sentCount} / {recipients.length} inviati</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Current Recipient Card */}
          {currentRecipient && currentRecipient.status === "pending" && (
            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-lg">{currentRecipient.customer.name}</h4>
                  <p className="text-sm text-muted-foreground">{currentRecipient.customer.phone}</p>
                </div>
                <Badge variant="secondary">
                  {currentIndex + 1} di {recipients.length}
                </Badge>
              </div>
              
              <div className="p-3 bg-background rounded-lg text-sm mb-4 whitespace-pre-wrap">
                {currentRecipient.personalized_message}
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="lg"
                  onClick={handleSendAndNext}
                  disabled={isPaused}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Invia su WhatsApp
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleSkip}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <Checkbox
                  id="auto-advance"
                  checked={autoAdvance}
                  onCheckedChange={(checked) => setAutoAdvance(!!checked)}
                />
                <label htmlFor="auto-advance" className="text-sm text-muted-foreground">
                  Avanza automaticamente dopo 3 secondi
                </label>
              </div>
            </div>
          )}

          {/* All Recipients List */}
          <div className="border rounded-lg">
            <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
              <span className="font-medium text-sm">Tutti i destinatari</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePause}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
            </div>
            <ScrollArea className="h-[200px]">
              <div className="p-2 space-y-1">
                {recipients.map((recipient, index) => (
                  <div
                    key={recipient.id}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      index === currentIndex ? "bg-green-100 dark:bg-green-900/30" : ""
                    }`}
                  >
                    {recipient.status === "sent" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{recipient.customer.name}</p>
                      <p className="text-xs text-muted-foreground">{recipient.customer.phone}</p>
                    </div>
                    {recipient.status === "sent" ? (
                      <span className="text-xs text-green-600">
                        {recipient.sent_at && format(new Date(recipient.sent_at), "HH:mm")}
                      </span>
                    ) : index === currentIndex ? (
                      <Badge variant="outline" className="text-xs">
                        Corrente
                      </Badge>
                    ) : null}
                    <Checkbox
                      checked={recipient.status === "sent"}
                      onCheckedChange={(checked) => handleManualMark(recipient.id, !!checked)}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Complete or Close */}
          {sentCount === recipients.length ? (
            <Button className="w-full" onClick={onComplete}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Campagna Completata!
            </Button>
          ) : (
            <Button variant="outline" className="w-full" onClick={onClose}>
              <XCircle className="h-4 w-4 mr-2" />
              Chiudi e Riprendi Dopo
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
