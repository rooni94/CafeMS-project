// src/services/api.ts
import axios from "axios";

export const api = axios.create({
  // Default to same-origin `/api/` so production doesn't accidentally point to localhost.
  baseURL: import.meta.env.VITE_API_URL || "/api/",
});

// لإضافة التوكن تلقائياً إن وجد
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
