import { Card } from "@/components/ui/card";
import { Package } from "lucide-react";

export default function Inventory() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Magazzino</h1>
          <p className="text-muted-foreground">
            Gestisci i ricambi e monitora le scorte
          </p>
        </div>

        <Card className="p-12 text-center">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">In arrivo</h2>
          <p className="text-muted-foreground">
            La gestione magazzino sarà disponibile a breve
          </p>
        </Card>
      </div>
    </div>
  );
}
