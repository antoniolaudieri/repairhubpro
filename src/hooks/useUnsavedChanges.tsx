import { useState, useEffect, useCallback } from "react";

export function useUnsavedChanges(hasChanges: boolean) {
  const [showDialog, setShowDialog] = useState(false);

  // Handle browser back/refresh with beforeunload
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

  const promptIfUnsaved = useCallback(() => {
    if (hasChanges) {
      setShowDialog(true);
      return true; // Has unsaved changes
    }
    return false; // No unsaved changes
  }, [hasChanges]);

  const closeDialog = useCallback(() => {
    setShowDialog(false);
  }, []);

  return {
    showDialog,
    setShowDialog,
    promptIfUnsaved,
    closeDialog,
    hasChanges,
  };
}
