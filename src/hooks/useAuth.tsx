import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  userRoles: string[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isTechnician: boolean;
  isAdmin: boolean;
  isCustomer: boolean;
  isPlatformAdmin: boolean;
  isCorner: boolean;
  isRiparatore: boolean;
  isCentroAdmin: boolean;
  isCentroTech: boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (!error && data) {
      setUserRoles(data.map(r => r.role));
    } else {
      setUserRoles([]);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => {
          fetchUserRoles(session.user.id);
        }, 0);
      } else {
        setUserRoles([]);
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserRoles(session.user.id);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone: string
  ) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          phone: phone,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
    // Always clear local state regardless of server response
    setUser(null);
    setSession(null);
    setUserRoles([]);
  };

  const hasRole = (role: string) => userRoles.includes(role);

  // Legacy single role (first role or null)
  const userRole = userRoles.length > 0 ? userRoles[0] : null;

  // Role checks
  const isTechnician = hasRole("technician");
  const isAdmin = hasRole("admin");
  const isCustomer = hasRole("customer");
  const isPlatformAdmin = hasRole("platform_admin");
  const isCorner = hasRole("corner");
  const isRiparatore = hasRole("riparatore");
  const isCentroAdmin = hasRole("centro_admin");
  const isCentroTech = hasRole("centro_tech");

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        userRoles,
        loading,
        signIn,
        signUp,
        signOut,
        isTechnician,
        isAdmin,
        isCustomer,
        isPlatformAdmin,
        isCorner,
        isRiparatore,
        isCentroAdmin,
        isCentroTech,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
