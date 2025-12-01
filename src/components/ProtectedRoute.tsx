import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireTechnician?: boolean;
}

export const ProtectedRoute = ({ children, requireTechnician = false }: ProtectedRouteProps) => {
  const { user, loading, isTechnician, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireTechnician && !isTechnician && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
