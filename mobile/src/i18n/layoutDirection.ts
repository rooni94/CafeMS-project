export type LayoutLocale = "ar" | "en";

type ApplyOptions = {
  log?: boolean;
};

export const normalizeLocale = (value?: string | null): LayoutLocale =>
  value === "en" ? "en" : "ar";

export const applyLayoutDirection = (
  locale: string | null | undefined,
  options?: ApplyOptions
) => {
  const resolvedLocale = normalizeLocale(locale);
  const shouldRTL = resolvedLocale === "ar";

  if (__DEV__ && options?.log) {
    console.log("[rtl] applyLayoutDirection", {
      locale: resolvedLocale,
      shouldRTL,
    });
  }

  return {
    shouldReload: false,
    direction: shouldRTL ? "rtl" : "ltr",
  };
};
