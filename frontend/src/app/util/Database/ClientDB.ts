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
        let store: IDBObjectStore;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id', autoIncrement: true });
          logger.info(`Object store '${this.STORE_NAME}' created in IndexedDB '${this.DB_NAME}'.`);
        } else {
          store = request.transaction!.objectStore(this.STORE_NAME);
          logger.info(`Object store '${this.STORE_NAME}' already exists in IndexedDB '${this.DB_NAME}'.`);
        }
        // Create compound index for title and author (unique constraint)
        if (!store.indexNames.contains('title_author')) {
          store.createIndex('title_author', ['title', 'author'], { unique: true });
          logger.info("Compound index 'title_author' created on 'books' store.");
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

  static async getBookById(bookId: number): Promise<Book | null> {
    try {
      const db = await this.openDb();
      logger.info(`Retrieving book with ID ${bookId} from local database...`);
      const transaction = db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(bookId);

      return await new Promise<Book | null>((resolve, reject) => {
        request.onsuccess = () => {
          const book = request.result as Book | undefined;
          if (book) {
            logger.info(`Successfully loaded book with ID ${bookId} from local database.`);
            db.close();
            resolve(book);
          } else {
            logger.warn(`No book found with ID ${bookId} in local database.`);
            resolve(null);
          }
          db.close();
        };
        request.onerror = () => {
          logger.error(`Failed to retrieve book with ID ${bookId} from local database.`, request.error);
          db.close();
          reject(request.error);
        };
      });
    } catch (error) {
      logger.error(`Unexpected error while retrieving book with ID ${bookId} from local db: `, error);
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

      // Helper - if a book with the same author and title exists
      const bookExists = (book: Book) => {
        return new Promise<boolean>((resolve, reject) => {
          const index = store.index('title_author');
          const request = index.get([book.title, book.author]);
          request.onsuccess = () => resolve(!!request.result);
          request.onerror = () => reject(request.error);
        });
      };

      for (const book of books) {
        const exists = await bookExists(book);
        if (!exists) {
          logger.debug("Saving new book: ", book);
          store.add(book);
        } else {
          logger.debug("Book already exists, updating: ", book);
          store.put(book);
        }
      }

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

  static async updateBookAttributes(bookId: number | undefined, updates: Partial<Book>): Promise<void> {
    try {
      if (!bookId) throw new Error("Book ID is undefined");
      const db = await this.openDb();
      logger.info(`Updating book with ID ${bookId} in local database...`);
      const transaction = db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const getRequest = store.get(bookId);

      return await new Promise<void>((resolve, reject) => {
        getRequest.onsuccess = () => {
          const book = getRequest.result as Book | undefined;
          if (!book) {
            logger.warn(`No book found with ID ${bookId} to update`);
            reject(new Error(`Book with ID ${bookId} not found`));
            return;
          }
          const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
          );
          const updatedBook = { ...book, ...cleanUpdates };
          const putRequest = store.put(updatedBook);
          putRequest.onsuccess = () => {
            logger.info(`Successfully updated book with ID ${bookId}`);
            db.close();
            resolve();
          }
          putRequest.onerror = () => {
            logger.warn(`Failed to update book with ID ${bookId}`);
            db.close();
            reject(putRequest.error);
          }
        };
        getRequest.onerror = () => {
          logger.warn(`Failed to get book for updating ID ${bookId}`);
          db.close();
          reject(getRequest.error);
        }
      });
    } catch (error) {
      logger.error(`Unexpected error while updating book with ID ${bookId} in local db: `, error);
      throw error;
    }
  }

}