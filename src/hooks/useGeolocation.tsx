import { useState, useCallback } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    loading: false,
    error: null,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: "Geolocalizzazione non supportata" }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          loading: false,
          error: null,
        });
      },
      (error) => {
        let errorMessage = "Errore nella geolocalizzazione";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Permesso negato per la geolocalizzazione";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Posizione non disponibile";
            break;
          case error.TIMEOUT:
            errorMessage = "Timeout nella richiesta di posizione";
            break;
        }
        setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  return { ...state, requestLocation };
}
