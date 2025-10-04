import React, { useEffect, useState } from "react";
import { BackendDB, type Book } from "../../util/Database/BackendDB";
import { ClientDB } from "../../util/Database/ClientDB";
import { AppLogger as logger } from "../../util/Logger";
import { handleDbOperations } from "../../util/BackendAPI/BookSync";
import { useToast } from "../../util/Toast/toast-context";
import { useBackend } from "../../util/BackendAPI/BackendContext";

type DownloadUploadButtonProps = {
  fileBlob: Blob | undefined;
  setFileBlob: React.Dispatch<React.SetStateAction<Blob | undefined>>;
  book: Book;
};

export const DownloadUploadButton: React.FC<DownloadUploadButtonProps> = ({ fileBlob, setFileBlob, book }) => {
  const backendContext = useBackend();
  const toast = useToast();
  const [userFile, setUserFile] = useState<File | undefined>(undefined);
  const [fileUrl, setFileUrl] = useState<string | undefined>(undefined);

  // Get file url from blob
  useEffect(() => {
    if (fileBlob) {
      const url = URL.createObjectURL(fileBlob);
      setFileUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [fileBlob]);

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
    <div className="book-handler">
      {fileUrl ? (
        <button className={`${"book-button"} ${"download"}`} onClick={handleDownloadClick}>
          <img src="assets/download_black.png" alt="Download"/>
        </button>
      ) : (
        <>
          <input
            type="file"
            accept=".epub"
            onChange={handleFileChange}
          />
          <button className={`${"book-button"} ${"upload"}`} onClick={handleUploadClick}>
            <img src="assets/upload_black.png" alt="Upload"/>
          </button>
        </>
      )}
    </div>
  )
}
