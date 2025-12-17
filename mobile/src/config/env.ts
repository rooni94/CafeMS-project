const normalizeBaseUrl = (url?: string | null) => {
  if (!url) return "https://example.invalid/api/";
  if (!url.endsWith("/")) {
    return `${url}/`;
  }
  return url;
};

export const ENV = {
  apiUrl: normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL),
};
