import { useEffect, useMemo, useRef, useState } from "react";
import { ToastContext } from "./toast-context";
import "./toast.css";

// Custom hook for running a callback after a specified timeout
const timeoutDelay: number = 3000;
function useTimeout(callbackFunction: () => void) {
  const savedCallback = useRef(callbackFunction);

  // Save the latest callback
  useEffect(() => {
    savedCallback.current = callbackFunction;
  }, [callbackFunction]);

  // Start the timeout on mount, clean up on unmount
  useEffect(() => {
    const functionId = setTimeout(() => savedCallback.current(), timeoutDelay);
    return () => clearTimeout(functionId);;
  }, []);
}

type NotificationVariant = "error" | "info" | "warning" | "success";

type ToastProperties = {
  message: string;
  close: () => void;
  type: NotificationVariant;
};


// Component with message,  close button and auto-close 
export function Toast({ message, close, type }: ToastProperties) {
  const [closing, setClosing] = useState(false);

  // Allow component to fade out (animation)
  const handleClose = () => {
    setClosing(true);
    setTimeout(close, 300);
  }

  useTimeout(() => {
    handleClose();
  });

  return (
    <div className={`toast${closing ? " fade-out" : ""} ${type}`} onClick={handleClose}>
      <div className="toast-bar" />
      <p>{message}</p>
      <button className="close-button" onClick={handleClose}>
        {"\u274C"}
      </button>
    </div>
  )
}

type ToastProviderProperties = {
  children: React.ReactElement;
};

type ToastState = {
  message: string;
  id: number;
  type: NotificationVariant;
};

// Stores and displays a list of toasts, and provides context
export function ToastProvider({ children }: ToastProviderProperties) {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  // Add a new toast to the list
  function openToast(message: string, type: NotificationVariant = "info") {
    const newToast = {
      id: Date.now(),
      message: message,
      type: type,
    };
    setToasts((prevToasts) => [...prevToasts, newToast]);
  }

  // Remove a toast by its id
  function closeToast(id: number) {
    setToasts((prevToasts) => 
      prevToasts.filter((toast) => toast.id !== id)
    );
  }

  // Memoize context value to avoid unnecessary renders
  const contextValue = useMemo(() => ({
    open: openToast,
    close: closeToast
  }), []);

  return (
    <>
      <ToastContext.Provider value={contextValue}>
        {children}
        <div className="toasts">
          {toasts && toasts.map(toast => {
            return (
              <Toast 
                key={toast.id} 
                message={toast.message} 
                close={() => closeToast(toast.id)}
                type={toast.type}
              />
            )
          })}
        </div>
      </ToastContext.Provider>
    </>
  )
}