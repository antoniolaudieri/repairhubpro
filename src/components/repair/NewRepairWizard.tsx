import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";

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
    <div className="space-y-4 md:space-y-6">
      {/* Step Indicators - Desktop */}
      <div className="hidden lg:flex items-center justify-between px-2">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`
                  h-9 w-9 rounded-full flex items-center justify-center font-semibold text-sm
                  transition-all duration-300 relative
                  ${
                    index < currentStep
                      ? "bg-primary text-primary-foreground"
                      : index === currentStep
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground border-2 border-border"
                  }
                `}
              >
                {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span className={`text-xs mt-1.5 font-medium text-center max-w-[80px] leading-tight ${
                index === currentStep ? "text-primary" : "text-muted-foreground"
              }`}>
                {step.title}
              </span>
            </div>
            {index < totalSteps - 1 && (
              <div className="flex-1 h-0.5 mx-3 -mt-5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    index < currentStep ? "bg-primary" : "bg-border"
                  }`}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Step Indicators - Mobile (Compact dots + progress) */}
      <div className="lg:hidden space-y-3">
        <div className="flex items-center justify-center gap-1.5">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`
                h-2 rounded-full transition-all duration-300
                ${
                  index < currentStep
                    ? "w-2 bg-primary"
                    : index === currentStep
                    ? "w-6 bg-primary"
                    : "w-2 bg-border"
                }
              `}
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-muted-foreground">
            Step {currentStep + 1} di {totalSteps}
          </span>
          <span className="text-primary font-medium">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Progress Bar - Desktop only */}
      <div className="hidden lg:block">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Step Title */}
      <div className="text-center py-2">
        <motion.h2
          key={currentStep}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg md:text-xl font-bold text-foreground"
        >
          {currentStepInfo.title}
        </motion.h2>
        <motion.p
          key={`desc-${currentStep}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-xs md:text-sm text-muted-foreground mt-1"
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
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="min-h-[280px] md:min-h-[400px] p-3 md:p-5 rounded-xl bg-muted/30 border border-border/50"
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-3 pt-3 md:pt-4 border-t border-border/50">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          disabled={currentStep === 0 || loading}
          className="h-10 md:h-11 px-3 md:px-5 flex-1 md:flex-none"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          <span className="hidden sm:inline">Indietro</span>
          <span className="sm:hidden">Indietro</span>
        </Button>

        {currentStep < totalSteps - 1 ? (
          <Button
            type="button"
            onClick={onNext}
            disabled={!canGoNext || loading}
            className="h-10 md:h-11 px-4 md:px-6 flex-1 md:flex-none bg-primary hover:bg-primary/90"
          >
            <span>Avanti</span>
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!canGoNext || loading}
            className="h-10 md:h-11 px-4 md:px-6 flex-1 md:flex-none bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Salvataggio...</span>
                <span className="sm:hidden">Salva...</span>
              </>
            ) : (
              <>
                <Check className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">Completa</span>
                <span className="sm:hidden">Completa</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
