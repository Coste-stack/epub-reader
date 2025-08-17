import React, { useEffect, useState } from "react";
import JSZip from "jszip";
import DOMPurify from "dompurify";
import { EpubViewerLog as logger } from "./logger";

type EpubViewerProps = {
  url?: string;
  maxChapters?: number;
};

type Chapter = {
  name: string;
  content: string;
};

const ALLOWED_TAGS = [
  "b", "i", "em", "strong", "u",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "ul", "ol", "li", "div", "span", "blockquote"
];

// utility to extract and sanitize html content from an xhtml string
const extractAndSanitize = (content: string, debugLabel?: string): string => {
  try {
    logger.debug(`[extractAndSanitize] (${debugLabel}) Parsing content:`, content.slice(0, 200));
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "application/xhtml+xml");
    const body = doc.querySelector("body");
    if (!body) {
      logger.warn(`[extractAndSanitize] (${debugLabel}) <body> not found! Returning full content.`);
    }
    const html = body ? body.innerHTML : content;
    const sanitized = DOMPurify.sanitize(html, { ALLOWED_TAGS });
    logger.debug(`[extractAndSanitize] (${debugLabel}) Sanitized length:`, sanitized.length);
    return sanitized;
  } catch (err) {
    logger.error(`[extractAndSanitize] (${debugLabel}) Error:`, err);
    return "";
  }
};

const getXhtmlFileNames = (zip: JSZip, max: number) => {
  const files = Object.keys(zip.files);
  const filtered = files.filter(
    name => name.endsWith(".xhtml") || name.endsWith(".html")
  );
  logger.debug("[getXhtmlFileNames] All files:", files);
  logger.debug("[getXhtmlFileNames] Filtered .xhtml files:", filtered);
  return filtered.slice(0, max);
};

const processZip = async (zip: JSZip, maxChapters: number): Promise<Chapter[]> => {
  const xhtmlFiles = getXhtmlFileNames(zip, maxChapters);
  if (xhtmlFiles.length === 0) {
    logger.warn("[processZip] No .xhtml files found!");
  }
  const chapterPromises = xhtmlFiles.map(async (name, idx) => {
    try {
      const file = zip.files[name];
      if (!file) {
        logger.warn(`[processZip] File not found in zip: ${name}`);
        return { name, content: "[File not found]" };
      }
      const content = await file.async("string");
      if (!content || content.length < 10) {
        logger.warn(`[processZip] File ${name} seems empty or too short:`, content);
      }
      const sanitized = extractAndSanitize(content, name);
      return {
        name,
        content: sanitized,
      };
    } catch (err) {
      logger.error(`[processZip] Error processing file ${name}:`, err);
      return { name, content: "[Error extracting this chapter]" };
    }
  });
  return Promise.all(chapterPromises);
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
      logger.info("[EpubViewer] Fetching EPUB from URL:", url);

      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const blob = await response.blob();
        logger.debug("[EpubViewer] EPUB blob size:", blob.size);

        const zip = await JSZip.loadAsync(blob);
        logger.debug("[EpubViewer] Loaded zip, files:", Object.keys(zip.files));

        const chapters = await processZip(zip, maxChapters);
        setChapters(chapters);
      } catch (err) {
        logger.error("[EpubViewer] Error reading EPUB:", err);
        setError("Error reading EPUB: " + (err instanceof Error ? err.message : String(err)));
      }
    };

    fetchAndProcess();
  }, [url, maxChapters]);

  // input handler for manual file upload
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setChapters([]);
    logger.debug("[EpubViewer] Manual file upload:", file.name, "size:", file.size);

    try {
      const zip = await JSZip.loadAsync(file);
      logger.debug("[EpubViewer] Loaded zip from file, files:", Object.keys(zip.files));

      const chapters = await processZip(zip, maxChapters);
      setChapters(chapters);
    } catch (err) {
      logger.error("[EpubViewer] Error reading EPUB from file:", err);
      setError("Error reading EPUB: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div>
      <input type="file" accept=".epub" onChange={handleFile} />
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