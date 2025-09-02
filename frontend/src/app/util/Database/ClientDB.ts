import type { Book } from './BackendDB';
import { DatabaseLogger as logger } from '../Logger'

export class ClientDB {

  static DB_NAME = 'epub-reader-db';
  static STORE_NAME = 'books';
  static DB_VERSION = 1;

  static openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id', autoIncrement: true });
          logger.info(`Object store '${this.STORE_NAME}' created in IndexedDB '${this.DB_NAME}'.`);
        } else {
          logger.info(`Object store '${this.STORE_NAME}' already exists in IndexedDB '${this.DB_NAME}'.`);
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

  static async getAllBooks(): Promise<Book[]> {
    try {
      const db = await this.openDb();
      logger.info("Retrieving all books from local database...");
      const transaction = db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
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

  static async addBooks(books: Book[]): Promise<void> {
    try {
      const db = await this.openDb();
      if (books.length === 0) {
        logger.info("No books provided to save. Operation skipped.");
        db.close();
        return;
      }
      logger.info(`Saving ${books.length} book(s) to local database...`);
      const transaction = db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      books.forEach(book => {
        logger.debug("Saving book:", book);
        if (typeof book.id === 'undefined') {
          store.add(book);
        } else {
          store.put(book);
        }
      });

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

  static addBook(book: Book): Promise<void> {
    return this.addBooks([book]);
  }

}