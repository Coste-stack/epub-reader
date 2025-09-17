import React, { useEffect, useState } from "react";
import { BackendDB, type Book } from "../../util/Database/BackendDB";
import { useNavigate } from 'react-router-dom';
import { ClientDB } from "../../util/Database/ClientDB";
import { AppLogger as logger } from "../../util/Logger";
import { handleDbOperations } from "../../util/BackendAPI/BookSync";
import { useToast } from "../../util/Toast/toast-context";
import { useBackend } from "../../util/BackendAPI/BackendContext";

type BookListProps = {
  books: Book[];
};

export const BookList: React.FC<BookListProps> = ({ books }) => (
  <ul>
    {books.map(book => <BookListItem key={book.id} book={book} />)}
  </ul>
);

const BookListItem: React.FC<{ book: Book }> = ({ book }) => {
  const backendContext = useBackend();
  const toast = useToast();
  
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
      logger.warn("Trying to view a book without a file");
    }
  }

  const backendOperations = async (): Promise<boolean> => {
    if (!book || !userFile) return false;
    try {
      logger.info("Updating book file in backend database");
      await BackendDB.uploadFileBlob(book);
      return true;
    } catch (error) {
      logger.warn("Failed updating book file to backend:", error);
      return false;
    }
  }

  const clientOperations = async (book: Book | null): Promise<boolean> => {
    if (!book || !book.id || !userFile) return false;
    try {
      logger.info("Updating book file in client database");
      await ClientDB.updateBookAttributes(book.id, { fileBlob: userFile });
      setFileBlob(userFile);
      return true;
    } catch (error) {
      logger.warn("Failed updating book file to client:", error);
      return false;
    }
  }

  const uploadBookFile = () => handleDbOperations({
    backendContext,
    toast,
    backendOperations: () => backendOperations(), 
    clientOperations: () => clientOperations(book),
    silent: false
  });

  // Handle user file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUserFile(e.target.files[0]);
    }
  }
  const handleUploadClick = async () => {
    uploadBookFile();
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
      logger.warn("File does not exist for download");
    }
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
      <div className="book-handle">
        {fileUrl ? (
          <button className="book-button" onClick={handleDownloadClick}>Download</button>
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