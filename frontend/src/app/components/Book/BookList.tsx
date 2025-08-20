import React, { useEffect, useState } from "react";
import { getAllBooks, type Book } from "../../util/Books";
import { BookApiLog as logger } from "../../util/Logger";

export const BookList: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    getAllBooks().then(data => {
      logger.debug('Books from API:', data);
      setBooks(data)
    });
  }, []);

  return (
    <ul>
      {books.map((book) => (
        <li key={book.id}>
          <strong>{book.title}</strong> by {book.author}
        </li>
      ))}
    </ul>
  );
};