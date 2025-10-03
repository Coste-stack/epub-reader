import { useState, useEffect } from "react";
import { getChapterContent, type Chapter, type ChapterRef } from "../../util/EpubUtil";
import JSZip from "jszip";

const CHAPTER_NUMBER_TO_LOAD = 1;

type UseChaptersLoaderResult = {
  loadedChapters: Chapter[];
  handleLoadMore: () => void;
};

export function useChaptersLoader(
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  zip: JSZip | null,
  chapterRefs: ChapterRef[]
): UseChaptersLoaderResult {
  const [loadedChapters, setLoadedChapters] = useState<Chapter[]>([]);
  const [visibleChapterCount, setVisibleChapterCount] = useState<number>(CHAPTER_NUMBER_TO_LOAD);

  useEffect(() => {
    setLoadedChapters([]);
    setVisibleChapterCount(CHAPTER_NUMBER_TO_LOAD);
  }, [zip, chapterRefs]);

  // Fetch chapter content
  useEffect(() => {
    if (!zip || chapterRefs.length === 0) return;
    const needToLoad = chapterRefs.slice(loadedChapters.length, visibleChapterCount);
    if (needToLoad.length === 0) return;

    Promise.all(
      needToLoad.map(async (ref) => ({
        name: ref.name,
        content: await getChapterContent(zip, ref),
      }))
    ).then(newChapters => {
      setLoadedChapters(prev => [...prev, ...newChapters]);
    });
  }, [zip, chapterRefs, visibleChapterCount, loadedChapters.length]);

  const handleLoadMore = () => {
    setVisibleChapterCount(count => Math.min(count + CHAPTER_NUMBER_TO_LOAD, chapterRefs.length));
  };

  return { loadedChapters, handleLoadMore };
}
  