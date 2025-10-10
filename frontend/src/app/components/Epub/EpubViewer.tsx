import './EpubViewer.css'
import React, { useMemo, useState } from "react";
import InfiniteScroll from "../../util/InfiniteScroll/InfiniteScroll";
import { useScrollProgress } from "./useScrollProgress";
import { useChaptersLoader } from "./useChapterLoader";
import { useBookLoader } from "./useBookLoader";
import { Chapter } from "./Chapter";

const TextScroller: React.FC = () => {
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
    <div className="text-scroller">
      {error && <div style={{ color: "red" }}>{error}</div>}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="infinite-scroll"
      >
        <InfiniteScroll 
          listItems={chapterList}
          lastRowHandler={handleLoadMore}  
        />
      </div>
    </div>
  );
};

type HeaderProps = {
  isFocused: boolean
}

const ViewerHeader: React.FC<HeaderProps> = ({ isFocused }) => {
  const visibilityState = isFocused ? "active" : "hidden";

  return (
    <div 
      className={`interactable-container ${visibilityState}`}
    >
      <div className="interactable">
        <img src="/assets/settings_black.png" alt="settings"/>
      </div>
      <div className="interactable">
        <img src="/assets/close_black.png" alt="close"/>
      </div>
    </div>
  )
}

const EpubViewer: React.FC = () => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    console.log("FOCUS: ", isFocused);
    setIsFocused(prev => !prev);
  }

  return (
    <div 
      id="viewer-content"
      onClick={handleFocus}
    >
      <header>
        <ViewerHeader isFocused={isFocused} />
      </header>
      <main>
        <TextScroller />
      </main>
    </div>
  )
}

export default EpubViewer;