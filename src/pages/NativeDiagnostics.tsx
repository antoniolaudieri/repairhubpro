import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import {
  Battery,
  HardDrive,
  Wifi,
  Shield,
  ChevronDown,
  Zap,
  Cpu,
  MemoryStick,
  Signal,
  Globe,
  Thermometer,
  Monitor,
  Fingerprint,
  MapPin,
  Activity,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNativeDeviceInfo } from "@/hooks/useNativeDeviceInfo";

interface NativeDiagnosticsProps {
  user: User;
}

export const NativeDiagnostics = ({ user }: NativeDiagnosticsProps) => {
  const deviceData = useNativeDeviceInfo();

  const getStatusColor = (value: number | null, thresholds: { good: number; warning: number }) => {
    if (value === null) return "text-muted-foreground";
    if (value >= thresholds.good) return "text-green-500";
    if (value >= thresholds.warning) return "text-yellow-500";
    return "text-red-500";
  };

  const getInverseStatusColor = (value: number | null, thresholds: { good: number; warning: number }) => {
    if (value === null) return "text-muted-foreground";
    if (value <= thresholds.good) return "text-green-500";
    if (value <= thresholds.warning) return "text-yellow-500";
    return "text-red-500";
  };

  const getBatteryHealthLabel = (health: string | null) => {
    switch (health) {
      case "good": return { label: "Buona", color: "text-green-500" };
      case "overheat": return { label: "Surriscaldata", color: "text-red-500" };
      case "dead": return { label: "Guasta", color: "text-red-500" };
      case "cold": return { label: "Fredda", color: "text-blue-500" };
      default: return { label: "Sconosciuto", color: "text-muted-foreground" };
    }
  };

  const sections = [
    {
      id: "battery",
      title: "Batteria",
      icon: Battery,
      iconColor: "text-green-500",
      status: deviceData.batteryLevel !== null 
        ? deviceData.batteryLevel >= 50 ? "good" : deviceData.batteryLevel >= 25 ? "warning" : "critical"
        : "unknown",
      content: (
        <div className="space-y-4">
          {/* Battery Level */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Livello</span>
            <span className={`font-bold ${getStatusColor(deviceData.batteryLevel, { good: 50, warning: 25 })}`}>
              {deviceData.batteryLevel !== null ? `${Math.round(deviceData.batteryLevel)}%` : "--"}
            </span>
          </div>
          {deviceData.batteryLevel !== null && (
            <Progress value={deviceData.batteryLevel} className="h-2" />
          )}
          
          {/* Battery Health */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Salute</span>
            <span className={`font-medium ${getBatteryHealthLabel(deviceData.batteryHealth).color}`}>
              {getBatteryHealthLabel(deviceData.batteryHealth).label}
            </span>
          </div>
          
          {/* Charging Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Stato</span>
            <Badge variant={deviceData.isCharging ? "default" : "secondary"}>
              <Zap className="h-3 w-3 mr-1" />
              {deviceData.isCharging ? "In carica" : "Non in carica"}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      id: "memory",
      title: "Memoria",
      icon: HardDrive,
      iconColor: "text-blue-500",
      status: deviceData.storagePercentUsed !== null
        ? deviceData.storagePercentUsed <= 70 ? "good" : deviceData.storagePercentUsed <= 85 ? "warning" : "critical"
        : "unknown",
      content: (
        <div className="space-y-4">
          {/* Storage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Storage
              </span>
              <span className={`font-bold ${getInverseStatusColor(deviceData.storagePercentUsed, { good: 70, warning: 85 })}`}>
                {deviceData.storagePercentUsed !== null ? `${deviceData.storagePercentUsed.toFixed(1)}%` : "--"} usato
              </span>
            </div>
            {deviceData.storagePercentUsed !== null && (
              <Progress value={deviceData.storagePercentUsed} className="h-2" />
            )}
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{deviceData.storageUsedGb?.toFixed(1) || "--"} GB usati</span>
              <span>{deviceData.storageTotalGb?.toFixed(1) || "--"} GB totali</span>
            </div>
          </div>
          
          {/* RAM */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <MemoryStick className="h-4 w-4" />
                RAM
              </span>
              <span className={`font-bold ${getInverseStatusColor(deviceData.ramPercentUsed, { good: 70, warning: 85 })}`}>
                {deviceData.ramPercentUsed !== null ? `${deviceData.ramPercentUsed.toFixed(0)}%` : "--"} usata
              </span>
            </div>
            {deviceData.ramPercentUsed !== null && (
              <Progress value={deviceData.ramPercentUsed} className="h-2" />
            )}
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{deviceData.ramAvailableMb ? Math.round(deviceData.ramAvailableMb) : "--"} MB liberi</span>
              <span>{deviceData.ramTotalMb ? Math.round(deviceData.ramTotalMb) : "--"} MB totali</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "network",
      title: "Connettività",
      icon: Wifi,
      iconColor: "text-purple-500",
      status: deviceData.networkConnected && deviceData.onlineStatus ? "good" : "critical",
      content: (
        <div className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Stato</span>
            <Badge variant={deviceData.networkConnected ? "default" : "destructive"}>
              {deviceData.networkConnected ? "Connesso" : "Disconnesso"}
            </Badge>
          </div>
          
          {/* Network Type */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tipo rete</span>
            <span className="font-medium">{deviceData.networkType || "--"}</span>
          </div>
          
          {/* Connection Speed */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Signal className="h-4 w-4" />
              Velocità effettiva
            </span>
            <span className="font-medium uppercase">{deviceData.connectionEffectiveType || "--"}</span>
          </div>
          
          {/* Bandwidth */}
          {deviceData.connectionDownlink !== null && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Bandwidth</span>
              <span className="font-medium">{deviceData.connectionDownlink} Mbps</span>
            </div>
          )}
          
          {/* Latency */}
          {deviceData.connectionRtt !== null && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Latenza</span>
              <span className={`font-medium ${
                deviceData.connectionRtt < 100 ? "text-green-500" :
                deviceData.connectionRtt < 300 ? "text-yellow-500" : "text-red-500"
              }`}>
                {deviceData.connectionRtt} ms
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "security",
      title: "Sicurezza",
      icon: Shield,
      iconColor: "text-amber-500",
      status: "good",
      content: (
        <div className="space-y-4">
          {/* Device Info */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Dispositivo
            </span>
            <span className="font-medium text-right text-sm">
              {deviceData.deviceManufacturer} {deviceData.deviceModel}
            </span>
          </div>
          
          {/* OS Version */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Sistema operativo</span>
            <span className="font-medium">{deviceData.osVersion || "--"}</span>
          </div>
          
          {/* CPU */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              CPU
            </span>
            <span className="font-medium">{deviceData.cpuCores || "--"} core</span>
          </div>
          
          {/* Device Memory */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Memoria dispositivo</span>
            <span className="font-medium">{deviceData.deviceMemoryGb || "--"} GB</span>
          </div>
          
          {/* Screen */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Schermo</span>
            <span className="font-medium">
              {deviceData.screenWidth}x{deviceData.screenHeight}
            </span>
          </div>
          
          {/* Touch Support */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Fingerprint className="h-4 w-4" />
              Touch points
            </span>
            <span className="font-medium">{deviceData.maxTouchPoints || "--"}</span>
          </div>
          
          {/* Location */}
          {(deviceData.latitude !== null || deviceData.longitude !== null) && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Posizione
              </span>
              <Badge variant="secondary">Disponibile</Badge>
            </div>
          )}
        </div>
      ),
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "good":
        return <Badge className="bg-green-500 text-white"><CheckCircle className="h-3 w-3 mr-1" />OK</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500 text-white"><AlertTriangle className="h-3 w-3 mr-1" />Attenzione</Badge>;
      case "critical":
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Critico</Badge>;
      default:
        return <Badge variant="secondary">--</Badge>;
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 pb-24 space-y-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-2"
        >
          <h1 className="text-xl font-bold">Diagnostica</h1>
          <Badge variant="outline" className="text-xs">
            <Activity className="h-3 w-3 mr-1" />
            Tempo reale
          </Badge>
        </motion.div>

        {/* Diagnostic Sections */}
        <Accordion type="multiple" defaultValue={["battery", "memory", "network", "security"]} className="space-y-3">
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <AccordionItem value={section.id} className="border rounded-xl overflow-hidden bg-card">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl bg-muted flex items-center justify-center ${section.iconColor}`}>
                        <section.icon className="h-5 w-5" />
                      </div>
                      <span className="font-semibold">{section.title}</span>
                    </div>
                    {getStatusBadge(section.status)}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {section.content}
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>

        {/* Raw Data Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Info aggiuntive</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Timezone</span>
                <span>{deviceData.timezone || "--"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lingua</span>
                <span>{deviceData.language || "--"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Orientamento</span>
                <span className="capitalize">{deviceData.orientation || "--"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pixel Ratio</span>
                <span>{deviceData.pixelRatio || "--"}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </ScrollArea>
  );
};
