import JSZip from "jszip";
import { readContentOpf, extractOpfData } from "../../util/EpubUtil";
import { EpubAppLogger as logger } from "../../util/Logger";
import { useToast, type ToastNotificationVariant } from "../../util/Toast/toast-context";
import { extractUserMessage } from "../../util/ExtractUserMessage";
import { useBackend } from "../../util/BackendAPI/BackendContext";
import { BackendDB, type Book } from "../../util/Database/BackendDB";
import { ClientDB } from "../../util/Database/ClientDB";

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
      logger.debug("Book data: " + data);

      // Add the book
      interface ToastStatus {
        addedToBackend: boolean;
        addedLocally: boolean;
        toastMsg: string;
        toastType: ToastNotificationVariant;
      }
      const status: ToastStatus = {
        addedToBackend: false,
        addedLocally: false,
        toastMsg: "",
        toastType: "success"
      };

      if (navigator.onLine) {
        refreshBackendStatus(true);
        if (backendAvailable) {
          try {
            logger.info("Adding book to backend database");
            await BackendDB.addBook(data as Book);
            logger.info("Uploading cover blob");
            await BackendDB.uploadCoverBlob(data as Book);
            status.addedToBackend = true;
          } catch (error) {
            logger.warn("Failed adding book to backend:", error);
          }
        }
      }

      try {
        logger.info("Adding book to client database");
        await ClientDB.addBook(data as Book);
        status.addedLocally = true;
      } catch (error) {
        logger.error("Failed adding book to client database:", error);
        status.toastMsg = "Failed to add book to client database";
        status.toastType = "error";
      }

      if (status.addedToBackend && status.addedLocally) {
        status.toastMsg = "Book added successfully!";
      } else if (!status.addedToBackend && status.addedLocally && navigator.onLine) {
        status.toastMsg = "Book added locally (backend unavailable)";
      } else if (!navigator.onLine && status.addedLocally) {
        status.toastMsg = "Book added locally (offline mode)";
      }

      if (status.toastMsg) toast?.open(status.toastMsg, status.toastType);

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