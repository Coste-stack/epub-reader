import React, { useEffect, useState } from "react";
import { type Book } from "../../util/Database/BackendDB";
import { useNavigate } from 'react-router-dom';
import { AppLogger as logger } from "../../util/Logger";
import { DownloadUploadButton } from "./DownloadUploadButton";

type BookListProps = {
  books: Book[];
};

export const BookList: React.FC<BookListProps> = ({ books }) => (
  <ul className="book-list">
    {books.map(book => <BookListItem key={book.id} book={book} />)}
  </ul>
);

const BookListItem: React.FC<{ book: Book }> = ({ book }) => {
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined);
  const [fileBlob, setFileBlob] = useState<Blob | undefined>(book.fileBlob);
  
  const navigate = useNavigate();

  // Get cover url from blob
  useEffect(() => {
    if (book.coverBlob) {
      const url = URL.createObjectURL(book.coverBlob);
      setCoverUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [book.coverBlob]);

  // Navigate to epub viewer
  const handleBookClick = () => {    
    if (fileBlob) {
      navigate(`/viewer/${book.id}`);
    } else {
      logger.warn("Trying to view a book without a file");
    }
  }

  return (
    <li className="book">
      {coverUrl && (
        <div className="cover" onClick={handleBookClick}>
          <img src={coverUrl} alt={`${book.title} Cover`} />
        </div>
      )}
      <div className="details">
        <div className="info">
          <p className="title">{book.title}</p>
          <p className="author">{book.author}</p>
        </div>
        <DownloadUploadButton
          fileBlob={fileBlob}
          setFileBlob={setFileBlob}
          book={book}
        />
      </div>
    </li>
  );
};