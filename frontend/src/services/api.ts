// src/services/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const api = axios.create({
  // Default to same-origin `/api/` so production doesn't accidentally point to localhost.
  baseURL: import.meta.env.VITE_API_URL || "/api/",
  // إذا عندك جلسات/كوكي (SessionAuth) فعّلها.
  // لو JWT فقط تقدر تتركها false.
  withCredentials: true,
});

const looksLikeJwt = (value: string) => {
  const token = (value || "").trim();
  if (!token) return false;
  if (token === "null" || token === "undefined") return false;
  return token.split(".").length === 3 && token.length > 20;
};

const getAccess = () => localStorage.getItem("access") || "";
const getRefresh = () => localStorage.getItem("refresh") || "";

const clearTokens = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccess();

  config.headers = config.headers || {};

  if (token && looksLikeJwt(token)) {
    config.headers.Authorization = `Bearer ${token}`;
    // Backup header in case a reverse proxy strips Authorization.
    config.headers["X-Access-Token"] = token;
  } else {
    // تنظيف
    delete config.headers.Authorization;
    delete config.headers["X-Access-Token"];
    if (token) clearTokens();
  }

  return config;
});

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const refreshAccessToken = async () => {
  const refresh = getRefresh();
  if (!refresh || !looksLikeJwt(refresh)) {
    throw new Error("Missing/invalid refresh token");
  }
  // endpoint الافتراضي في simplejwt:
  // POST /api/token/refresh/  { refresh }
  const res = await axios.post(
    (import.meta.env.VITE_API_URL || "/api/") + "token/refresh/",
    { refresh },
    { withCredentials: true }
  );
  const newAccess = res.data?.access;
  if (!newAccess || !looksLikeJwt(newAccess)) {
    throw new Error("Refresh did not return a valid access token");
  }
  localStorage.setItem("access", newAccess);
  return newAccess;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    // إذا ما فيه config أو ما فيه response
    if (!originalRequest || !error.response) {
      return Promise.reject(error);
    }

    const status = error.response.status;

    // لا تحاول refresh على refresh endpoint نفسه
    const url = (originalRequest.url || "").toString();
    const isRefreshCall = url.includes("token/refresh");

    // مرة واحدة فقط لكل طلب
    if (status === 401 && !originalRequest._retry && !isRefreshCall) {
      originalRequest._retry = true;

      // إذا فيه refresh جاري، صف الطلب لين يخلص
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            originalRequest.headers["X-Access-Token"] = token;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        isRefreshing = false;
        onRefreshed(newToken);

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        originalRequest.headers["X-Access-Token"] = newToken;

        return api(originalRequest);
      } catch (e) {
        isRefreshing = false;
        clearTokens();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
