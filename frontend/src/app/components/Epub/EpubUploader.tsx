import JSZip from "jszip";
import { readContentOpf, extractOpfData } from "../../util/EpubUtil";
import { EpubAppLogger as logger } from "../../util/Logger";
import { addBook, uploadCoverBlob, type Book } from "../../util/Database/BackendDB";
import { useToast } from "../../util/Toast/toast-context";
import { extractUserMessage } from "../../util/ExtractUserMessage";
import { saveBookToDb } from "../../util/Database/ClientDB";

type EpubUploaderProps = {
  onUpload: () => void;
};

const EpubUploader: React.FC<EpubUploaderProps> = ({ onUpload }) => {
  const toast = useToast();

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
      // Add the book via API
      logger.info("Trying to add book");
      await addBook(data as Book);
      logger.info("Trying to upload cover blob");
      await uploadCoverBlob(data as Book);
      //await saveBookToDb(data as Book);
      
      toast?.open("Book added successfully!", "success");
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