import React, { useState } from "react";
import JSZip from "jszip";
import { readContentOpf, extractOpfData } from "./EpubUtil";
import { EpubAppLog as logger } from "./logger";
import { addBook, type Book } from "./assets/api/books";

const EpubUploader: React.FC<{}> = () => {
  const [error, setError] = useState<string | null>(null);

  // input handler for manual file upload
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    logger.debug("Manual file upload:", file.name, "size:", file.size);

    try {
      const zip = await JSZip.loadAsync(file);
      logger.debug("Loaded zip from file, files:", Object.keys(zip.files));
      readContentOpf(zip).then(data => logger.trace(data)); // hidden - for debug
      extractOpfData(zip).then(async data => {
        logger.info("Trying to add book");
        logger.debug(data);
        await addBook(data as Book);
      });
    } catch (err) {
      logger.error("Error uploading EPUB from file:", err);
      setError("Error uploading EPUB: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div>
      <input type="file" accept=".epub" onChange={handleFile} />
      {error && <div style={{ color: "red" }}>{error}</div>}
    </div>
  );
};

export default EpubUploader;