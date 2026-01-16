import { I18nManager, StyleSheet } from "react-native";

// Normalize flexDirection to auto-flip rows when RTL is enabled.
StyleSheet.setStyleAttributePreprocessor("flexDirection", (value: any) => {
  if (value === "row") {
    return I18nManager.isRTL ? "row-reverse" : "row";
  }
  if (value === "row-reverse") {
    return I18nManager.isRTL ? "row" : "row-reverse";
  }
  return value;
});
