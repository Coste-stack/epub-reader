import JSZip from "jszip";
import { readContentOpf, extractOpfData } from "../../util/EpubUtil";
import { EpubAppLog as logger } from "../../util/Logger";
import { addBook, type Book } from "../../util/Books";
import { useToast } from "../../util/Toast/toast-context";

const EpubUploader: React.FC<{}> = () => {
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
      toast?.open("Book added successfully!", "success");
    } catch (err) {
      // Log the error
      let message: string = "Error uploading EPUB";
      logger.error(message + " from file:", err);
      // Extract a user friendly message
      if (err instanceof Error && typeof err.message === "string") {
        // Split by colon and trim whitespace, get the last part
        const parts = err.message.split(":");
        message = parts[parts.length - 1].trim();
      }
      toast?.open(message, "error");
    }
  };

  return (
    <div>
      <input type="file" accept=".epub" onChange={handleFile} />
    </div>
  );
};

export default EpubUploader;