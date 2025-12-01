import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Wrench, Smartphone, Package, TrendingUp } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-primary">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-block bg-white/10 backdrop-blur-sm p-6 rounded-3xl mb-6">
            <Wrench className="h-16 w-16 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-6">
            RepairShop CRM
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Sistema completo per la gestione del tuo negozio di riparazioni. 
            Gestisci clienti, riparazioni, magazzino e ordini in un'unica piattaforma.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-white text-primary hover:bg-white/90 font-semibold px-8 py-6 text-lg"
          >
            Accedi al Sistema
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-white">
            <Smartphone className="h-12 w-12 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Gestione Riparazioni</h3>
            <p className="text-white/80">
              Traccia ogni riparazione con dettagli completi su dispositivi e clienti
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-white">
            <Package className="h-12 w-12 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Magazzino Intelligente</h3>
            <p className="text-white/80">
              Gestisci ricambi e ordini con notifiche automatiche per scorte basse
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-white">
            <TrendingUp className="h-12 w-12 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Assistenza IA</h3>
            <p className="text-white/80">
              Riconoscimento automatico dispositivi e suggerimenti per riparazioni
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
