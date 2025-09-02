import axios from "axios";
import { BACKEND_API_URL } from "../BackendAPI/BackendConnection";

export interface Book {
  id?: number;
  title: string;
  author: string;
  progress?: number;
  favorite?: boolean;
  coverBlob?: Blob;
}

export class BackendDB {

  static async getAllBooks(): Promise<Book[]> {
    try {
      const res = await axios.get<Book[]>(`${BACKEND_API_URL}/api/books`);
      return res.data;
    } catch (error: any) {
      throw new Error("Failed to get books: " + (error instanceof Error ? error.message : String(error)));
    }
  }

  private static stripBook(book: Book): Omit<Book, "id" | "coverBlob"> {
    const { id, coverBlob, ...rest } = book;
    return rest;
  }

  static async addBook(book: Omit<Book, "id" | "coverBlob">): Promise<Book> {
    book = this.stripBook(book);
    try {
      const res = await axios.post<Book>(`${BACKEND_API_URL}/api/books`, book);
      return res.data;
    } catch (error: any) {
      const backendMessage = error.response?.data && typeof error.response.data === "string"
          ? error.response.data
          : error.message;
      throw new Error("Failed to add book: " + backendMessage);
    }
  }

  static async uploadBook(bookId: number, file: File): Promise<Book> {
    try {
      const res = await axios.post<Book>(`${BACKEND_API_URL}/api/books${bookId}/upload`, file);
      return res.data;
    } catch (error: any) {
      const backendMessage = error.response?.data && typeof error.response.data === "string"
          ? error.response.data
          : error.message;
      throw new Error("Failed to upload book: " + backendMessage);
    }
  }

  static async getBookId(bookLocal: Book): Promise<number | undefined> {
    const books = await this.getAllBooks();
    const found = books.find(
      bookBackend => bookBackend.title === bookLocal.title && bookBackend.author === bookLocal.author
    );
    return found?.id;
  }

  static async uploadCoverBlob(book: Book): Promise<Book> {
    try {
      // Get the book id
      const bookId = await this.getBookId(book);
      if (!bookId) throw new Error("Book not found (no id)");

      // Prepare FormData for cover blob upload
      const formData = new FormData();
      if (book.coverBlob) {
        formData.append("cover", book.coverBlob);
      } else {
        throw new Error("No coverBlob provided");
      }

      const res = await axios.post<Book>(
        `${BACKEND_API_URL}/api/books/${bookId}/cover`, 
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" }
        }
      );
      return res.data;
    } catch (error: any) {
      const backendMessage = error.response?.data && typeof error.response.data === "string"
          ? error.response.data
          : error.message;
      throw new Error("Failed to upload cover blob: " + backendMessage);
    }
  }

}