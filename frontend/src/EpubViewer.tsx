import React, { useEffect, useState } from "react";
import JSZip from "jszip";
import DOMPurify from "dompurify";

type EpubViewerProps = {
  url?: string;
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

const EpubViewer: React.FC<EpubViewerProps> = ({ url }) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [error, setError] = useState<string | null>(null);

  // if url is provided, fetch and process the epub
  useEffect(() => {
    if (!url) return;

    const fetchAndProcess = async () => {
      setError(null);
      setChapters([]);

      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const blob = await response.blob();
        const zip = await JSZip.loadAsync(blob);
        const xhtmlFiles = Object.keys(zip.files)
          .filter(
            (name) =>
              name.endsWith(".xhtml")
          )
          .slice(0, 10);

        const chapterPromises = xhtmlFiles.map(async (name) => {
          const content = await zip.files[name].async("string");
          // parse just the <body> innerHTML
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, "application/xhtml+xml");
          const body = doc.querySelector("body");
          const html = body ? body.innerHTML : content;
          // sanitize with dompurify
          const safe = DOMPurify.sanitize(html, { ALLOWED_TAGS });
          return { name, content: safe };
        });

        const chapters = await Promise.all(chapterPromises);
        setChapters(chapters);
      } catch (err) {
        setError("Error reading EPUB: " + (err as Error).message);
      }
    };

    fetchAndProcess();
  }, [url]);

  // input handler for manual file upload
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setChapters([]);

    try {
      const zip = await JSZip.loadAsync(file);
      const xhtmlFiles = Object.keys(zip.files)
        .filter(
          (name) =>
            name.endsWith(".xhtml")
        )
        .slice(0, 10);

      const chapterPromises = xhtmlFiles.map(async (name) => {
        const content = await zip.files[name].async("string");
        // parse just the <body> innerHTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, "application/xhtml+xml");
        const body = doc.querySelector("body");
        const html = body ? body.innerHTML : content;
        // sanitize with dompurify
        const safe = DOMPurify.sanitize(html, { ALLOWED_TAGS });
        return { name, content: safe };
      });

      const chapters = await Promise.all(chapterPromises);
      setChapters(chapters);
    } catch (err) {
      setError("Error reading EPUB: " + (err as Error).message);
    }
  };

  return (
    <div>
      <input type="file" accept=".epub" onChange={handleFile} />
      {error && <div style={{ color: "red" }}>{error}</div>}
      {chapters.map((ch, idx) => (
        <div key={idx}>
          <div
            style={{ border: "1px solid #ccc", padding: 12, marginBottom: 20 }}
            dangerouslySetInnerHTML={{ __html: ch.content }}
          />
        </div>
      ))}
    </div>
  );
};

export default EpubViewer;