import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Smartphone,
  Download,
  Shield,
  Battery,
  Cpu,
  CheckCircle,
  Star,
  Gift,
  Clock,
  CreditCard,
  Percent,
  Check,
  Loader2,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useLoyaltyProgramSettingsForCentro, DEFAULT_SETTINGS } from "@/hooks/useLoyaltyProgramSettings";
import { GITHUB_REPO } from "@/config/appVersion";

interface Centro {
  id: string;
  business_name: string;
  logo_url: string | null;
}

interface AndroidAppDownloadWidgetProps {
  hasActiveCard: boolean;
  customerEmail?: string;
  existingCardCentroIds?: string[];
}

export const AndroidAppDownloadWidget = ({
  hasActiveCard,
  customerEmail,
  existingCardCentroIds = [],
}: AndroidAppDownloadWidgetProps) => {
  const [centri, setCentri] = useState<Centro[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingCentroId, setActivatingCentroId] = useState<string | null>(null);
  const [selectedCentroId, setSelectedCentroId] = useState<string | null>(null);
  const [apkDownloadUrl, setApkDownloadUrl] = useState<string>("");
  const [isLoadingApk, setIsLoadingApk] = useState(false);

  // Fetch latest APK from GitHub Releases (same logic as useAppUpdate)
  const fetchLatestApk = useCallback(async () => {
    if (!GITHUB_REPO || GITHUB_REPO.includes("YOUR_GITHUB")) {
      console.log("GitHub repo not configured");
      return;
    }

    setIsLoadingApk(true);
    try {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.log("No releases available");
          return;
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const release = await response.json();
      const apkAsset = release.assets?.find(
        (asset: any) => asset.name.endsWith(".apk")
      );

      if (apkAsset?.browser_download_url) {
        setApkDownloadUrl(apkAsset.browser_download_url);
      }
    } catch (error) {
      console.error("Error fetching APK:", error);
    } finally {
      setIsLoadingApk(false);
    }
  }, []);

  useEffect(() => {
    if (hasActiveCard) {
      fetchLatestApk();
    }
  }, [hasActiveCard, fetchLatestApk]);

  useEffect(() => {
    if (customerEmail && !hasActiveCard) {
      fetchAvailableCentri();
    } else {
      setLoading(false);
    }
  }, [customerEmail, hasActiveCard, existingCardCentroIds]);

  const fetchAvailableCentri = async () => {
    try {
      // Trova tutti i customer records per questa email
      const { data: customers } = await supabase
        .from('customers')
        .select('id, centro_id')
        .eq('email', customerEmail);

      if (!customers || customers.length === 0) {
        setLoading(false);
        return;
      }

      const customerIds = customers.map(c => c.id);

      // Trova TUTTE le loyalty cards attive per questo cliente (qualsiasi centro)
      const { data: activeCards } = await supabase
        .from('loyalty_cards')
        .select('centro_id')
        .in('customer_id', customerIds)
        .eq('status', 'active');

      const activeCentroIds = activeCards?.map(c => c.centro_id) || [];
      
      // Combina con existingCardCentroIds passati come prop
      const allExistingCentroIds = [...new Set([...existingCardCentroIds, ...activeCentroIds])];

      // Filtra solo quelli con centro_id e senza card attiva
      const centroIds = customers
        .filter(c => c.centro_id)
        .map(c => c.centro_id as string)
        .filter(id => !allExistingCentroIds.includes(id));

      if (centroIds.length === 0) {
        setLoading(false);
        return;
      }

      // Carica i dati dei Centri
      const { data: centriData } = await supabase
        .from('centri_assistenza')
        .select('id, business_name, logo_url')
        .in('id', centroIds)
        .eq('status', 'approved');

      setCentri(centriData || []);
      if (centriData && centriData.length > 0) {
        setSelectedCentroId(centriData[0].id);
      }
    } catch (error) {
      console.error('Error fetching centri:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (centro: Centro) => {
    if (!customerEmail) return;
    
    setActivatingCentroId(centro.id);
    try {
      // Trova il customer_id per questo centro
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', customerEmail)
        .eq('centro_id', centro.id)
        .single();

      if (!customer) {
        throw new Error('Cliente non trovato');
      }

      // Crea checkout session
      const { data, error } = await supabase.functions.invoke('create-loyalty-checkout', {
        body: {
          customer_id: customer.id,
          centro_id: centro.id,
          customer_email: customerEmail
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast({
          title: 'Checkout avviato',
          description: 'Completa il pagamento nella nuova scheda per attivare la tessera.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile avviare il checkout',
        variant: 'destructive',
      });
    } finally {
      setActivatingCentroId(null);
    }
  };

  const handleDownload = () => {
    if (apkDownloadUrl) {
      window.open(apkDownloadUrl, "_blank");
      toast({
        title: "Download avviato",
        description: "Il download dell'APK è iniziato. Controlla la cartella download.",
      });
    } else {
      // Try to fetch again if no URL
      fetchLatestApk();
      toast({
        title: "Caricamento...",
        description: "Stiamo recuperando l'ultima versione disponibile. Riprova tra qualche secondo.",
      });
    }
  };

  // Premium widget for customers WITH active loyalty card
  if (hasActiveCard) {
    return (
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-amber-600" />
              App di Diagnosi Premium
            </CardTitle>
            <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
              <Gift className="h-3 w-3 mr-1" />
              Inclusa nella Tessera
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Monitora la salute del tuo dispositivo con l'app esclusiva per i membri del programma fedeltà.
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Shield, label: "Scanner Malware", color: "text-red-600" },
              { icon: Battery, label: "Stato Batteria", color: "text-yellow-600" },
              { icon: Cpu, label: "Test Hardware", color: "text-blue-600" },
              { icon: CheckCircle, label: "Diagnosi AI", color: "text-green-600" },
            ].map((feature) => (
              <div
                key={feature.label}
                className="flex items-center gap-2 p-2 bg-background/50 rounded-lg"
              >
                <feature.icon className={`h-4 w-4 ${feature.color}`} />
                <span className="text-xs font-medium">{feature.label}</span>
              </div>
            ))}
          </div>

          {/* Download Button */}
          <Button
            onClick={handleDownload}
            disabled={isLoadingApk}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            {isLoadingApk ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Caricamento...
              </>
            ) : apkDownloadUrl ? (
              <>
                <Download className="h-4 w-4 mr-2" />
                Scarica l'App Android
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Verifica disponibilità
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Compatibile con Android 8.0+
          </p>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (loading) {
    return null;
  }

  // No available centri to activate
  if (centri.length === 0) {
    return null;
  }

  // Proposal widget for customers WITHOUT loyalty card
  return (
    <div className="space-y-4">
      <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
        <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
        Attiva la Tessera Fedeltà
      </h2>
      
      <div className="grid gap-4 md:grid-cols-2">
        {centri.map((centro) => (
          <CentroCardProposal 
            key={centro.id}
            centro={centro}
            customerEmail={customerEmail}
            isActivating={activatingCentroId === centro.id}
            onActivate={() => handleActivate(centro)}
          />
        ))}
      </div>
    </div>
  );
};

// Separate component to use the hook per centro
interface CentroCardProposalProps {
  centro: Centro;
  customerEmail?: string;
  isActivating: boolean;
  onActivate: () => void;
}

const CentroCardProposal = ({ centro, customerEmail, isActivating, onActivate }: CentroCardProposalProps) => {
  const { settings, loading, getEffectiveSettings } = useLoyaltyProgramSettingsForCentro(centro.id);
  const effectiveSettings = getEffectiveSettings();

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          {centro.logo_url ? (
            <img 
              src={centro.logo_url} 
              alt={centro.business_name}
              className="w-12 h-12 rounded-lg object-contain bg-white p-1"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-amber-600" />
            </div>
          )}
          <div>
            <CardTitle className="text-lg">{centro.business_name}</CardTitle>
            <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
              <Gift className="h-3 w-3 mr-1" />
              €{effectiveSettings.annual_price}/anno
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Benefits */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-background/50">
            <Check className="h-4 w-4 mx-auto text-green-600 mb-1" />
            <p className="text-xs font-medium">Diagnosi €{effectiveSettings.diagnostic_fee}</p>
            <p className="text-[10px] text-muted-foreground line-through">€{effectiveSettings.diagnostic_fee + 5}</p>
          </div>
          <div className="p-2 rounded-lg bg-background/50">
            <Percent className="h-4 w-4 mx-auto text-blue-600 mb-1" />
            <p className="text-xs font-medium">-{effectiveSettings.repair_discount_percent}%</p>
            <p className="text-[10px] text-muted-foreground">riparazioni</p>
          </div>
          <div className="p-2 rounded-lg bg-background/50">
            <Smartphone className="h-4 w-4 mx-auto text-purple-600 mb-1" />
            <p className="text-xs font-medium">{effectiveSettings.max_devices} dispositivi</p>
            <p className="text-[10px] text-muted-foreground">coperti</p>
          </div>
        </div>

        {/* App included badge */}
        <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-500/20">
          <Shield className="h-4 w-4 text-amber-600" />
          <span className="text-xs font-medium text-amber-700">App Diagnosi Android inclusa</span>
        </div>

        <Button 
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          onClick={onActivate}
          disabled={isActivating}
        >
          {isActivating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Attivazione...
            </>
          ) : (
            <>
              <Star className="h-4 w-4 mr-2" />
              Attiva Ora
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
