import { registerRootComponent } from "expo";
import { I18nManager } from "react-native";
import App from "./App";
import { applyLayoutDirection } from "./src/i18n/layoutDirection";

const initialLocale = I18nManager.isRTL ? "ar" : "en";
applyLayoutDirection(initialLocale, { log: __DEV__ });

registerRootComponent(App);
