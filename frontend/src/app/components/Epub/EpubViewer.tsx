import './EpubViewer.css'
import React, { useMemo, useState } from "react";
import InfiniteScroll from "../../util/InfiniteScroll/InfiniteScroll";
import { useScrollProgress } from "./useScrollProgress";
import { useChaptersLoader } from "./useChapterLoader";
import { useBookLoader } from "./useBookLoader";
import { ChapterItem } from "./Chapter";
import { useNavigate } from 'react-router-dom';
import { CloseButton, SettingsButton } from '../../util/UI/Buttons';
import type { Chapter } from '../../util/EpubUtil';

const EpubViewer: React.FC = () => {
  const [isMenuFocused, setIsMenuFocused] = useState(false);
  const [settingsOpened, setSettingsOpened] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const { book, zip, chapterRefs, chapterStartIndex, setChapterStartIndex } = 
    useBookLoader(setError);
  const { loadedChapters, handleLoadMore } =
    useChaptersLoader(setError, zip, chapterRefs);
  const { scrollContainerRef, handleScroll } =
    useScrollProgress(setError, loadedChapters, book, chapterStartIndex);

  const handleMenuFocus = () => {
    setIsMenuFocused(prev => !prev);
    setSettingsOpened(false);
  }

  const onClose = () => {
    setSettingsOpened(false);
  }

  return (
    <div id="viewer-content">
      <ViewerHeader 
        isMenuFocused={isMenuFocused} 
        setSettingsOpened={setSettingsOpened} 
      />
      <main>
        <TextScroller 
          handleMenuFocus={handleMenuFocus}
          error={error}
          scrollContainerRef={scrollContainerRef}
          handleScroll={handleScroll}
          loadedChapters={loadedChapters}
          chapterStartIndex={chapterStartIndex}
          handleLoadMore={handleLoadMore}
        />
      </main>
      <SettingsPopup 
        onClose={onClose}
        settingsOpened={settingsOpened}
        chapterRefs={chapterRefs}
        setChapterStartIndex={setChapterStartIndex}
      />
    </div>
  )
}

type HeaderProps = {
  isMenuFocused: boolean;
  setSettingsOpened: React.Dispatch<React.SetStateAction<boolean>>;
}

const ViewerHeader: React.FC<HeaderProps> = ({ isMenuFocused, setSettingsOpened }) => {
  const navigate = useNavigate();
  const visibilityState = isMenuFocused ? "active" : "hidden";

  const handleSettingsClick = () => {
    setSettingsOpened(prev => !prev);
  }

  const handleExit = () => {
    navigate("/");
  }

  return (
    <header className={visibilityState}>
      <div className="interactable-container">
        <SettingsButton handleClick={handleSettingsClick}/>
        <CloseButton handleClick={handleExit}/>
      </div>
    </header>
  )
}

type TextScrollerProps = {
  handleMenuFocus: () => void;
  error: string | null;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
  loadedChapters: Chapter[];
  chapterStartIndex: number;
  handleLoadMore: () => void;
}

const TextScroller: React.FC<TextScrollerProps> = ({
  handleMenuFocus,
  error,
  scrollContainerRef,
  handleScroll,
  loadedChapters,
  chapterStartIndex,
  handleLoadMore
}) => {
  const chapterList = useMemo(() => loadedChapters
    .map((ch, idx) => (
      <div 
        key={ch.name || idx}
        data-chapter-index={chapterStartIndex + idx}
      >
        <ChapterItem html={ch.content} />
      </div>
  )), [loadedChapters]);

  return (
    <div 
      className="text-scroller"
      onClick={handleMenuFocus}
    >
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

type SettingsPopupProps = {
  onClose: () => void;
  settingsOpened: boolean;
  chapterRefs: any[];
  setChapterStartIndex: React.Dispatch<React.SetStateAction<number>>;
}

// TODO: Add change font option from a selector
const SettingsPopup: React.FC<SettingsPopupProps> = ({
  onClose,
  settingsOpened,
  chapterRefs,
  setChapterStartIndex,
}) => {
  const visibilityState = settingsOpened ? "active" : "hidden";

  return (
    <footer className={visibilityState}>
      <div className="settings-popup">
        <CloseButton handleClick={onClose}/>
        <div className="settings-popup-content">
          <GoToPage
            chapterRefs={chapterRefs}
            setChapterStartIndex={setChapterStartIndex}
          />
        </div>
      </div>
    </footer>
  )
}

type GoToPageProps = {
  chapterRefs: any[];
  setChapterStartIndex: React.Dispatch<React.SetStateAction<number>>;
};

const GoToPage: React.FC<GoToPageProps> = ({ chapterRefs, setChapterStartIndex }) => {
  const [page, setPage] = useState(0);

  const handlePageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPage(Number(e.target.value));
  }

  const handleGoToPage = () => {
    if (page < 0 || page >= chapterRefs.length) {
      alert("Invalid chapter index");
      return;
    }
    setChapterStartIndex(page);
  }

  const decrementPage = () => {
    setPage(prev => Math.max(prev - 1, 0));
  };

  const incrementPage = () => {
    setPage(prev => Math.min(prev + 1, chapterRefs.length - 1));
  };
  
  return (
    <div className="goto-container">
      <div className="goto-form">
        <input
          type="number"
          min="0"
          max={chapterRefs.length - 1}
          value={page}
          onChange={handlePageChange}
        />
        <button className="decrement" onClick={decrementPage}>-</button>
        <button className="increment" onClick={incrementPage}>+</button>
      </div>
      <button className="submit" onClick={handleGoToPage}>Go</button>
    </div>
  )
}

export default EpubViewer;