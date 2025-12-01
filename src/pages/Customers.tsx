import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function Customers() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Clienti</h1>
          <p className="text-muted-foreground">
            Gestisci i tuoi clienti e visualizza lo storico
          </p>
        </div>

        <Card className="p-12 text-center">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">In arrivo</h2>
          <p className="text-muted-foreground">
            La gestione clienti sarà disponibile a breve
          </p>
        </Card>
      </div>
    </div>
  );
}
