import { useState, useEffect, useCallback } from "react";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import NativeLogin from "@/pages/NativeLogin";
import { NativeHome } from "@/pages/NativeHome";
import { NativeDiagnostics } from "@/pages/NativeDiagnostics";
import { NativeProfile } from "@/pages/NativeProfile";
import { BottomNavBar, NativeView } from "@/components/native/BottomNavBar";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { UpdateAvailableDialog } from "@/components/native/UpdateAvailableDialog";
import { useFirstLaunchNotificationPrompt } from "@/hooks/useFirstLaunchNotificationPrompt";
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

const NativeApp = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<NativeView>("home");
  const [loyaltyCard, setLoyaltyCard] = useState<LoyaltyCard | null>(null);
  const [cardLoading, setCardLoading] = useState(true);

  // Wrap hooks in try-catch to prevent crashes on Android
  let updateState = {
    showUpdateDialog: false,
    currentVersion: '',
    latestVersion: '',
    changelog: '',
    downloadUrl: '',
    releaseDate: '',
    dismissUpdate: (_v: string) => {},
  };
  
  try {
    const update = useAppUpdate();
    updateState = {
      showUpdateDialog: update.showUpdateDialog,
      currentVersion: update.currentVersion,
      latestVersion: update.latestVersion,
      changelog: update.changelog,
      downloadUrl: update.downloadUrl,
      releaseDate: update.releaseDate,
      dismissUpdate: update.dismissUpdate,
    };
  } catch (e) {
    console.log('useAppUpdate error:', e);
  }

  // Call notification prompt hook in a safe way
  try {
    useFirstLaunchNotificationPrompt();
  } catch (e) {
    console.log('useFirstLaunchNotificationPrompt error:', e);
  }

  // Auth state with timeout to prevent infinite loading
  useEffect(() => {
    let isMounted = true;
    
    // Safety timeout - force end loading after 10 seconds max
    const safetyTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.log('[NativeApp] Safety timeout triggered, forcing loading to end');
        setLoading(false);
        setCardLoading(false);
      }
    }, 10000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (isMounted) {
          setUser(session?.user ?? null);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.log('[NativeApp] getSession error:', err);
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
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
  }, [loading]);

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
    }
  }, [user, fetchLoyaltyCard]);

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
      <UpdateAvailableDialog
        open={updateState.showUpdateDialog}
        onDismiss={() => updateState.dismissUpdate(updateState.latestVersion)}
        currentVersion={updateState.currentVersion}
        latestVersion={updateState.latestVersion}
        changelog={updateState.changelog}
        downloadUrl={updateState.downloadUrl}
        releaseDate={updateState.releaseDate}
      />
    </div>
  );
};

export default NativeApp;
