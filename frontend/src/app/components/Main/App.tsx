import './App.css'
import { BookList } from '../Book/BookList'
import EpubUploader from '../Epub/EpubUploader'
import { useCallback, useEffect, useState } from 'react';
import { getAllBooks, type Book } from '../../util/Books';
import { BookApiLogger, AppLogger } from '../../util/Logger';

function App() {
  const [books, setBooks] = useState<Book[]>([]);

  const refreshBooks = useCallback(() => {
    getAllBooks().then(data => {
      BookApiLogger.debug('Books from API:', data);
      AppLogger.info("Books refreshed");
      setBooks(data);
    });
  }, []);

  useEffect(() => {
    refreshBooks();
  }, [refreshBooks]);
  
  return (
    <>
      <EpubUploader onUpload={refreshBooks} />
      <BookList books={books} />
    </>
  )
}

export default App
