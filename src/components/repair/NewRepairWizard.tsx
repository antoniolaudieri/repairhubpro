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

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 50 : -50,
    opacity: 0,
    scale: 0.98,
  }),
};

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
    <div className="space-y-4">
      {/* Step Indicators - Desktop */}
      <div className="hidden lg:flex items-center justify-between px-2">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <motion.div
                initial={false}
                animate={{
                  scale: index === currentStep ? 1.1 : 1,
                  backgroundColor: index <= currentStep ? "hsl(var(--primary))" : "hsl(var(--muted))",
                }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`
                  h-8 w-8 rounded-full flex items-center justify-center font-semibold text-sm
                  ${index <= currentStep ? "text-primary-foreground" : "text-muted-foreground"}
                  ${index === currentStep ? "ring-4 ring-primary/20" : ""}
                `}
              >
                {index < currentStep ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <Check className="h-4 w-4" />
                  </motion.div>
                ) : (
                  index + 1
                )}
              </motion.div>
              <span className={`text-[10px] mt-1.5 font-medium text-center max-w-[70px] leading-tight ${
                index === currentStep ? "text-primary" : "text-muted-foreground"
              }`}>
                {step.title}
              </span>
            </div>
            {index < totalSteps - 1 && (
              <div className="flex-1 h-0.5 mx-2 -mt-4 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: index < currentStep ? "100%" : "0%" }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Step Indicators - Mobile */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">
            Step {currentStep + 1}/{totalSteps}
          </span>
          <span className="text-xs font-semibold text-primary">{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <div className="flex items-center justify-center gap-1 mt-2">
          {steps.map((_, index) => (
            <motion.div
              key={index}
              animate={{
                width: index === currentStep ? 20 : 6,
                backgroundColor: index <= currentStep ? "hsl(var(--primary))" : "hsl(var(--muted))",
              }}
              transition={{ duration: 0.3 }}
              className="h-1.5 rounded-full"
            />
          ))}
        </div>
      </div>

      {/* Step Title */}
      <div className="text-center py-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-base md:text-lg font-bold text-foreground">
              {currentStepInfo.title}
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              {currentStepInfo.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step Content */}
      <div className="relative min-h-[300px] md:min-h-[380px]">
        <AnimatePresence mode="wait" custom={1}>
          <motion.div
            key={currentStep}
            custom={1}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 },
            }}
            className="p-3 md:p-4 rounded-xl bg-muted/20 border border-border/40"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-3 border-t border-border/40">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          disabled={currentStep === 0 || loading}
          className="h-11 flex-1 md:flex-none md:px-6"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Indietro
        </Button>

        <div className="flex-1" />

        {currentStep < totalSteps - 1 ? (
          <Button
            type="button"
            onClick={onNext}
            disabled={!canGoNext || loading}
            className="h-11 flex-1 md:flex-none md:px-8 bg-primary hover:bg-primary/90"
          >
            Avanti
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!canGoNext || loading}
            className="h-11 flex-1 md:flex-none md:px-6 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Check className="mr-1.5 h-4 w-4" />
                Completa
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
