import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2, Smartphone, Battery, HardDrive, Wifi, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AutomaticDiagnostics } from "./AutomaticDiagnostics";
import { useDeviceInfo, type DeviceInfo } from "@/hooks/useDeviceInfo";

interface QuizQuestion {
  id: string;
  category: string;
  question: string;
  icon: React.ReactNode;
  options: { value: string; label: string; weight: number }[];
}

const questions: QuizQuestion[] = [
  {
    id: "battery_drain",
    category: "battery",
    question: "Quanto velocemente si scarica la batteria durante l'uso normale?",
    icon: <Battery className="h-5 w-5" />,
    options: [
      { value: "excellent", label: "Dura tutto il giorno senza problemi", weight: 100 },
      { value: "good", label: "Dura mezza giornata con uso moderato", weight: 75 },
      { value: "fair", label: "Devo ricaricare più volte al giorno", weight: 50 },
      { value: "poor", label: "Si scarica molto rapidamente", weight: 25 }
    ]
  },
  {
    id: "battery_charging",
    category: "battery",
    question: "Come si comporta durante la ricarica?",
    icon: <Battery className="h-5 w-5" />,
    options: [
      { value: "excellent", label: "Si carica normalmente e rimane freddo", weight: 100 },
      { value: "good", label: "Si carica bene ma si scalda leggermente", weight: 75 },
      { value: "fair", label: "Ricarica lenta o si scalda molto", weight: 50 },
      { value: "poor", label: "Problemi frequenti di ricarica", weight: 25 }
    ]
  },
  {
    id: "storage_space",
    category: "storage",
    question: "Hai spazio di archiviazione sufficiente?",
    icon: <HardDrive className="h-5 w-5" />,
    options: [
      { value: "excellent", label: "Sì, ho molto spazio libero (>50%)", weight: 100 },
      { value: "good", label: "Abbastanza spazio (20-50% libero)", weight: 75 },
      { value: "fair", label: "Poco spazio (<20% libero)", weight: 50 },
      { value: "poor", label: "Quasi pieno, problemi frequenti", weight: 25 }
    ]
  },
  {
    id: "app_performance",
    category: "performance",
    question: "Come si comportano le app durante l'uso?",
    icon: <Smartphone className="h-5 w-5" />,
    options: [
      { value: "excellent", label: "Tutto fluido, nessun problema", weight: 100 },
      { value: "good", label: "Generalmente fluido, rari rallentamenti", weight: 75 },
      { value: "fair", label: "Rallentamenti frequenti", weight: 50 },
      { value: "poor", label: "Lento, app che crashano spesso", weight: 25 }
    ]
  },
  {
    id: "app_crashes",
    category: "performance",
    question: "Con che frequenza le app si chiudono inaspettatamente?",
    icon: <AlertTriangle className="h-5 w-5" />,
    options: [
      { value: "excellent", label: "Mai o quasi mai", weight: 100 },
      { value: "good", label: "Raramente (1-2 volte al mese)", weight: 75 },
      { value: "fair", label: "Occasionalmente (settimanalmente)", weight: 50 },
      { value: "poor", label: "Frequentemente (quotidianamente)", weight: 25 }
    ]
  },
  {
    id: "restart_issues",
    category: "performance",
    question: "Il dispositivo si riavvia da solo?",
    icon: <Smartphone className="h-5 w-5" />,
    options: [
      { value: "excellent", label: "Mai", weight: 100 },
      { value: "good", label: "Molto raramente", weight: 75 },
      { value: "fair", label: "A volte", weight: 50 },
      { value: "poor", label: "Spesso", weight: 25 }
    ]
  },
  {
    id: "connectivity",
    category: "connectivity",
    question: "Come funziona la connettività (WiFi, Bluetooth, rete)?",
    icon: <Wifi className="h-5 w-5" />,
    options: [
      { value: "excellent", label: "Tutto perfetto", weight: 100 },
      { value: "good", label: "Funziona bene, rari problemi", weight: 75 },
      { value: "fair", label: "Problemi occasionali di connessione", weight: 50 },
      { value: "poor", label: "Problemi frequenti", weight: 25 }
    ]
  },
  {
    id: "screen_issues",
    category: "hardware",
    question: "Lo schermo presenta problemi?",
    icon: <Smartphone className="h-5 w-5" />,
    options: [
      { value: "excellent", label: "No, perfetto", weight: 100 },
      { value: "good", label: "Piccoli graffi superficiali", weight: 75 },
      { value: "fair", label: "Touch poco reattivo o macchie", weight: 50 },
      { value: "poor", label: "Crepe, dead pixels o problemi seri", weight: 25 }
    ]
  },
  {
    id: "audio_issues",
    category: "hardware",
    question: "Come funzionano altoparlante e microfono?",
    icon: <Smartphone className="h-5 w-5" />,
    options: [
      { value: "excellent", label: "Perfettamente", weight: 100 },
      { value: "good", label: "Bene, qualche imperfezione minore", weight: 75 },
      { value: "fair", label: "Problemi occasionali", weight: 50 },
      { value: "poor", label: "Problemi frequenti o non funzionano", weight: 25 }
    ]
  },
  {
    id: "overall_satisfaction",
    category: "general",
    question: "Complessivamente, sei soddisfatto del tuo dispositivo?",
    icon: <Smartphone className="h-5 w-5" />,
    options: [
      { value: "excellent", label: "Molto soddisfatto", weight: 100 },
      { value: "good", label: "Abbastanza soddisfatto", weight: 75 },
      { value: "fair", label: "Poco soddisfatto", weight: 50 },
      { value: "poor", label: "Per niente soddisfatto", weight: 25 }
    ]
  }
];

