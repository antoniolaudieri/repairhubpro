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
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {currentStep + 1} di {totalSteps}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Title */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-foreground">
          {currentStepInfo.title}
        </h2>
        <p className="text-muted-foreground">
          {currentStepInfo.description}
        </p>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="min-h-[400px]"
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-4 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          disabled={currentStep === 0 || loading}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Indietro
        </Button>

        {currentStep < totalSteps - 1 ? (
          <Button
            type="button"
            onClick={onNext}
            disabled={!canGoNext || loading}
            className="bg-primary hover:bg-primary-hover"
          >
            Avanti
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!canGoNext || loading}
            className="bg-primary hover:bg-primary-hover"
          >
            {loading ? "Salvataggio..." : "Completa Registrazione"}
          </Button>
        )}
      </div>
    </div>
  );
};
