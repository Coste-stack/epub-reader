import React, { useEffect, useState } from "react";
import type { Book } from "../../util/Database/BackendDB";

type BookListProps = {
  books: Book[];
};

export const BookList: React.FC<BookListProps> = ({ books }) => (
  <ul>
    {books.map(book => <BookListItem key={book.id} book={book} />)}
  </ul>
);

const BookListItem: React.FC<{ book: Book }> = ({ book }) => {
  const [coverUrl, setCoverUrl] = useState<string | undefined>();

  useEffect(() => {
    if (book.coverBlob) {
      const url = URL.createObjectURL(book.coverBlob);
      setCoverUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [book.coverBlob]);

  return (
    <li>
      {coverUrl && (
        <img src={coverUrl} alt={`${book.title} Cover`} style={{ width: 100, height: "auto" }} />
      )}
      <strong>{book.title}</strong> by {book.author}
      <button className="upload-button">Upload</button>
    </li>
  );
};