import './App.css'
import { BookList } from '../Book/BookList'
import EpubUploader from '../Epub/EpubUploader'
import { useCallback, useEffect, useState } from 'react';
import { type Book } from '../../util/Books';
import { handleOnlineRefresh, handleOfflineRefresh } from "../../util/BookSync";

function App() {
  const [books, setBooks] = useState<Book[]>([]);

  const refreshBooks = useCallback(() => {
    if (navigator.onLine) {
      handleOnlineRefresh(setBooks);
    } else {
      handleOfflineRefresh(setBooks);
    }
  }, []);

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
