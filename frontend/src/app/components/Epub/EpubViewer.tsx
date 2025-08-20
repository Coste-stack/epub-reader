import React, { useEffect, useState } from "react";
import JSZip from "jszip";
import { EpubAppLog as logger } from "../../util/Logger";
import { processZip, type Chapter } from "../../util/EpubUtil";

type EpubViewerProps = {
  url?: string;
  maxChapters?: number;
};

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

const EpubViewer: React.FC<EpubViewerProps> = ({ url, maxChapters = 10 }) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [error, setError] = useState<string | null>(null);

  // if url is provided, fetch and process the epub
  useEffect(() => {
    if (!url) return;

    const fetchAndProcess = async () => {
      setError(null);
      setChapters([]);
      logger.info("Fetching EPUB from URL:", url);

      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const blob = await response.blob();
        logger.debug("EPUB blob size:", blob.size);

        const zip = await JSZip.loadAsync(blob);
        logger.debug("Loaded zip, files:", Object.keys(zip.files));

        const chapters = await processZip(zip, maxChapters);
        setChapters(chapters);
      } catch (err) {
        logger.error("Error reading EPUB from:", err);
        setError("Error reading EPUB: " + (err instanceof Error ? err.message : String(err)));
      }
    };

    fetchAndProcess();
  }, [url, maxChapters]);

  return (
    <div>
      {error && <div style={{ color: "red" }}>{error}</div>}
      {chapters
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
      ))}
    </div>
  );
};

export default EpubViewer;