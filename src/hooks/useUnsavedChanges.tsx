import { useState, useEffect, useCallback } from "react";
import { useBlocker } from "react-router-dom";

export function useUnsavedChanges(hasChanges: boolean) {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // Block navigation when there are unsaved changes
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasChanges && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === "blocked") {
      setShowDialog(true);
      setPendingNavigation(() => () => blocker.proceed());
    }
  }, [blocker]);

  // Also handle browser back/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  const confirmNavigation = useCallback(() => {
    setShowDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  }, [pendingNavigation]);

  const cancelNavigation = useCallback(() => {
    setShowDialog(false);
    setPendingNavigation(null);
    if (blocker.state === "blocked") {
      blocker.reset();
    }
  }, [blocker]);

  return {
    showDialog,
    confirmNavigation,
    cancelNavigation,
  };
}
