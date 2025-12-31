import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  MessageSquare, 
  Users, 
  Send, 
  Search, 
  Filter,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  History,
  Save,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import WhatsAppSendingModal from "./WhatsAppSendingModal";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  last_interaction_at: string | null;
}

interface Campaign {
  id: string;
  name: string;
  message_template: string;
  recipients_count: number;
  sent_count: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface Template {
  id: string;
  name: string;
  message: string;
  category: string;
}

const DEFAULT_TEMPLATES = [
  {
    name: "Promozione Tessera Fedeltà",
    message: "Ciao {{nome}}! 🎉 Abbiamo una promozione speciale per te: attiva la Tessera Fedeltà e risparmia il 10% su tutte le riparazioni! Ti aspettiamo da {{centro}}.",
    category: "promo"
  },
  {
    name: "Antivirus Android - Offerta Lancio",
    message: "Ciao {{nome}}! 🛡️ Proteggi il tuo smartphone con il nostro Antivirus Android esclusivo! A soli 30€/anno hai: protezione malware, blocco pubblicità e scansione app. Offerta limitata ai primi 100 clienti! Attiva ora: {{link_pagamento}} - {{centro}}",
    category: "promo"
  },
  {
    name: "Buon Compleanno",
    message: "Buon compleanno {{nome}}! 🎂 Da parte di tutto il team di {{centro}}, ti auguriamo una giornata fantastica! Per festeggiare, hai diritto a uno sconto speciale del 15% sulla tua prossima riparazione.",
    category: "auguri"
  },
  {
    name: "Reminder Manutenzione",
    message: "Ciao {{nome}}! 📱 È passato un po' di tempo dalla tua ultima visita. Come sta il tuo {{dispositivo}}? Se hai bisogno di assistenza, siamo qui per te! - {{centro}}",
    category: "reminder"
  },
  {
    name: "Dispositivo Pronto",
    message: "Ciao {{nome}}! ✅ Il tuo {{dispositivo}} è pronto per il ritiro! Passa quando vuoi da {{centro}}. Ti aspettiamo!",
    category: "notifica"
  },
  {
    name: "Nuova Promozione",
    message: "Ciao {{nome}}! 🔥 Nuova promozione da {{centro}}! Sconto del 20% su tutte le riparazioni display questa settimana. Non perdere l'occasione!",
    category: "promo"
  }
];

export default function WhatsAppCampaign() {
  const { user } = useAuth();
  const [centroId, setCentroId] = useState<string | null>(null);
  const [centroName, setCentroName] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Composer state
  const [campaignName, setCampaignName] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  
  // Modal state
  const [showSendingModal, setShowSendingModal] = useState(false);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
  
  // Template saving
  const [templateName, setTemplateName] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCentroInfo();
    }
  }, [user]);

  useEffect(() => {
    if (centroId) {
      fetchCustomers();
      fetchCampaigns();
      fetchTemplates();
    }
  }, [centroId]);

  const fetchCentroInfo = async () => {
    const { data } = await supabase
      .from("centri_assistenza")
      .select("id, business_name")
      .eq("owner_user_id", user?.id)
      .single();
    
    if (data) {
      setCentroId(data.id);
      setCentroName(data.business_name);
    }
    setLoading(false);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from("customers")
      .select("id, name, phone, email, last_interaction_at")
      .eq("centro_id", centroId)
      .not("phone", "is", null)
      .order("name");
    
    if (data) {
      // Filter customers with valid phone numbers
      const validCustomers = data.filter(c => c.phone && c.phone.length >= 8);
      setCustomers(validCustomers);
    }
  };

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from("whatsapp_campaigns")
      .select("*")
      .eq("centro_id", centroId)
      .order("created_at", { ascending: false })
      .limit(20);
    
    if (data) {
      setCampaigns(data);
    }
  };

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("whatsapp_message_templates")
      .select("*")
      .eq("centro_id", centroId)
      .order("created_at", { ascending: false });
    
    if (data) {
      setTemplates(data);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery);
    
    if (filter === "all") return matchesSearch;
    if (filter === "recent") {
      if (!customer.last_interaction_at) return false;
      const daysSinceInteraction = (Date.now() - new Date(customer.last_interaction_at).getTime()) / (1000 * 60 * 60 * 24);
      return matchesSearch && daysSinceInteraction <= 30;
    }
    if (filter === "inactive") {
      if (!customer.last_interaction_at) return matchesSearch;
      const daysSinceInteraction = (Date.now() - new Date(customer.last_interaction_at).getTime()) / (1000 * 60 * 60 * 24);
      return matchesSearch && daysSinceInteraction > 90;
    }
    return matchesSearch;
  });

  const toggleCustomer = (customerId: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const selectAll = () => {
    const allIds = new Set(filteredCustomers.map(c => c.id));
    setSelectedCustomers(allIds);
  };

  const deselectAll = () => {
    setSelectedCustomers(new Set());
  };

  const applyTemplate = (template: { message: string }) => {
    setMessageTemplate(template.message);
  };

  const insertVariable = (variable: string) => {
    setMessageTemplate(prev => prev + `{{${variable}}}`);
  };

  const personalizeMessage = (customer: Customer, template: string) => {
    return template
      .replace(/\{\{nome\}\}/g, customer.name.split(" ")[0])
      .replace(/\{\{nome_completo\}\}/g, customer.name)
      .replace(/\{\{centro\}\}/g, centroName)
      .replace(/\{\{dispositivo\}\}/g, "dispositivo") // TODO: get last device
      .replace(/\{\{data\}\}/g, format(new Date(), "d MMMM yyyy", { locale: it }));
  };

  const saveTemplate = async () => {
    if (!templateName.trim() || !messageTemplate.trim()) {
      toast.error("Inserisci nome e messaggio del template");
      return;
    }

    const { error } = await supabase
      .from("whatsapp_message_templates")
      .insert({
        centro_id: centroId,
        name: templateName,
        message: messageTemplate,
        category: "custom"
      });

    if (error) {
      toast.error("Errore nel salvare il template");
    } else {
      toast.success("Template salvato!");
      setTemplateName("");
      setShowSaveTemplate(false);
      fetchTemplates();
    }
  };

  const deleteTemplate = async (templateId: string) => {
    const { error } = await supabase
      .from("whatsapp_message_templates")
      .delete()
      .eq("id", templateId);

    if (error) {
      toast.error("Errore nell'eliminare il template");
    } else {
      toast.success("Template eliminato");
      fetchTemplates();
    }
  };

  const startCampaign = async () => {
    if (!campaignName.trim()) {
      toast.error("Inserisci un nome per la campagna");
      return;
    }
    if (!messageTemplate.trim()) {
      toast.error("Inserisci un messaggio");
      return;
    }
    if (selectedCustomers.size === 0) {
      toast.error("Seleziona almeno un destinatario");
      return;
    }

    // Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("whatsapp_campaigns")
      .insert({
        centro_id: centroId,
        name: campaignName,
        message_template: messageTemplate,
        recipients_count: selectedCustomers.size,
        status: "in_progress",
        created_by: user?.id
      })
      .select()
      .single();

    if (campaignError || !campaign) {
      toast.error("Errore nel creare la campagna");
      return;
    }

    // Create recipients
    const selectedCustomersList = customers.filter(c => selectedCustomers.has(c.id));
    const recipients = selectedCustomersList.map(customer => ({
      campaign_id: campaign.id,
      customer_id: customer.id,
      personalized_message: personalizeMessage(customer, messageTemplate)
    }));

    const { error: recipientsError } = await supabase
      .from("whatsapp_campaign_recipients")
      .insert(recipients);

    if (recipientsError) {
      toast.error("Errore nel salvare i destinatari");
      return;
    }

    setCurrentCampaignId(campaign.id);
    setShowSendingModal(true);
  };

  const handleCampaignComplete = () => {
    setShowSendingModal(false);
    setCurrentCampaignId(null);
    setCampaignName("");
    setMessageTemplate("");
    setSelectedCustomers(new Set());
    fetchCampaigns();
    toast.success("Campagna completata!");
  };

  const resumeCampaign = (campaignId: string) => {
    setCurrentCampaignId(campaignId);
    setShowSendingModal(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="compose" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="compose" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Componi
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Template
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Storico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Message Composer */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-green-500" />
                  Componi Messaggio
                </CardTitle>
                <CardDescription>
                  Usa le variabili per personalizzare il messaggio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome Campagna</Label>
                  <Input
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Es. Promozione Natale 2024"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Messaggio</Label>
                  <Textarea
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    placeholder="Ciao {{nome}}! Il tuo messaggio qui..."
                    rows={6}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => insertVariable("nome")}
                    >
                      {"{{nome}}"}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => insertVariable("centro")}
                    >
                      {"{{centro}}"}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => insertVariable("dispositivo")}
                    >
                      {"{{dispositivo}}"}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => insertVariable("data")}
                    >
                      {"{{data}}"}
                    </Badge>
                  </div>
                </div>

                {messageTemplate && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Anteprima</Label>
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900 text-sm">
                      {personalizeMessage(
                        { id: "", name: "Mario Rossi", phone: "", email: null, last_interaction_at: null },
                        messageTemplate
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {showSaveTemplate ? (
                    <div className="flex gap-2 w-full">
                      <Input
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Nome template..."
                        className="flex-1"
                      />
                      <Button size="sm" onClick={saveTemplate}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowSaveTemplate(false)}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowSaveTemplate(true)}
                      disabled={!messageTemplate.trim()}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Salva come Template
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recipients Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Destinatari
                  <Badge variant="secondary">{selectedCustomers.size} selezionati</Badge>
                </CardTitle>
                <CardDescription>
                  Seleziona i clienti a cui inviare il messaggio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cerca per nome o telefono..."
                      className="pl-10"
                    />
                  </div>
                  <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-[140px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti</SelectItem>
                      <SelectItem value="recent">Recenti (30gg)</SelectItem>
                      <SelectItem value="inactive">Inattivi (90gg+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Seleziona tutti ({filteredCustomers.length})
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll}>
                    Deseleziona tutti
                  </Button>
                </div>

                <ScrollArea className="h-[300px] border rounded-lg">
                  <div className="p-2 space-y-1">
                    {filteredCustomers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nessun cliente con numero di telefono</p>
                      </div>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                          onClick={() => toggleCustomer(customer.id)}
                        >
                          <Checkbox
                            checked={selectedCustomers.has(customer.id)}
                            onCheckedChange={() => toggleCustomer(customer.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">{customer.phone}</p>
                          </div>
                          {customer.last_interaction_at && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(customer.last_interaction_at), "dd/MM/yy")}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                  onClick={startCampaign}
                  disabled={selectedCustomers.size === 0 || !messageTemplate.trim()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Avvia Campagna ({selectedCustomers.size} messaggi)
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Default Templates */}
            {DEFAULT_TEMPLATES.map((template, index) => (
              <Card key={`default-${index}`} className="cursor-pointer hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    {template.name}
                  </CardTitle>
                  <Badge variant="outline" className="w-fit">{template.category}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {template.message}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => applyTemplate(template)}
                  >
                    Usa Template
                  </Button>
                </CardContent>
              </Card>
            ))}

            {/* Custom Templates */}
            {templates.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTemplate(template.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                  <Badge variant="secondary" className="w-fit">{template.category}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {template.message}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => applyTemplate(template)}
                  >
                    Usa Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Storico Campagne</CardTitle>
              <CardDescription>
                Le tue campagne WhatsApp recenti
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nessuna campagna ancora</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{campaign.name}</h4>
                          {campaign.status === "completed" ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completata
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              In corso
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {campaign.sent_count}/{campaign.recipients_count} messaggi • {format(new Date(campaign.created_at), "d MMM yyyy HH:mm", { locale: it })}
                        </p>
                      </div>
                      {campaign.status !== "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resumeCampaign(campaign.id)}
                        >
                          Riprendi
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showSendingModal && currentCampaignId && (
        <WhatsAppSendingModal
          campaignId={currentCampaignId}
          onClose={() => setShowSendingModal(false)}
          onComplete={handleCampaignComplete}
        />
      )}
    </div>
  );
}
