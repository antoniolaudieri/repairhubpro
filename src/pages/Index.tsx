import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Wrench, 
  Smartphone, 
  Package, 
  TrendingUp, 
  Clock,
  CheckCircle2,
  Search,
  LogOut
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { user, isTechnician, isAdmin, signOut } = useAuth();
  const [customerRepairs, setCustomerRepairs] = useState<any[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && (isTechnician || isAdmin)) {
      navigate("/dashboard");
    }
  }, [user, isTechnician, isAdmin, navigate]);

  const searchRepairs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail) return;

    setLoading(true);
    try {
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("email", searchEmail)
        .maybeSingle();

      if (!customer) {
        toast({
          title: "Nessun risultato",
          description: "Nessuna riparazione trovata per questa email",
          variant: "destructive",
        });
        setCustomerRepairs([]);
        return;
      }

      const { data: devices } = await supabase
        .from("devices")
        .select("id")
        .eq("customer_id", customer.id);

      if (!devices || devices.length === 0) {
        setCustomerRepairs([]);
        return;
      }

      const deviceIds = devices.map((d) => d.id);

      const { data: repairs } = await supabase
        .from("repairs")
        .select(`
          *,
          device:devices (
            brand,
            model,
            device_type,
            reported_issue
          )
        `)
        .in("device_id", deviceIds)
        .order("created_at", { ascending: false });

      setCustomerRepairs(repairs || []);
    } catch (error) {
      console.error("Error searching repairs:", error);
      toast({
        title: "Errore",
        description: "Impossibile cercare le riparazioni",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      in_progress: "default",
      completed: "secondary",
      cancelled: "destructive",
    };

    const labels: Record<string, string> = {
      pending: "In attesa",
      in_progress: "In corso",
      completed: "Completata",
      cancelled: "Annullata",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Disconnesso",
      description: "Sei stato disconnesso con successo",
    });
  };

  // Landing page for non-authenticated users
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <nav className="border-b bg-background/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Wrench className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">TechRepair</span>
            </div>
            <Button onClick={() => navigate("/auth")} variant="default">
              Accedi
            </Button>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <div className="inline-block bg-primary/10 backdrop-blur-sm p-6 rounded-3xl mb-6">
              <Wrench className="h-16 w-16 text-primary" />
            </div>
            <h1 className="text-5xl font-bold text-foreground mb-6">
              TechRepair CRM
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Sistema completo per la gestione del tuo negozio di riparazioni.
              Gestisci clienti, riparazioni, magazzino e ordini in un'unica piattaforma.
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="font-semibold px-8 py-6 text-lg"
              >
                Accedi al Sistema
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <Card className="p-8">
              <Smartphone className="h-12 w-12 mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Gestione Riparazioni</h3>
              <p className="text-muted-foreground">
                Traccia ogni riparazione con dettagli completi su dispositivi e clienti
              </p>
            </Card>
            <Card className="p-8">
              <Package className="h-12 w-12 mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Magazzino Intelligente</h3>
              <p className="text-muted-foreground">
                Gestisci ricambi e ordini con notifiche automatiche per scorte basse
              </p>
            </Card>
            <Card className="p-8">
              <TrendingUp className="h-12 w-12 mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Assistenza IA</h3>
              <p className="text-muted-foreground">
                Riconoscimento automatico dispositivi e suggerimenti per riparazioni
              </p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Customer dashboard for authenticated customers
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <nav className="border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">TechRepair</span>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Esci
          </Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Le Tue Riparazioni
          </h1>
          <p className="text-muted-foreground text-lg">
            Traccia lo stato delle tue riparazioni in tempo reale
          </p>
        </div>

        <Card className="p-8 mb-12">
          <form onSubmit={searchRepairs} className="space-y-4">
            <div>
              <Label htmlFor="search-email" className="text-lg">
                Cerca le tue riparazioni
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Inserisci l'email usata durante la prenotazione
              </p>
              <div className="flex gap-2">
                <Input
                  id="search-email"
                  type="email"
                  placeholder="tua@email.com"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="flex-1"
                  required
                />
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    "Ricerca..."
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Cerca
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Card>

        {customerRepairs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold mb-4">Riparazioni Trovate</h2>
            {customerRepairs.map((repair) => (
              <Card key={repair.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      {repair.status === "completed" ? (
                        <CheckCircle2 className="h-6 w-6 text-success" />
                      ) : (
                        <Clock className="h-6 w-6 text-warning" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          {repair.device.brand} {repair.device.model}
                        </h3>
                        {getStatusBadge(repair.status)}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          <span className="font-medium">Tipo:</span> {repair.device.device_type}
                        </p>
                        <p>
                          <span className="font-medium">Problema:</span>{" "}
                          {repair.device.reported_issue}
                        </p>
                        {repair.diagnosis && (
                          <p>
                            <span className="font-medium">Diagnosi:</span> {repair.diagnosis}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {repair.final_cost ? (
                      <p className="text-2xl font-bold text-primary mb-2">
                        €{repair.final_cost.toFixed(2)}
                      </p>
                    ) : repair.estimated_cost ? (
                      <p className="text-xl font-semibold text-muted-foreground mb-2">
                        ~€{repair.estimated_cost.toFixed(2)}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {new Date(repair.created_at).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
