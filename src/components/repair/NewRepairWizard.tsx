import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WizardStep {
  title: string;
  description: string;
}

interface NewRepairWizardProps {
  currentStep: number;
  totalSteps: number;
  steps: WizardStep[];
  children: React.ReactNode;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
  canGoNext: boolean;
  loading?: boolean;
}

export const NewRepairWizard = ({
  currentStep,
  totalSteps,
  steps,
  children,
  onNext,
  onPrevious,
  onSubmit,
  canGoNext,
  loading = false,
}: NewRepairWizardProps) => {
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const currentStepInfo = steps[currentStep];

  return (
    <div className="space-y-8">
      {/* Step Indicators */}
      <div className="flex justify-between items-center">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`
                  h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm
                  transition-all duration-300
                  ${
                    index < currentStep
                      ? "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-md"
                      : index === currentStep
                      ? "bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-lg ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                  }
                `}
              >
                {index < currentStep ? "✓" : index + 1}
              </div>
              <p className={`text-xs mt-2 font-medium ${index === currentStep ? "text-foreground" : "text-muted-foreground"}`}>
                {step.title}
              </p>
            </div>
            {index < totalSteps - 1 && (
              <div className="flex-1 h-0.5 mx-2 mb-6">
                <div
                  className={`h-full transition-all duration-300 ${
                    index < currentStep ? "bg-gradient-to-r from-primary to-primary-glow" : "bg-border"
                  }`}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium">
          <span className="text-muted-foreground">Progresso</span>
          <span className="text-primary">{Math.round(progress)}%</span>
        </div>
        <div className="relative">
          <Progress value={progress} className="h-2.5 bg-muted" />
        </div>
      </div>

      {/* Step Title */}
      <div className="text-center space-y-2 py-4">
        <motion.h2
          key={currentStep}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text"
        >
          {currentStepInfo.title}
        </motion.h2>
        <motion.p
          key={`desc-${currentStep}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground"
        >
          {currentStepInfo.description}
        </motion.p>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="min-h-[450px] p-6 rounded-xl bg-gradient-to-br from-card to-card/50 border border-border/50 shadow-sm"
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-4 pt-6 border-t border-border/50">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          disabled={currentStep === 0 || loading}
          className="h-11 px-6"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Indietro
        </Button>

        {currentStep < totalSteps - 1 ? (
          <Button
            type="button"
            onClick={onNext}
            disabled={!canGoNext || loading}
            className="h-11 px-8 bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary shadow-md hover:shadow-lg transition-all"
          >
            Avanti
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!canGoNext || loading}
            className="h-11 px-8 bg-gradient-to-r from-accent to-accent-glow hover:from-accent-glow hover:to-accent shadow-md hover:shadow-lg transition-all"
          >
            {loading ? (
              <>
                <span className="animate-pulse">Salvataggio...</span>
              </>
            ) : (
              "Completa Registrazione"
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
