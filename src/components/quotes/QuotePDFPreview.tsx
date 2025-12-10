import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Send, 
  Mail, 
  MessageCircle, 
  FileText, 
  Sparkles,
  User,
  Smartphone,
  Euro,
  ChevronLeft,
  Eye,
  Printer,
  Share2,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { downloadQuotePDF, getQuotePDFDataUrl } from "./QuotePDFGenerator";

interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
}

interface QuotePDFPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  issueDescription: string;
  diagnosis: string;
  notes: string;
  items: QuoteItem[];
  laborCost: number;
  partsCost: number;
  totalCost: number;
  centroInfo?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  onSend: (method: "email" | "whatsapp") => void;
  isSending: boolean;
}

export function QuotePDFPreview({
  open,
  onOpenChange,
  customer,
  deviceType,
  deviceBrand,
  deviceModel,
  issueDescription,
  diagnosis,
  notes,
  items,
  laborCost,
  partsCost,
  totalCost,
  centroInfo,
  onSend,
  isSending
}: QuotePDFPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [sendMethod, setSendMethod] = useState<"email" | "whatsapp" | null>(null);
  const [showSendOptions, setShowSendOptions] = useState(false);

  const pdfData = {
    customerName: customer.name,
    customerEmail: customer.email || undefined,
    customerPhone: customer.phone,
    deviceType,
    deviceBrand,
    deviceModel,
    issueDescription,
    diagnosis: diagnosis || undefined,
    notes: notes || undefined,
    items,
    laborCost,
    partsCost,
    totalCost,
    centroName: centroInfo?.name,
    centroAddress: centroInfo?.address,
    centroPhone: centroInfo?.phone,
    centroEmail: centroInfo?.email,
    quoteNumber: `PRV-${Date.now().toString().slice(-6)}`,
  };

  useEffect(() => {
    if (open) {
      const url = getQuotePDFDataUrl(pdfData);
      setPdfUrl(url);
    }
  }, [open, customer, items, laborCost, totalCost]);

  const handleDownload = () => {
    downloadQuotePDF(pdfData);
  };

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl);
      printWindow?.print();
    }
  };

  const handleSend = () => {
    if (sendMethod) {
      onSend(sendMethod);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-glow shadow-elegant">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Anteprima Preventivo</h2>
                <p className="text-sm text-muted-foreground">Verifica e invia al cliente</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {pdfData.quoteNumber}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* PDF Preview */}
          <div className="flex-1 bg-muted/30 p-4 overflow-hidden">
            <div className="h-full rounded-xl overflow-hidden shadow-elegant border bg-white">
              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full min-h-[400px]"
                  title="Anteprima PDF"
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l p-4 space-y-4 overflow-y-auto">
            {/* Quick Info */}
            <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span className="font-medium">{customer.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Smartphone className="h-4 w-4" />
                  <span>{deviceType} {deviceBrand} {deviceModel}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Totale</span>
                    <span className="text-2xl font-bold text-primary">€{totalCost.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Azioni</p>
              
              <Button
                variant="outline"
                className="w-full justify-start h-11"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Scarica PDF
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-11"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4 mr-2" />
                Stampa
              </Button>
            </div>

            {/* Send Section */}
            <AnimatePresence mode="wait">
              {!showSendOptions ? (
                <motion.div
                  key="send-button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Button
                    className="w-full h-12 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 shadow-elegant"
                    onClick={() => setShowSendOptions(true)}
                  >
                    <Send className="h-5 w-5 mr-2" />
                    Invia al Cliente
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="send-options"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowSendOptions(false); setSendMethod(null); }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <p className="text-sm font-medium">Scegli come inviare</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSendMethod("email")}
                      disabled={!customer.email}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        sendMethod === "email" 
                          ? "border-primary bg-primary/10" 
                          : "border-muted hover:border-primary/50"
                      } ${!customer.email ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <Mail className={`h-6 w-6 mx-auto mb-1 ${sendMethod === "email" ? "text-primary" : "text-muted-foreground"}`} />
                      <p className="text-xs font-medium">Email</p>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSendMethod("whatsapp")}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        sendMethod === "whatsapp" 
                          ? "border-green-500 bg-green-500/10" 
                          : "border-muted hover:border-green-500/50"
                      }`}
                    >
                      <MessageCircle className={`h-6 w-6 mx-auto mb-1 ${sendMethod === "whatsapp" ? "text-green-500" : "text-muted-foreground"}`} />
                      <p className="text-xs font-medium">WhatsApp</p>
                    </motion.button>
                  </div>

                  {sendMethod && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                    >
                      <Card className={`${sendMethod === "email" ? "bg-primary/5 border-primary/20" : "bg-green-500/5 border-green-500/20"}`}>
                        <CardContent className="p-3">
                          <p className="text-xs text-muted-foreground">
                            {sendMethod === "email" 
                              ? `Invieremo il preventivo a: ${customer.email}`
                              : `Apriremo WhatsApp con il numero: ${customer.phone}`
                            }
                          </p>
                        </CardContent>
                      </Card>

                      <Button
                        className={`w-full h-11 mt-2 ${
                          sendMethod === "whatsapp" 
                            ? "bg-green-500 hover:bg-green-600" 
                            : "bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
                        }`}
                        onClick={handleSend}
                        disabled={isSending}
                      >
                        {isSending ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                        ) : (
                          <>
                            {sendMethod === "email" ? <Mail className="h-4 w-4 mr-2" /> : <MessageCircle className="h-4 w-4 mr-2" />}
                            Conferma Invio
                          </>
                        )}
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tips */}
            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardContent className="p-3">
                <div className="flex gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-700">Suggerimento</p>
                    <p className="text-xs text-amber-600/80 mt-0.5">
                      Scarica il PDF per conservare una copia prima di inviarlo al cliente.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}