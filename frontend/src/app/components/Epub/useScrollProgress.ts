import { useRef, useEffect, useState } from "react";
import { EpubAppLogger as logger } from "../../util/Logger";
import { BackendDB, type Book } from "../../util/Database/BackendDB";
import { ClientDB } from "../../util/Database/ClientDB";
import { handleDbOperations } from "../../util/BackendAPI/BookSync";
import { useToast } from "../../util/Toast/toast-context";
import { useBackend } from "../../util/BackendAPI/BackendContext";
import type { Chapter } from "../../util/EpubUtil";

const SCROLL_REFRESH_TIMEOUT = 1000;

type UseScrollProgressResult = {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
};

export function useScrollProgress(
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  loadedChapters: Chapter[], 
  book: Book | null,
  chapterStartIndex: number = 0
): UseScrollProgressResult {
  const toast = useToast();
  const backendContext = useBackend();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const scrollUpdateTimeout = useRef<number | null>(null);

  let hasScrolledToProgress: boolean = false;

  // Derive baseIndex
  let baseIndex = 0;
  if (typeof chapterStartIndex === "number") {
    baseIndex = chapterStartIndex;
  } else {
    if (book && typeof book.progress === "number") {
      baseIndex = Math.floor(book.progress);
    }
  }

  // In the beginning scroll to stored progress value
  useEffect(() => {
    const scrollToProgress = (globalProgress: number) => {
      const el = scrollContainerRef.current;
      if (!el || loadedChapters.length === 0) return;

      const globalChapterIndex = Math.floor(globalProgress);
      const chapterFraction = globalProgress - globalChapterIndex;

      const localIndex = globalChapterIndex - baseIndex;
      if (localIndex < 0) return; // progress is before the slice start

      const chapterElement = el.children[localIndex] as HTMLElement | undefined;
      if (!chapterElement) return;

      const chapterStart = chapterElement.offsetTop;
      const chapterHeight = chapterElement.offsetHeight;
      const scrollTop = chapterStart + chapterHeight * chapterFraction - el.clientHeight;

      requestAnimationFrame(() => {
        el.scrollTo({ top: scrollTop, behavior: "smooth" });
      });
    };
    
    if (!hasScrolledToProgress && loadedChapters.length > 0) {
      hasScrolledToProgress = true;
      if (book && typeof book.progress === "number") {
        scrollToProgress(book.progress);
      }
    }
  }, [loadedChapters.length, baseIndex, book?.progress]);

  // Get reading progress from scroll
    const handleScroll = () => {
      console.log(scrollProgress);
      
      // Skip if timeout is already sheduled
      if (scrollUpdateTimeout.current) return;
  
      const getScrollProgress = (): number | undefined => {
        const el = scrollContainerRef.current;
        if (!el || loadedChapters.length === 0) return;
  
        const children = Array.from(el.children);
        let chapterIndexGlobal = baseIndex;
        let chapterFraction = 0;
  
        const visibleBottom = el.scrollTop + el.clientHeight;
  
        for (let i = children.length - 1; i >= 0; i--) {
          const child = children[i] as HTMLElement;
          const chapterStart = child.offsetTop;
          const chapterHeight = child.offsetHeight;
  
          if (chapterStart <= visibleBottom) {
            // read absolute index from data attribute if present
            const dataIdx = child.dataset?.chapterIndex;
            const childGlobalIndex = (dataIdx !== undefined) ? Number(dataIdx) : (baseIndex + i);

            const scrollInChapter = Math.min(visibleBottom - chapterStart, chapterHeight);
            chapterFraction = chapterHeight > 0 ? Math.max(0, scrollInChapter / chapterHeight) : 1;
            chapterIndexGlobal = childGlobalIndex;
            break;
          }
        }
  
        // Progress = chapters completed + fraction of current chapter
        return chapterIndexGlobal + chapterFraction;
      }
  
      scrollUpdateTimeout.current = window.setTimeout(() => {
        const newScrollProgress = getScrollProgress();
        if (typeof newScrollProgress === "number") {
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
    if (typeof book.progress !== "number") {
      updateProgress();
    } else if (scrollProgress > book.progress) {
      updateProgress();
    }
  }, [scrollProgress]);

  return { scrollContainerRef, handleScroll };
}