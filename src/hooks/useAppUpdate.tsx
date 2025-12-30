import { useState, useEffect, useCallback } from "react";
import { APP_VERSION, GITHUB_REPO } from "@/config/appVersion";

interface UpdateInfo {
  updateAvailable: boolean;
  latestVersion: string;
  currentVersion: string;
  downloadUrl: string;
  changelog: string;
  releaseDate: string;
  isChecking: boolean;
  error: string | null;
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
  }>;
}

const STORAGE_KEY = "app_update_dismissed";
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 ore

const compareVersions = (v1: string, v2: string): number => {
  const parts1 = v1.replace(/^v/, "").split(".").map(Number);
  const parts2 = v2.replace(/^v/, "").split(".").map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
};

export const useAppUpdate = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
    updateAvailable: false,
    latestVersion: "",
    currentVersion: APP_VERSION,
    downloadUrl: "",
    changelog: "",
    releaseDate: "",
    isChecking: false,
    error: null,
  });

  const [isDismissed, setIsDismissed] = useState(false);

  const checkForUpdates = useCallback(async (force = false) => {
    // Controlla se l'aggiornamento è già stato rimandato (solo se non forzato)
    if (!force) {
      try {
        const dismissedData = localStorage.getItem(STORAGE_KEY);
        if (dismissedData) {
          const { version, timestamp } = JSON.parse(dismissedData);
          const hoursSinceDismissed = (Date.now() - timestamp) / (1000 * 60 * 60);
          // Se è stato rimandato meno di 24 ore fa per la stessa versione, non mostrare
          if (hoursSinceDismissed < 24) {
            setIsDismissed(true);
            return;
          }
        }
      } catch (e) {
        console.log('Error reading localStorage:', e);
      }
    }

    // Verifica che il repo sia configurato
    if (!GITHUB_REPO || GITHUB_REPO.includes("YOUR_GITHUB")) {
      console.log("GitHub repo not configured for updates");
      return;
    }

    setUpdateInfo((prev) => ({ ...prev, isChecking: true, error: null }));

    try {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // Nessuna release disponibile
          setUpdateInfo((prev) => ({
            ...prev,
            isChecking: false,
            updateAvailable: false,
          }));
          return;
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const release: GitHubRelease = await response.json();
      const latestVersion = release.tag_name.replace(/^v/, "");
      
      // Trova l'APK negli assets
      const apkAsset = release.assets.find(
        (asset) => asset.name.endsWith(".apk")
      );

      const isNewer = compareVersions(latestVersion, APP_VERSION) > 0;

      setUpdateInfo({
        updateAvailable: isNewer,
        latestVersion,
        currentVersion: APP_VERSION,
        downloadUrl: apkAsset?.browser_download_url || "",
        changelog: release.body || "Nuova versione disponibile",
        releaseDate: release.published_at,
        isChecking: false,
        error: null,
      });

      setIsDismissed(false);
    } catch (error) {
      console.error("Error checking for updates:", error);
      setUpdateInfo((prev) => ({
        ...prev,
        isChecking: false,
        error: error instanceof Error ? error.message : "Errore sconosciuto",
      }));
    }
  }, []);

  const dismissUpdate = useCallback((version: string) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      console.log('Error saving to localStorage:', e);
    }
    setIsDismissed(true);
  }, []);

  const clearDismissal = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.log('Error removing from localStorage:', e);
    }
    setIsDismissed(false);
  }, []);

  // Controllo iniziale all'avvio
  useEffect(() => {
    checkForUpdates();

    // Controllo periodico
    const intervalId = setInterval(() => {
      checkForUpdates();
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [checkForUpdates]);

  return {
    ...updateInfo,
    isDismissed,
    checkForUpdates,
    dismissUpdate,
    clearDismissal,
    showUpdateDialog: updateInfo.updateAvailable && !isDismissed,
  };
};
