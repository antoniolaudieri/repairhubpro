import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { DeviceIcon } from "./DeviceIcons";
import { CheckCircle, Edit2, Sparkles } from "lucide-react";
import { useState } from "react";

interface DeviceInfo {
  type: string;
  brand: string;
  model: string;
  imei?: string;
  serial?: string;
  confidence?: string;
  fullName?: string;
  year?: string;
  specs?: {
    ram?: string;
    storage?: string;
    display?: string;
    processor?: string;
    camera?: string | { main?: string; telephoto?: string; ultrawide?: string; front?: string };
  };
  imageUrl?: string;
}

interface DeviceInfoCardProps {
  deviceInfo: DeviceInfo;
  onConfirm: (updatedInfo: Partial<DeviceInfo>) => void;
  onEdit: () => void;
}

export const DeviceInfoCard = ({ deviceInfo, onConfirm, onEdit }: DeviceInfoCardProps) => {
  const [editMode, setEditMode] = useState(false);
  const [imei, setImei] = useState(deviceInfo.imei || "");
  const [serial, setSerial] = useState(deviceInfo.serial || "");

  const handleConfirm = () => {
    onConfirm({ imei, serial });
    setEditMode(false);
  };

  const getConfidenceColor = (confidence?: string) => {
    switch (confidence?.toLowerCase()) {
      case "alta":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "media":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "bassa":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="p-6 bg-gradient-to-br from-background to-secondary/20 border-primary/20">
        <div className="flex items-start gap-6">
          {/* Device Image or Icon */}
          <div className="flex-shrink-0">
            {deviceInfo.imageUrl ? (
              <div className="w-32 h-32 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                <img
                  src={deviceInfo.imageUrl}
                  alt={deviceInfo.fullName || `${deviceInfo.brand} ${deviceInfo.model}`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback to icon if image fails to load
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      e.currentTarget.style.display = "none";
                      parent.innerHTML = "";
                      const iconContainer = document.createElement("div");
                      iconContainer.className = "flex items-center justify-center w-full h-full";
                      parent.appendChild(iconContainer);
                    }
                  }}
                />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-lg bg-secondary/50 flex items-center justify-center">
                <DeviceIcon type={deviceInfo.type} className="h-20 w-20" />
              </div>
            )}
          </div>

          {/* Device Information */}
          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <h3 className="text-xl font-bold text-foreground">
                    Dispositivo Riconosciuto
                  </h3>
                </div>
                <p className="text-2xl font-semibold text-primary">
                  {deviceInfo.fullName || `${deviceInfo.brand} ${deviceInfo.model}`}
                </p>
                {deviceInfo.year && (
                  <p className="text-sm text-muted-foreground">Anno: {deviceInfo.year}</p>
                )}
              </div>
              {deviceInfo.confidence && (
                <Badge variant="outline" className={getConfidenceColor(deviceInfo.confidence)}>
                  <Sparkles className="h-3 w-3 mr-1" />
                  Confidenza: {deviceInfo.confidence}
                </Badge>
              )}
            </div>

            {/* Specifications */}
            {deviceInfo.specs && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {deviceInfo.specs.display && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Display:</span>
                    <span className="ml-2 font-medium">{deviceInfo.specs.display}</span>
                  </div>
                )}
                {deviceInfo.specs.storage && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Storage:</span>
                    <span className="ml-2 font-medium">{deviceInfo.specs.storage}</span>
                  </div>
                )}
                {deviceInfo.specs.ram && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">RAM:</span>
                    <span className="ml-2 font-medium">{deviceInfo.specs.ram}</span>
                  </div>
                )}
                {deviceInfo.specs.processor && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Processore:</span>
                    <span className="ml-2 font-medium">{deviceInfo.specs.processor}</span>
                  </div>
                )}
                {deviceInfo.specs.camera && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Camera:</span>
                    <span className="ml-2 font-medium">
                      {typeof deviceInfo.specs.camera === 'string' 
                        ? deviceInfo.specs.camera 
                        : deviceInfo.specs.camera.main || Object.values(deviceInfo.specs.camera).filter(Boolean).join(', ')
                      }
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* IMEI and Serial Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="detected-imei" className="text-sm font-medium">
                  IMEI {deviceInfo.imei ? "(Rilevato)" : ""}
                </Label>
                <Input
                  id="detected-imei"
                  value={imei}
                  onChange={(e) => setImei(e.target.value)}
                  disabled={!editMode}
                  placeholder="Non rilevato"
                  className={deviceInfo.imei ? "border-green-500/50" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detected-serial" className="text-sm font-medium">
                  Numero Seriale {deviceInfo.serial ? "(Rilevato)" : ""}
                </Label>
                <Input
                  id="detected-serial"
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  disabled={!editMode}
                  placeholder="Non rilevato"
                  className={deviceInfo.serial ? "border-green-500/50" : ""}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              {editMode ? (
                <>
                  <Button onClick={handleConfirm} className="bg-gradient-primary">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Conferma
                  </Button>
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    Annulla
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={handleConfirm} className="bg-gradient-primary">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Conferma e Procedi
                  </Button>
                  <Button variant="outline" onClick={() => setEditMode(true)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Modifica IMEI/Seriale
                  </Button>
                  <Button variant="ghost" onClick={onEdit}>
                    Riscansiona
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
