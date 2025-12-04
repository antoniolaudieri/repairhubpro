import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PlatformAdminSidebar } from "@/components/admin/PlatformAdminSidebar";
import { Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface PlatformAdminLayoutProps {
  children: ReactNode;
}

export const PlatformAdminLayout = ({ children }: PlatformAdminLayoutProps) => {
  const { user } = useAuth();

  // Check if user is platform admin
  const { data: isPlatformAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-platform-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "platform_admin")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id,
  });

  // Fetch total pending count
  const { data: totalPending = 0 } = useQuery({
    queryKey: ["admin-total-pending"],
    queryFn: async () => {
      const [cornersRes, riparatoriRes, centriRes] = await Promise.all([
        supabase.from("corners").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("riparatori").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("centri_assistenza").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return (cornersRes.count || 0) + (riparatoriRes.count || 0) + (centriRes.count || 0);
    },
    enabled: isPlatformAdmin === true,
  });

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background overflow-x-hidden">
        <PlatformAdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <header className="h-14 sm:h-16 border-b bg-card/50 backdrop-blur-xl flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-10 shadow-sm">
            <div className="flex items-center">
              <SidebarTrigger className="mr-2 sm:mr-4" />
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg overflow-hidden bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-base sm:text-lg font-bold text-foreground">Admin Piattaforma</h1>
                  <p className="text-xs text-muted-foreground">Gestione marketplace</p>
                </div>
              </div>
            </div>
            
            {totalPending > 0 && (
              <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30 text-xs sm:text-sm px-2 sm:px-3 py-1">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">{totalPending} richieste in attesa</span>
                <span className="sm:hidden">{totalPending}</span>
              </Badge>
            )}
          </header>
          <main className="flex-1 bg-gradient-to-br from-background via-background to-muted/20 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
