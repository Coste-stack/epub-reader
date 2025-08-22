import axios from "axios";

export const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_LOCATION +
  import.meta.env.VITE_BACKEND_API_PORT;

export async function isBackendUp(): Promise<boolean> {
  try {
    const res = await axios.get<string>(`${BACKEND_API_URL}/api/status`);
    return res.data === "OK";
  } catch (error: any) {
    return false;
  }
}