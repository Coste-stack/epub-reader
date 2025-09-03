import React, { useEffect, useState } from "react";
import type { Book } from "../../util/Database/BackendDB";
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

  // Get cover url
  useEffect(() => {
    if (book.coverBlob) {
      const url = URL.createObjectURL(book.coverBlob);
      setCoverUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [book.coverBlob]);

  // Navigate to epub viewer
  const handleBookClick = () => {    
    navigate(`/viewer/${book.id}`);
  }

  return (
    <li>
      <div 
        className="book" 
        onClick={handleBookClick}
      >
        {coverUrl && (
          <img src={coverUrl} alt={`${book.title} Cover`} style={{ width: 100, height: "auto" }} />
        )}
        <strong>{book.title}</strong> by {book.author}
      </div>
      <button className="upload-button">Upload</button>
    </li>
  );
};