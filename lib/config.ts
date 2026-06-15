const backendUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:8080";

export const BACKEND_API_URL = backendUrl;
export const API_URL = typeof window === "undefined" ? backendUrl : "";
