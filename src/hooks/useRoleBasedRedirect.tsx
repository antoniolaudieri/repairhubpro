import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Hook that redirects authenticated users to their role-specific dashboard
 * after login or when accessing the root page
 */
export const useRoleBasedRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    user, 
    loading, 
    isPlatformAdmin, 
    isTechnician, 
    isAdmin,
    isCorner, 
    isRiparatore, 
    isCentroAdmin,
    isCentroTech,
    isCustomer 
  } = useAuth();

  useEffect(() => {
    if (loading || !user) return;

    // Only redirect from auth page or root
    const shouldRedirect = location.pathname === "/auth" || location.pathname === "/";
    if (!shouldRedirect) return;

    // Determine redirect path based on role priority
    let redirectPath = "/customer-dashboard"; // Default for customers

    if (isPlatformAdmin) {
      redirectPath = "/platform-admin";
    } else if (isTechnician || isAdmin) {
      redirectPath = "/dashboard";
    } else if (isCentroAdmin || isCentroTech) {
      redirectPath = "/centro";
    } else if (isRiparatore) {
      redirectPath = "/riparatore";
    } else if (isCorner) {
      redirectPath = "/corner";
    } else if (isCustomer) {
      redirectPath = "/customer-dashboard";
    }

    // Only navigate if we're on auth page (after login)
    if (location.pathname === "/auth") {
      navigate(redirectPath, { replace: true });
    }
  }, [user, loading, location.pathname, isPlatformAdmin, isTechnician, isAdmin, isCorner, isRiparatore, isCentroAdmin, isCentroTech, isCustomer, navigate]);

  return {
    getRedirectPath: () => {
      if (isPlatformAdmin) return "/platform-admin";
      if (isTechnician || isAdmin) return "/dashboard";
      if (isCentroAdmin || isCentroTech) return "/centro";
      if (isRiparatore) return "/riparatore";
      if (isCorner) return "/corner";
      return "/customer-dashboard";
    }
  };
};
