import axios from "axios";
import { BACKEND_API_URL } from "./BackendConnection";

export interface Book {
  id?: number;
  title: string;
  author: string;
  progress?: number;
  favorite?: boolean;
  coverPath?: string;
}

export async function getAllBooks(): Promise<Book[]> {
  try {
    const res = await axios.get<Book[]>(`${BACKEND_API_URL}/api/books`);
    return res.data;
  } catch (error: any) {
    throw new Error("Failed to get books: " + (error instanceof Error ? error.message : String(error)));
  }
}

export async function addBook(book: Omit<Book, "id">): Promise<Book> {
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

export async function uploadBook(bookId: Pick<Book, "id">, file: File): Promise<Book> {
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