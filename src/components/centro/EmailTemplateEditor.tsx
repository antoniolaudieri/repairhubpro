import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Eye, 
  Code, 
  RotateCcw, 
  Save,
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  html: string;
  variables: string[];
}

export interface EmailTemplates {
  customer_welcome: EmailTemplate;
  customer_welcome_no_loyalty: EmailTemplate;
  loyalty_welcome: EmailTemplate;
  quote_sent: EmailTemplate;
  repair_status_update: EmailTemplate;
  repair_completed: EmailTemplate;
  order_received: EmailTemplate;
}

interface EmailTemplateEditorProps {
  templates: Partial<EmailTemplates>;
  onSave: (templates: Partial<EmailTemplates>) => void;
  centroName: string;
  centroLogo?: string | null;
}

const DEFAULT_TEMPLATES: EmailTemplates = {
  customer_welcome: {
    id: "customer_welcome",
    name: "Benvenuto Cliente (con Tessera)",
    description: "Email inviata ai nuovi clienti che hanno già la tessera fedeltà",
    subject: "Benvenuto su {{shop_name}} - I tuoi dati di accesso",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 12px;">
    {{#if logo_url}}<img src="{{logo_url}}" alt="{{shop_name}}" style="max-height: 60px;">{{/if}}
    <h1 style="color: white; margin: 10px 0;">{{shop_name}}</h1>
  </div>
  
  <h2 style="color: #333; margin-top: 24px;">Benvenuto {{customer_name}}!</h2>
  
  <p>È stato creato un account per te su <strong>{{shop_name}}</strong>.</p>
  
  <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #0369a1; margin: 0 0 12px 0;">🔐 I tuoi dati di accesso</h3>
    <p><strong>Email:</strong> {{customer_email}}</p>
    <p><strong>Password:</strong> {{password}}</p>
  </div>
  
  <p style="background: #fef3c7; padding: 12px; border-radius: 6px;">
    ⚠️ Ti consigliamo di cambiare la password al primo accesso.
  </p>
  
  <div style="text-align: center; margin: 24px 0;">
    <a href="{{login_url}}" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Accedi al tuo account
    </a>
  </div>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #666; font-size: 12px; text-align: center;">
    {{shop_name}} {{#if shop_address}}- {{shop_address}}{{/if}}
  </p>
</body>
</html>`,
    variables: ["shop_name", "logo_url", "customer_name", "customer_email", "password", "login_url", "shop_address", "shop_phone", "shop_email"]
  },
  customer_welcome_no_loyalty: {
    id: "customer_welcome_no_loyalty",
    name: "Benvenuto Cliente (senza Tessera)",
    description: "Email inviata ai nuovi clienti senza tessera fedeltà - include promozione tessera con link acquisto",
    subject: "Benvenuto su {{shop_name}} - Scopri i vantaggi esclusivi!",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 12px;">
    {{#if logo_url}}<img src="{{logo_url}}" alt="{{shop_name}}" style="max-height: 60px;">{{/if}}
    <h1 style="color: white; margin: 10px 0;">{{shop_name}}</h1>
  </div>
  
  <h2 style="color: #333; margin-top: 24px;">Benvenuto {{customer_name}}!</h2>
  
  <p>È stato creato un account per te su <strong>{{shop_name}}</strong>.</p>
  
  <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #0369a1; margin: 0 0 12px 0;">🔐 I tuoi dati di accesso</h3>
    <p><strong>Email:</strong> {{customer_email}}</p>
    <p><strong>Password:</strong> {{password}}</p>
  </div>
  
  <!-- LOYALTY CARD PROMOTION WITH DIRECT PURCHASE -->
  <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 24px; border-radius: 12px; margin: 24px 0; color: #78350f;">
    <h3 style="margin: 0 0 12px 0; font-size: 20px;">🎉 Attiva la Tessera Fedeltà!</h3>
    <p style="margin: 0 0 16px 0;">Con soli <strong>€30/anno</strong> ottieni vantaggi esclusivi:</p>
    <ul style="margin: 0 0 16px 0; padding-left: 20px;">
      <li><strong>Diagnosi a €10</strong> invece di €15 (risparmio €5)</li>
      <li><strong>10% di sconto</strong> su tutte le riparazioni</li>
      <li><strong>Fino a 3 dispositivi</strong> coperti per un anno</li>
    </ul>
    <div style="text-align: center; margin-top: 20px;">
      <a href="{{loyalty_url}}" style="display: inline-block; background: #78350f; color: #fef3c7; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">💳 Attiva Ora - €30/anno</a>
    </div>
  </div>
  
  <p style="background: #fef3c7; padding: 12px; border-radius: 6px;">
    ⚠️ Ti consigliamo di cambiare la password al primo accesso.
  </p>
  
  <div style="text-align: center; margin: 24px 0;">
    <a href="{{login_url}}" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Accedi al tuo account
    </a>
  </div>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #666; font-size: 12px; text-align: center;">
    {{shop_name}} {{#if shop_address}}- {{shop_address}}{{/if}}
  </p>
</body>
</html>`,
    variables: ["shop_name", "logo_url", "customer_name", "customer_email", "password", "login_url", "loyalty_url", "shop_address", "shop_phone", "shop_email"]
  },
  loyalty_welcome: {
    id: "loyalty_welcome",
    name: "Benvenuto Tessera Fedeltà",
    description: "Email inviata quando un cliente attiva la tessera fedeltà",
    subject: "🎉 Benvenuto nel Club Fedeltà di {{shop_name}}!",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 12px;">
    {{#if logo_url}}<img src="{{logo_url}}" alt="{{shop_name}}" style="max-height: 60px;">{{/if}}
    <h1 style="color: white; margin: 10px 0;">Benvenuto nel Club Fedeltà!</h1>
  </div>
  
  <p style="margin-top: 24px;">Gentile <strong>{{customer_name}}</strong>,</p>
  
  <p>Grazie per aver attivato la <strong>Tessera Fedeltà</strong> di <strong>{{shop_name}}</strong>! 🎉</p>
  
  <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 25px; border-radius: 12px; margin: 25px 0;">
    <h2 style="margin: 0 0 15px 0; font-size: 18px;">I Tuoi Vantaggi Esclusivi:</h2>
    <ul style="margin: 0; padding-left: 20px;">
      <li style="margin-bottom: 10px;"><strong>Diagnosi Scontata:</strong> Solo €10 invece di €15</li>
      <li style="margin-bottom: 10px;"><strong>10% di Sconto</strong> su tutte le riparazioni</li>
      <li style="margin-bottom: 10px;"><strong>Fino a {{max_devices}} dispositivi</strong> coperti per un anno</li>
    </ul>
  </div>
  
  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0;"><strong>Numero Tessera:</strong> {{card_number}}</p>
    <p style="margin: 10px 0 0 0;"><strong>Valida fino al:</strong> {{expiry_date}}</p>
  </div>
  
  <p>I vantaggi verranno applicati <strong>automaticamente</strong> ad ogni riparazione.</p>
  
  <div style="text-align: center; margin: 24px 0;">
    <a href="{{dashboard_url}}" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Visualizza la tua Tessera
    </a>
  </div>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #666; font-size: 12px; text-align: center;">
    {{shop_name}} - Tel: {{shop_phone}} - {{shop_email}}
  </p>
</body>
</html>`,
    variables: ["shop_name", "logo_url", "customer_name", "card_number", "expiry_date", "max_devices", "dashboard_url", "shop_phone", "shop_email"]
  },
  quote_sent: {
    id: "quote_sent",
    name: "Preventivo Inviato",
    description: "Email inviata quando viene creato un preventivo per il cliente",
    subject: "Preventivo #{{quote_number}} da {{shop_name}}",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 12px;">
    {{#if logo_url}}<img src="{{logo_url}}" alt="{{shop_name}}" style="max-height: 60px;">{{/if}}
    <h1 style="color: white; margin: 10px 0;">Preventivo Riparazione</h1>
  </div>
  
  <p style="margin-top: 24px;">Gentile <strong>{{customer_name}}</strong>,</p>
  
  <p>Abbiamo preparato un preventivo per la riparazione del tuo dispositivo:</p>
  
  <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
    <p><strong>Dispositivo:</strong> {{device_name}}</p>
    <p><strong>Problema:</strong> {{issue_description}}</p>
    <p style="font-size: 24px; color: #2563eb; margin: 16px 0;"><strong>Totale: €{{total_cost}}</strong></p>
    <p style="color: #666; font-size: 13px;">Valido fino al: {{valid_until}}</p>
  </div>
  
  <div style="text-align: center; margin: 24px 0;">
    <a href="{{sign_url}}" style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      ✍️ Firma il Preventivo
    </a>
  </div>
  
  <p style="color: #666; font-size: 13px;">Clicca sul pulsante per visualizzare i dettagli e firmare il preventivo online.</p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #666; font-size: 12px; text-align: center;">
    {{shop_name}} - Tel: {{shop_phone}}
  </p>
</body>
</html>`,
    variables: ["shop_name", "logo_url", "customer_name", "device_name", "issue_description", "total_cost", "valid_until", "sign_url", "quote_number", "shop_phone"]
  },
  repair_status_update: {
    id: "repair_status_update",
    name: "Aggiornamento Stato Riparazione",
    description: "Email inviata quando lo stato di una riparazione cambia",
    subject: "Aggiornamento riparazione - {{device_name}}",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 12px;">
    {{#if logo_url}}<img src="{{logo_url}}" alt="{{shop_name}}" style="max-height: 60px;">{{/if}}
    <h1 style="color: white; margin: 10px 0;">Aggiornamento Riparazione</h1>
  </div>
  
  <p style="margin-top: 24px;">Gentile <strong>{{customer_name}}</strong>,</p>
  
  <p>Ti informiamo che lo stato della tua riparazione è stato aggiornato:</p>
  
  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Dispositivo:</strong> {{device_name}}</p>
    <p><strong>Nuovo stato:</strong> <span style="color: #16a34a; font-weight: bold;">{{status}}</span></p>
    {{#if status_note}}<p><strong>Note:</strong> {{status_note}}</p>{{/if}}
  </div>
  
  <div style="text-align: center; margin: 24px 0;">
    <a href="{{tracking_url}}" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Segui la Riparazione
    </a>
  </div>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #666; font-size: 12px; text-align: center;">
    {{shop_name}} - Tel: {{shop_phone}}
  </p>
</body>
</html>`,
    variables: ["shop_name", "logo_url", "customer_name", "device_name", "status", "status_note", "tracking_url", "shop_phone"]
  },
  repair_completed: {
    id: "repair_completed",
    name: "Riparazione Completata",
    description: "Email inviata quando una riparazione è pronta per il ritiro",
    subject: "✅ Riparazione completata - Pronta per il ritiro!",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 12px;">
    {{#if logo_url}}<img src="{{logo_url}}" alt="{{shop_name}}" style="max-height: 60px;">{{/if}}
    <h1 style="color: white; margin: 10px 0;">Riparazione Completata! ✅</h1>
  </div>
  
  <p style="margin-top: 24px;">Gentile <strong>{{customer_name}}</strong>,</p>
  
  <p>Ottime notizie! La riparazione del tuo dispositivo è stata completata ed è pronta per il ritiro.</p>
  
  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Dispositivo:</strong> {{device_name}}</p>
    <p><strong>Lavori eseguiti:</strong> {{repair_notes}}</p>
    <p style="font-size: 20px; color: #16a34a; margin: 16px 0;"><strong>Totale da pagare: €{{final_cost}}</strong></p>
  </div>
  
  <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0;"><strong>📍 Dove ritirare:</strong></p>
    <p style="margin: 8px 0 0 0;">{{shop_address}}</p>
    <p style="margin: 8px 0 0 0;"><strong>📞 Telefono:</strong> {{shop_phone}}</p>
  </div>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #666; font-size: 12px; text-align: center;">
    {{shop_name}} - Ti aspettiamo!
  </p>
</body>
</html>`,
    variables: ["shop_name", "logo_url", "customer_name", "device_name", "repair_notes", "final_cost", "shop_address", "shop_phone"]
  },
  order_received: {
    id: "order_received",
    name: "Ricambi Arrivati",
    description: "Email inviata quando i ricambi ordinati sono arrivati",
    subject: "📦 I ricambi per la tua riparazione sono arrivati!",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius: 12px;">
    {{#if logo_url}}<img src="{{logo_url}}" alt="{{shop_name}}" style="max-height: 60px;">{{/if}}
    <h1 style="color: white; margin: 10px 0;">Ricambi Arrivati! 📦</h1>
  </div>
  
  <p style="margin-top: 24px;">Gentile <strong>{{customer_name}}</strong>,</p>
  
  <p>Ti informiamo che i ricambi necessari per la riparazione del tuo dispositivo sono arrivati.</p>
  
  <div style="background: #f5f3ff; border: 1px solid #ddd6fe; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Dispositivo:</strong> {{device_name}}</p>
    <p><strong>Ricambi ricevuti:</strong> {{parts_list}}</p>
  </div>
  
  <p>Procederemo con la riparazione e ti aggiorneremo appena sarà completata.</p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #666; font-size: 12px; text-align: center;">
    {{shop_name}} - Tel: {{shop_phone}}
  </p>
</body>
</html>`,
    variables: ["shop_name", "logo_url", "customer_name", "device_name", "parts_list", "shop_phone"]
  }
};

export function getDefaultTemplates(): EmailTemplates {
  return DEFAULT_TEMPLATES;
}

export default function EmailTemplateEditor({ 
  templates, 
  onSave, 
  centroName,
  centroLogo 
}: EmailTemplateEditorProps) {
  const [activeTemplate, setActiveTemplate] = useState<keyof EmailTemplates>("customer_welcome_no_loyalty");
  const [editedTemplates, setEditedTemplates] = useState<Partial<EmailTemplates>>(templates);
  const [previewMode, setPreviewMode] = useState<"code" | "preview">("code");
  const [showVariables, setShowVariables] = useState(false);

  const currentTemplate = editedTemplates[activeTemplate] || DEFAULT_TEMPLATES[activeTemplate];

  const handleSubjectChange = (subject: string) => {
    setEditedTemplates(prev => ({
      ...prev,
      [activeTemplate]: {
        ...currentTemplate,
        subject
      }
    }));
  };

  const handleHtmlChange = (html: string) => {
    setEditedTemplates(prev => ({
      ...prev,
      [activeTemplate]: {
        ...currentTemplate,
        html
      }
    }));
  };

  const handleReset = () => {
    setEditedTemplates(prev => ({
      ...prev,
      [activeTemplate]: DEFAULT_TEMPLATES[activeTemplate]
    }));
  };

  const handleSave = () => {
    onSave(editedTemplates);
  };

  const getPreviewHtml = () => {
    let html = currentTemplate.html;
    // Replace variables with sample data for preview
    const sampleData: Record<string, string> = {
      shop_name: centroName,
      logo_url: centroLogo || "",
      customer_name: "Mario Rossi",
      customer_email: "mario.rossi@example.com",
      password: "12345678",
      login_url: "#",
      dashboard_url: "#",
      loyalty_url: "#",
      shop_address: "Via Roma 123, Milano",
      shop_phone: "+39 02 1234567",
      shop_email: "info@example.com",
      card_number: "LLC-AB12-CD34",
      expiry_date: "15 dicembre 2026",
      max_devices: "3",
      device_name: "iPhone 14 Pro",
      issue_description: "Schermo rotto",
      total_cost: "149.00",
      valid_until: "31 dicembre 2025",
      sign_url: "#",
      quote_number: "Q-2024-001",
      status: "In Riparazione",
      status_note: "Stiamo lavorando sul tuo dispositivo",
      tracking_url: "#",
      repair_notes: "Sostituzione display originale",
      final_cost: "149.00",
      parts_list: "Display iPhone 14 Pro, Adesivo frame"
    };

    Object.entries(sampleData).forEach(([key, value]) => {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
      html = html.replace(new RegExp(`{{#if ${key}}}`, 'g'), value ? '' : '<!--');
      html = html.replace(new RegExp(`{{/if}}`, 'g'), value ? '' : '-->');
    });

    return html;
  };

  const templateList: { key: keyof EmailTemplates; label: string; badge?: string }[] = [
    { key: "customer_welcome", label: "Benvenuto (con Tessera)" },
    { key: "customer_welcome_no_loyalty", label: "Benvenuto (senza Tessera)", badge: "Promozione" },
    { key: "loyalty_welcome", label: "Attivazione Tessera" },
    { key: "quote_sent", label: "Preventivo Inviato" },
    { key: "repair_status_update", label: "Aggiornamento Stato" },
    { key: "repair_completed", label: "Riparazione Completata" },
    { key: "order_received", label: "Ricambi Arrivati" }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Template Email
        </CardTitle>
        <CardDescription>
          Personalizza i template delle email inviate ai clienti
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Selector */}
        <div className="flex flex-wrap gap-2">
          {templateList.map(({ key, label, badge }) => (
            <Button
              key={key}
              variant={activeTemplate === key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTemplate(key)}
              className="relative"
            >
              {label}
              {badge && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {badge}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Current Template Info */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium">{currentTemplate.name}</h4>
          <p className="text-sm text-muted-foreground">{currentTemplate.description}</p>
        </div>

        {/* Variables Help */}
        <Collapsible open={showVariables} onOpenChange={setShowVariables}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Variabili disponibili
              </span>
              {showVariables ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 mt-2">
              <p className="text-sm text-muted-foreground mb-2">
                Usa queste variabili nel template (es: {"{{customer_name}}"})
              </p>
              <div className="flex flex-wrap gap-2">
                {currentTemplate.variables.map(v => (
                  <code key={v} className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded">
                    {`{{${v}}}`}
                  </code>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Subject */}
        <div className="space-y-2">
          <Label>Oggetto Email</Label>
          <Input
            value={currentTemplate.subject}
            onChange={(e) => handleSubjectChange(e.target.value)}
            placeholder="Oggetto dell'email..."
          />
        </div>

        {/* Editor Tabs */}
        <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as "code" | "preview")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="code" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              HTML
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Anteprima
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="code" className="mt-4">
            <Textarea
              value={currentTemplate.html}
              onChange={(e) => handleHtmlChange(e.target.value)}
              className="font-mono text-sm min-h-[400px]"
              placeholder="HTML del template..."
            />
          </TabsContent>
          
          <TabsContent value="preview" className="mt-4">
            <div className="border rounded-lg overflow-hidden bg-white">
              <iframe
                srcDoc={getPreviewHtml()}
                className="w-full h-[500px]"
                title="Email Preview"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Ripristina Default
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salva Template
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
