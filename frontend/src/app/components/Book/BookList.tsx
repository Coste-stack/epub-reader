import React, { useEffect, useState } from "react";
import type { Book } from "../../util/Database/BackendDB";
import { useNavigate } from 'react-router-dom';
import { ClientDB } from "../../util/Database/ClientDB";
import { AppLogger } from "../../util/Logger";

type BookListProps = {
  books: Book[];
};

export const BookList: React.FC<BookListProps> = ({ books }) => (
  <ul>
    {books.map(book => <BookListItem key={book.id} book={book} />)}
  </ul>
);

const BookListItem: React.FC<{ book: Book }> = ({ book }) => {
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined);
  const [fileUrl, setFileUrl] = useState<string | undefined>(undefined);
  const [userFile, setUserFile] = useState<File | undefined>(undefined);
  const navigate = useNavigate();

  // Get cover url
  useEffect(() => {
    if (book.coverBlob) {
      const url = URL.createObjectURL(book.coverBlob);
      setCoverUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [book.coverBlob]);

  // Get file url
  useEffect(() => {
    if (book.fileBlob) {
      const url = URL.createObjectURL(book.fileBlob);
      setFileUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [book.fileBlob]);

  // Navigate to epub viewer
  const handleBookClick = () => {    
    navigate(`/viewer/${book.id}`);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUserFile(e.target.files[0]);
    }
  }

  const handleFileUpload = async () => {
    if (book.id && userFile) {
      ClientDB.updateBookFile(book.id, userFile)
        .then(() => {
          book.fileBlob = userFile;
        });
    }
  }

  const handleFileDelete = async () => {
    if (book.id) {
      await ClientDB.deleteBookFileBlob(book.id);
    }
  };

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
      <div className="book-handle">
        {fileUrl ? (
          <>
          <a
            href={fileUrl}
            download={`${book.title}.epub`}
          >
            <button className="book-button">Download</button>
          </a>
          <button className="book-button" onClick={handleFileDelete} style={{marginLeft: '8px'}}>Delete</button>
          </>
        ) : (
          <>
            <input
              type="file"
              accept=".epub"
              onChange={handleFileChange}
            />
            <button className="book-button" onClick={handleFileUpload}>Upload</button>
          </>
        )}
      </div>
    </li>
  );
};