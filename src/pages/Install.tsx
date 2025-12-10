import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Smartphone, 
  Monitor, 
  Check, 
  Share, 
  Plus,
  Wrench,
  Zap,
  Wifi,
  Bell,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Install = () => {
  const { isInstallable, isInstalled, promptInstall, isIOS, isAndroid, isMobile, getPlatform } = useInstallPrompt();
  const navigate = useNavigate();

  const benefits = [
    { icon: Zap, text: "Accesso istantaneo dalla home" },
    { icon: Wifi, text: "Funziona anche offline" },
    { icon: Bell, text: "Notifiche in tempo reale" },
    { icon: Monitor, text: "Esperienza a schermo intero" },
  ];

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      // Installation was accepted
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="p-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Installa App</h1>
      </header>

      <div className="container max-w-lg mx-auto px-4 py-8">
        {/* App Icon */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl shadow-xl flex items-center justify-center mb-4">
            <Wrench className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">LabLinkRiparo</h2>
          <p className="text-muted-foreground">Gestionale Riparazioni</p>
        </div>

        {/* Already Installed */}
        {isInstalled && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-green-800">App già installata!</p>
                  <p className="text-sm text-green-600">Puoi aprirla dalla tua home screen</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Vantaggi dell'installazione</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <benefit.icon className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">{benefit.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Install Instructions */}
        {!isInstalled && (
          <>
            {/* Android/Chrome Install Button */}
            {(isInstallable || isAndroid) && (
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-lg">Android / Chrome</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {isInstallable ? (
                    <Button 
                      onClick={handleInstall} 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      size="lg"
                    >
                      <Download className="h-5 w-5 mr-2" />
                      Installa App
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Se il pulsante di installazione non appare:
                      </p>
                      <ol className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-0.5">1</Badge>
                          <span>Tocca il menu <strong>⋮</strong> in alto a destra</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-0.5">2</Badge>
                          <span>Seleziona <strong>"Installa app"</strong> o <strong>"Aggiungi a schermata Home"</strong></span>
                        </li>
                      </ol>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* iOS Instructions */}
            {isIOS && (
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-gray-600" />
                    <CardTitle className="text-lg">iPhone / iPad</CardTitle>
                  </div>
                  <CardDescription>
                    Su Safari, segui questi passaggi:
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                        <Share className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Tocca Condividi</p>
                        <p className="text-sm text-muted-foreground">
                          L'icona con la freccia verso l'alto nella barra in basso
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                        <Plus className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Aggiungi a Home</p>
                        <p className="text-sm text-muted-foreground">
                          Scorri e tocca "Aggiungi a schermata Home"
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Conferma</p>
                        <p className="text-sm text-muted-foreground">
                          Tocca "Aggiungi" in alto a destra
                        </p>
                      </div>
                    </li>
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* Desktop Instructions */}
            {!isMobile && (
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">PC / Mac</CardTitle>
                  </div>
                  <CardDescription>
                    Su Chrome o Edge:
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isInstallable ? (
                    <Button 
                      onClick={handleInstall} 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      size="lg"
                    >
                      <Download className="h-5 w-5 mr-2" />
                      Installa App
                    </Button>
                  ) : (
                    <ol className="space-y-3 text-sm">
                      <li className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">1</Badge>
                        <span>Cerca l'icona <strong>⊕</strong> nella barra degli indirizzi</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">2</Badge>
                        <span>Clicca su <strong>"Installa"</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">3</Badge>
                        <span>L'app si aprirà come finestra separata</span>
                      </li>
                    </ol>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Platform Badge */}
        <div className="text-center">
          <Badge variant="secondary" className="text-xs">
            Rilevato: {getPlatform().toUpperCase()}
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default Install;
