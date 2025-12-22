// This page handles BOTH iOS and Android diagnostic quiz
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DiagnosticQuiz } from "@/components/health/DiagnosticQuiz";
import { DeviceHealthScore, DeviceHealthSummary } from "@/components/health/DeviceHealthScore";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Smartphone, Activity, CheckCircle2, Clock, 
  Sparkles, Gift, Shield, AlertCircle, Loader2
} from "lucide-react";
import { toast } from "sonner";

interface QuizResult {
  id: string;
  health_score: number | null;
  ai_analysis: string | null;
  recommendations: any;
  created_at: string;
  status: string;
}

export default function DeviceHealthQuiz() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const loyaltyCardIdFromUrl = searchParams.get("card");
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [quickMode, setQuickMode] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [previousQuizzes, setPreviousQuizzes] = useState<QuizResult[]>([]);
  const [loyaltyCard, setLoyaltyCard] = useState<any>(null);
  const [availableCards, setAvailableCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(loyaltyCardIdFromUrl);

  useEffect(() => {
    checkAccess();
  }, [user, selectedCardId]);

  // If no card ID in URL, try to find active loyalty cards for this user
  useEffect(() => {
    const findUserCards = async () => {
      const userEmail = user?.email;
      if (!userEmail || loyaltyCardIdFromUrl) return;
      
      try {
        // Use fetch to avoid Supabase client type inference issues
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        
        // Fetch loyalty cards
        const cardsRes = await fetch(
          `${baseUrl}/rest/v1/loyalty_cards?customer_email=eq.${encodeURIComponent(userEmail)}&status=eq.active&select=id,card_number,centro_id`,
          { headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}` } }
        );
        const cards = await cardsRes.json() as { id: string; card_number: string | null; centro_id: string }[];
        
        if (cards && cards.length > 0) {
          // Fetch centro names
          const centroIds = [...new Set(cards.map(c => c.centro_id))];
          const centroRes = await fetch(
            `${baseUrl}/rest/v1/centri_assistenza?id=in.(${centroIds.join(",")})&select=id,business_name`,
            { headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}` } }
          );
          const centri = await centroRes.json() as { id: string; business_name: string }[];
          const centroMap = new Map(centri?.map(c => [c.id, c.business_name]) || []);
          
          const cardsWithCentro = cards.map(card => ({
            ...card,
            centro_name: centroMap.get(card.centro_id) || "Centro"
          }));
          
          setAvailableCards(cardsWithCentro);
          if (cardsWithCentro.length === 1) {
            setSelectedCardId(cardsWithCentro[0].id);
          }
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching user cards:", error);
        setLoading(false);
      }
    };

    findUserCards();
  }, [user, loyaltyCardIdFromUrl]);

  const checkAccess = async () => {
    if (!user || !selectedCardId) {
      if (!loyaltyCardIdFromUrl && availableCards.length === 0) {
        // Will be handled by findUserCards
      } else {
        setLoading(false);
      }
      return;
    }

    try {
      // Verify loyalty card access
      const { data, error } = await supabase.functions.invoke("device-health", {
        body: {
          action: "verify_access",
          loyalty_card_id: selectedCardId
        }
      });

      if (error) throw error;

      setHasAccess(data.has_access);
      setLoyaltyCard(data.loyalty_card);

      if (data.has_access) {
        // Fetch previous quizzes
        await fetchPreviousQuizzes();
      }
    } catch (error: any) {
      console.error("Error checking access:", error);
      toast.error("Errore nel verificare l'accesso");
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviousQuizzes = async () => {
    if (!user || !selectedCardId) return;

    try {
      const response: any = await supabase
        .from("diagnostic_quizzes")
        .select("id, health_score, ai_analysis, recommendations, created_at, status")
        .eq("loyalty_card_id", selectedCardId)
        .order("created_at", { ascending: false })
        .limit(5);

      setPreviousQuizzes(response.data || []);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
    }
  };

  const handleQuizComplete = async (responses: Record<string, string>, healthScore: number) => {
    if (!user || !selectedCardId) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("device-health", {
        body: {
          action: "submit_quiz",
          loyalty_card_id: selectedCardId,
          responses,
          health_score: healthScore,
          quick_mode: quickMode
        }
      });

      if (error) throw error;

      setResult(data.quiz);
      setShowQuiz(false);
      toast.success("Diagnosi completata!", {
        description: data.points_earned ? `Hai guadagnato ${data.points_earned} punti!` : undefined
      });
      
      // Refresh previous quizzes
      await fetchPreviousQuizzes();
    } catch (error: any) {
      console.error("Error submitting quiz:", error);
      toast.error(error.message || "Errore nel salvare la diagnosi");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageTransition>
    );
  }

  // Show card selector if multiple cards available
  if (user && !selectedCardId && availableCards.length > 1) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background p-4">
          <div className="max-w-md mx-auto pt-8">
            <Card>
              <CardHeader className="text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Activity className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Seleziona Tessera</CardTitle>
                <CardDescription>
                  Hai più tessere attive. Seleziona quella da utilizzare per la diagnosi.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {availableCards.map((card) => (
                  <Button
                    key={card.id}
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() => setSelectedCardId(card.id)}
                  >
                    <div className="text-left">
                      <p className="font-medium">{card.card_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {(card.centri_assistenza as any)?.business_name || "Centro"}
                      </p>
                    </div>
                  </Button>
                ))}
                <Button 
                  onClick={() => navigate("/customer-dashboard")} 
                  variant="ghost"
                  className="w-full mt-4"
                >
                  Torna alla Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!user || (!selectedCardId && availableCards.length === 0) || !hasAccess) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background p-4">
          <div className="max-w-md mx-auto pt-8">
            <Card className="border-destructive/50">
              <CardHeader className="text-center">
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <CardTitle>Accesso non disponibile</CardTitle>
                <CardDescription>
                  Questa funzionalità è riservata ai possessori di tessera fedeltà attiva.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button onClick={() => navigate("/customer-dashboard")} variant="outline">
                  Torna alla Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => showQuiz ? setShowQuiz(false) : navigate("/customer-dashboard")}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h1 className="font-semibold">Diagnostica Dispositivo</h1>
              <p className="text-xs text-muted-foreground">Check-up salute del tuo device</p>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              <Shield className="h-3 w-3 mr-1" />
              Premium
            </Badge>
          </div>
        </div>

        <div className="max-w-lg mx-auto p-4 space-y-6">
          {showQuiz ? (
            <DiagnosticQuiz
              onComplete={handleQuizComplete}
              isSubmitting={submitting}
              quickMode={quickMode}
            />
          ) : result ? (
            // Show result
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-4">
                    <DeviceHealthScore score={result.health_score || 0} size="lg" />
                  </div>
                  <CardTitle>Risultato Diagnosi</CardTitle>
                  <CardDescription>
                    Analisi completata il {new Date(result.created_at).toLocaleDateString("it-IT")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.ai_analysis && (
                    <div className="p-4 rounded-xl bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Analisi AI</span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {result.ai_analysis}
                      </p>
                    </div>
                  )}
                  
                  {result.recommendations && Array.isArray(result.recommendations) && result.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Raccomandazioni</h4>
                      <ul className="space-y-2">
                        {result.recommendations.map((rec: any, index: number) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                            <span>{typeof rec === 'string' ? rec : rec.text || rec.recommendation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button 
                    onClick={() => setResult(null)} 
                    variant="outline" 
                    className="w-full"
                  >
                    Torna alla Dashboard
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            // Show options
            <div className="space-y-6">
              {/* Welcome Card */}
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                      <Activity className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Check-up Dispositivo</h2>
                      <p className="text-sm text-muted-foreground">
                        Analizza la salute del tuo device
                      </p>
                    </div>
                  </div>
                </div>
                <CardContent className="pt-4 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Rispondi a poche domande per ottenere un'analisi completa dello stato 
                    del tuo dispositivo con consigli personalizzati dall'AI.
                  </p>
                  
                  <div className="grid gap-3">
                    <Button 
                      onClick={() => { setQuickMode(false); setShowQuiz(true); }}
                      className="h-auto py-4 justify-start"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                          <Smartphone className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <span className="block font-medium">Diagnosi Completa</span>
                          <span className="block text-xs opacity-80">10 domande • ~3 minuti</span>
                        </div>
                      </div>
                    </Button>
                    
                    <Button 
                      onClick={() => { setQuickMode(true); setShowQuiz(true); }}
                      variant="secondary"
                      className="h-auto py-4 justify-start"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-secondary-foreground/10 flex items-center justify-center">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <span className="block font-medium">Check-up Rapido</span>
                          <span className="block text-xs opacity-70">5 domande • ~1 minuto</span>
                        </div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Benefits */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gift className="h-4 w-4 text-primary" />
                    Vantaggi Esclusivi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      <span>Guadagna punti fedeltà per ogni check-up</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      <span>Analisi AI personalizzata</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      <span>Consigli per mantenere il device in salute</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      <span>Storico completo delle diagnosi</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Previous Quizzes */}
              {previousQuizzes.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Diagnosi Precedenti
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {previousQuizzes.map((quiz) => (
                      <motion.div
                        key={quiz.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => setResult(quiz)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="flex items-center gap-3">
                          <DeviceHealthScore 
                            score={quiz.health_score || 0} 
                            size="sm" 
                            showLabel={false}
                          />
                          <div>
                            <p className="text-sm font-medium">
                              Punteggio: {quiz.health_score}/100
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(quiz.created_at).toLocaleDateString("it-IT", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                              })}
                            </p>
                          </div>
                        </div>
                        <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180" />
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
