import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import SimpleDeviceMonitor from "@/pages/SimpleDeviceMonitor";
import { ErrorBoundary } from "@/components/ErrorBoundary";

/**
 * Minimal App for Native Android
 * - No routing
 * - No auth
 * - No complex dependencies
 * - Just device monitoring
 */
const NativeApp = () => (
  <ErrorBoundary>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SimpleDeviceMonitor />
    </TooltipProvider>
  </ErrorBoundary>
);

export default NativeApp;
