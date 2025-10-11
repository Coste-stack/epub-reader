import { useEffect, useState } from "react";
import JSZip from "jszip";
import { EpubAppLogger as logger } from "../../util/Logger";
import { getChapterRefs, type ChapterRef } from "../../util/EpubUtil";
import { useParams } from "react-router-dom";
import { type Book } from "../../util/Database/BackendDB";
import { ClientDB } from "../../util/Database/ClientDB";

export function useBookLoader(
  setError: React.Dispatch<React.SetStateAction<string | null>>
) {
  const [book, setBook] = useState<Book | null>(null);
  const { bookId } = useParams();

  const [zip, setZip] = useState<JSZip | null>(null);
  const [chapterRefs, setChapterRefs] = useState<ChapterRef[]>([]);
  const [chapterStartIndex, setChapterStartIndex] = useState<number>(0);
  
  // Fetch book from db by using ID
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

  // Fetch from epub file url and get the chapters' contents
  useEffect(() => {
    const fetchAndProcess = async () => {
      logger.debug(book);
      if (!book?.fileBlob) throw new Error(`No file blob found in book object of ID ${bookId}`);
      const fileUrl = URL.createObjectURL(book.fileBlob);
      logger.info("Fetching EPUB from URL:", fileUrl);

      try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const blob = await response.blob();
        const fetchedZip = await JSZip.loadAsync(blob);
        const foundChapters = await getChapterRefs(fetchedZip);

        const startIndex = (book && typeof book.progress === "number") 
          ? Math.floor(book.progress) 
          : 0;

        const chapters = foundChapters.slice(startIndex);

        setZip(fetchedZip);
        setChapterRefs(chapters);
        setChapterStartIndex(startIndex)
      } catch (err) {
        logger.error("Error reading EPUB from:", err);
        setError("Error reading EPUB: " + (err instanceof Error ? err.message : String(err)));
      }
    };

    if (book) {
      fetchAndProcess();
    }
  }, [book]);

  return { book, zip, chapterRefs, chapterStartIndex }
}