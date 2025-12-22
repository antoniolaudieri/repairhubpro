import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Download } from "lucide-react";

interface CustomerImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  centroId: string;
  onImportComplete: () => void;
}

interface ParsedCustomer {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  isValid: boolean;
  errors: string[];
}

export function CustomerImportDialog({ 
  open, 
  onOpenChange, 
  centroId,
  onImportComplete 
}: CustomerImportDialogProps) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "complete">("upload");
  const [parsedCustomers, setParsedCustomers] = useState<ParsedCustomer[]>([]);
  const [importResults, setImportResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const csvContent = "nome,cognome,telefono,email,indirizzo,note\nMario,Rossi,+39 333 1234567,mario.rossi@email.com,Via Roma 1,Cliente VIP\nGiulia,Bianchi,+39 339 7654321,giulia.bianchi@email.com,,";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "template_clienti.csv";
    link.click();
  };

  const parseCSV = (text: string): ParsedCustomer[] => {
    const lines = text.split("\n").filter(line => line.trim());
    if (lines.length < 2) return [];

    // Get header and normalize
    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(/[,;|]/).map(h => h.trim().replace(/"/g, ""));
    
    // Map headers to expected fields - support both combined "nome" and separate "nome"/"cognome"
    const nomeIdx = headers.findIndex(h => h === "nome" || h === "name" || h === "first name" || h === "firstname");
    const cognomeIdx = headers.findIndex(h => h === "cognome" || h === "surname" || h === "last name" || h === "lastname");
    const phoneIdx = headers.findIndex(h => h.includes("telefono") || h.includes("phone") || h.includes("tel") || h.includes("cellulare"));
    const emailIdx = headers.findIndex(h => h.includes("email") || h.includes("e-mail") || h.includes("mail"));
    const addressIdx = headers.findIndex(h => h.includes("indirizzo") || h.includes("address") || h.includes("via"));
    const notesIdx = headers.findIndex(h => h.includes("note") || h.includes("notes") || h.includes("commento"));

    const customers: ParsedCustomer[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // Parse CSV line handling quoted values
      const values: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if ((char === ',' || char === ';' || char === '|') && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      // Get nome and cognome separately, then combine
      const nome = nomeIdx >= 0 ? values[nomeIdx]?.replace(/"/g, "").replace(/\\/g, "").trim() || "" : "";
      const cognome = cognomeIdx >= 0 ? values[cognomeIdx]?.replace(/"/g, "").replace(/\\/g, "").trim() || "" : "";
      
      // Combine nome + cognome, or use whichever is available
      let fullName = "";
      if (nome && cognome) {
        fullName = `${nome} ${cognome}`;
      } else if (cognome) {
        fullName = cognome;
      } else if (nome) {
        fullName = nome;
      }

      const phone = phoneIdx >= 0 ? values[phoneIdx]?.replace(/"/g, "").replace(/\\/g, "").trim() || "" : "";
      const email = emailIdx >= 0 ? values[emailIdx]?.replace(/"/g, "").replace(/\\/g, "").trim() || "" : "";
      const address = addressIdx >= 0 ? values[addressIdx]?.replace(/"/g, "").replace(/\\/g, "").trim() || "" : "";
      const notes = notesIdx >= 0 ? values[notesIdx]?.replace(/"/g, "").replace(/\\/g, "").trim() || "" : "";

      // Skip completely empty rows
      if (!fullName && !phone && !email) continue;

      const errors: string[] = [];
      if (!fullName) errors.push("Nome mancante");
      if (!phone) errors.push("Telefono mancante");
      if (email && !email.includes("@")) errors.push("Email non valida");

      customers.push({
        name: fullName,
        phone,
        email,
        address,
        notes,
        isValid: errors.length === 0,
        errors
      });
    }

    return customers;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const customers = parseCSV(text);
      
      if (customers.length === 0) {
        toast.error("File CSV vuoto o non valido");
        return;
      }

      setParsedCustomers(customers);
      setStep("preview");
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const validCustomers = parsedCustomers.filter(c => c.isValid);
    
    if (validCustomers.length === 0) {
      toast.error("Nessun cliente valido da importare");
      return;
    }

    setStep("importing");
    let success = 0;
    let failed = 0;

    for (const customer of validCustomers) {
      try {
        const { error } = await supabase
          .from("customers")
          .insert({
            name: customer.name,
            phone: customer.phone,
            email: customer.email || null,
            address: customer.address || null,
            notes: customer.notes || null,
            centro_id: centroId
          });

        if (error) {
          failed++;
          console.error("Import error:", error);
        } else {
          success++;
        }
      } catch {
        failed++;
      }
    }

    setImportResults({ success, failed });
    setStep("complete");
  };

  const handleClose = () => {
    setStep("upload");
    setParsedCustomers([]);
    setImportResults({ success: 0, failed: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
    onOpenChange(false);
    
    if (importResults.success > 0) {
      onImportComplete();
    }
  };

  const validCount = parsedCustomers.filter(c => c.isValid).length;
  const invalidCount = parsedCustomers.filter(c => !c.isValid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importa Clienti
          </DialogTitle>
          <DialogDescription>
            Importa clienti in blocco da un file CSV
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-6 py-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Carica un file CSV con le colonne: nome, cognome, telefono, email, indirizzo, note
              </p>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="max-w-xs mx-auto"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Non hai un file CSV?</p>
                <p className="text-xs text-muted-foreground">Scarica il template di esempio</p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Scarica Template
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {validCount} validi
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  {invalidCount} con errori
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefono</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Indirizzo</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedCustomers.map((customer, idx) => (
                    <TableRow key={idx} className={!customer.isValid ? "bg-destructive/5" : ""}>
                      <TableCell>
                        {customer.isValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{customer.name || "-"}</TableCell>
                      <TableCell>{customer.phone || "-"}</TableCell>
                      <TableCell>{customer.email || "-"}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{customer.address || "-"}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{customer.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Indietro
              </Button>
              <Button onClick={handleImport} disabled={validCount === 0}>
                Importa {validCount} Clienti
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary/20 border-t-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Importazione in corso...</p>
          </div>
        )}

        {step === "complete" && (
          <div className="py-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Importazione Completata</h3>
              <p className="text-muted-foreground">
                {importResults.success} clienti importati con successo
                {importResults.failed > 0 && `, ${importResults.failed} non importati`}
              </p>
            </div>
            <Button onClick={handleClose}>Chiudi</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
