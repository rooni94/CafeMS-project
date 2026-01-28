import { I18nManager } from "react-native";
import { applyLayoutDirection } from "./layoutDirection";

// Apply an early direction so StyleSheet preprocessors and defaults are aligned before first render.
const initialLocale = I18nManager.isRTL ? "ar" : "en";
applyLayoutDirection(initialLocale, { log: __DEV__ });
