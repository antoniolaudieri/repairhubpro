import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Settings, RotateCcw, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { NotificationPermissionBanner } from "@/components/notifications/NotificationPermissionBanner";
import { DashboardProvider, useDashboardContext } from "@/components/dashboard/DashboardContext";
import { WidgetGrid } from "@/components/dashboard/WidgetGrid";
import { WidgetSelector } from "@/components/dashboard/WidgetSelector";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";

const DashboardContent = () => {
  const navigate = useNavigate();
  const { loading, isEditMode, setIsEditMode } = useDashboardContext();
  const { widgets, layouts, isLoaded, handleLayoutChange, addWidget, removeWidget, resetLayout } = useDashboardLayout();
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);

  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary mx-auto" />
          <p className="text-muted-foreground text-sm mt-3">Caricamento...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                {isEditMode ? "Trascina e ridimensiona i widget" : "Panoramica attività"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowWidgetSelector(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Aggiungi</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetLayout}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span className="hidden sm:inline">Reset</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsEditMode(false)}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" />
                    <span className="hidden sm:inline">Fatto</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditMode(true)}
                    className="gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Personalizza</span>
                  </Button>
                  <Button
                    onClick={() => navigate("/new-repair")}
                    className="gap-2 shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Nuovo Ritiro</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Notification Permission Banner */}
        <NotificationPermissionBanner />
        
        {/* Widget Grid */}
        <WidgetGrid
          widgets={widgets}
          layouts={layouts}
          onLayoutChange={handleLayoutChange}
          onRemoveWidget={removeWidget}
        />
      </div>

      {/* Widget Selector Modal */}
      <WidgetSelector
        open={showWidgetSelector}
        onOpenChange={setShowWidgetSelector}
        currentWidgets={widgets}
        onAddWidget={(type) => {
          addWidget(type);
          setShowWidgetSelector(false);
        }}
      />
    </div>
  );
};

const Dashboard = () => {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
};

export default Dashboard;
