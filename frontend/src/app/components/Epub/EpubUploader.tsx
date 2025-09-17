import JSZip from "jszip";
import { readContentOpf, extractOpfData } from "../../util/EpubUtil";
import { EpubAppLogger as logger } from "../../util/Logger";
import { useToast } from "../../util/Toast/toast-context";
import { extractUserMessage } from "../../util/ExtractUserMessage";
import { useBackend } from "../../util/BackendAPI/BackendContext";
import { BackendDB, type Book } from "../../util/Database/BackendDB";
import { ClientDB } from "../../util/Database/ClientDB";
import { handleDbOperations } from "../../util/BackendAPI/BookSync";

type EpubUploaderProps = {
  onUpload: () => void;
};

const EpubUploader: React.FC<EpubUploaderProps> = ({ onUpload }) => {
  const toast = useToast();
  const { backendAvailable, refreshBackendStatus } = useBackend();

  // input handler for manual file upload
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    logger.debug("Manual file upload:", file.name, "size:", file.size);

    try {
      // Load the file
      const zip = await JSZip.loadAsync(file);
      logger.debug("Loaded zip from file, files:", Object.keys(zip.files));
      // Read the file contents
      const opfContent = await readContentOpf(zip);
      logger.trace(opfContent); // hidden - for debug
      const data = await extractOpfData(zip);
      const book: Book = {
        ...data,
        fileBlob: e.target.files?.[0]
      }
      logger.debug("Book data: " + book);

      const backendOperations = async (): Promise<boolean> => {
        try {
          logger.info("Adding book to backend database");
          await BackendDB.addBook(book);
          logger.info("Uploading cover blob");
          await BackendDB.uploadCoverBlob(book);
          return true;
        } catch (error) {
          logger.warn("Failed adding book to backend:", error);
          return false;
        }
      }

      const clientOperations = async (): Promise<boolean> => {
        try {
          logger.info("Adding book to client database");
          await ClientDB.addBook(book);
          return true;
        } catch (error) {
          logger.error("Failed adding book to client database:", error);
          return false;
        }
      }

      handleDbOperations({
        backendContext: {backendAvailable, refreshBackendStatus}, 
        toast, 
        backendOperations, 
        clientOperations
      });

      onUpload(); // Refresh books using GET API 
    } catch (err) {
      // Log the error
      let message: string = "Error uploading EPUB";
      logger.error(message + " from file:", err);
      toast?.open(extractUserMessage(err), "error");
    }
  };

  return (
    <div>
      <input type="file" accept=".epub" onChange={handleFile} />
    </div>
  );
};

export default EpubUploader;