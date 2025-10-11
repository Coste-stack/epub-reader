import './EpubViewer.css'
import React, { useMemo, useState } from "react";
import InfiniteScroll from "../../util/InfiniteScroll/InfiniteScroll";
import { useScrollProgress } from "./useScrollProgress";
import { useChaptersLoader } from "./useChapterLoader";
import { useBookLoader } from "./useBookLoader";
import { Chapter } from "./Chapter";
import { useNavigate } from 'react-router-dom';
import { CloseButton, SettingsButton } from '../../util/UI/Buttons';

type TextScrollerProps = {
  handleMenuFocus: () => void;
}

const TextScroller: React.FC<TextScrollerProps> = ({ handleMenuFocus }) => {
  const [error, setError] = useState<string | null>(null);
  
  const { book, zip, chapterRefs, chapterStartIndex } = 
    useBookLoader(setError);

  const { loadedChapters, handleLoadMore } =
    useChaptersLoader(setError, zip, chapterRefs);

  const { scrollContainerRef, handleScroll } =
    useScrollProgress(setError, loadedChapters, book, chapterStartIndex);

  console.log("loadedChapters viewer:", loadedChapters);
  
  const chapterList = useMemo(() => loadedChapters
    .map((ch, idx) => (
      <div 
        key={ch.name || idx}
        data-chapter-index={chapterStartIndex + idx}
      >
        <Chapter html={ch.content} />
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

type HeaderProps = {
  isMenuFocused: boolean;
  setSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ViewerHeader: React.FC<HeaderProps> = ({ isMenuFocused, setSettingsOpen }) => {
  const navigate = useNavigate();
  const visibilityState = isMenuFocused ? "active" : "hidden";

  const handleSettingsClick = () => {
    setSettingsOpen(prev => !prev);
  }

  const handleExit = () => {
    navigate("/");
  }

  return (
    <div 
      className={`interactable-container ${visibilityState}`}
    >
      <SettingsButton handleClick={handleSettingsClick}/>
      <CloseButton handleClick={handleExit}/>
    </div>
  )
}

type SettingsPopupProps = {
  onClose: () => void;
}

// TODO: Add go to specific page
// TODO: Add change font option from a selector
const SettingsPopup: React.FC<SettingsPopupProps> = ({ onClose }) => (
  <div className="settings-popup">
    <div className="settings-popup-content">
      <CloseButton handleClick={onClose}/>
      <p>Settings</p>
    </div>
  </div>
);

const EpubViewer: React.FC = () => {
  const [isMenuFocused, setIsMenuFocused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleMenuFocus = () => {
    setIsMenuFocused(prev => !prev);
    setSettingsOpen(false);
  }

  const onClose = () => {
    setSettingsOpen(false);
  }

  return (
    <div id="viewer-content">
      {isMenuFocused && (
        <header>
          <ViewerHeader 
            isMenuFocused={isMenuFocused} 
            setSettingsOpen={setSettingsOpen} 
          />
        </header>
      )}
      <main>
        <TextScroller handleMenuFocus={handleMenuFocus} />
      </main>
      {settingsOpen && <SettingsPopup onClose={onClose} />}
    </div>
  )
}

export default EpubViewer;