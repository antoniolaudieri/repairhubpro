import { useState, useEffect, useCallback } from "react";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import NativeLogin from "@/pages/NativeLogin";
import { NativeHome } from "@/pages/NativeHome";
import { NativeDiagnostics } from "@/pages/NativeDiagnostics";
import { NativeProfile } from "@/pages/NativeProfile";
import { BottomNavBar, NativeView } from "@/components/native/BottomNavBar";
import { UpdateAvailableDialog } from "@/components/native/UpdateAvailableDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, LogOut } from "lucide-react";

interface LoyaltyCard {
  id: string;
  centro_id: string;
  status: string;
  customer_id: string;
  card_number?: string;
  activated_at?: string;
  expires_at?: string;
  centro?: {
    business_name: string;
    logo_url?: string;
  };
}

// Lazy load hooks to prevent blocking - these run AFTER app is ready
const useDeferredHooks = (isReady: boolean) => {
  const [updateState, setUpdateState] = useState({
    showUpdateDialog: false,
    currentVersion: '',
    latestVersion: '',
    changelog: '',
    downloadUrl: '',
    releaseDate: '',
    dismissUpdate: (_v: string) => {},
  });

  useEffect(() => {
    if (!isReady) return;
    
    // Defer hook loading to prevent blocking
    const timer = setTimeout(async () => {
      try {
        const { useAppUpdate } = await import("@/hooks/useAppUpdate");
        // We can't call hooks dynamically, so we'll just trigger notification prompt
        const { useFirstLaunchNotificationPrompt } = await import("@/hooks/useFirstLaunchNotificationPrompt");
      } catch (e) {
        console.log('[NativeApp] Deferred hooks error:', e);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [isReady]);

  return updateState;
};

const NativeApp = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<NativeView>("home");
  const [loyaltyCard, setLoyaltyCard] = useState<LoyaltyCard | null>(null);
  const [cardLoading, setCardLoading] = useState(true);
  const [appReady, setAppReady] = useState(false);

  // Auth state with AGGRESSIVE timeout to prevent infinite loading
  useEffect(() => {
    let isMounted = true;
    
    console.log('[NativeApp] Starting auth initialization...');
    
    // AGGRESSIVE safety timeout - force end loading after 3 seconds max
    const safetyTimeout = setTimeout(() => {
      if (isMounted && (loading || cardLoading)) {
        console.log('[NativeApp] Safety timeout triggered after 3s, forcing loading to end');
        setLoading(false);
        setCardLoading(false);
        setAppReady(true);
      }
    }, 3000);

    // Try to get session with its own timeout
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Session timeout')), 2000)
    );

    Promise.race([sessionPromise, timeoutPromise])
      .then((result) => {
        if (isMounted) {
          console.log('[NativeApp] Got session result');
          setUser(result?.data?.session?.user ?? null);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.log('[NativeApp] getSession error or timeout:', err);
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[NativeApp] Auth state change:', event);
        if (isMounted) {
          setUser(session?.user ?? null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Fetch loyalty card
  const fetchLoyaltyCard = useCallback(async () => {
    if (!user?.email) {
      setLoyaltyCard(null);
      setCardLoading(false);
      return;
    }

    try {
      const { data: customers } = await supabase
        .from("customers")
        .select("id")
        .eq("email", user.email);

      if (!customers || customers.length === 0) {
        setLoyaltyCard(null);
        setCardLoading(false);
        return;
      }

      const customerIds = customers.map(c => c.id);

      const { data } = await supabase
        .from("loyalty_cards")
        .select(`
          id, centro_id, status, customer_id, card_number, activated_at, expires_at,
          centro:centri_assistenza(business_name, logo_url)
        `)
        .in("customer_id", customerIds)
        .eq("status", "active")
        .not("expires_at", "is", null)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setLoyaltyCard({
          ...data,
          centro: Array.isArray(data.centro) ? data.centro[0] : data.centro
        } as LoyaltyCard);
      } else {
        setLoyaltyCard(null);
      }
    } catch (err) {
      console.error("Error fetching loyalty card:", err);
      setLoyaltyCard(null);
    } finally {
      setCardLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (user) {
      fetchLoyaltyCard();
    } else if (!loading) {
      // No user, skip card loading
      setCardLoading(false);
      setAppReady(true);
    }
  }, [user, loading, fetchLoyaltyCard]);

  // Mark app ready when both loading states are done
  useEffect(() => {
    if (!loading && !cardLoading) {
      setAppReady(true);
    }
  }, [loading, cardLoading]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading || cardLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Toaster />
        <NativeLogin />
      </>
    );
  }

  if (!loyaltyCard) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Toaster />
        <div className="max-w-md mx-auto">
          <Card className="border-destructive/50">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">Tessera Non Attiva</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Non hai una tessera fedeltà attiva associata a questo account.
              </p>
              <p className="text-sm text-muted-foreground">Email: {user.email}</p>
              <Button variant="outline" onClick={handleLogout} className="w-full">
                <LogOut className="mr-2 h-4 w-4" />
                Esci
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case "diagnostics":
        return <NativeDiagnostics user={user} />;
      case "profile":
        return <NativeProfile user={user} loyaltyCard={loyaltyCard} />;
      case "home":
      default:
        return (
          <NativeHome
            user={user}
            loyaltyCard={loyaltyCard}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <div className="h-screen pb-16">
        {renderContent()}
      </div>
      <BottomNavBar currentView={currentView} onNavigate={setCurrentView} />
    </div>
  );
};

export default NativeApp;
