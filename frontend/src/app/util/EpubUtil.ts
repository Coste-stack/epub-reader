import DOMPurify from "dompurify";
import { EpubAppLogger as logger } from "./Logger";
import type JSZip from "jszip";

// Types
export type Chapter = {
  name: string;
  content: string;
};

// For chapter pre loading
export type ChapterRef = {
  name: string;
  path: string;
};

const ALLOWED_TAGS = [
  "b", "i", "em", "strong", "u",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "ul", "ol", "li", "div", "span", "blockquote", "img"
];

// Utility to extract and sanitize html content from an xhtml string
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

// Enhances HTML by embedding images referenced in the zip
async function embedImagesInHtml(html: string, zip: JSZip, opfPath: string): Promise<string> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const imgs = doc.querySelectorAll("img");

  for (const img of imgs) {
    const src = img.getAttribute("src");
    if (src) {
      const file = findZipFile(zip, opfPath, src);
      if (file) {
        const arr = await file.async("uint8array");
        const mimeType = src.endsWith(".png")
          ? "image/png"
          : src.endsWith(".gif")
          ? "image/gif"
          : "image/jpeg"; // Fallback
        const base64 = uint8ToBase64(arr);
        img.setAttribute("src", `data:${mimeType};base64,${base64}`);
      }
    }
  }
  return doc.body.innerHTML;
}

// Chapter file finding helpers
const getXhtmlFileNames = (zip: JSZip) => {
  const files = Object.keys(zip.files);
  const filtered = files.filter(
    name => name.endsWith(".xhtml") || name.endsWith(".html")
  );
  logger.debug("[getXhtmlFileNames] All files:", files);
  logger.debug("[getXhtmlFileNames] Filtered .xhtml files:", filtered);
  return filtered;
};

export async function getChapterRefs(zip: JSZip): Promise<ChapterRef[]> {
  const xhtmlFiles = getXhtmlFileNames(zip);
  if (xhtmlFiles.length === 0) {
    logger.warn("No .xhtml files found!");
  }
  return xhtmlFiles.map(name => ({
    name,
    path: name
  }));
}

export async function getChapterContent(zip: JSZip, chapterRef: ChapterRef): Promise<string> {
  try {
    const file = zip.files[chapterRef.path];
    if (!file) {
      logger.warn(`[getChapterContent] File not found in zip: ${chapterRef.path}`);
      return "[File not found]";
    }
    const content = await file.async("string");
    if (!content || content.length < 10) {
      logger.warn(`[getChapterContent] File ${chapterRef.path} seems empty or too short:`, content);
    }
    const sanitized = extractAndSanitize(content, chapterRef.name);
    // Embed images
    const opfPath = await getOpfPath(zip);
    if (!opfPath) return sanitized;
    const enhanced = await embedImagesInHtml(sanitized, zip, opfPath);
    return enhanced;
  } catch (err) {
    logger.error(`[getChapterContent] Error processing file ${chapterRef.path}:`, err);
    return "[Error extracting this chapter]";
  }
}

// Returns the OPF file path by parsing container.xml
async function getOpfPath(zip: JSZip): Promise<string | null> {
  const file = zip.file("META-INF/container.xml");
  if (!file) {
    logger.warn(`[getOpfPath] File not found in zip`);
    return null;
  }

  const xml = await file.async("string");
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const rootfile = doc.querySelector("rootfile");

  // Get the full-path attribute from <rootfile>
  return rootfile?.getAttribute("full-path") || null;
}

// Returns the OPF zip file
async function getOpfFile(zip: JSZip): Promise<JSZip.JSZipObject | null> {
  const opfPath = await getOpfPath(zip);
  if (!opfPath) return null;

  const opfFile = zip.file(opfPath);
  if (!opfFile) {
    logger.warn(`[getOpfFile] File not found in zip`);
    return null;
  }

  return opfFile;
}

// Returns the OPF file contents as string
export async function readContentOpf(zip: JSZip): Promise<string | null> {
  const opfFile = await getOpfFile(zip);
  if (!opfFile) return null;

  return await opfFile.async("string");
}

function resolvePath(opfPath: string, itemHref: string): string {
  // Get base directory of opfPath
  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
  // If itemHref already contains a directory, use it relative to OPF dir.
  // If itemHref starts with '/', treat as root
  if (itemHref.startsWith('/')) {
    return itemHref.replace(/^\//, ''); // Remove leading slash for zip
  }
  return opfDir + itemHref.replace(/\\/g, '/');
}

function findZipFile(zip: JSZip, opfPath: string, href: string): JSZip.JSZipObject | null {
  const resolved = resolvePath(opfPath, href);
  console.log(`opfPath: ${opfPath}\nhref: ${href}\nfullPath: ${resolved}`);

  // Try to find the file
  let file = zip.file(resolved);
  if (file) return file;

  // If name is ascii encoded
  try {
    const decoded = decodeURIComponent(resolved);
    file = zip.file(decoded);
    if (file) return file;
  } catch {}

  // Nothing found
  return null;
}

// Returns an object of data from content.opf file
export async function extractOpfData(zip: JSZip) {
  const opfPath = await getOpfPath(zip);
  if (!opfPath) return { title: "", author: "" };

  const opfFile = zip.file(opfPath);
  if (!opfFile) return { title: "", author: "" };
  const opfString = await opfFile.async("string");
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(opfString, "application/xml");

  // Namespaces used in OPF
  const dcNS = "http://purl.org/dc/elements/1.1/";
  function getText(tag: string) {
    return doc.getElementsByTagNameNS(dcNS, tag)[0]?.textContent ?? "";
  }

  // Cover image
  let coverBlob: Blob | undefined;
  const coverMeta = doc.querySelector('meta[name="cover"]')?.getAttribute("content");
  console.log(coverMeta);

  if (coverMeta) {
    const item = doc.querySelector(`manifest > item[id="${coverMeta}"]`);
    console.log(`item: ${item}`);
    const href = item?.getAttribute("href") || undefined;
    if (href && opfPath) {
      const file = findZipFile(zip, opfPath, href);
      console.log(`file: ${file}`);

      if (file) {
        const arr = await file.async("uint8array");
        const fixedArr = new Uint8Array(arr.buffer as ArrayBuffer, arr.byteOffset, arr.byteLength);

        const mediaType = item?.getAttribute("media-type") || "image/jpeg";
        console.log(`mediaType: ${mediaType}`);
        coverBlob = new Blob([fixedArr], { type: mediaType });
      }
    }
  }

  return {
    title: getText("title"),
    author: getText("creator"),
    coverBlob,
  };
}

// Convert Uint8Array to base64 string
function uint8ToBase64(uint8: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return window.btoa(binary);
}

export function base64ToBlob(base64: string, mimeType: string = "image/png"): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}