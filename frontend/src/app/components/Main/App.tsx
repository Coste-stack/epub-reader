import './App.css'
import { BookList } from '../Book/BookList'
import EpubUploader from '../Epub/EpubUploader'
import { useCallback, useEffect, useState } from 'react';
import { type Book } from '../../util/Database/BackendDB';
import { handleOnlineRefresh, handleOfflineRefresh } from "../../util/BackendAPI/BookSync";
import { BackendProvider, useBackend } from '../../util/BackendAPI/BackendContext';

function AppContent() {
  const [books, setBooks] = useState<Book[]>([]);
  const { backendAvailable, refreshBackendStatus } = useBackend();

  const refreshBooks = useCallback((silent: boolean = false) => {
    if (navigator.onLine) {
      refreshBackendStatus(silent);
      const refresh = backendAvailable ? handleOnlineRefresh : handleOfflineRefresh;
      refresh(setBooks);
    } else {
      handleOfflineRefresh(setBooks);
    }
  }, [backendAvailable, refreshBackendStatus]);

  useEffect(() => {
    refreshBooks();
    const handleOnline = () => refreshBooks();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refreshBooks]);

  return (
    <>
      <EpubUploader onUpload={refreshBooks} />
      <BookList books={books} />
    </>
  )
}

function App() {
  return (
    <BackendProvider>
      <AppContent/>
    </BackendProvider>
  )
}

export default App
