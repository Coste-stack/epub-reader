import React, { useMemo, useState } from "react";
import InfiniteScroll from "../../util/InfiniteScroll/InfiniteScroll";
import { useScrollProgress } from "./useScrollProgress";
import { useChaptersLoader } from "./useChapterLoader";
import { useBookLoader } from "./useBookLoader";
import { Chapter } from "./Chapter";

const EpubViewer: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  
  const { book, zip, chapterRefs } = 
    useBookLoader(setError);

  const { loadedChapters, handleLoadMore } =
    useChaptersLoader(setError, zip, chapterRefs);

  const { scrollContainerRef, handleScroll } =
    useScrollProgress(setError, loadedChapters, book);

  console.log("loadedChapters viewer:", loadedChapters);
  
  const chapterList = useMemo(() => loadedChapters
    .map((ch, idx) => (
      <div key={ch.name || idx}>
        <Chapter html={ch.content} />
      </div>
  )), [loadedChapters]);

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