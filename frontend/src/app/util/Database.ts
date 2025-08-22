import type { Book } from './BackendAPI/Books';
import { DatabaseLogger as logger } from './Logger'

const DB_NAME = 'epub-reader-db';
const STORE_NAME = 'books';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        logger.info(`Object store '${STORE_NAME}' created in IndexedDB '${DB_NAME}'.`);
      } else {
        logger.info(`Object store '${STORE_NAME}' already exists in IndexedDB '${DB_NAME}'.`);
      }
    };
    request.onsuccess = () => {
      logger.debug("Successfully opened IndexedDB database.", request.result);
      resolve(request.result);
    }
    request.onerror = () => {
      logger.error("Failed to open IndexedDB:", request.error);
      reject(request.error);
    }
  });
}

export async function saveBooksToDb(books: Book[]): Promise<void> {
  try {
    const db = await openDb();
    if (books.length === 0) {
      logger.info("No books provided to save. Operation skipped.");
      db.close();
      return;
    }
    logger.info(`Saving ${books.length} book(s) to local database...`);
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    books.forEach(book => store.put(book));

    return await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => {
        logger.info(`Successfully saved ${books.length} book(s) to local database.`);
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        logger.error(`Failed to save ${books.length} book(s) to local database.`, transaction.error);
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    logger.error("Unexpected error while saving books to local db: ", error);
    throw error;
  }
}

export function saveBookToDb(book: Book): Promise<void> {
  return saveBooksToDb([book]);
}

export async function getAllBooksFromDb(): Promise<Book[]> {
  try {
    const db = await openDb();
    logger.info("Retrieving all books from local database...");
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    return await new Promise<Book[]>((resolve, reject) => {
      request.onsuccess = () => {
        const books = request.result as Book[];
        logger.info(`Successfully loaded ${books.length} book(s) from local database.`);
        db.close();
        resolve(books);
      };
      request.onerror = () => {
        logger.error("Failed to retrieve books from local database.", request.error);
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    logger.error("Unexpected error while retrieving books from local db: ", error);
    throw error;
  }
}