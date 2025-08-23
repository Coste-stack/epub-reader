import DOMPurify from "dompurify";
import { EpubAppLogger as logger } from "./Logger";
import type JSZip from "jszip";

export type Chapter = {
  name: string;
  content: string;
};

const ALLOWED_TAGS = [
  "b", "i", "em", "strong", "u",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "ul", "ol", "li", "div", "span", "blockquote"
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

const getXhtmlFileNames = (zip: JSZip, max: number) => {
  const files = Object.keys(zip.files);
  const filtered = files.filter(
    name => name.endsWith(".xhtml") || name.endsWith(".html")
  );
  logger.debug("[getXhtmlFileNames] All files:", files);
  logger.debug("[getXhtmlFileNames] Filtered .xhtml files:", filtered);
  return filtered.slice(0, max);
};

export const processZip = async (zip: JSZip, maxChapters: number): Promise<Chapter[]> => {
  const xhtmlFiles = getXhtmlFileNames(zip, maxChapters);
  if (xhtmlFiles.length === 0) {
    logger.warn("[processZip] No .xhtml files found!");
  }
  const chapterPromises = xhtmlFiles.map(async (name) => {
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