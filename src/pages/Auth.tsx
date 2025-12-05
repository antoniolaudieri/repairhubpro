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
import { Wrench, Mail, Lock, User, Phone, ArrowLeft, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp, userRoles, loading: authLoading } = useAuth();
  const { getRedirectPath } = useRoleBasedRedirect();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");
  const [waitingForRoles, setWaitingForRoles] = useState(false);
  
  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Handle redirect after login with roles loaded
  useEffect(() => {
    if (user && !authLoading) {
      if (userRoles.length > 0) {
        const redirectPath = getRedirectPath();
        navigate(redirectPath, { replace: true });
      } else if (waitingForRoles) {
        // Retry after a short delay if waiting for roles
        const timeout = setTimeout(() => {
          if (userRoles.length > 0) {
            const redirectPath = getRedirectPath();
            navigate(redirectPath, { replace: true });
          }
        }, 500);
        return () => clearTimeout(timeout);
      }
    }
  }, [user, userRoles, authLoading, navigate, getRedirectPath, waitingForRoles]);

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
      const { error } = await signUp(email, password, fullName, phone);
      if (error) throw error;
      toast.success("Registrazione completata! Verifica la tua email.");
    } catch (error: any) {
      toast.error(error.message || "Errore durante la registrazione");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 100, damping: 15 }
    }
  };

  const logoVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: { type: "spring" as const, stiffness: 200, damping: 20, delay: 0.1 }
    }
  };

  const formVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: 20, transition: { duration: 0.2 } }
  };

  // Show loading while waiting for redirect after login
  if (user && waitingForRoles) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-muted-foreground">Caricamento dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/5 to-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <motion.div
        className="w-full max-w-md relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo and Title */}
        <motion.div className="flex flex-col items-center mb-8" variants={itemVariants}>
          <motion.div
            className="relative mb-4"
            variants={logoVariants}
          >
            <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-5 rounded-2xl shadow-lg shadow-primary/25">
              <Wrench className="h-10 w-10" />
            </div>
            <motion.div
              className="absolute -top-1 -right-1"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="h-5 w-5 text-primary" />
            </motion.div>
          </motion.div>
          <motion.h1
            className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
            variants={itemVariants}
          >
            TechRepair CRM
          </motion.h1>
          <motion.p
            className="text-muted-foreground text-center mt-2"
            variants={itemVariants}
          >
            Sistema di gestione riparazioni
          </motion.p>
        </motion.div>

        {/* Auth Card */}
        <motion.div variants={itemVariants}>
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

              <AnimatePresence mode="wait">
                <TabsContent value="signin" key="signin" className="mt-0">
                  <motion.form
                    onSubmit={handleSignIn}
                    className="space-y-5"
                    variants={formVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
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
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <Button
                        type="submit"
                        className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 transition-all duration-300"
                        disabled={loading}
                      >
                        {loading ? (
                          <motion.div
                            className="flex items-center gap-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <motion.div
                              className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            Accesso in corso...
                          </motion.div>
                        ) : (
                          "Accedi"
                        )}
                      </Button>
                    </motion.div>
                  </motion.form>
                </TabsContent>

                <TabsContent value="signup" key="signup" className="mt-0">
                  <motion.form
                    onSubmit={handleSignUp}
                    className="space-y-4"
                    variants={formVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
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
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <Button
                        type="submit"
                        className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 transition-all duration-300"
                        disabled={loading}
                      >
                        {loading ? (
                          <motion.div
                            className="flex items-center gap-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <motion.div
                              className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            Registrazione...
                          </motion.div>
                        ) : (
                          "Registrati"
                        )}
                      </Button>
                    </motion.div>
                  </motion.form>
                </TabsContent>
              </AnimatePresence>
            </Tabs>
          </Card>
        </motion.div>

        {/* Back button */}
        <motion.div
          className="text-center mt-6"
          variants={itemVariants}
        >
          <motion.div whileHover={{ x: -4 }} transition={{ type: "spring" as const, stiffness: 400 }}>
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Torna alla Home
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Auth;
