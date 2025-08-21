import axios from "axios";

export interface Book {
  id?: number;
  title: string;
  author: string;
  progress?: number;
  favorite?: boolean;
  coverPath?: string;
}

const api_location = "http://localhost:";
const api_port = 8080;

export async function getAllBooks(): Promise<Book[]> {
  try {
    const res = await axios.get<Book[]>(api_location + api_port + "/api/books");
    return res.data;
  } catch (error: any) {
    throw new Error("Failed to get books: " + (error instanceof Error ? error.message : String(error)));
  }
}

export async function addBook(book: Omit<Book, "id">): Promise<Book> {
  try {
    const res = await axios.post<Book>(api_location + api_port + "/api/books", book);
    return res.data;
  } catch (error: any) {
    const backendMessage = error.response?.data && typeof error.response.data === "string"
        ? error.response.data
        : error.message;
    throw new Error("Failed to add book: " + backendMessage);
  }
  
}