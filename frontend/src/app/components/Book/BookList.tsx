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
  const [fileBlob, setFileBlob] = useState<Blob | undefined>(book.fileBlob);
  
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
    if (fileBlob) {
      const url = URL.createObjectURL(fileBlob);
      setFileUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [fileBlob]);

  // Navigate to epub viewer
  const handleBookClick = () => {    
    if (fileBlob) {
      navigate(`/viewer/${book.id}`);
    } else {
      AppLogger.warn("Trying to view a book without a file");
    }
  }

  // Handle user file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUserFile(e.target.files[0]);
    }
  }
  const handleUploadClick = async () => {
    if (book.id && userFile) {
      ClientDB.updateBookFile(book.id, userFile)
        .then(() => {
          setFileBlob(userFile);
        });
    }
  }

  // Handle user file download
  const handleDownloadClick = () => {
    if (fileUrl && fileBlob) {
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = `${book.title}.epub`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      AppLogger.warn("File does not exist for download");
    }
  }

  const handleDeleteClick = async () => {
    if (book.id) {
      await ClientDB.deleteBookFileBlob(book.id);
      setFileBlob(undefined);
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
          <button className="book-button" onClick={handleDownloadClick}>Download</button>
          <button className="book-button" onClick={handleDeleteClick}>Delete</button>
          </>
        ) : (
          <>
            <input
              type="file"
              accept=".epub"
              onChange={handleFileChange}
            />
            <button className="book-button" onClick={handleUploadClick}>Upload</button>
          </>
        )}
      </div>
    </li>
  );
};