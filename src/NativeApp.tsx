import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import NativeLogin from "@/pages/NativeLogin";
import NativeMonitor from "@/pages/NativeMonitor";
import NativeSettings from "@/pages/NativeSettings";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { UpdateAvailableDialog } from "@/components/native/UpdateAvailableDialog";
import { useFirstLaunchNotificationPrompt } from "@/hooks/useFirstLaunchNotificationPrompt";

type AppView = "monitor" | "settings";

const NativeApp = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>("monitor");

  const {
    showUpdateDialog,
    currentVersion,
    latestVersion,
    changelog,
    downloadUrl,
    releaseDate,
    dismissUpdate,
  } = useAppUpdate();

  // Prompt for notifications on first launch
  useFirstLaunchNotificationPrompt();

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderContent = () => {
    if (!user) {
      return <NativeLogin />;
    }

    switch (currentView) {
      case "settings":
        return <NativeSettings user={user} onBack={() => setCurrentView("monitor")} />;
      case "monitor":
      default:
        return <NativeMonitor user={user} onOpenSettings={() => setCurrentView("settings")} />;
    }
  };

  return (
    <>
      <Toaster />
      {renderContent()}
      <UpdateAvailableDialog
        open={showUpdateDialog}
        onDismiss={() => dismissUpdate(latestVersion)}
        currentVersion={currentVersion}
        latestVersion={latestVersion}
        changelog={changelog}
        downloadUrl={downloadUrl}
        releaseDate={releaseDate}
      />
    </>
  );
};

export default NativeApp;
