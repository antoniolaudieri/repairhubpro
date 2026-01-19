import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Download, 
  Send, 
  Mail, 
  MessageCircle, 
  Sparkles,
  User,
  Smartphone,
  ChevronLeft,
  Eye,
  Printer,
  Loader2,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { downloadQuotePDF, getQuotePDFDataUrl } from "./QuotePDFGenerator";

interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
  sourceUrl?: string;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  address?: string;
}

interface DeviceInfo {
  fullName?: string;
  year?: string;
  imageUrl?: string;
  specs?: {
    ram?: string;
    storage?: string;
    display?: string;
    processor?: string;
  };
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
    vatNumber?: string;
    logoUrl?: string;
  };
  deviceInfo?: DeviceInfo | null;
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
  deviceInfo,
  onSend,
  isSending
}: QuotePDFPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [sendMethod, setSendMethod] = useState<"email" | "whatsapp" | null>(null);
  const [showSendOptions, setShowSendOptions] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [quoteNumber] = useState(() => `PRV-${Date.now().toString().slice(-6)}`);

  useEffect(() => {
    if (!open || !customer) return;
    
    let currentUrl: string | null = null;
    
    const generatePDF = async () => {
      setIsGenerating(true);
      setPdfUrl(null);
      
      try {
        const pdfData = {
          customerName: customer.name || "",
          customerEmail: customer.email || undefined,
          customerPhone: customer.phone || "",
          customerAddress: customer.address || undefined,
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
          centroInfo: centroInfo ? {
            name: centroInfo.name,
            address: centroInfo.address,
            phone: centroInfo.phone,
            email: centroInfo.email,
            vatNumber: centroInfo.vatNumber,
            logoUrl: centroInfo.logoUrl,
          } : undefined,
          quoteNumber,
          deviceInfo: deviceInfo || undefined,
        };
        
        console.log("Generating PDF with data:", pdfData);
        const url = await getQuotePDFDataUrl(pdfData);
        currentUrl = url;
        console.log("PDF generated successfully, blob URL created");
        setPdfUrl(url);
      } catch (error) {
        console.error("Error generating PDF:", error);
      } finally {
        setIsGenerating(false);
      }
    };
    
    generatePDF();
    
    // Cleanup blob URL when component unmounts or dialog closes
    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [open, customer, deviceType, deviceBrand, deviceModel, issueDescription, diagnosis, notes, items, laborCost, partsCost, totalCost, centroInfo, deviceInfo, quoteNumber]);

  const getPdfData = () => ({
    customerName: customer?.name || "",
    customerEmail: customer?.email || undefined,
    customerPhone: customer?.phone || "",
    customerAddress: customer?.address || undefined,
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
    centroInfo: centroInfo ? {
      name: centroInfo.name,
      address: centroInfo.address,
      phone: centroInfo.phone,
      email: centroInfo.email,
      vatNumber: centroInfo.vatNumber,
      logoUrl: centroInfo.logoUrl,
    } : undefined,
    quoteNumber,
    deviceInfo: deviceInfo || undefined,
  });

  const handleDownload = () => {
    downloadQuotePDF(getPdfData());
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

  const deviceName = deviceInfo?.fullName || `${deviceType} ${deviceBrand} ${deviceModel}`.trim();

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl h-[90dvh] sm:h-[85dvh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-3 sm:p-6 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-bold">Anteprima Preventivo</h2>
                <p className="text-xs text-muted-foreground hidden sm:block">Verifica e invia al cliente</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">
              {quoteNumber}
            </Badge>
          </div>
        </div>

        {/* Content - Mobile: stacked, Desktop: side by side */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col-reverse lg:flex-row">
          
          {/* PDF Preview - Hidden on mobile, shown on desktop */}
          <div className="hidden lg:flex flex-1 min-w-0 bg-muted/30 p-4 flex-col">
            <div className="flex-1 rounded-xl overflow-hidden shadow-lg border bg-white">
              {isGenerating ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Generazione PDF...</p>
                  </div>
                </div>
              ) : pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full border-0"
                  title="Anteprima PDF"
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Errore nella generazione del PDF</p>
                    <p className="text-xs text-muted-foreground mt-1">Riprova a riaprire l'anteprima</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar / Main content on mobile */}
          <div className="flex-1 lg:flex-none lg:w-80 shrink-0 overflow-y-auto lg:border-l">
              <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                {/* Device Preview Card */}
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 overflow-hidden">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex gap-2 sm:gap-3">
                      {deviceInfo?.imageUrl && (
                        <div className="relative flex-shrink-0">
                          <img
                            src={deviceInfo.imageUrl}
                            alt={deviceName}
                            className="h-12 w-12 sm:h-16 sm:w-16 object-contain rounded-lg bg-white p-1 shadow-sm"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <Badge 
                            variant="secondary" 
                            className="absolute -top-1 -right-1 text-[8px] px-1 py-0 bg-primary text-primary-foreground"
                          >
                            <Sparkles className="h-2 w-2" />
                          </Badge>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                          <User className="h-3 w-3 text-primary flex-shrink-0" />
                          <span className="font-medium text-xs sm:text-sm truncate">{customer.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
                          <Smartphone className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{deviceName}</span>
                        </div>
                        {deviceInfo?.year && deviceInfo.year !== "N/A" && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 sm:mt-1">Anno: {deviceInfo.year}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Total */}
                    <div className="mt-2 sm:mt-4 pt-2 sm:pt-3 border-t border-primary/20">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">Totale</span>
                        <span className="text-xl sm:text-2xl font-bold text-primary">€{totalCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Mobile PDF Preview Button */}
                <div className="lg:hidden">
                  <Button
                    variant="outline"
                    className="w-full h-10 border-primary/30"
                    onClick={() => pdfUrl && window.open(pdfUrl, '_blank')}
                    disabled={isGenerating || !pdfUrl}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4 mr-2" />
                    )}
                    {isGenerating ? "Generazione..." : "Visualizza PDF"}
                  </Button>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Azioni</p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-9 sm:h-10"
                      onClick={handleDownload}
                      disabled={isGenerating}
                    >
                      <Download className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="text-xs sm:text-sm">Scarica</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-9 sm:h-10"
                      onClick={handlePrint}
                      disabled={isGenerating || !pdfUrl}
                    >
                      <Printer className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="text-xs sm:text-sm">Stampa</span>
                    </Button>
                  </div>
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
                        className="w-full h-10 sm:h-12 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 shadow-lg"
                        onClick={() => setShowSendOptions(true)}
                      >
                        <Send className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                        <span className="text-sm sm:text-base">Invia al Cliente</span>
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="send-options"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-2 sm:space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setShowSendOptions(false); setSendMethod(null); }}
                          className="h-7 w-7 p-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <p className="text-xs sm:text-sm font-medium">Scegli come inviare</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSendMethod("email")}
                          disabled={!customer.email}
                          className={`p-2 sm:p-3 rounded-xl border-2 transition-all text-center ${
                            sendMethod === "email" 
                              ? "border-primary bg-primary/10" 
                              : "border-muted hover:border-primary/50"
                          } ${!customer.email ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <Mail className={`h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-0.5 sm:mb-1 ${sendMethod === "email" ? "text-primary" : "text-muted-foreground"}`} />
                          <p className="text-[10px] sm:text-xs font-medium">Email</p>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSendMethod("whatsapp")}
                          className={`p-2 sm:p-3 rounded-xl border-2 transition-all text-center ${
                            sendMethod === "whatsapp" 
                              ? "border-green-500 bg-green-500/10" 
                              : "border-muted hover:border-green-500/50"
                          }`}
                        >
                          <MessageCircle className={`h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-0.5 sm:mb-1 ${sendMethod === "whatsapp" ? "text-green-500" : "text-muted-foreground"}`} />
                          <p className="text-[10px] sm:text-xs font-medium">WhatsApp</p>
                        </motion.button>
                      </div>

                      {sendMethod && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                        >
                          <Card className={`${sendMethod === "email" ? "bg-primary/5 border-primary/20" : "bg-green-500/5 border-green-500/20"}`}>
                            <CardContent className="p-2 sm:p-3">
                              <p className="text-[10px] sm:text-xs text-muted-foreground">
                                {sendMethod === "email" 
                                  ? `Invieremo a: ${customer.email}`
                                  : `WhatsApp: ${customer.phone}`
                                }
                              </p>
                            </CardContent>
                          </Card>

                          <Button
                            className={`w-full h-9 sm:h-11 mt-2 ${
                              sendMethod === "whatsapp" 
                                ? "bg-green-500 hover:bg-green-600" 
                                : "bg-gradient-to-r from-primary to-primary/80 hover:opacity-90"
                            }`}
                            onClick={handleSend}
                            disabled={isSending}
                          >
                            {isSending ? (
                              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                            ) : (
                              <>
                                {sendMethod === "email" ? <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" /> : <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />}
                                <span className="text-xs sm:text-sm">Conferma Invio</span>
                              </>
                            )}
                          </Button>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tips - Hidden on mobile */}
                <Card className="hidden sm:block bg-amber-500/5 border-amber-500/20">
                  <CardContent className="p-3">
                    <div className="flex gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-amber-700">Suggerimento</p>
                        <p className="text-xs text-amber-600/80 mt-0.5">
                          Scarica il PDF per conservare una copia prima di inviarlo.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
