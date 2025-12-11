import { ReactNode, useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CentroSidebar } from "@/components/centro/CentroSidebar";
import { CentroNotificationCenter } from "@/components/centro/CentroNotificationCenter";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Building2 } from "lucide-react";
import { useAutoPromptNotifications } from "@/hooks/useAutoPromptNotifications";

interface CentroLayoutProps {
  children: ReactNode;
}

export const CentroLayout = ({ children }: CentroLayoutProps) => {
  const { user } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("Centro Assistenza");
  
  // Auto-prompt for push notifications after login
  useAutoPromptNotifications();

  useEffect(() => {
    const fetchCentroInfo = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("centri_assistenza")
        .select("logo_url, business_name")
        .eq("owner_user_id", user.id)
        .single();
      
      if (data) {
        setLogoUrl(data.logo_url);
        setBusinessName(data.business_name || "Centro Assistenza");
      }
    };

    fetchCentroInfo();
  }, [user]);

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-background overflow-hidden">
        <aside className="h-full flex-shrink-0">
          <CentroSidebar />
        </aside>
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <header className="h-14 sm:h-16 border-b bg-card/50 backdrop-blur-xl flex items-center justify-between px-3 sm:px-4 lg:px-6 flex-shrink-0 shadow-sm">
            <div className="flex items-center">
              <SidebarTrigger className="mr-2 sm:mr-4" />
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg overflow-hidden bg-gradient-primary flex items-center justify-center shadow-md">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  )}
                </div>
                <h1 className="text-base sm:text-lg font-bold text-foreground hidden sm:block truncate max-w-[200px]">{businessName}</h1>
              </div>
            </div>
            
            {/* Notification Center */}
            <div className="flex items-center">
              <CentroNotificationCenter />
            </div>
          </header>
          <main className="flex-1 bg-gradient-to-br from-background via-background to-muted/20 overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};