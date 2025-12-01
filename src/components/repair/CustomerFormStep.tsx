import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CustomerData {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

interface CustomerFormStepProps {
  customerData: CustomerData;
  onChange: (data: CustomerData) => void;
  readOnly?: boolean;
}

export const CustomerFormStep = ({ customerData, onChange, readOnly = false }: CustomerFormStepProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <div className="space-y-2">
          <Label htmlFor="customer-name">Nome Completo *</Label>
          <Input
            id="customer-name"
            required
            value={customerData.name}
            onChange={(e) => onChange({ ...customerData, name: e.target.value })}
            readOnly={readOnly}
            className={readOnly ? "bg-muted" : ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-phone">Telefono *</Label>
          <Input
            id="customer-phone"
            type="tel"
            required
            value={customerData.phone}
            onChange={(e) => onChange({ ...customerData, phone: e.target.value })}
            readOnly={readOnly}
            className={readOnly ? "bg-muted" : ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-email">Email</Label>
          <Input
            id="customer-email"
            type="email"
            value={customerData.email}
            onChange={(e) => onChange({ ...customerData, email: e.target.value })}
            readOnly={readOnly}
            className={readOnly ? "bg-muted" : ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-address">Indirizzo</Label>
          <Input
            id="customer-address"
            value={customerData.address}
            onChange={(e) => onChange({ ...customerData, address: e.target.value })}
            readOnly={readOnly}
            className={readOnly ? "bg-muted" : ""}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="customer-notes">Note Cliente</Label>
        <Textarea
          id="customer-notes"
          rows={2}
          value={customerData.notes}
          onChange={(e) => onChange({ ...customerData, notes: e.target.value })}
          readOnly={readOnly}
          className={readOnly ? "bg-muted" : ""}
        />
      </div>
    </div>
  );
};
