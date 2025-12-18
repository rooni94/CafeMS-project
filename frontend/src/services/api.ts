// src/services/api.ts
import axios from "axios";

export const api = axios.create({
  // Default to same-origin `/api/` so production doesn't accidentally point to localhost.
  baseURL: import.meta.env.VITE_API_URL || "/api/",
});

const looksLikeJwt = (value: string) => {
  const token = value.trim();
  if (!token) return false;
  if (token === "null" || token === "undefined") return false;
  return token.split(".").length === 3 && token.length > 20;
};

// لإضافة التوكن تلقائياً إن وجد
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token && config.headers) {
    if (looksLikeJwt(token)) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      delete config.headers.Authorization;
    }
  }
  return config;
});
