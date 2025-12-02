import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Smartphone, Tablet, Laptop, Monitor, HelpCircle, KeyRound, FileText, AlertCircle } from "lucide-react";

interface DeviceData {
  device_type: string;
  brand: string;
  model: string;
  serial_number: string;
  imei: string;
  password: string;
  reported_issue: string;
  initial_condition: string;
}

interface DeviceFormStepProps {
  deviceData: DeviceData;
  onChange: (data: DeviceData) => void;
}

const deviceTypes = [
  { value: "smartphone", label: "Smartphone", icon: Smartphone },
  { value: "tablet", label: "Tablet", icon: Tablet },
  { value: "laptop", label: "Laptop", icon: Laptop },
  { value: "pc", label: "PC", icon: Monitor },
  { value: "other", label: "Altro", icon: HelpCircle },
];

export const DeviceFormStep = ({ deviceData, onChange }: DeviceFormStepProps) => {
  return (
    <div className="space-y-4">
      {/* Device Type Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Smartphone className="h-3.5 w-3.5 text-primary" />
          Tipo Dispositivo *
        </Label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {deviceTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = deviceData.device_type === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => onChange({ ...deviceData, device_type: type.value })}
                className={`
                  flex flex-col items-center justify-center p-2.5 rounded-lg border-2 transition-all
                  ${isSelected 
                    ? "border-primary bg-primary/10 text-primary" 
                    : "border-border bg-card hover:border-primary/50 hover:bg-muted/50 text-muted-foreground"
                  }
                `}
              >
                <Icon className={`h-5 w-5 mb-1 ${isSelected ? "text-primary" : ""}`} />
                <span className="text-[10px] font-medium">{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Brand & Model */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="device-brand" className="text-xs font-medium">Marca *</Label>
          <Input
            id="device-brand"
            required
            value={deviceData.brand}
            onChange={(e) => onChange({ ...deviceData, brand: e.target.value })}
            className="h-10"
            placeholder="es. Apple"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="device-model" className="text-xs font-medium">Modello *</Label>
          <Input
            id="device-model"
            required
            value={deviceData.model}
            onChange={(e) => onChange({ ...deviceData, model: e.target.value })}
            className="h-10"
            placeholder="es. iPhone 15"
          />
        </div>
      </div>

      {/* Technical Info - Collapsible on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="device-serial" className="text-xs font-medium text-muted-foreground">
            N. Seriale
          </Label>
          <Input
            id="device-serial"
            value={deviceData.serial_number}
            onChange={(e) => onChange({ ...deviceData, serial_number: e.target.value })}
            className="h-9 text-sm"
            placeholder="Opzionale"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="device-imei" className="text-xs font-medium text-muted-foreground">
            IMEI
          </Label>
          <Input
            id="device-imei"
            value={deviceData.imei}
            onChange={(e) => onChange({ ...deviceData, imei: e.target.value })}
            className="h-9 text-sm"
            placeholder="Opzionale"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="device-password" className="text-xs font-medium flex items-center gap-1 text-muted-foreground">
            <KeyRound className="h-3 w-3" />
            Password/PIN
          </Label>
          <Input
            id="device-password"
            type="password"
            value={deviceData.password}
            onChange={(e) => onChange({ ...deviceData, password: e.target.value })}
            className="h-9 text-sm"
            placeholder="Per sblocco"
          />
        </div>
      </div>

      {/* Issue Description */}
      <div className="space-y-1.5">
        <Label htmlFor="reported-issue" className="text-sm font-medium flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
          Problema Segnalato *
        </Label>
        <Textarea
          id="reported-issue"
          required
          rows={2}
          value={deviceData.reported_issue}
          onChange={(e) => onChange({ ...deviceData, reported_issue: e.target.value })}
          className="resize-none text-sm"
          placeholder="Descrivi il problema riscontrato..."
        />
      </div>

      {/* Initial Condition */}
      <div className="space-y-1.5">
        <Label htmlFor="initial-condition" className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
          <FileText className="h-3 w-3" />
          Condizioni Iniziali
        </Label>
        <Textarea
          id="initial-condition"
          rows={2}
          value={deviceData.initial_condition}
          onChange={(e) => onChange({ ...deviceData, initial_condition: e.target.value })}
          className="resize-none text-sm"
          placeholder="Graffi, ammaccature, ecc. (opzionale)"
        />
      </div>
    </div>
  );
};
