import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Smartphone, Tablet, Laptop, Monitor, HelpCircle, KeyRound, FileText, AlertCircle, ImageOff } from "lucide-react";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

interface DetectedDeviceInfo {
  type?: string;
  brand?: string;
  model?: string;
  fullName?: string;
  year?: string;
  imageUrl?: string;
  specs?: {
    ram?: string;
    storage?: string;
    display?: string;
    processor?: string;
    camera?: string;
  };
}

interface DeviceFormStepProps {
  deviceData: DeviceData;
  onChange: (data: DeviceData) => void;
  detectedDevice?: DetectedDeviceInfo | null;
}

const deviceTypes = [
  { value: "smartphone", label: "Smartphone", icon: Smartphone },
  { value: "tablet", label: "Tablet", icon: Tablet },
  { value: "laptop", label: "Laptop", icon: Laptop },
  { value: "pc", label: "PC", icon: Monitor },
  { value: "other", label: "Altro", icon: HelpCircle },
];

// Generate fallback image URLs based on brand
const getFallbackImageUrls = (brand: string, model: string): string[] => {
  const normalizedBrand = brand.toLowerCase().trim();
  const normalizedModel = model.toLowerCase().trim().replace(/\s+/g, '-');
  
  const urls: string[] = [];
  
  // Brand-specific logo fallbacks
  if (normalizedBrand.includes('apple') || normalizedBrand.includes('iphone') || normalizedBrand.includes('ipad')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg');
  } else if (normalizedBrand.includes('samsung')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg');
  } else if (normalizedBrand.includes('huawei')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/e/e8/Huawei_Logo.svg');
  } else if (normalizedBrand.includes('xiaomi')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_%282021-%29.svg');
  } else if (normalizedBrand.includes('oppo')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/0/0a/OPPO_LOGO_2019.svg');
  } else if (normalizedBrand.includes('oneplus')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/d/d6/OnePlus_logo.svg');
  } else if (normalizedBrand.includes('google') || normalizedBrand.includes('pixel')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg');
  } else if (normalizedBrand.includes('sony')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg');
  } else if (normalizedBrand.includes('lg')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/2/20/LG_symbol.svg');
  } else if (normalizedBrand.includes('motorola')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/4/45/Motorola-logo.svg');
  } else if (normalizedBrand.includes('nokia')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/0/02/Nokia_wordmark.svg');
  } else if (normalizedBrand.includes('asus')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/d/d9/Asus_logo.svg');
  } else if (normalizedBrand.includes('lenovo')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/b/b8/Lenovo_logo_2015.svg');
  } else if (normalizedBrand.includes('hp')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/a/ad/HP_logo_2012.svg');
  } else if (normalizedBrand.includes('dell')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/8/82/Dell_Logo.png');
  } else if (normalizedBrand.includes('acer')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/0/00/Acer_2011.svg');
  }
  
  return urls;
};

export const DeviceFormStep = ({ deviceData, onChange, detectedDevice }: DeviceFormStepProps) => {
  const [imageError, setImageError] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  
  const hasDeviceInfo = detectedDevice && (detectedDevice.imageUrl || detectedDevice.specs || detectedDevice.year);
  
  // Reset image error when detectedDevice changes
  useEffect(() => {
    setImageError(false);
    setFallbackIndex(0);
    setCurrentImageUrl(detectedDevice?.imageUrl || null);
  }, [detectedDevice?.imageUrl]);
  
  const handleImageError = () => {
    const fallbacks = getFallbackImageUrls(deviceData.brand, deviceData.model);
    if (fallbackIndex < fallbacks.length) {
      setCurrentImageUrl(fallbacks[fallbackIndex]);
      setFallbackIndex(prev => prev + 1);
    } else {
      setImageError(true);
    }
  };

  // Get device type icon as fallback
  const getDeviceIcon = () => {
    const deviceType = deviceTypes.find(t => t.value === deviceData.device_type);
    const Icon = deviceType?.icon || Smartphone;
    return <Icon className="h-10 w-10 text-muted-foreground" />;
  };
  
  return (
    <div className="space-y-4">
      {/* Device Image and Specs from AI - Show only if we have detected info */}
      {hasDeviceInfo && (
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex gap-4">
            {/* Device Image */}
            <div className="flex-shrink-0">
              {currentImageUrl && !imageError ? (
                <div className="relative">
                  <img
                    src={currentImageUrl}
                    alt={`${deviceData.brand} ${deviceData.model}`}
                    className="h-24 w-24 object-contain rounded-lg bg-white p-2"
                    onError={handleImageError}
                  />
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 bg-primary text-primary-foreground"
                  >
                    AI
                  </Badge>
                </div>
              ) : (
                <div className="h-24 w-24 rounded-lg bg-muted flex flex-col items-center justify-center gap-1">
                  {getDeviceIcon()}
                  <span className="text-[8px] text-muted-foreground uppercase font-medium">
                    {deviceData.brand || 'Device'}
                  </span>
                </div>
              )}
            </div>
            
            {/* Device Details */}
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <h3 className="font-semibold text-sm truncate">
                  {detectedDevice.fullName || `${deviceData.brand} ${deviceData.model}`}
                </h3>
                {detectedDevice.year && detectedDevice.year !== "N/A" && (
                  <p className="text-xs text-muted-foreground">Anno: {detectedDevice.year}</p>
                )}
              </div>
              
              {/* Specs Grid */}
              {detectedDevice.specs && (
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {detectedDevice.specs.ram && detectedDevice.specs.ram !== "N/A" && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">RAM:</span>
                      <span className="text-[10px] font-medium truncate">{detectedDevice.specs.ram}</span>
                    </div>
                  )}
                  {detectedDevice.specs.storage && detectedDevice.specs.storage !== "N/A" && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">Storage:</span>
                      <span className="text-[10px] font-medium truncate">{detectedDevice.specs.storage}</span>
                    </div>
                  )}
                  {detectedDevice.specs.display && detectedDevice.specs.display !== "N/A" && (
                    <div className="flex items-center gap-1 col-span-2">
                      <span className="text-[10px] text-muted-foreground">Display:</span>
                      <span className="text-[10px] font-medium truncate">{detectedDevice.specs.display}</span>
                    </div>
                  )}
                  {detectedDevice.specs.processor && detectedDevice.specs.processor !== "N/A" && (
                    <div className="flex items-center gap-1 col-span-2">
                      <span className="text-[10px] text-muted-foreground">CPU:</span>
                      <span className="text-[10px] font-medium truncate">{detectedDevice.specs.processor}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

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