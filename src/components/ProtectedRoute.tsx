import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireTechnician?: boolean;
  requirePlatformAdmin?: boolean;
  requireCorner?: boolean;
  requireRiparatore?: boolean;
  requireCentro?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requireTechnician = false,
  requirePlatformAdmin = false,
  requireCorner = false,
  requireRiparatore = false,
  requireCentro = false,
}: ProtectedRouteProps) => {
  const { 
    user, 
    loading, 
    isTechnician, 
    isAdmin, 
    isPlatformAdmin,
    isCorner,
    isRiparatore,
    isCentroAdmin,
    isCentroTech,
  } = useAuth();

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

  // Platform admin has access to everything
  if (isPlatformAdmin) {
    return <>{children}</>;
  }

  // Check specific role requirements
  if (requirePlatformAdmin && !isPlatformAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireTechnician && !isTechnician && !isAdmin && !isCentroAdmin && !isCentroTech) {
    return <Navigate to="/" replace />;
  }

  if (requireCorner && !isCorner) {
    return <Navigate to="/" replace />;
  }

  if (requireRiparatore && !isRiparatore) {
    return <Navigate to="/" replace />;
  }

  if (requireCentro && !isCentroAdmin && !isCentroTech) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
