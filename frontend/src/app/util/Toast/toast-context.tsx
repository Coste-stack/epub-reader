import { createContext, useContext } from "react";

export type ToastNotificationVariant = "error" | "info" | "warning" | "success";

export type ToastContextValue = {
  open: (message: string, type?: ToastNotificationVariant) => void;
  close: (id: number) => void;
};

// Create the context with initial value null
export const ToastContext = createContext<ToastContextValue | null>(null);

// Custom hook for consuming the toast context
export const useToast = () => useContext(ToastContext);