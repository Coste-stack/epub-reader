import { getAllBooksFromDb, saveBooksToDb } from "../Database/ClientDB";
import { base64ToBlob } from "../EpubUtil";
import { BookSyncLogger } from "../Logger"
import { getAllBooks, type Book } from "../Database/BackendDB";

function areBooksEqual(a: Book[], b: Book[]): boolean {
  if (a.length !== b.length) return false;
  // Sort the array by title
  const aSorted = [...a].sort((b1, b2) => b1.title.localeCompare(b2.title));
  const bSorted = [...b].sort((b1, b2) => b1.title.localeCompare(b2.title));
  // Check the object equality
  for (let i = 0; i < aSorted.length; i++) {
    if (
      aSorted[i].title !== bSorted[i].title ||
      aSorted[i].author !== bSorted[i].author
    ) return false;
  }
  return true;
}

async function updateLocalDb(backendBooks: Book[]): Promise<void> {
  BookSyncLogger.info("Trying to check if local db is up to date");
  try {
    const localBooks = await getAllBooksFromDb();
    BookSyncLogger.debug('Books from local db:', localBooks);
    if (areBooksEqual(backendBooks, localBooks)) {
      BookSyncLogger.info("Local db is already updated");
    } else {
      BookSyncLogger.info("Trying to update local db");
      await saveBooksToDb(backendBooks);
      BookSyncLogger.info("Local db has been updated");
    }
  } catch (err) {
    BookSyncLogger.error("Failed to update local db", err);
  }
}

type SetBooksType = React.Dispatch<React.SetStateAction<Book[]>>;

export async function handleOnlineRefresh(setBooks: SetBooksType) {
  let backendBooks: Book[] = [];
  try {
    // Get books from backend db
    backendBooks = await getAllBooks();
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
    setBooks(backendBooks);
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

export async function handleOfflineRefresh(setBooks: SetBooksType) {
  try {
    // Get books from local db
    const localBooks = await getAllBooksFromDb();
    BookSyncLogger.debug('Books from local db:', localBooks);
    BookSyncLogger.info("Books refreshed from local db");
    setBooks(localBooks);
  } catch (err) {
    BookSyncLogger.error("Error refreshing books from local DB", err);
  }
};