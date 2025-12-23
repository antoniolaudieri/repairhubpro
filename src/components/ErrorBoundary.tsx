import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo: errorInfo.componentStack || null });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReload = async () => {
    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Clear localStorage auth data (with try-catch for Android WebView)
      try {
        const keysToRemove = Object.keys(localStorage).filter(key => 
          key.includes('supabase') || key.includes('auth')
        );
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } catch (storageError) {
        console.error('localStorage clear error:', storageError);
      }
      
      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }
    } catch (e) {
      console.error('Clear cache error:', e);
    }
    
    // Hard reload
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              Qualcosa è andato storto
            </h1>
            <p className="text-muted-foreground text-sm">
              Si è verificato un errore. Prova a ricaricare l'applicazione.
            </p>
            
            <div className="flex flex-col gap-2">
              <Button onClick={this.handleReload} className="gap-2 w-full">
                <RefreshCw className="h-4 w-4" />
                Ricarica App
              </Button>
              
              <Button 
                onClick={this.handleClearAndReload} 
                variant="outline" 
                className="gap-2 w-full"
              >
                <Trash2 className="h-4 w-4" />
                Cancella Cache e Riprova
              </Button>
            </div>
            
            {/* Always show error details to help debug on Android */}
            {this.state.error && (
              <details className="text-left mt-4 p-3 bg-muted rounded-lg text-xs">
                <summary className="cursor-pointer font-medium">Dettagli errore</summary>
                <pre className="mt-2 whitespace-pre-wrap text-destructive overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
