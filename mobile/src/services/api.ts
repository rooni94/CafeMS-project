import axios from "axios";
import { ENV } from "../config/env";

export const api = axios.create({
  baseURL: ENV.apiUrl,
  timeout: 65000,
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  const isFormData = typeof FormData !== "undefined" && config.data instanceof FormData;
  if (isFormData) {
    if (config.headers) {
      delete (config.headers as any)["Content-Type"];
      delete (config.headers as any)["content-type"];
    }
    config.transformRequest = [(data) => data];
  } else {
    config.headers = {
      ...(config.headers || {}),
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }
  return config;
});

export const setAuthToken = (token?: string | null) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    // Backup header if a proxy strips Authorization.
    api.defaults.headers.common["X-Access-Token"] = token;
  } else {
    delete api.defaults.headers.common["Authorization"];
    delete api.defaults.headers.common["X-Access-Token"];
  }
};

export const parseApiError = (error: any, fallback?: string): string => {
  if (error?.response?.data) {
    const data = error.response.data;
    if (typeof data === "string") return data;
    if (data.detail && typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.non_field_errors)) {
      return data.non_field_errors.join(" ");
    }
    if (typeof data.message === "string") return data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return fallback || "حدث خطأ غير متوقع، حاول مرة أخرى.";
};
