import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { User, Phone, Mail, MapPin, FileText, Calendar, Megaphone } from "lucide-react";

interface CustomerData {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  birth_date: string;
  marketing_consent: boolean;
}

interface CustomerFormStepProps {
  customerData: CustomerData;
  onChange: (data: CustomerData) => void;
  readOnly?: boolean;
}

export const CustomerFormStep = ({ customerData, onChange, readOnly = false }: CustomerFormStepProps) => {
  return (
    <div className="space-y-3">
      {/* Name & Phone - Most important, always visible */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="customer-name" className="text-xs font-medium flex items-center gap-1.5">
            <User className="h-3 w-3 text-primary" />
            Nome Completo *
          </Label>
          <Input
            id="customer-name"
            required
            value={customerData.name}
            onChange={(e) => onChange({ ...customerData, name: e.target.value })}
            readOnly={readOnly}
            placeholder="Mario Rossi"
            className={`h-10 ${readOnly ? "bg-muted" : ""}`}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="customer-phone" className="text-xs font-medium flex items-center gap-1.5">
            <Phone className="h-3 w-3 text-primary" />
            Telefono *
          </Label>
          <Input
            id="customer-phone"
            type="tel"
            required
            value={customerData.phone}
            onChange={(e) => onChange({ ...customerData, phone: e.target.value })}
            readOnly={readOnly}
            placeholder="+39 333 1234567"
            className={`h-10 ${readOnly ? "bg-muted" : ""}`}
          />
        </div>
      </div>

      {/* Email & Birth Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="customer-email" className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
            <Mail className="h-3 w-3" />
            Email
          </Label>
          <Input
            id="customer-email"
            type="email"
            value={customerData.email}
            onChange={(e) => onChange({ ...customerData, email: e.target.value })}
            readOnly={readOnly}
            placeholder="email@esempio.it"
            className={`h-9 text-sm ${readOnly ? "bg-muted" : ""}`}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="customer-birthdate" className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Data di Nascita
          </Label>
          <Input
            id="customer-birthdate"
            type="date"
            value={customerData.birth_date || ""}
            onChange={(e) => onChange({ ...customerData, birth_date: e.target.value })}
            readOnly={readOnly}
            className={`h-9 text-sm ${readOnly ? "bg-muted" : ""}`}
          />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label htmlFor="customer-address" className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-3 w-3" />
          Indirizzo
        </Label>
        <Input
          id="customer-address"
          value={customerData.address}
          onChange={(e) => onChange({ ...customerData, address: e.target.value })}
          readOnly={readOnly}
          placeholder="Via Roma, 1"
          className={`h-9 text-sm ${readOnly ? "bg-muted" : ""}`}
        />
      </div>

      {/* Marketing Consent */}
      {!readOnly && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Consenso Marketing</p>
              <p className="text-xs text-muted-foreground">Ricevi promozioni e comunicazioni via email</p>
            </div>
          </div>
          <Switch
            checked={customerData.marketing_consent ?? true}
            onCheckedChange={(checked) => onChange({ ...customerData, marketing_consent: checked })}
          />
        </div>
      )}

      {/* Notes - Optional */}
      <div className="space-y-1.5">
        <Label htmlFor="customer-notes" className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
          <FileText className="h-3 w-3" />
          Note Cliente
        </Label>
        <Textarea
          id="customer-notes"
          rows={2}
          value={customerData.notes}
          onChange={(e) => onChange({ ...customerData, notes: e.target.value })}
          readOnly={readOnly}
          placeholder="Note aggiuntive (opzionale)"
          className={`resize-none text-sm ${readOnly ? "bg-muted" : ""}`}
        />
      </div>
    </div>
  );
};
