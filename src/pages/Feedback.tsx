import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Star, MessageSquare } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface FeedbackItem {
  id: string;
  customer_name: string;
  customer_email: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export default function Feedback() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFeedback(data || []);
    } catch (error) {
      console.error("Error loading feedback:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i feedback",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 ${
          i < rating ? "fill-warning text-warning" : "text-muted-foreground"
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento feedback...</p>
        </div>
      </div>
    );
  }

  const avgRating = feedback.length
    ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1)
    : "0";

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Feedback Clienti</h1>
          <p className="text-muted-foreground">
            Recensioni e valutazioni dei clienti
          </p>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-4xl font-bold text-primary">{avgRating}</p>
              <div className="flex gap-1 mt-2">
                {renderStars(Math.round(parseFloat(avgRating)))}
              </div>
            </div>
            <div>
              <p className="text-2xl font-semibold">{feedback.length}</p>
              <p className="text-muted-foreground">Recensioni Totali</p>
            </div>
          </div>
        </Card>

        {feedback.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Nessun feedback</h2>
            <p className="text-muted-foreground">
              I feedback dei clienti appariranno qui
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {feedback.map((item) => (
              <Card key={item.id} className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{item.customer_name}</h3>
                    <p className="text-sm text-muted-foreground">{item.customer_email}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex gap-1 mb-1">{renderStars(item.rating)}</div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                </div>
                {item.comment && (
                  <p className="text-muted-foreground bg-muted/50 p-4 rounded-lg">
                    "{item.comment}"
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
