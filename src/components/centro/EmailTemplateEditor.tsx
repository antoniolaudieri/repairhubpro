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
    description: "Email inviata ai nuovi clienti che hanno la tessera e la nostra app antivirus",
    subject: "Benvenuto su {{shop_name}} - Proteggi il tuo smartphone!",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background-color:#f8fafc;">
<div style="text-align:center;padding:24px;background:linear-gradient(135deg,#10b981,#059669);border-radius:16px;">
{{#if logo_url}}<img src="{{logo_url}}" alt="{{shop_name}}" style="max-height:60px;margin-bottom:12px;">{{/if}}
<h1 style="color:white;margin:0;font-size:24px;">Benvenuto in {{shop_name}}</h1>
<p style="color:#d1fae5;margin:8px 0 0 0;font-size:14px;">La tua sicurezza mobile inizia qui</p>
</div>

<div style="background:white;padding:24px;border-radius:12px;margin-top:20px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
<h2 style="color:#1f2937;margin:0 0 16px 0;font-size:20px;">Ciao {{customer_name}}!</h2>

<p style="color:#4b5563;line-height:1.6;margin:0 0 20px 0;">Grazie per aver scelto <strong>{{shop_name}}</strong>! Hai fatto la scelta giusta per proteggere il tuo smartphone.</p>

<div style="background:linear-gradient(135deg,#10b981,#059669);padding:20px;border-radius:12px;margin:20px 0;color:white;">
<h3 style="margin:0 0 12px 0;font-size:18px;">La Nostra App Antivirus Nativa</h3>
<p style="margin:0 0 12px 0;font-size:14px;line-height:1.5;">Scarica la nostra app GRATUITA per proteggere il tuo dispositivo:</p>
<ul style="margin:0 0 16px 0;padding-left:20px;font-size:14px;">
<li style="margin-bottom:6px;">Scansione antivirus e antimalware in tempo reale</li>
<li style="margin-bottom:6px;">Monitoraggio salute batteria e memoria</li>
<li style="margin-bottom:6px;">Notifiche intelligenti per la manutenzione</li>
<li style="margin-bottom:6px;">Protezione contro app dannose</li>
</ul>
</div>

<div style="background:#f0f9ff;border:1px solid #bae6fd;padding:16px;border-radius:8px;margin:20px 0;">
<h3 style="color:#0369a1;margin:0 0 12px 0;font-size:16px;">I tuoi dati di accesso</h3>
<p style="margin:0 0 8px 0;color:#1f2937;"><strong>Email:</strong> {{customer_email}}</p>
<p style="margin:0;color:#1f2937;"><strong>Password:</strong> {{password}}</p>
</div>

<p style="background:#fef3c7;padding:12px;border-radius:6px;color:#92400e;font-size:13px;margin:0 0 20px 0;">Ti consigliamo di cambiare la password al primo accesso.</p>

<div style="text-align:center;margin:24px 0;">
<a href="{{login_url}}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Accedi e Scarica l'App</a>
</div>
</div>

<div style="text-align:center;padding:20px;color:#6b7280;font-size:12px;">
<p style="margin:0;">{{shop_name}} {{#if shop_address}}- {{shop_address}}{{/if}}</p>
</div>
</body>
</html>`,
    variables: ["shop_name", "logo_url", "customer_name", "customer_email", "password", "login_url", "shop_address", "shop_phone", "shop_email"]
  },
  customer_welcome_no_loyalty: {
    id: "customer_welcome_no_loyalty",
    name: "Benvenuto Cliente (senza Tessera)",
    description: "Email promozionale per nuovi clienti - promuove app antivirus e tessera fedelta",
    subject: "Proteggi il tuo smartphone GRATIS con {{shop_name}}!",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background-color:#f8fafc;">
<div style="text-align:center;padding:24px;background:linear-gradient(135deg,#10b981,#059669);border-radius:16px;">
{{#if logo_url}}<img src="{{logo_url}}" alt="{{shop_name}}" style="max-height:60px;margin-bottom:12px;">{{/if}}
<h1 style="color:white;margin:0;font-size:24px;">Benvenuto in {{shop_name}}</h1>
<p style="color:#d1fae5;margin:8px 0 0 0;font-size:14px;">Protezione smartphone professionale</p>
</div>

<div style="background:white;padding:24px;border-radius:12px;margin-top:20px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
<h2 style="color:#1f2937;margin:0 0 16px 0;font-size:20px;">Ciao {{customer_name}}!</h2>

<p style="color:#4b5563;line-height:1.6;margin:0 0 20px 0;">Grazie per aver scelto <strong>{{shop_name}}</strong>! Abbiamo una sorpresa speciale per te.</p>

<div style="background:linear-gradient(135deg,#10b981,#059669);padding:24px;border-radius:12px;margin:20px 0;color:white;">
<h3 style="margin:0 0 8px 0;font-size:20px;">NOVITA: App Antivirus GRATUITA!</h3>
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;opacity:0.95;">Proteggi il tuo smartphone con la nostra app antivirus e antimalware proprietaria. Sviluppata dai nostri tecnici esperti!</p>
<ul style="margin:0 0 16px 0;padding-left:20px;font-size:14px;">
<li style="margin-bottom:8px;"><strong>Scansione in tempo reale</strong> - Rileva virus e malware</li>
<li style="margin-bottom:8px;"><strong>Monitoraggio salute</strong> - Batteria, memoria, prestazioni</li>
<li style="margin-bottom:8px;"><strong>Avvisi intelligenti</strong> - Ti avvisa prima che sia troppo tardi</li>
<li style="margin-bottom:8px;"><strong>100% GRATUITA</strong> - Nessun costo nascosto</li>
</ul>
<div style="text-align:center;">
<a href="{{login_url}}" style="display:inline-block;background:white;color:#059669;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Scarica Subito l'App</a>
</div>
</div>

<div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:24px;border-radius:12px;margin:20px 0;color:white;">
<h3 style="margin:0 0 12px 0;font-size:18px;">Passa al Livello PRO con la Tessera!</h3>
<p style="margin:0 0 16px 0;font-size:14px;line-height:1.5;">Con soli 30 euro/anno sblocchi vantaggi esclusivi:</p>
<ul style="margin:0 0 16px 0;padding-left:20px;font-size:14px;">
<li style="margin-bottom:6px;"><strong>Diagnosi a 10 euro</strong> invece di 15 euro</li>
<li style="margin-bottom:6px;"><strong>10% di sconto</strong> su tutte le riparazioni</li>
<li style="margin-bottom:6px;"><strong>Fino a 3 dispositivi</strong> protetti per un anno</li>
<li style="margin-bottom:6px;"><strong>Supporto prioritario</strong> via app</li>
</ul>
<div style="text-align:center;">
<a href="{{loyalty_url}}" style="display:inline-block;background:white;color:#d97706;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Attiva Tessera - 30 euro/anno</a>
</div>
</div>

<div style="background:#f0f9ff;border:1px solid #bae6fd;padding:16px;border-radius:8px;margin:20px 0;">
<h3 style="color:#0369a1;margin:0 0 12px 0;font-size:16px;">I tuoi dati di accesso</h3>
<p style="margin:0 0 8px 0;color:#1f2937;"><strong>Email:</strong> {{customer_email}}</p>
<p style="margin:0;color:#1f2937;"><strong>Password:</strong> {{password}}</p>
</div>

<p style="background:#fef3c7;padding:12px;border-radius:6px;color:#92400e;font-size:13px;margin:0;">Ti consigliamo di cambiare la password al primo accesso.</p>
</div>

<div style="text-align:center;padding:20px;color:#6b7280;font-size:12px;">
<p style="margin:0;">{{shop_name}} {{#if shop_address}}- {{shop_address}}{{/if}}</p>
</div>
</body>
</html>`,
    variables: ["shop_name", "logo_url", "customer_name", "customer_email", "password", "login_url", "loyalty_url", "shop_address", "shop_phone", "shop_email"]
  },
  loyalty_welcome: {
    id: "loyalty_welcome",
    name: "Benvenuto Tessera Fedelta",
    description: "Email inviata quando un cliente attiva la tessera fedelta",
    subject: "Benvenuto nel Club PRO di {{shop_name}}!",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background-color:#f8fafc;">
<div style="text-align:center;padding:24px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);border-radius:16px;">
{{#if logo_url}}<img src="{{logo_url}}" alt="{{shop_name}}" style="max-height:60px;margin-bottom:12px;">{{/if}}
<h1 style="color:white;margin:0;font-size:24px;">Benvenuto nel Club PRO!</h1>
<p style="color:#ddd6fe;margin:8px 0 0 0;font-size:14px;">Hai sbloccato tutti i vantaggi esclusivi</p>
</div>

<div style="background:white;padding:24px;border-radius:12px;margin-top:20px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
<h2 style="color:#1f2937;margin:0 0 16px 0;font-size:20px;">Complimenti {{customer_name}}!</h2>

<p style="color:#4b5563;line-height:1.6;margin:0 0 20px 0;">Hai attivato la <strong>Tessera Fedelta PRO</strong> di <strong>{{shop_name}}</strong>! Ora hai accesso a tutti i vantaggi esclusivi.</p>

<div style="background:linear-gradient(135deg,#10b981,#059669);padding:20px;border-radius:12px;margin:20px 0;color:white;">
<h3 style="margin:0 0 12px 0;font-size:18px;">App Antivirus Inclusa!</h3>
<p style="margin:0;font-size:14px;line-height:1.5;">Come membro PRO hai accesso GRATUITO alla nostra app antivirus e antimalware. Scaricala subito per proteggere il tuo dispositivo!</p>
</div>

<div style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:20px;border-radius:12px;margin:20px 0;color:white;">
<h3 style="margin:0 0 12px 0;font-size:16px;">I Tuoi Vantaggi PRO:</h3>
<ul style="margin:0;padding-left:20px;font-size:14px;">
<li style="margin-bottom:8px;"><strong>Diagnosi a 10 euro</strong> invece di 15 euro</li>
<li style="margin-bottom:8px;"><strong>10% di sconto</strong> su tutte le riparazioni</li>
<li style="margin-bottom:8px;"><strong>Fino a {{max_devices}} dispositivi</strong> protetti</li>
<li style="margin-bottom:8px;"><strong>App antivirus</strong> inclusa gratuitamente</li>
</ul>
</div>

<div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:20px 0;">
<p style="margin:0 0 8px 0;color:#1f2937;"><strong>Numero Tessera:</strong> {{card_number}}</p>
<p style="margin:0;color:#1f2937;"><strong>Valida fino al:</strong> {{expiry_date}}</p>
</div>

<div style="text-align:center;margin:24px 0;">
<a href="{{dashboard_url}}" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Accedi e Scarica l'App</a>
</div>
</div>

<div style="text-align:center;padding:20px;color:#6b7280;font-size:12px;">
<p style="margin:0;">{{shop_name}} - Tel: {{shop_phone}} - {{shop_email}}</p>
</div>
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
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background-color:#f8fafc;">
<div style="text-align:center;padding:24px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);border-radius:16px;">
{{#if logo_url}}<img src="{{logo_url}}" alt="{{shop_name}}" style="max-height:60px;margin-bottom:12px;">{{/if}}
<h1 style="color:white;margin:0;font-size:24px;">Preventivo Riparazione</h1>
</div>

<div style="background:white;padding:24px;border-radius:12px;margin-top:20px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
<p style="color:#4b5563;margin:0 0 16px 0;">Gentile <strong>{{customer_name}}</strong>,</p>

<p style="color:#4b5563;line-height:1.6;margin:0 0 20px 0;">Abbiamo preparato un preventivo per la riparazione del tuo dispositivo:</p>

<div style="background:#f8fafc;padding:20px;border-radius:8px;border:1px solid #e2e8f0;margin:20px 0;">
<p style="margin:0 0 8px 0;color:#1f2937;"><strong>Dispositivo:</strong> {{device_name}}</p>
<p style="margin:0 0 16px 0;color:#1f2937;"><strong>Problema:</strong> {{issue_description}}</p>
<p style="font-size:28px;color:#2563eb;margin:0 0 8px 0;font-weight:700;">{{total_cost}} euro</p>
<p style="color:#6b7280;font-size:13px;margin:0;">Valido fino al: {{valid_until}}</p>
</div>

<div style="text-align:center;margin:24px 0;">
<a href="{{sign_url}}" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Firma il Preventivo</a>
</div>

<p style="color:#6b7280;font-size:13px;text-align:center;margin:0;">Clicca sul pulsante per visualizzare i dettagli e firmare online.</p>
</div>

<div style="text-align:center;padding:20px;color:#6b7280;font-size:12px;">
<p style="margin:0;">{{shop_name}} - Tel: {{shop_phone}}</p>
</div>
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
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background-color:#f8fafc;">
<div style="text-align:center;padding:24px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);border-radius:16px;">
{{#if logo_url}}<img src="{{logo_url}}" alt="{{shop_name}}" style="max-height:60px;margin-bottom:12px;">{{/if}}
<h1 style="color:white;margin:0;font-size:24px;">Aggiornamento Riparazione</h1>
</div>

<div style="background:white;padding:24px;border-radius:12px;margin-top:20px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
<p style="color:#4b5563;margin:0 0 16px 0;">Gentile <strong>{{customer_name}}</strong>,</p>

<p style="color:#4b5563;line-height:1.6;margin:0 0 20px 0;">Ti informiamo che lo stato della tua riparazione e stato aggiornato:</p>

<div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:20px;border-radius:8px;margin:20px 0;">
<p style="margin:0 0 8px 0;color:#1f2937;"><strong>Dispositivo:</strong> {{device_name}}</p>
<p style="margin:0;color:#1f2937;"><strong>Nuovo stato:</strong> <span style="color:#16a34a;font-weight:bold;">{{status}}</span></p>
{{#if status_note}}<p style="margin:12px 0 0 0;color:#1f2937;"><strong>Note:</strong> {{status_note}}</p>{{/if}}
</div>

<div style="background:#f0f9ff;border:1px solid #bae6fd;padding:16px;border-radius:8px;margin:20px 0;">
<p style="margin:0;color:#0369a1;font-size:14px;"><strong>Suggerimento:</strong> Scarica la nostra app antivirus gratuita per ricevere notifiche in tempo reale sullo stato delle tue riparazioni!</p>
</div>

<div style="text-align:center;margin:24px 0;">
<a href="{{tracking_url}}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Segui la Riparazione</a>
</div>
</div>

<div style="text-align:center;padding:20px;color:#6b7280;font-size:12px;">
<p style="margin:0;">{{shop_name}} - Tel: {{shop_phone}}</p>
</div>
</body>
</html>`,
    variables: ["shop_name", "logo_url", "customer_name", "device_name", "status", "status_note", "tracking_url", "shop_phone"]
  },
  repair_completed: {
    id: "repair_completed",
    name: "Riparazione Completata",
    description: "Email inviata quando una riparazione e pronta per il ritiro",
    subject: "Riparazione completata - Pronta per il ritiro!",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background-color:#f8fafc;">
<div style="text-align:center;padding:24px;background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:16px;">
{{#if logo_url}}<img src="{{logo_url}}" alt="{{shop_name}}" style="max-height:60px;margin-bottom:12px;">{{/if}}
<h1 style="color:white;margin:0;font-size:24px;">Riparazione Completata!</h1>
</div>

<div style="background:white;padding:24px;border-radius:12px;margin-top:20px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
<p style="color:#4b5563;margin:0 0 16px 0;">Gentile <strong>{{customer_name}}</strong>,</p>

<p style="color:#4b5563;line-height:1.6;margin:0 0 20px 0;">Ottime notizie! La riparazione del tuo dispositivo e stata completata ed e pronta per il ritiro.</p>

<div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:20px;border-radius:8px;margin:20px 0;">
<p style="margin:0 0 8px 0;color:#1f2937;"><strong>Dispositivo:</strong> {{device_name}}</p>
<p style="margin:0 0 16px 0;color:#1f2937;"><strong>Lavori eseguiti:</strong> {{repair_notes}}</p>
<p style="font-size:24px;color:#16a34a;margin:0;font-weight:700;">Totale: {{final_cost}} euro</p>
</div>

<div style="background:#fef3c7;padding:16px;border-radius:8px;margin:20px 0;">
<p style="margin:0 0 8px 0;color:#92400e;"><strong>Dove ritirare:</strong></p>
<p style="margin:0 0 8px 0;color:#92400e;">{{shop_address}}</p>
<p style="margin:0;color:#92400e;"><strong>Telefono:</strong> {{shop_phone}}</p>
</div>

<div style="background:linear-gradient(135deg,#10b981,#059669);padding:16px;border-radius:8px;margin:20px 0;color:white;">
<p style="margin:0;font-size:14px;"><strong>Proteggi il tuo dispositivo!</strong> Scarica la nostra app antivirus gratuita per mantenere il tuo smartphone sicuro e performante.</p>
</div>
</div>

<div style="text-align:center;padding:20px;color:#6b7280;font-size:12px;">
<p style="margin:0;">{{shop_name}} - Ti aspettiamo!</p>
</div>
</body>
</html>`,
    variables: ["shop_name", "logo_url", "customer_name", "device_name", "repair_notes", "final_cost", "shop_address", "shop_phone"]
  },
  order_received: {
    id: "order_received",
    name: "Ricambi Arrivati",
    description: "Email inviata quando i ricambi ordinati sono arrivati",
    subject: "I ricambi per la tua riparazione sono arrivati!",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background-color:#f8fafc;">
<div style="text-align:center;padding:24px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);border-radius:16px;">
{{#if logo_url}}<img src="{{logo_url}}" alt="{{shop_name}}" style="max-height:60px;margin-bottom:12px;">{{/if}}
<h1 style="color:white;margin:0;font-size:24px;">Ricambi Arrivati!</h1>
</div>

<div style="background:white;padding:24px;border-radius:12px;margin-top:20px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
<p style="color:#4b5563;margin:0 0 16px 0;">Gentile <strong>{{customer_name}}</strong>,</p>

<p style="color:#4b5563;line-height:1.6;margin:0 0 20px 0;">Ti informiamo che i ricambi necessari per la riparazione del tuo dispositivo sono arrivati.</p>

<div style="background:#f5f3ff;border:1px solid #ddd6fe;padding:20px;border-radius:8px;margin:20px 0;">
<p style="margin:0 0 8px 0;color:#1f2937;"><strong>Dispositivo:</strong> {{device_name}}</p>
<p style="margin:0;color:#1f2937;"><strong>Ricambi ricevuti:</strong> {{parts_list}}</p>
</div>

<p style="color:#4b5563;line-height:1.6;margin:0 0 20px 0;">Procederemo con la riparazione e ti aggiorneremo appena sara completata.</p>

<div style="background:linear-gradient(135deg,#10b981,#059669);padding:16px;border-radius:8px;margin:20px 0;color:white;">
<p style="margin:0;font-size:14px;"><strong>Hai scaricato la nostra app?</strong> Ricevi notifiche in tempo reale sullo stato della riparazione e proteggi il tuo dispositivo con il nostro antivirus gratuito!</p>
</div>
</div>

<div style="text-align:center;padding:20px;color:#6b7280;font-size:12px;">
<p style="margin:0;">{{shop_name}} - Tel: {{shop_phone}}</p>
</div>
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
