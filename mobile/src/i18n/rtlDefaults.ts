import * as Localization from "expo-localization";
import { applyLayoutDirection, normalizeLocale } from "./layoutDirection";

// Apply an early direction so StyleSheet preprocessors and defaults are aligned before first render.
const initialLocale = normalizeLocale(Localization.getLocales?.()[0]?.languageCode);
applyLayoutDirection(initialLocale, { log: __DEV__ });
