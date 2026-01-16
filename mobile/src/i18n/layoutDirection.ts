import { I18nManager, Text, TextInput } from "react-native";

export type LayoutLocale = "ar" | "en";

type ApplyOptions = {
  log?: boolean;
};

export const normalizeLocale = (value?: string | null): LayoutLocale => (value === "en" ? "en" : "ar");

export const applyLayoutDirection = (locale: string | null | undefined, options?: ApplyOptions) => {
  const resolvedLocale = normalizeLocale(locale);
  const shouldRTL = resolvedLocale === "ar";
  const previousRTL = I18nManager.isRTL;

  // Always allow RTL so swapping isn't disabled when returning to LTR.
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(shouldRTL);
  I18nManager.swapLeftAndRightInRTL(true);
  // Keep JS-side flags in sync to allow style preprocessors to pick the intended direction before reload.
  (I18nManager as any).isRTL = shouldRTL;
  (I18nManager as any).doLeftAndRightSwapInRTL = true;

  const direction = shouldRTL ? "rtl" : "ltr";
  const textAlign = shouldRTL ? "right" : "left";

  const TextWithDefaults = Text as typeof Text & { defaultProps?: { style?: any } };
  const TextInputWithDefaults = TextInput as typeof TextInput & { defaultProps?: { style?: any } };

  TextWithDefaults.defaultProps = TextWithDefaults.defaultProps || {};
  TextWithDefaults.defaultProps.style = [
    ...(Array.isArray(TextWithDefaults.defaultProps.style)
      ? (TextWithDefaults.defaultProps.style as any[])
      : TextWithDefaults.defaultProps.style
      ? [TextWithDefaults.defaultProps.style]
      : []),
    { writingDirection: direction, textAlign },
  ];

  TextInputWithDefaults.defaultProps = TextInputWithDefaults.defaultProps || {};
  TextInputWithDefaults.defaultProps.style = [
    ...(Array.isArray(TextInputWithDefaults.defaultProps.style)
      ? (TextInputWithDefaults.defaultProps.style as any[])
      : TextInputWithDefaults.defaultProps.style
      ? [TextInputWithDefaults.defaultProps.style]
      : []),
    { writingDirection: direction, textAlign },
  ];

  if (__DEV__ && options?.log) {
    console.log("[rtl] applyLayoutDirection", {
      locale: resolvedLocale,
      shouldRTL,
      previousRTL,
      nextRTL: shouldRTL,
      swap: (I18nManager as any)?.doLeftAndRightSwapInRTL,
    });
  }

  return { shouldReload: previousRTL !== shouldRTL, direction };
};
