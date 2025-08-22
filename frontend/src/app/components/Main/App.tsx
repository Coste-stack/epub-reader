import './App.css'
import { BookList } from '../Book/BookList'
import EpubUploader from '../Epub/EpubUploader'
import { useCallback, useEffect, useRef, useState } from 'react';
import { type Book } from '../../util/BackendAPI/Books';
import { handleOnlineRefresh, handleOfflineRefresh } from "../../util/BackendAPI/BookSync";
import { isBackendUp } from '../../util/BackendAPI/BackendConnection';
import { useToast } from '../../util/Toast/toast-context';
import { AppLogger } from '../../util/Logger';

function App() {
  const toast = useToast();
  const [books, setBooks] = useState<Book[]>([]);

  const [backendAvailable, setBackendAvailable] = useState<boolean>(true);
  // Use ref to always get the latest backendAvailable value inside interval
  const backendAvailableRef = useRef(backendAvailable);

  useEffect(() => {
    backendAvailableRef.current = backendAvailable;
  }, [backendAvailable]);

  const handleBackendUp = () => {
    setBackendAvailable(true);
    handleOnlineRefresh(setBooks);
  }

  const handleBackendDown = () => {
    setBackendAvailable(false);
    AppLogger.warn("Backend status is down - Falling back to offline mode");
    toast?.open("Backend status is down", "error");
    toast?.open("Falling back to offline mode", "info")
    handleOfflineRefresh(setBooks);
  }
  
  // Try reconnecting without notifications
  const trySilentBackendReconnect = () => {
    isBackendUp().then((isUp) => {
      if (isUp) {
        AppLogger.info("Backend reconnected");
        toast?.open("Backend reconnected", "success");      
        handleBackendUp();
      } else {
        setBackendAvailable(false);
      }
    });
  }

  const refreshBooks = useCallback(() => {
    if (navigator.onLine && backendAvailable) {
      isBackendUp()
        .then((isUp) => isUp ? handleBackendUp() : handleBackendDown())
        .catch(handleBackendDown);
    } else {
      handleOfflineRefresh(setBooks);
    }
  }, []);

  // Periodically try to reconnect if backend is not available
  const RECONNECTION_INTERVAL = Number(import.meta.env.VITE_BACKEND_RECONNECTION_INTERVAL) || 10000;
  useEffect(() => {
    if (!backendAvailable) {
      const interval = setInterval(() => {
        if (navigator.onLine) {
          trySilentBackendReconnect();
        }
      }, RECONNECTION_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [backendAvailable, trySilentBackendReconnect]);

  useEffect(() => {
    refreshBooks();
    window.addEventListener('online', refreshBooks);
    return () => window.removeEventListener('online', refreshBooks);
  }, [refreshBooks]);
  
  return (
    <>
      <EpubUploader onUpload={refreshBooks} />
      <BookList books={books} />
    </>
  )
}

export default App
