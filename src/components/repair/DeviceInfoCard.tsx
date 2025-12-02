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
      <Card className="p-4 md:p-6 bg-gradient-to-br from-background to-secondary/20 border-primary/20">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 md:gap-6">
          {/* Device Image or Icon */}
          <div className="flex-shrink-0">
            {deviceInfo.imageUrl ? (
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                <img
                  src={deviceInfo.imageUrl}
                  alt={deviceInfo.fullName || `${deviceInfo.brand} ${deviceInfo.model}`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
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
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-lg bg-secondary/50 flex items-center justify-center">
                <DeviceIcon type={deviceInfo.type} className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20" />
              </div>
            )}
          </div>

          {/* Device Information */}
          <div className="flex-1 w-full space-y-3 md:space-y-4 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
                  <h3 className="text-base md:text-xl font-bold text-foreground">
                    Dispositivo Riconosciuto
                  </h3>
                </div>
                <p className="text-lg md:text-2xl font-semibold text-primary break-words">
                  {deviceInfo.fullName || `${deviceInfo.brand} ${deviceInfo.model}`}
                </p>
                {deviceInfo.year && (
                  <p className="text-xs md:text-sm text-muted-foreground">Anno: {deviceInfo.year}</p>
                )}
              </div>
              {deviceInfo.confidence && (
                <Badge variant="outline" className={`${getConfidenceColor(deviceInfo.confidence)} text-xs whitespace-nowrap`}>
                  <Sparkles className="h-3 w-3 mr-1" />
                  {deviceInfo.confidence}
                </Badge>
              )}
            </div>

            {/* Specifications */}
            {deviceInfo.specs && (
              <div className="grid grid-cols-2 gap-2 md:gap-3 text-left">
                {deviceInfo.specs.display && (
                  <div className="text-xs md:text-sm">
                    <span className="text-muted-foreground block">Display:</span>
                    <span className="font-medium break-words">{deviceInfo.specs.display}</span>
                  </div>
                )}
                {deviceInfo.specs.storage && (
                  <div className="text-xs md:text-sm">
                    <span className="text-muted-foreground block">Storage:</span>
                    <span className="font-medium">{deviceInfo.specs.storage}</span>
                  </div>
                )}
                {deviceInfo.specs.ram && (
                  <div className="text-xs md:text-sm">
                    <span className="text-muted-foreground block">RAM:</span>
                    <span className="font-medium">{deviceInfo.specs.ram}</span>
                  </div>
                )}
                {deviceInfo.specs.processor && (
                  <div className="text-xs md:text-sm">
                    <span className="text-muted-foreground block">Processore:</span>
                    <span className="font-medium break-words">{deviceInfo.specs.processor}</span>
                  </div>
                )}
                {deviceInfo.specs.camera && (
                  <div className="text-xs md:text-sm col-span-2">
                    <span className="text-muted-foreground block">Camera:</span>
                    <span className="font-medium break-words">
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
            <div className="grid grid-cols-1 gap-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="detected-imei" className="text-xs md:text-sm font-medium">
                  IMEI {deviceInfo.imei ? "(Rilevato)" : ""}
                </Label>
                <Input
                  id="detected-imei"
                  value={imei}
                  onChange={(e) => setImei(e.target.value)}
                  disabled={!editMode}
                  placeholder="Non rilevato"
                  className={`h-9 text-sm ${deviceInfo.imei ? "border-green-500/50" : ""}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="detected-serial" className="text-xs md:text-sm font-medium">
                  Numero Seriale {deviceInfo.serial ? "(Rilevato)" : ""}
                </Label>
                <Input
                  id="detected-serial"
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  disabled={!editMode}
                  placeholder="Non rilevato"
                  className={`h-9 text-sm ${deviceInfo.serial ? "border-green-500/50" : ""}`}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              {editMode ? (
                <>
                  <Button onClick={handleConfirm} className="bg-gradient-primary h-10 text-sm">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Conferma
                  </Button>
                  <Button variant="outline" onClick={() => setEditMode(false)} className="h-10 text-sm">
                    Annulla
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={handleConfirm} className="bg-gradient-primary h-10 text-sm flex-1 sm:flex-initial">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Conferma e Procedi
                  </Button>
                  <Button variant="outline" onClick={() => setEditMode(true)} className="h-10 text-sm flex-1 sm:flex-initial">
                    <Edit2 className="mr-2 h-4 w-4" />
                    Modifica
                  </Button>
                  <Button variant="ghost" onClick={onEdit} className="h-10 text-sm">
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
