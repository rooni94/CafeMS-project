import axios from "axios";
import { ENV } from "../config/env";

export const api = axios.create({
  baseURL: ENV.apiUrl,
  timeout: 20000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
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

export const parseApiError = (error: any): string => {
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
  return "حدث خطأ غير متوقع، حاول مرة أخرى.";
};
