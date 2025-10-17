import { base64ToBlob } from "../EpubUtil";
import { BookSyncLogger } from "../Logger"
import { ClientDB } from "../Database/ClientDB";
import { BackendDB, type Book } from "../Database/BackendDB";
import type { ToastContextValue } from "../Toast/toast-context";
import type { BackendContextValue } from "./BackendContext";

function areBooksEqual(a: Book, b: Book): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (a[key as keyof Book] !== b[key as keyof Book]) return false;
  }
  return true;
}

async function updateLocalDb(backendBooks: Book[]): Promise<void> {
  BookSyncLogger.info("Trying to check if local db is up to date");
  try {
    const clientBooks = await ClientDB.getAllBooks();
    BookSyncLogger.debug('Books from local db:', clientBooks);

    const backendById = new Map(backendBooks.map(book => [book.id, book]));
    const clientById = new Map(clientBooks.map(book => [book.id, book]));

    // Update client books
    for (const backendBook of backendBooks) {
      const clientBook = clientById.get(backendBook.id);
      if (!clientBook) {
        // Add the book
        await ClientDB.addBook(backendBook);
        BookSyncLogger.info(`Added new book with ID ${backendBook.id}`);
      } else if (!areBooksEqual(clientBook, backendBook)) {
        // Update the book
        await ClientDB.updateBookAttributes(backendBook.id, backendBook);
        BookSyncLogger.info(`Updated book with ID ${backendBook.id}`);
      }
    }

    // Update backend books
    for (const clientBook of clientBooks) {
      const backendBook = backendById.get(clientBook.id);
      if (!backendBook) {
        // Add the book
        BookSyncLogger.info("Adding book to backend database");
        await BackendDB.addBook(clientBook);
        BookSyncLogger.info("Uploading cover blob");
        await BackendDB.uploadCoverBlob(clientBook);
        BookSyncLogger.info("Uploading file blob");
          await BackendDB.uploadFileBlob(clientBook);
      } else {
        // Update the book
        BookSyncLogger.info("Updating book to backend database");
        await BackendDB.uploadBook(clientBook, clientBook);
        if (clientBook.coverBlob && backendBook.coverBlob !== clientBook.coverBlob) {
          BookSyncLogger.info("Uploading cover blob");
          await BackendDB.uploadCoverBlob(clientBook);
        } else {
          BookSyncLogger.warn("No cover blob to upload");
        }
        if (clientBook.fileBlob && backendBook.fileBlob !== clientBook.fileBlob) {
          BookSyncLogger.info("Uploading file blob");
          await BackendDB.uploadFileBlob(clientBook);
        } else {
          BookSyncLogger.warn("No file blob to upload");
        }
      }
      
    }
  } catch (err) {
    BookSyncLogger.error("Failed to update local db", err);
  }
}

export async function handleOnlineRefresh(): Promise<void> {
  let backendBooks: Book[] = [];
  try {
    // Get books from backend db
    backendBooks = await BackendDB.getAllBooks();
    // Convert all base64 strings to Blob
    backendBooks.forEach(book => {
      if (book.coverBlob && typeof book.coverBlob === "string") {
        book.coverBlob = base64ToBlob(book.coverBlob, "image/png");
      } else {
        book.coverBlob = undefined;
      }
    })
    
    BookSyncLogger.debug('Books from backend db:', backendBooks);
    BookSyncLogger.info("Books refreshed from backend db");
  } catch (err) {
    BookSyncLogger.error("Error fetching books from backend", err);
    return; // Exit early if fetching fails
  } 

  try {
    // Try to update local db
    await updateLocalDb(backendBooks);
  } catch (err) {
    BookSyncLogger.error("Error updating local DB", err);
  }
};

export async function handleOfflineRefresh(setBooks: React.Dispatch<React.SetStateAction<Book[]>>): Promise<void> {
  try {
    // Get books from local db
    const localBooks = await ClientDB.getAllBooks();
    BookSyncLogger.debug('Books from local db:', localBooks);
    BookSyncLogger.info("Books refreshed from local db");
    setBooks(localBooks);
  } catch (err) {
    BookSyncLogger.error("Error refreshing books from local DB", err);
  }
};

interface OperationStatus {
  successfullBackend: boolean,
  successfullClient: boolean
}

interface HandleDbOperationsProps {
  backendContext: BackendContextValue,
  toast: ToastContextValue | null,
  backendOperations: () => Promise<boolean>,
  clientOperations: () => Promise<boolean>,
  silent: boolean
}

export async function handleDbOperations({
  backendContext,
  toast,
  backendOperations,
  clientOperations,
  silent = false
}: HandleDbOperationsProps) {
  const status: OperationStatus = {
    successfullBackend: false,
    successfullClient: false,
  };

  // Perform backend db operations
  if (navigator.onLine) {
    backendContext.refreshBackendStatus(true);
    if (backendContext.backendAvailable) {
      status.successfullBackend = await backendOperations();
    }
  }

  // Perform client db operations
  status.successfullClient = await clientOperations();

  // Show a toast message
  if (silent) return;
  if (status.successfullBackend && status.successfullClient) {
    toast?.open("Operation successfull!", "success");
  } else if (!status.successfullBackend && status.successfullClient) {
    if (navigator.onLine) {
      if (!backendContext.backendAvailable) {
        toast?.open("Operation successfull locally", "success");
        toast?.open("Backend unavailable", "warning");
      } else {
        toast?.open("Operation successfull locally", "success");
        toast?.open("Operation failed on backend", "error");
      }
    } else {
      toast?.open("Operation successfull locally", "success");
      toast?.open("Offline mode", "warning");
    }
  } else {
    toast?.open("Operation failed locally", "error");
    toast?.open("Operation failed on backend", "error");
  }
}