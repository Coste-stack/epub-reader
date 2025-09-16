import React, { useCallback, useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { EpubAppLogger as logger } from "../../util/Logger";
import { getChapterRefs, getChapterContent, type Chapter, type ChapterRef } from "../../util/EpubUtil";
import { useParams } from "react-router-dom";
import type { Book } from "../../util/Database/BackendDB";
import { ClientDB } from "../../util/Database/ClientDB";
import InfiniteScroll from "../../util/InfiniteScroll/InfiniteScroll";

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

const CHAPTER_NUMBER_TO_LOAD = 10;

const EpubViewer: React.FC = () => {
  const [book, setBook] = useState<Book | null>(null);
  const [zip, setZip] = useState<JSZip | null>(null);

  const [chapterRefs, setChapterRefs] = useState<ChapterRef[]>([]);
  const [loadedChapters, setLoadedChapters] = useState<Chapter[]>([]);
  const [visibleChapterCount, setVisibleChapterCount] = useState<number>(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  const [error, setError] = useState<string | null>(null);
  const { bookId } = useParams();

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
        logger.debug("EPUB blob size:", blob.size);

        const fetchedZip = await JSZip.loadAsync(blob);
        logger.debug("Loaded zip, files:", Object.keys(fetchedZip.files));

        const chapters = await getChapterRefs(fetchedZip);
        setZip(fetchedZip);
        setChapterRefs(chapters);
        setVisibleChapterCount(CHAPTER_NUMBER_TO_LOAD);
      } catch (err) {
        logger.error("Error reading EPUB from:", err);
        setError("Error reading EPUB: " + (err instanceof Error ? err.message : String(err)));
      }
    };

    if (book) {
      fetchAndProcess();
    }
  }, [book]);

  // Fetch chapter content
  useEffect(() => {
    if (!zip) return;
    if (chapterRefs.length === 0) return;

    const loadChapters = async () => {
      const needToLoad = chapterRefs.slice(loadedChapters.length, visibleChapterCount);
      if (needToLoad.length === 0) return;
      const newChapters = await Promise.all(
        needToLoad.map(async (ref) => ({
          name: ref.name,
          content: await getChapterContent(zip, ref)
        }))
      );
      setLoadedChapters(prev => [...prev, ...newChapters]);
    };

    loadChapters();
  }, [zip, chapterRefs, visibleChapterCount]);

  const handleLoadMore = useCallback(() => {
    setVisibleChapterCount(count => Math.min(count + CHAPTER_NUMBER_TO_LOAD, chapterRefs.length));
  }, [chapterRefs.length]);

  const chapterList = loadedChapters
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
  ));

  // Get reading progress from scroll
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const maxScroll = scrollHeight - clientHeight;
    const newProgress = maxScroll > 0 ? scrollTop / maxScroll : 0;
    setScrollProgress(newProgress);
  }

  const getCalculatedProgress = () => {
    return (scrollProgress * loadedChapters.length) / chapterRefs.length;
  }

  return (
    <div>
      {error && <div style={{ color: "red" }}>{error}</div>}
      <div style={{ 
        margin: "16px 0", 
        position: "fixed",
        left: 0,
        bottom: 0,  
      }}>
        <progress value={getCalculatedProgress()} max={1} />
        <div>
          {Math.round(getCalculatedProgress() * 100)}% read
        </div>
      </div>
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ height: "80vh", overflowY: "auto" }}
      >
        <InfiniteScroll 
          listItems={chapterList}
          lastRowHandler={handleLoadMore}  
        />
      </div>
    </div>
  );
};

export default EpubViewer;