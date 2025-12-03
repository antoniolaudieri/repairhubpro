import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRoleBasedRedirect } from "@/hooks/useRoleBasedRedirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Wrench, Star } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp, userRole, loading: authLoading } = useAuth();
  const { getRedirectPath } = useRoleBasedRedirect();
  const [loading, setLoading] = useState(false);
  
  // Stati per il form cliente
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPassword, setCustomerPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  
  // Stati per il form tecnico
  const [techEmail, setTechEmail] = useState("");
  const [techPassword, setTechPassword] = useState("");

  useEffect(() => {
    // Wait for auth to finish loading and for role to be fetched
    if (user && !authLoading && userRole) {
      const redirectPath = getRedirectPath();
      navigate(redirectPath, { replace: true });
    }
  }, [user, userRole, authLoading, navigate, getRedirectPath]);

  const handleCustomerSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(customerEmail, customerPassword);
      if (error) throw error;
      toast.success("Accesso effettuato con successo");
    } catch (error: any) {
      toast.error(error.message || "Errore durante l'accesso");
    } finally {
      setLoading(false);
    }
  };

  const handleTechSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(techEmail, techPassword);
      if (error) throw error;
      toast.success("Accesso effettuato con successo");
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
      const { error } = await signUp(customerEmail, customerPassword, fullName, phone);
      if (error) throw error;
      toast.success("Registrazione completata! Verifica la tua email.");
    } catch (error: any) {
      toast.error(error.message || "Errore durante la registrazione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary text-primary-foreground p-4 rounded-full mb-4">
            <Wrench className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">TechRepair CRM</h1>
          <p className="text-muted-foreground text-center mt-2">
            Sistema di gestione riparazioni
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Sezione Cliente */}
          <Card className="p-8 shadow-lg">
            <div className="flex flex-col items-center mb-6">
              <div className="bg-primary/10 text-primary p-3 rounded-full mb-3">
                <Star className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Area Cliente</h2>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Accedi o registrati per gestire le tue riparazioni
              </p>
            </div>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Accedi</TabsTrigger>
                <TabsTrigger value="signup">Registrati</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleCustomerSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer-email">Email</Label>
                    <Input
                      id="customer-email"
                      type="email"
                      placeholder="tua@email.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer-password">Password</Label>
                    <Input
                      id="customer-password"
                      type="password"
                      placeholder="••••••••"
                      value={customerPassword}
                      onChange={(e) => setCustomerPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? "Accesso..." : "Accedi come Cliente"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome Completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Mario Rossi"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Telefono</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="+39 123 456 7890"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="tua@email.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={customerPassword}
                      onChange={(e) => setCustomerPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? "Registrazione..." : "Registrati"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Sezione Tecnico */}
          <Card className="p-8 shadow-lg border-2 border-primary/20">
            <div className="flex flex-col items-center mb-6">
              <div className="bg-primary text-primary-foreground p-3 rounded-full mb-3">
                <Wrench className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Area Tecnico</h2>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Accedi con le credenziali fornite dall'amministratore
              </p>
            </div>

            <form onSubmit={handleTechSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tech-email">Email Aziendale</Label>
                <Input
                  id="tech-email"
                  type="email"
                  placeholder="tecnico@techrepair.com"
                  value={techEmail}
                  onChange={(e) => setTechEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tech-password">Password</Label>
                <Input
                  id="tech-password"
                  type="password"
                  placeholder="••••••••"
                  value={techPassword}
                  onChange={(e) => setTechPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                variant="default"
              >
                {loading ? "Accesso..." : "Accedi come Tecnico"}
              </Button>
              
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground text-center">
                  Solo per personale autorizzato. <br />
                  Contatta l'amministratore per ottenere le credenziali.
                </p>
              </div>
            </form>
          </Card>
        </div>

        <div className="text-center mt-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-muted-foreground"
          >
            ← Torna alla Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
