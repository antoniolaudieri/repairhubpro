import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Mail, Lock, Loader2, Activity } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NativeLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Inserisci email e password");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
      }
    } catch (err) {
      toast.error("Errore durante il login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-full relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
      
      {/* Floating orbs for depth */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-float-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '-3s' }} />
      
      {/* Glass card */}
      <Card className={cn(
        "w-full max-w-md relative z-10 animate-fade-in",
        "bg-card/80 backdrop-blur-xl",
        "border border-border/50",
        "shadow-2xl shadow-primary/5"
      )}>
        <CardHeader className="text-center space-y-4 pb-2">
          {/* Animated logo container */}
          <div className="mx-auto relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-xl opacity-30 animate-pulse-glow" />
            <div className={cn(
              "relative h-20 w-20 rounded-full",
              "bg-gradient-to-br from-primary to-primary/80",
              "flex items-center justify-center",
              "shadow-lg shadow-primary/30"
            )}>
              <Activity className="h-10 w-10 text-primary-foreground animate-pulse" />
            </div>
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Device Health Pro
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Monitora lo stato del tuo dispositivo
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="pt-4">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email field with animated border */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className={cn(
                "relative rounded-xl transition-all duration-300",
                focusedField === 'email' && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background"
              )}>
                <Mail className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200",
                  focusedField === 'email' ? "text-primary" : "text-muted-foreground"
                )} />
                <Input
                  id="email"
                  type="email"
                  placeholder="la.tua@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className={cn(
                    "pl-11 h-12 rounded-xl",
                    "bg-muted/50 border-border/50",
                    "focus:bg-background transition-all duration-200"
                  )}
                  disabled={loading}
                />
              </div>
            </div>
            
            {/* Password field with animated border */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className={cn(
                "relative rounded-xl transition-all duration-300",
                focusedField === 'password' && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background"
              )}>
                <Lock className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200",
                  focusedField === 'password' ? "text-primary" : "text-muted-foreground"
                )} />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className={cn(
                    "pl-11 h-12 rounded-xl",
                    "bg-muted/50 border-border/50",
                    "focus:bg-background transition-all duration-200"
                  )}
                  disabled={loading}
                />
              </div>
            </div>
            
            {/* Gradient glow button */}
            <Button 
              type="submit" 
              className={cn(
                "w-full h-12 rounded-xl font-semibold text-base",
                "bg-gradient-to-r from-primary to-primary/80",
                "hover:opacity-90 transition-all duration-200",
                "shadow-lg shadow-primary/25",
                "relative overflow-hidden group"
              )}
              disabled={loading}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Accesso in corso...
                </>
              ) : (
                <>
                  <Smartphone className="mr-2 h-5 w-5" />
                  Accedi
                </>
              )}
            </Button>
          </form>
          
          {/* Footer text */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Monitora batteria, memoria e prestazioni del tuo dispositivo
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default NativeLogin;
