import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Wrench, Mail, Lock, User, Phone, ArrowLeft, Sparkles, Loader2, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get("redirect");
  const isTrial = searchParams.get("trial") === "true";
  const leadId = searchParams.get("lead");
  const prefilledEmail = searchParams.get("email");
  
  const { user, signIn, signUp, userRoles, loading: authLoading, isPlatformAdmin, isTechnician, isAdmin, isCentroAdmin, isCentroTech, isRiparatore, isCorner } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(isTrial ? "signup" : "signin");
  const [waitingForRoles, setWaitingForRoles] = useState(false);
  const hasRedirected = useRef(false);
  
  // Form states
  const [email, setEmail] = useState(prefilledEmail || "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Assign role and update lead via edge function after registration
  const processTrialRegistration = async (userId: string, userEmail: string) => {
    try {
      console.log("Processing trial registration for user:", userId, "lead:", leadId, "email:", userEmail);
      
      const { data, error } = await supabase.functions.invoke("assign-trial-role", {
        body: {
          user_id: userId,
          lead_id: leadId, // Can be null - function will try to find by email
          user_email: userEmail,
        },
      });

      if (error) {
        console.error("Error assigning trial role:", error);
        toast.error("Errore nell'assegnazione del ruolo. Contatta l'assistenza.");
      } else {
        console.log("Trial role assigned:", data);
      }
    } catch (error) {
      console.error("Error in processTrialRegistration:", error);
    }
  };

  // Handle redirect after login with roles loaded - only once
  useEffect(() => {
    if (user && !authLoading && userRoles.length > 0 && !hasRedirected.current) {
      hasRedirected.current = true;
      
      // If there's a redirect parameter, use it
      if (redirectPath) {
        navigate(redirectPath, { replace: true });
        return;
      }
      
      // Otherwise, redirect based on role
      let defaultPath = "/customer-dashboard";
      if (isPlatformAdmin) {
        defaultPath = "/admin";
      } else if (isTechnician || isAdmin) {
        defaultPath = "/dashboard";
      } else if (isCentroAdmin || isCentroTech) {
        defaultPath = "/centro";
      } else if (isRiparatore) {
        defaultPath = "/riparatore";
      } else if (isCorner) {
        defaultPath = "/corner";
      }
      
      navigate(defaultPath, { replace: true });
    }
  }, [user, userRoles, authLoading, navigate, redirectPath, isPlatformAdmin, isTechnician, isAdmin, isCentroAdmin, isCentroTech, isRiparatore, isCorner]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      toast.success("Accesso effettuato con successo");
      setWaitingForRoles(true);
      // Force a small delay to allow roles to load
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error: any) {
      toast.error(error.message || "Errore durante l'accesso");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
            phone: phone,
          },
        },
      });
      if (error) throw error;
      
      // Assign role and update lead if this is a trial registration
      if (isTrial && data.user) {
        await processTrialRegistration(data.user.id, email);
      }
      
      toast.success("Registrazione completata! Verifica la tua email.");
    } catch (error: any) {
      toast.error(error.message || "Errore durante la registrazione");
    } finally {
      setLoading(false);
    }
  };

  // Show loading while waiting for redirect after login
  if (user && waitingForRoles) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-muted-foreground">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Static background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-5 rounded-2xl shadow-lg shadow-primary/25">
              <Wrench className="h-10 w-10" />
            </div>
            <div className="absolute -top-1 -right-1">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            LabLinkRiparo
          </h1>
          <p className="text-muted-foreground text-center mt-2">
            Sistema di gestione riparazioni
          </p>
        </div>

        {/* Trial Banner */}
        {isTrial && (
          <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 p-2 rounded-lg">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Prova Gratuita</p>
                <p className="text-sm text-muted-foreground">
                  Registrati per iniziare la tua prova gratuita di LinkRiparo
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Auth Card */}
        <Card className="p-8 shadow-2xl border-border/50 backdrop-blur-sm bg-card/95">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 p-1 bg-muted/50">
              <TabsTrigger
                value="signin"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-300"
              >
                Accedi
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-300"
              >
                Registrati
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-0">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="tua@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 transition-all duration-300"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Accesso in corso...
                    </span>
                  ) : (
                    "Accedi"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm font-medium">
                    Nome Completo
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Mario Rossi"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone" className="text-sm font-medium">
                    Telefono
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="+39 123 456 7890"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="tua@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 transition-all duration-300"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Registrazione...
                    </span>
                  ) : isTrial ? (
                    "Inizia la Prova Gratuita"
                  ) : (
                    "Registrati"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Back button */}
        <div className="text-center mt-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna alla Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
