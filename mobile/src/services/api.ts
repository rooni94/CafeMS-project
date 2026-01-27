import axios, { AxiosHeaders } from "axios";
import { ENV } from "../config/env";

export const api = axios.create({
  baseURL: ENV.apiUrl,
  timeout: 65000,
});

api.defaults.headers.common.Accept = "application/json";

api.interceptors.request.use((config) => {
  const isFormData =
    typeof FormData !== "undefined" && config.data instanceof FormData;

  if (isFormData) {
    config.headers = new AxiosHeaders(config.headers);
    config.headers.delete("Content-Type");
  } else {
    const headers = new AxiosHeaders(config.headers);
    headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");
    config.headers = headers;
  }

  return config;
});

export const setAuthToken = (token?: string | null) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
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
  if (error?.message) return error.message;
  return fallback || "حدث خطأ غير متوقع، حاول مرة أخرى.";
};
