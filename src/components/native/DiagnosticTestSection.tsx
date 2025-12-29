import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  HardDrive,
  MemoryStick,
  Battery,
  Wifi,
  Signal,
  MapPin,
  Mic,
  Camera,
  Compass,
  Sun,
  Gauge,
  Eye,
  Fingerprint,
  Vibrate,
  Speaker,
  Bluetooth,
  Smartphone,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Play,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Monitor,
  Thermometer,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import DeviceDiagnostics, { SensorsInfo, AppStorageInfo } from "@/plugins/DeviceStoragePlugin";
import { useNativeDeviceInfo } from "@/hooks/useNativeDeviceInfo";

interface TestResult {
  status: "idle" | "testing" | "pass" | "fail" | "warning";
  message?: string;
  value?: any;
}

interface ComponentTest {
  id: string;
  name: string;
  icon: React.ElementType;
  category: "hardware" | "sensor" | "connectivity" | "system";
  description: string;
  testFn: () => Promise<TestResult>;
}

export const DiagnosticTestSection = () => {
  const deviceData = useNativeDeviceInfo();
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string[]>(["hardware", "sensor", "connectivity"]);
  const [installedApps, setInstalledApps] = useState<AppStorageInfo[] | null>(null);
  const [loadingApps, setLoadingApps] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  // Test functions
  const testBattery = async (): Promise<TestResult> => {
    try {
      const info = await DeviceDiagnostics.getBatteryAdvancedInfo();
      const level = Math.round(info.level * 100);
      if (info.health === "good" && level > 20) {
        return { status: "pass", message: `${level}% - Salute: ${info.health}`, value: info };
      } else if (level <= 20 || info.health !== "good") {
        return { status: "warning", message: `${level}% - Salute: ${info.health}`, value: info };
      }
      return { status: "pass", message: `${level}%`, value: info };
    } catch {
      return { status: "fail", message: "Non disponibile" };
    }
  };

  const testStorage = async (): Promise<TestResult> => {
    try {
      const info = await DeviceDiagnostics.getStorageInfo();
      if (info.percentUsed < 80) {
        return { status: "pass", message: `${info.availableGb.toFixed(1)} GB liberi (${info.percentUsed.toFixed(0)}% usato)`, value: info };
      } else if (info.percentUsed < 90) {
        return { status: "warning", message: `${info.availableGb.toFixed(1)} GB liberi (${info.percentUsed.toFixed(0)}% usato)`, value: info };
      }
      return { status: "fail", message: `Spazio insufficiente (${info.percentUsed.toFixed(0)}% usato)`, value: info };
    } catch {
      return { status: "fail", message: "Non disponibile" };
    }
  };

  const testRAM = async (): Promise<TestResult> => {
    try {
      const info = await DeviceDiagnostics.getRamInfo();
      if (info.percentUsed < 80) {
        return { status: "pass", message: `${info.availableMb.toFixed(0)} MB liberi (${info.percentUsed.toFixed(0)}% usata)`, value: info };
      } else if (info.percentUsed < 90) {
        return { status: "warning", message: `${info.availableMb.toFixed(0)} MB liberi (${info.percentUsed.toFixed(0)}% usata)`, value: info };
      }
      return { status: "fail", message: `RAM insufficiente (${info.percentUsed.toFixed(0)}% usata)`, value: info };
    } catch {
      return { status: "fail", message: "Non disponibile" };
    }
  };

  const testScreen = async (): Promise<TestResult> => {
    const width = window.screen.width;
    const height = window.screen.height;
    const pixelRatio = window.devicePixelRatio;
    if (width && height) {
      return { status: "pass", message: `${width}x${height} @${pixelRatio}x`, value: { width, height, pixelRatio } };
    }
    return { status: "fail", message: "Non disponibile" };
  };

  const testTouch = async (): Promise<TestResult> => {
    const maxPoints = navigator.maxTouchPoints || 0;
    const hasTouch = "ontouchstart" in window || maxPoints > 0;
    if (hasTouch && maxPoints >= 5) {
      return { status: "pass", message: `Multi-touch ${maxPoints} punti`, value: maxPoints };
    } else if (hasTouch) {
      return { status: "warning", message: `Touch limitato (${maxPoints} punti)`, value: maxPoints };
    }
    return { status: "fail", message: "Touch non supportato" };
  };

  const testCPU = async (): Promise<TestResult> => {
    const cores = navigator.hardwareConcurrency || 0;
    if (cores >= 4) {
      return { status: "pass", message: `${cores} core`, value: cores };
    } else if (cores >= 2) {
      return { status: "warning", message: `${cores} core`, value: cores };
    }
    return { status: "fail", message: "CPU info non disponibile" };
  };

  const testSensor = async (sensorType: string, sensorName: string): Promise<TestResult> => {
    try {
      const result = await DeviceDiagnostics.testSensor({ sensorType });
      if (result.working) {
        return { status: "pass", message: "Funzionante", value: result.value };
      }
      return { status: "fail", message: result.error || "Non funzionante" };
    } catch (e: any) {
      return { status: "fail", message: e.message || "Errore test" };
    }
  };

  const testNetwork = async (): Promise<TestResult> => {
    if (!navigator.onLine) {
      return { status: "fail", message: "Offline" };
    }
    const conn = (navigator as any).connection;
    if (conn) {
      const type = conn.effectiveType?.toUpperCase() || "Unknown";
      const downlink = conn.downlink || 0;
      if (type === "4G" || downlink >= 5) {
        return { status: "pass", message: `${type} - ${downlink} Mbps`, value: { type, downlink } };
      } else if (type === "3G" || downlink >= 1) {
        return { status: "warning", message: `${type} - ${downlink} Mbps`, value: { type, downlink } };
      }
      return { status: "fail", message: `Connessione lenta (${type})` };
    }
    return { status: "pass", message: "Online" };
  };

  const testGPS = async (): Promise<TestResult> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ status: "fail", message: "GPS non disponibile" });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            status: "pass",
            message: `Lat: ${pos.coords.latitude.toFixed(4)}, Lon: ${pos.coords.longitude.toFixed(4)}`,
            value: pos.coords,
          });
        },
        (err) => {
          resolve({ status: "fail", message: err.message });
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  };

  const testCamera = async (): Promise<TestResult> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((d) => d.kind === "videoinput");
      if (cameras.length > 0) {
        return { status: "pass", message: `${cameras.length} fotocamera/e`, value: cameras };
      }
      return { status: "fail", message: "Nessuna fotocamera" };
    } catch {
      return { status: "fail", message: "Accesso negato" };
    }
  };

  const testMicrophone = async (): Promise<TestResult> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter((d) => d.kind === "audioinput");
      if (mics.length > 0) {
        return { status: "pass", message: `${mics.length} microfono/i`, value: mics };
      }
      return { status: "fail", message: "Nessun microfono" };
    } catch {
      return { status: "fail", message: "Accesso negato" };
    }
  };

  const testSpeaker = async (): Promise<TestResult> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const speakers = devices.filter((d) => d.kind === "audiooutput");
      if (speakers.length > 0) {
        return { status: "pass", message: `${speakers.length} altoparlante/i`, value: speakers };
      }
      return { status: "warning", message: "Info non disponibile" };
    } catch {
      return { status: "warning", message: "Verifica manuale" };
    }
  };

  const testVibration = async (): Promise<TestResult> => {
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(100);
        return { status: "pass", message: "Vibrazione funzionante" };
      } catch {
        return { status: "fail", message: "Errore vibrazione" };
      }
    }
    return { status: "fail", message: "Vibrazione non supportata" };
  };

  // Component tests definition
  const componentTests: ComponentTest[] = [
    // Hardware
    { id: "battery", name: "Batteria", icon: Battery, category: "hardware", description: "Livello e salute batteria", testFn: testBattery },
    { id: "storage", name: "Storage", icon: HardDrive, category: "hardware", description: "Spazio di archiviazione", testFn: testStorage },
    { id: "ram", name: "RAM", icon: MemoryStick, category: "hardware", description: "Memoria disponibile", testFn: testRAM },
    { id: "cpu", name: "CPU", icon: Cpu, category: "hardware", description: "Processore", testFn: testCPU },
    { id: "screen", name: "Schermo", icon: Monitor, category: "hardware", description: "Risoluzione e densità", testFn: testScreen },
    { id: "touch", name: "Touch", icon: Fingerprint, category: "hardware", description: "Touchscreen multitouch", testFn: testTouch },
    // Sensors
    { id: "gps", name: "GPS", icon: MapPin, category: "sensor", description: "Localizzazione", testFn: testGPS },
    { id: "camera", name: "Fotocamera", icon: Camera, category: "sensor", description: "Fotocamera", testFn: testCamera },
    { id: "microphone", name: "Microfono", icon: Mic, category: "sensor", description: "Registrazione audio", testFn: testMicrophone },
    { id: "speaker", name: "Altoparlante", icon: Speaker, category: "sensor", description: "Uscita audio", testFn: testSpeaker },
    { id: "vibration", name: "Vibrazione", icon: Vibrate, category: "sensor", description: "Motore vibrazione", testFn: testVibration },
    { id: "accelerometer", name: "Accelerometro", icon: Compass, category: "sensor", description: "Movimento", testFn: () => testSensor("accelerometer", "Accelerometro") },
    { id: "gyroscope", name: "Giroscopio", icon: Compass, category: "sensor", description: "Orientamento", testFn: () => testSensor("gyroscope", "Giroscopio") },
    { id: "lightSensor", name: "Sensore Luce", icon: Sun, category: "sensor", description: "Luminosità ambiente", testFn: () => testSensor("light", "Luce") },
    { id: "proximity", name: "Prossimità", icon: Eye, category: "sensor", description: "Sensore prossimità", testFn: () => testSensor("proximity", "Prossimità") },
    // Connectivity
    { id: "network", name: "Rete", icon: Wifi, category: "connectivity", description: "Connessione dati", testFn: testNetwork },
  ];

  const categories = [
    { id: "hardware", name: "Hardware", icon: Cpu, color: "text-blue-500" },
    { id: "sensor", name: "Sensori", icon: Compass, color: "text-purple-500" },
    { id: "connectivity", name: "Connettività", icon: Wifi, color: "text-green-500" },
  ];

  const runTest = async (test: ComponentTest) => {
    setTestResults((prev) => ({ ...prev, [test.id]: { status: "testing" } }));
    const result = await test.testFn();
    setTestResults((prev) => ({ ...prev, [test.id]: result }));
    return result;
  };

  const runAllTests = async () => {
    setIsRunningAll(true);
    setTestResults({});

    for (const test of componentTests) {
      await runTest(test);
      await new Promise((r) => setTimeout(r, 150)); // Small delay for visual feedback
    }

    setIsRunningAll(false);
    
    const passed = Object.values(testResults).filter((r) => r.status === "pass").length;
    const failed = Object.values(testResults).filter((r) => r.status === "fail").length;
    
    toast.success(`Test completati: ${passed} OK, ${failed} problemi`);
  };

  const resetTests = () => {
    setTestResults({});
    toast.info("Test resettati");
  };

  const loadInstalledApps = async () => {
    if (!isNative) return;
    setLoadingApps(true);
    try {
      const result = await DeviceDiagnostics.getInstalledAppsStorage();
      setInstalledApps(result.apps);
    } catch (e) {
      console.error("Error loading apps:", e);
    } finally {
      setLoadingApps(false);
    }
  };

  const toggleCategory = (catId: string) => {
    setExpandedCategory((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  };

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "testing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "pass":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "fail":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  const getStatusBadge = (status: TestResult["status"]) => {
    switch (status) {
      case "testing":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Test...</Badge>;
      case "pass":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">OK</Badge>;
      case "fail":
        return <Badge variant="destructive">Errore</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Attenzione</Badge>;
      default:
        return <Badge variant="outline">Da testare</Badge>;
    }
  };

  const passedTests = Object.values(testResults).filter((r) => r.status === "pass").length;
  const failedTests = Object.values(testResults).filter((r) => r.status === "fail").length;
  const warningTests = Object.values(testResults).filter((r) => r.status === "warning").length;
  const totalTested = passedTests + failedTests + warningTests;
  const overallScore = totalTested > 0 ? Math.round((passedTests / totalTested) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Hero Stats Card */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500/20 via-purple-500/15 to-pink-500/10">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <motion.div
              className={`relative h-20 w-20 rounded-2xl flex items-center justify-center ${
                isRunningAll
                  ? "bg-gradient-to-br from-blue-500 to-purple-600"
                  : totalTested > 0
                  ? overallScore >= 70
                    ? "bg-gradient-to-br from-green-500 to-emerald-600"
                    : overallScore >= 40
                    ? "bg-gradient-to-br from-yellow-500 to-orange-500"
                    : "bg-gradient-to-br from-red-500 to-pink-500"
                  : "bg-gradient-to-br from-slate-400 to-slate-500"
              }`}
              animate={isRunningAll ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {isRunningAll ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Cpu className="h-10 w-10 text-white" />
                </motion.div>
              ) : totalTested > 0 ? (
                <span className="text-2xl font-bold text-white">{overallScore}%</span>
              ) : (
                <Smartphone className="h-10 w-10 text-white" />
              )}
              
              {isRunningAll && (
                <motion.div
                  className="absolute inset-0 rounded-2xl border-2 border-white/50"
                  animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </motion.div>

            <div className="flex-1">
              <h3 className="text-lg font-bold">
                {isRunningAll
                  ? "Test in corso..."
                  : totalTested > 0
                  ? `${passedTests}/${totalTested} test superati`
                  : "Test Componenti"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isRunningAll
                  ? `${totalTested}/${componentTests.length} completati`
                  : totalTested > 0
                  ? `${failedTests} problemi, ${warningTests} avvisi`
                  : "Verifica hardware, sensori e connettività"}
              </p>

              {isRunningAll && (
                <div className="mt-3">
                  <Progress value={(totalTested / componentTests.length) * 100} className="h-2" />
                </div>
              )}
            </div>
          </div>

          {/* Quick stats after tests */}
          {totalTested > 0 && !isRunningAll && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 grid grid-cols-3 gap-2"
            >
              {[
                { label: "Superati", count: passedTests, color: "text-green-500", icon: CheckCircle },
                { label: "Problemi", count: failedTests, color: "text-red-500", icon: XCircle },
                { label: "Avvisi", count: warningTests, color: "text-yellow-500", icon: AlertTriangle },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center p-2 bg-background/50 rounded-xl"
                >
                  <stat.icon className={`h-5 w-5 mx-auto mb-1 ${stat.color}`} />
                  <div className={`text-lg font-bold ${stat.color}`}>{stat.count}</div>
                  <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={runAllTests}
          disabled={isRunningAll}
          className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          {isRunningAll ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <Play className="h-5 w-5 mr-2" />
          )}
          {isRunningAll ? "Test in corso..." : "Avvia Test Completo"}
        </Button>
        {totalTested > 0 && (
          <Button onClick={resetTests} variant="outline" className="h-12 px-4">
            <RotateCcw className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Test Categories */}
      <div className="space-y-3">
        {categories.map((category) => {
          const categoryTests = componentTests.filter((t) => t.category === category.id);
          const categoryPassed = categoryTests.filter((t) => testResults[t.id]?.status === "pass").length;
          const categoryFailed = categoryTests.filter((t) => testResults[t.id]?.status === "fail").length;
          const categoryTested = categoryTests.filter((t) => testResults[t.id] && testResults[t.id].status !== "idle").length;

          return (
            <Collapsible
              key={category.id}
              open={expandedCategory.includes(category.id)}
              onOpenChange={() => toggleCategory(category.id)}
            >
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl bg-muted flex items-center justify-center ${category.color}`}>
                        <category.icon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">{category.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {categoryTests.length} componenti
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {categoryTested > 0 && (
                        <Badge
                          className={
                            categoryFailed > 0
                              ? "bg-red-500/10 text-red-500"
                              : "bg-green-500/10 text-green-500"
                          }
                        >
                          {categoryPassed}/{categoryTests.length}
                        </Badge>
                      )}
                      {expandedCategory.includes(category.id) ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardContent>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-2">
                    {categoryTests.map((test) => {
                      const result = testResults[test.id] || { status: "idle" };
                      return (
                        <motion.div
                          key={test.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            result.status === "pass"
                              ? "bg-green-500/5 border-green-500/20"
                              : result.status === "fail"
                              ? "bg-red-500/5 border-red-500/20"
                              : result.status === "warning"
                              ? "bg-yellow-500/5 border-yellow-500/20"
                              : "bg-muted/50 border-border"
                          }`}
                        >
                          <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center">
                            <test.icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{test.name}</p>
                            {result.status !== "idle" && result.message && (
                              <p className="text-xs text-muted-foreground truncate">
                                {result.message}
                              </p>
                            )}
                            {result.status === "idle" && (
                              <p className="text-xs text-muted-foreground">{test.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(result.status)}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => runTest(test)}
                              disabled={result.status === "testing" || isRunningAll}
                            >
                              Test
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Installed Apps Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">App Installate</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={loadInstalledApps}
              disabled={loadingApps || !isNative}
            >
              {loadingApps ? <Loader2 className="h-4 w-4 animate-spin" /> : "Carica"}
            </Button>
          </div>
          
          {!isNative && (
            <p className="text-sm text-muted-foreground">Disponibile solo su app nativa</p>
          )}
          
          {installedApps && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <p className="text-xs text-muted-foreground mb-2">{installedApps.length} app trovate</p>
              {installedApps.slice(0, 10).map((app) => (
                <div key={app.packageName} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                  {app.iconBase64 ? (
                    <img src={app.iconBase64} alt="" className="w-6 h-6 rounded" />
                  ) : (
                    <div className="w-6 h-6 rounded bg-muted" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{app.appName || app.packageName}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {app.totalSizeMb.toFixed(0)} MB
                  </Badge>
                </div>
              ))}
              {installedApps.length > 10 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{installedApps.length - 10} altre app
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Non-native warning */}
      {!isNative && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <p className="text-xs text-muted-foreground">
              Alcuni test richiedono l'app Android nativa per risultati completi
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
