import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export const DeviceFormStep = ({ deviceData, onChange }: DeviceFormStepProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="device-type">Tipo Dispositivo *</Label>
          <Select
            value={deviceData.device_type}
            onValueChange={(value) => onChange({ ...deviceData, device_type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="smartphone">Smartphone</SelectItem>
              <SelectItem value="tablet">Tablet</SelectItem>
              <SelectItem value="pc">PC</SelectItem>
              <SelectItem value="laptop">Laptop</SelectItem>
              <SelectItem value="other">Altro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="device-brand">Marca *</Label>
          <Input
            id="device-brand"
            required
            value={deviceData.brand}
            onChange={(e) => onChange({ ...deviceData, brand: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="device-model">Modello *</Label>
          <Input
            id="device-model"
            required
            value={deviceData.model}
            onChange={(e) => onChange({ ...deviceData, model: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="device-serial">Numero Seriale</Label>
          <Input
            id="device-serial"
            value={deviceData.serial_number}
            onChange={(e) => onChange({ ...deviceData, serial_number: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="device-imei">IMEI</Label>
          <Input
            id="device-imei"
            value={deviceData.imei}
            onChange={(e) => onChange({ ...deviceData, imei: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="device-password">Password/PIN</Label>
          <Input
            id="device-password"
            type="password"
            value={deviceData.password}
            onChange={(e) => onChange({ ...deviceData, password: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reported-issue">Problema Segnalato *</Label>
        <Textarea
          id="reported-issue"
          required
          rows={3}
          value={deviceData.reported_issue}
          onChange={(e) => onChange({ ...deviceData, reported_issue: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="initial-condition">Condizioni Iniziali</Label>
        <Textarea
          id="initial-condition"
          rows={2}
          value={deviceData.initial_condition}
          onChange={(e) => onChange({ ...deviceData, initial_condition: e.target.value })}
        />
      </div>
    </div>
  );
};
