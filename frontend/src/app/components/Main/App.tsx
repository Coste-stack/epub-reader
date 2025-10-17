import './App.css'
import { useCallback, useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { handleOnlineRefresh, handleOfflineRefresh } from "../../util/BackendAPI/BookSync";
import { BackendProvider, useBackend } from '../../util/BackendAPI/BackendContext';
import { type Book } from '../../util/Database/BackendDB';
import { BookList } from '../Book/BookList'
import EpubUploader from '../Epub/EpubUploader'
import EpubViewer from '../Epub/EpubViewer';

type HeaderProps = {
  refreshBooks: (silent?: boolean) => void;
};

function Header({ refreshBooks }: HeaderProps) {
  return (
    <header>
      <EpubUploader onUpload={refreshBooks} />
    </header>
  )
}

function AppContent() {
  const [books, setBooks] = useState<Book[]>([]);
  const { backendAvailable, refreshBackendStatus } = useBackend();

  const refreshBooks = useCallback((silent: boolean = false) => {
    if (navigator.onLine) {
      refreshBackendStatus(silent);
      if (backendAvailable) {
        handleOnlineRefresh();
      }
      handleOfflineRefresh(setBooks);
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
    <div id="app-content">
      <Header refreshBooks={refreshBooks} />
      <main>
        <BookList books={books} />
      </main>
    </div>
  )
}

function App() {
  return (
    <BackendProvider>
      <Routes>
        <Route
          path="/"
          element={<AppContent/>}
        />
        <Route
          path="/viewer/:bookId"
          element={<EpubViewer />}
        />
      </Routes>
    </BackendProvider>
  )
}

export default App