interface DiagnosticQuizProps {
  onComplete: (responses: Record<string, string>, healthScore: number, hardwareInfo?: DeviceInfo) => void;
  isSubmitting?: boolean;
  quickMode?: boolean;
}

export function DiagnosticQuiz({ onComplete, isSubmitting = false, quickMode = false }: DiagnosticQuizProps) {
  const activeQuestions = quickMode ? questions.slice(0, 5) : questions;
  const [currentStep, setCurrentStep] = useState(-1); // -1 = show automatic diagnostics first
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [hardwareInfo, setHardwareInfo] = useState<DeviceInfo | null>(null);
  const deviceInfo = useDeviceInfo();

  const currentQuestion = currentStep >= 0 ? activeQuestions[currentStep] : null;
  const progress = currentStep < 0 ? 0 : ((currentStep + 1) / activeQuestions.length) * 100;
  const isLastStep = currentStep === activeQuestions.length - 1;
  const canProceed = currentStep < 0 || (currentQuestion && responses[currentQuestion.id]);

  const handleNext = () => {
    if (currentStep < 0) {
      // Move from auto diagnostics to first question
      setHardwareInfo(deviceInfo);
      setCurrentStep(0);
    } else if (isLastStep) {
      // Calculate health score
      const totalWeight = Object.entries(responses).reduce((sum, [questionId, answer]) => {
        const question = activeQuestions.find(q => q.id === questionId);
        const option = question?.options.find(o => o.value === answer);
        return sum + (option?.weight || 0);
      }, 0);
      const healthScore = Math.round(totalWeight / activeQuestions.length);
      onComplete(responses, healthScore, hardwareInfo || undefined);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(-1, prev - 1));
  };

  const handleAnswer = (value: string) => {
    setResponses(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }));
  };

  return (
    <div className="space-y-6">
      {currentStep < 0 ? (
        // Show automatic diagnostics first
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <AutomaticDiagnostics compact showRefresh={false} />
          <Button onClick={handleNext} className="w-full" size="lg">
            Continua con il Questionario
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </motion.div>
      ) : currentQuestion ? (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Domanda {currentStep + 1} di {activeQuestions.length}
              </span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      {currentQuestion.icon}
                    </div>
                    <div>
                      <CardDescription className="capitalize">
                        {currentQuestion.category === "battery" ? "Batteria" :
                         currentQuestion.category === "storage" ? "Archiviazione" :
                         currentQuestion.category === "performance" ? "Prestazioni" :
                         currentQuestion.category === "connectivity" ? "Connettività" :
                         currentQuestion.category === "hardware" ? "Hardware" : "Generale"}
                      </CardDescription>
                      <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={responses[currentQuestion.id] || ""}
                    onValueChange={handleAnswer}
                    className="space-y-3"
                  >
                    {currentQuestion.options.map((option) => (
                      <motion.div
                        key={option.value}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <Label
                          htmlFor={`${currentQuestion.id}-${option.value}`}
                          className={cn(
                            "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                            responses[currentQuestion.id] === option.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <RadioGroupItem
                            value={option.value}
                            id={`${currentQuestion.id}-${option.value}`}
                          />
                          <span className="flex-1">{option.label}</span>
                          {responses[currentQuestion.id] === option.value && (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          )}
                        </Label>
                      </motion.div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isSubmitting}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Indietro
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analisi in corso...
                </>
              ) : isLastStep ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Completa
                </>
              ) : (
                <>
                  Avanti
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
