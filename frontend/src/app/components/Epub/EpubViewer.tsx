import React, { useEffect, useState } from "react";
import JSZip from "jszip";
import { EpubAppLogger as logger } from "../../util/Logger";
import { processZip, type Chapter } from "../../util/EpubUtil";
import { useParams } from "react-router-dom";
import type { Book } from "../../util/Database/BackendDB";
import { ClientDB } from "../../util/Database/ClientDB";

type EpubViewerProps = {
  url?: string;
  maxChapters?: number;
};

// Returns true if the HTML contains only empty or invisible elements
function isHtmlVisuallyEmpty(html: string) {
  // Create a DOM node to parse HTML
  const doc = document.createElement("div");
  doc.innerHTML = html;

  if (doc.textContent && doc.textContent.trim().length > 0) {
    return false; // Has visible text
  }
  return true;
}

const EpubViewer: React.FC<EpubViewerProps> = ({ maxChapters = 10 }) => {
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { bookId } = useParams();

  // Fetch book from db
  useEffect(() => {
    const fetchBook = async () => {
      const foundBook = await ClientDB.getBookById(Number(bookId));
      if (!foundBook) throw new Error(`Error fetching book with ID ${bookId} from local db`);
      setBook(foundBook);
    }

    try {
      if (!bookId) throw new Error("Book ID is null, cannot fetch from db");
      fetchBook();
    } catch (err) {
      setError((err instanceof Error ? err.message : String(err)));
      logger.error(err);
      return;
    }
  }, [bookId]);

  // Fetch from file url and process the epub
  useEffect(() => {
    const fetchAndProcess = async () => {
      setError(null);
      setChapters([]);

      logger.debug(book);
      if (!book?.fileBlob) throw new Error(`No file blob found in book object of ID ${bookId}`);
      const fileUrl = URL.createObjectURL(book.fileBlob);
      logger.info("Fetching EPUB from URL:", fileUrl);

      try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const blob = await response.blob();
        logger.debug("EPUB blob size:", blob.size);

        const zip = await JSZip.loadAsync(blob);
        logger.debug("Loaded zip, files:", Object.keys(zip.files));

        const chapters = await processZip(zip, maxChapters);
        setChapters(chapters);
      } catch (err) {
        logger.error("Error reading EPUB from:", err);
        setError("Error reading EPUB: " + (err instanceof Error ? err.message : String(err)));
      }
    };

    if (book) {
      fetchAndProcess();
    }
  }, [book, maxChapters]);

  return (
    <div>
      {error && <div style={{ color: "red" }}>{error}</div>}
      {chapters
        .filter(ch => ch.content && !isHtmlVisuallyEmpty(ch.content))
        .map((ch, idx) => (
          <div key={ch.name || idx}>
            <div
              style={{
                border: "1px solid #ccc",
                padding: 12,
                marginBottom: 20,
                borderRadius: 4,
                overflowX: "auto"
              }}
              dangerouslySetInnerHTML={{ __html: ch.content }}
            />
          </div>
      ))}
    </div>
  );
};

export default EpubViewer;