import { createContext, useContext, useEffect, useState, useCallback } from "react";
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

  const fetchUserRoles = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (!error && data) {
        setUserRoles(data.map(r => r.role));
      } else {
        setUserRoles([]);
      }
    } catch (error) {
      console.error("Error fetching user roles:", error);
      setUserRoles([]);
    }
  }, []);

  const initializeAuth = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Error getting session:", error);
        // Clear potentially corrupted session
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setUserRoles([]);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchUserRoles(session.user.id);
      }
    } catch (error) {
      console.error("Auth initialization error:", error);
      // On any error, reset to clean state
      setSession(null);
      setUser(null);
      setUserRoles([]);
    } finally {
      setLoading(false);
    }
  }, [fetchUserRoles]);

  useEffect(() => {
    // Initialize auth
    initializeAuth();

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event);
      
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Use setTimeout to avoid race conditions
        setTimeout(() => {
          fetchUserRoles(session.user.id);
        }, 0);
      } else {
        setUserRoles([]);
      }

      // If token was refreshed or session expired, update loading state
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
        setLoading(false);
      }
    });

    // Refresh session when app becomes visible (iOS PWA fix)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (!error && session) {
            // Refresh token if needed
            const { data } = await supabase.auth.refreshSession();
            if (data.session) {
              setSession(data.session);
              setUser(data.session.user);
            }
          }
        } catch (error) {
          console.error("Session refresh error:", error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [initializeAuth, fetchUserRoles]);

  // Show loading state while initializing
  if (loading) {
    return (
      <AuthContext.Provider
        value={{
          user: null,
          session: null,
          userRole: null,
          userRoles: [],
          loading: true,
          signIn: async () => ({ error: new Error('Loading') }),
          signUp: async () => ({ error: new Error('Loading') }),
          signOut: async () => {},
          isTechnician: false,
          isAdmin: false,
          isCustomer: false,
          isPlatformAdmin: false,
          isCorner: false,
          isRiparatore: false,
          isCentroAdmin: false,
          isCentroTech: false,
          hasRole: () => false,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

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
