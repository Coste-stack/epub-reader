import React, { useCallback, useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { EpubAppLogger as logger } from "../../util/Logger";
import { getChapterRefs, getChapterContent, type Chapter, type ChapterRef } from "../../util/EpubUtil";
import { useParams } from "react-router-dom";
import { BackendDB, type Book } from "../../util/Database/BackendDB";
import { ClientDB } from "../../util/Database/ClientDB";
import InfiniteScroll from "../../util/InfiniteScroll/InfiniteScroll";
import { useToast } from "../../util/Toast/toast-context";
import { handleDbOperations } from "../../util/BackendAPI/BookSync";
import { useBackend } from "../../util/BackendAPI/BackendContext";

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

const CHAPTER_NUMBER_TO_LOAD = 1;
const SCROLL_REFRESH_TIMEOUT = 1000;

const EpubViewer: React.FC = () => {
  const toast = useToast();
  const backendContext = useBackend();

  const [book, setBook] = useState<Book | null>(null);
  const [zip, setZip] = useState<JSZip | null>(null);

  const [chapterRefs, setChapterRefs] = useState<ChapterRef[]>([]);
  const [loadedChapters, setLoadedChapters] = useState<Chapter[]>([]);
  const [visibleChapterCount, setVisibleChapterCount] = useState<number>(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const scrollUpdateTimeout = useRef<number | null>(null);

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

        const foundChapters = await getChapterRefs(fetchedZip);
        const chapters = foundChapters.slice(book.progress ? book.progress : 0);
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

  useEffect(() => {
    const scrollToProgress = (targetProgress: number) => {
      const el = scrollContainerRef.current;
      if (!el || loadedChapters.length === 0) return;

      const chapterIndex = Math.floor(targetProgress);
      const chapterFraction = targetProgress - chapterIndex;

      const chapterElement = el.children[chapterIndex] as HTMLElement | undefined;
      if (!chapterElement) return;

      const chapterStart = chapterElement.offsetTop;
      const chapterHeight = chapterElement.offsetHeight;
      const scrollTop = chapterStart + chapterHeight * chapterFraction - el.clientHeight;

      el.scrollTo({ top: scrollTop, behavior: "smooth" });
    };
    
    if (loadedChapters.length > 0) {
      if (book && book.progress) {
        const decimalProgress = book.progress - Math.floor(book.progress);
        //console.log(decimalProgress);
        scrollToProgress(decimalProgress);
      }
    }
  }, [loadedChapters]);

  // Get reading progress from scroll
  const handleScroll = () => {
    // Skip if timeout is already sheduled
    if (scrollUpdateTimeout.current) return;

    const getScrollProgress = (): number | undefined => {
      const el = scrollContainerRef.current;
      if (!el || loadedChapters.length === 0) return;

      const children = Array.from(el.children);
      let chapterIndex = 0;
      let chapterFraction = 0;

      const visibleBottom = el.scrollTop + el.clientHeight;

      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i] as HTMLElement;
        const chapterStart = child.offsetTop;
        const chapterHeight = child.offsetHeight;
        //console.log({i, chapterStart, chapterHeight, visibleBottom});

        if (chapterStart <= visibleBottom) {
          chapterIndex = i;
          const scrollInChapter = Math.min(visibleBottom - chapterStart, chapterHeight);
          //console.log({scrollInChapter, chapterHeight});
          
          chapterFraction = chapterHeight > 0 
            ? Math.max(0, scrollInChapter / chapterHeight)
            : 1;
          break;
        }
      }
      //console.log({chapterIndex, chapterFraction});

      // Progress = chapters completed + fraction of current chapter
      return chapterIndex + chapterFraction;
    }

    scrollUpdateTimeout.current = window.setTimeout(() => {
      const newScrollProgress = getScrollProgress();
      if (newScrollProgress) {
        setScrollProgress(newScrollProgress);
      }
      scrollUpdateTimeout.current = null;
    }, SCROLL_REFRESH_TIMEOUT);
  }

  // Clear scroll timeout at dismantling
  useEffect(() => {
    return () => {
      if (scrollUpdateTimeout.current) clearTimeout(scrollUpdateTimeout.current);
    };
  }, []);

  // Update book progress in database
  useEffect(() => { 
    console.log(scrollProgress);
    const backendOperations = async (): Promise<boolean> => {
      if (!book) return false;
      try {
        logger.info("Updating book progress in backend database");
        await BackendDB.uploadBook(book, { progress: scrollProgress });
        return true;
      } catch (error) {
        logger.warn("Failed updating book progress to backend:", error);
        return false;
      }
    }

    const clientOperations = async (book: Book | null): Promise<boolean> => {
      if (!book || !book.id) return false;
      try {
        logger.info("Updating book progress in client database");
        await ClientDB.updateBookAttributes(book.id, { progress: scrollProgress });
        return true;
      } catch (error) {
        logger.warn("Failed updating book progress to client:", error);
        return false;
      }
    }

    const updateProgress = () => handleDbOperations({
        backendContext,
        toast,
        backendOperations: () => backendOperations(), 
        clientOperations: () => clientOperations(book),
        silent: false
    });

    if (!book) return;
    if (!book.progress) {
      updateProgress();
    } else if (scrollProgress > book.progress) {
      updateProgress();
    }
  }, [scrollProgress]);

  return (
    <div>
      {error && <div style={{ color: "red" }}>{error}</div>}
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