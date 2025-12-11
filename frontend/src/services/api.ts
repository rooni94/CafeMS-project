// src/services/api.ts
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/",
});

// لإضافة التوكن تلقائياً إن وجد
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
