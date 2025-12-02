import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Wrench,
  Package,
  Target,
  Shield,
  BookOpen,
  Play,
  Flag,
  CircleAlert,
  Sparkles,
  ThumbsUp,
  Gauge,
  ListChecks,
  Info,
  ArrowRight
} from "lucide-react";

interface RepairStep {
  stepNumber: number;
  title: string;
  description: string;
  imageUrl?: string;
  warnings?: string[];
  tips?: string[];
  checkpoints?: string[];
}

interface Diagnosis {
  problem: string;
  cause: string;
  severity: "low" | "medium" | "high";
  repairability: number;
}

interface Overview {
  difficulty: string;
  estimatedTime: string;
  partsNeeded: string[];
  toolsNeeded: string[];
}

interface Troubleshooting {
  problem: string;
  solution: string;
}

interface RepairGuideData {
  diagnosis: Diagnosis;
  overview: Overview;
  steps: RepairStep[];
  troubleshooting: Troubleshooting[];
  finalNotes: string;
}

interface RepairGuideProps {
  guide: RepairGuideData;
  deviceName: string;
}

const severityConfig = {
  low: { label: "Basso", color: "bg-emerald-500", bgLight: "bg-emerald-500/10", text: "text-emerald-600" },
  medium: { label: "Medio", color: "bg-amber-500", bgLight: "bg-amber-500/10", text: "text-amber-600" },
  high: { label: "Alto", color: "bg-red-500", bgLight: "bg-red-500/10", text: "text-red-600" },
};

const difficultyConfig: Record<string, { color: string; icon: string }> = {
  "Facile": { color: "text-emerald-600", icon: "🟢" },
  "Medio": { color: "text-amber-600", icon: "🟡" },
  "Difficile": { color: "text-orange-600", icon: "🟠" },
  "Esperto": { color: "text-red-600", icon: "🔴" },
};

