import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useToast } from "../Toast/toast-context";
import { AppLogger } from "../Logger";
import { isBackendUp } from "./BackendConnection";

type BackendContextValue = {
  backendAvailable: boolean;
  refreshBackendStatus: (silent: boolean) => void;
};

export const BackendContext = createContext<BackendContextValue | undefined>(undefined);

export const useBackend = () => {
  const ctx = useContext(BackendContext);
  if (!ctx) throw new Error('useBackend must be used within BackendProvider');
  return ctx;
};

export const BackendProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const toast = useToast();
  const [backendAvailable, setBackendAvailable] = useState(false);

  // Called when backend is up
  const handleBackendUp = useCallback((silent: boolean) => {
    setBackendAvailable(true);
    AppLogger.info("Backend reconnected");
    if (!silent) {
      toast?.open("Backend reconnected", "success");   
    }
  }, []);

  // Called when backend is down
  const handleBackendDown = useCallback((silent: boolean) => {
    setBackendAvailable(false);
    AppLogger.warn("Backend status is down - Falling back to offline mode");
    if (!silent) {
      toast?.open("Backend status is down", "error");
      toast?.open("Falling back to offline mode", "info");
    }
  }, []);

  const refreshBackendStatus = useCallback((silent: boolean) => {
    isBackendUp()
      .then((isUp) => 
        isUp ? handleBackendUp(silent) : handleBackendDown(silent)
    );
  }, [handleBackendUp, handleBackendDown]);

  const contextValue = useMemo(() => ({
    backendAvailable, 
    refreshBackendStatus
}), [backendAvailable, refreshBackendStatus]);

  return (
    <BackendContext.Provider value={contextValue}>
      {children}
    </BackendContext.Provider>
  );
}
