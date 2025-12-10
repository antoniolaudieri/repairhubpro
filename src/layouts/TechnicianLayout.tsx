import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TechnicianNotificationCenter } from "@/components/notifications/TechnicianNotificationCenter";

export default function TechnicianLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background overflow-x-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <header className="h-14 sm:h-16 border-b bg-card/50 backdrop-blur-xl flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-10 shadow-sm">
            <div className="flex items-center">
              <SidebarTrigger className="mr-2 sm:mr-4" />
              <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xs sm:text-sm">LL</span>
                </div>
                <h1 className="text-base sm:text-lg font-bold text-foreground hidden sm:block">LabLinkRiparo</h1>
              </div>
            </div>
            <TechnicianNotificationCenter />
          </header>
          <main className="flex-1 bg-gradient-to-br from-background via-background to-muted/20 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