export default function RepairGuide({ guide, deviceName }: RepairGuideProps) {
  const [currentStep, setCurrentStep] = useState(-1); // -1 = overview
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [expandedCheckpoints, setExpandedCheckpoints] = useState<Record<number, boolean>>({});

  const totalSteps = guide.steps?.length || 0;
  const progress = currentStep === -1 ? 0 : ((currentStep + 1) / totalSteps) * 100;
  
  const severity = severityConfig[guide.diagnosis?.severity] || severityConfig.medium;
  const difficulty = difficultyConfig[guide.overview?.difficulty] || difficultyConfig["Medio"];

  const toggleStepComplete = (stepNum: number) => {
    setCompletedSteps(prev => 
      prev.includes(stepNum) 
        ? prev.filter(s => s !== stepNum)
        : [...prev, stepNum]
    );
  };

  const goToStep = (step: number) => {
    setCurrentStep(Math.max(-1, Math.min(step, totalSteps - 1)));
  };

  const currentStepData = currentStep >= 0 ? guide.steps[currentStep] : null;

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Guida Riparazione</span>
          </div>
          <Badge variant="outline" className="gap-1">
            {completedSteps.length}/{totalSteps} completati
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Panoramica</span>
          <span>Step {currentStep + 1} di {totalSteps}</span>
        </div>
      </div>

      {/* Step Navigation Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
        <Button
          variant={currentStep === -1 ? "default" : "outline"}
          size="sm"
          onClick={() => setCurrentStep(-1)}
          className="flex-shrink-0 gap-1.5"
        >
          <Info className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Panoramica</span>
        </Button>
        {guide.steps?.map((step, idx) => (
          <Button
            key={idx}
            variant={currentStep === idx ? "default" : completedSteps.includes(idx) ? "secondary" : "outline"}
            size="sm"
            onClick={() => setCurrentStep(idx)}
            className={`flex-shrink-0 gap-1.5 min-w-[60px] ${completedSteps.includes(idx) ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" : ""}`}
          >
            {completedSteps.includes(idx) ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <span className="text-xs font-bold">{idx + 1}</span>
            )}
          </Button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {currentStep === -1 ? (
          /* Overview Section */
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {/* Diagnosis Card */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/5 px-4 py-3 border-b border-border/50">
                <h3 className="font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  Diagnosi
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Problema Identificato</p>
                  <p className="font-medium">{guide.diagnosis?.problem}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Causa Probabile</p>
                  <p className="font-medium">{guide.diagnosis?.cause}</p>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Badge className={`${severity.bgLight} ${severity.text} border-0`}>
                    <CircleAlert className="h-3 w-3 mr-1" />
                    Gravità: {severity.label}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Gauge className="h-3 w-3" />
                    Riparabilità: {guide.diagnosis?.repairability}/10
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Overview Card */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 border-b border-border/50">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Panoramica Riparazione
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <Flag className={`h-5 w-5 mx-auto mb-1 ${difficulty.color}`} />
                    <p className="text-xs text-muted-foreground">Difficoltà</p>
                    <p className={`font-semibold ${difficulty.color}`}>
                      {difficulty.icon} {guide.overview?.difficulty}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <Clock className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                    <p className="text-xs text-muted-foreground">Tempo Stimato</p>
                    <p className="font-semibold text-blue-600">{guide.overview?.estimatedTime}</p>
                  </div>
                </div>

                {/* Parts Needed */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-emerald-500" />
                    Ricambi Necessari
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {guide.overview?.partsNeeded?.map((part, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-emerald-500/10 text-emerald-700 border-emerald-200">
                        {part}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Tools Needed */}
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Wrench className="h-4 w-4 text-orange-500" />
                    Strumenti Richiesti
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {guide.overview?.toolsNeeded?.map((tool, idx) => (
                      <Badge key={idx} variant="outline" className="border-orange-200 text-orange-700">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Start Button */}
            <Button 
              onClick={() => setCurrentStep(0)} 
              className="w-full gap-2 h-12 text-base"
              size="lg"
            >
              <Play className="h-5 w-5" />
              Inizia Guida Riparazione
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          </motion.div>
        ) : currentStepData && (
          /* Step Content */
          <motion.div
            key={`step-${currentStep}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <Card className="overflow-hidden">
              {/* Step Header */}
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                      completedSteps.includes(currentStep) 
                        ? "bg-emerald-500 text-white" 
                        : "bg-primary text-primary-foreground"
                    }`}>
                      {completedSteps.includes(currentStep) ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        currentStep + 1
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Step {currentStep + 1} di {totalSteps}</p>
                      <h3 className="font-semibold text-foreground">{currentStepData.title}</h3>
                    </div>
                  </div>
                  <Checkbox
                    checked={completedSteps.includes(currentStep)}
                    onCheckedChange={() => toggleStepComplete(currentStep)}
                    className="h-6 w-6"
                  />
                </div>
              </div>

              {/* Step Image */}
              {currentStepData.imageUrl && (
                <div className="relative aspect-video bg-muted/50 overflow-hidden">
                  <img
                    src={currentStepData.imageUrl}
                    alt={currentStepData.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <Badge className="absolute bottom-3 left-3 bg-black/60 text-white border-0">
                    <Shield className="h-3 w-3 mr-1" />
                    Guida Visuale
                  </Badge>
                </div>
              )}

              {/* Step Description */}
              <div className="p-4 space-y-4">
                <p className="text-foreground leading-relaxed">{currentStepData.description}</p>

                {/* Warnings */}
                {currentStepData.warnings && currentStepData.warnings.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 space-y-2">
                    <h4 className="font-medium text-red-600 flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      Attenzione
                    </h4>
                    {currentStepData.warnings.map((warning, idx) => (
                      <p key={idx} className="text-sm text-red-700 pl-6">• {warning}</p>
                    ))}
                  </div>
                )}

                {/* Tips */}
                {currentStepData.tips && currentStepData.tips.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-2">
                    <h4 className="font-medium text-amber-600 flex items-center gap-2 text-sm">
                      <Lightbulb className="h-4 w-4" />
                      Suggerimenti
                    </h4>
                    {currentStepData.tips.map((tip, idx) => (
                      <p key={idx} className="text-sm text-amber-700 pl-6">• {tip}</p>
                    ))}
                  </div>
                )}

                {/* Checkpoints */}
                {currentStepData.checkpoints && currentStepData.checkpoints.length > 0 && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 space-y-2">
                    <h4 className="font-medium text-emerald-600 flex items-center gap-2 text-sm">
                      <ListChecks className="h-4 w-4" />
                      Verifica
                    </h4>
                    {currentStepData.checkpoints.map((check, idx) => (
                      <div key={idx} className="flex items-start gap-2 pl-2">
                        <Checkbox className="mt-0.5 h-4 w-4" />
                        <p className="text-sm text-emerald-700">{check}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Navigation */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => goToStep(currentStep - 1)}
                disabled={currentStep <= -1}
                className="flex-1 gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Precedente
              </Button>
              {currentStep < totalSteps - 1 ? (
                <Button
                  onClick={() => goToStep(currentStep + 1)}
                  className="flex-1 gap-2"
                >
                  Successivo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => toggleStepComplete(currentStep)}
                  className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Completato!
                </Button>
              )}
            </div>

            {/* Final Notes (show on last step) */}
            {currentStep === totalSteps - 1 && guide.finalNotes && (
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <div className="p-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Note Finali
                  </h4>
                  <p className="text-sm text-muted-foreground">{guide.finalNotes}</p>
                </div>
              </Card>
            )}

            {/* Troubleshooting (show on last step) */}
            {currentStep === totalSteps - 1 && guide.troubleshooting && guide.troubleshooting.length > 0 && (
              <Card>
                <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
                  <h4 className="font-semibold flex items-center gap-2 text-sm">
                    <CircleAlert className="h-4 w-4 text-amber-500" />
                    Risoluzione Problemi
                  </h4>
                </div>
                <div className="p-4 space-y-3">
                  {guide.troubleshooting.map((item, idx) => (
                    <div key={idx} className="bg-muted/50 rounded-lg p-3">
                      <p className="font-medium text-sm text-foreground">{item.problem}</p>
                      <p className="text-sm text-muted-foreground mt-1">{item.solution}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
