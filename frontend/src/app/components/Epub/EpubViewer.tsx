import React, { useState } from "react";
import InfiniteScroll from "../../util/InfiniteScroll/InfiniteScroll";
import { useScrollProgress } from "./useScrollProgress";
import { useChaptersLoader } from "./useChapterLoader";
import { useBookLoader } from "./useBookLoader";

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

const EpubViewer: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  
  const { book, zip, chapterRefs } = 
    useBookLoader(setError);

  const { loadedChapters, handleLoadMore } =
    useChaptersLoader(setError, zip, chapterRefs);

  const { scrollContainerRef, handleScroll } =
    useScrollProgress(setError, loadedChapters, book);

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