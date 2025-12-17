import { ENV } from "../config/env";

const API_ORIGIN = (() => {
  try {
    const url = new URL(ENV.apiUrl);
    return url.origin;
  } catch {
    return ENV.apiUrl.replace(/\/api\/?$/, "");
  }
})();

export const resolveMediaUrl = (value?: string | null) => {
  if (!value) return undefined;
  if (value.startsWith("data:")) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `${API_ORIGIN}${value}`;
  return `${API_ORIGIN}/${value}`;
};
