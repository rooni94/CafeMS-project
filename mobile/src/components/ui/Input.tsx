import React, { ComponentProps } from "react";
import { View, Text, StyleSheet, I18nManager } from "react-native";
import { TextInput as PaperTextInput } from "react-native-paper";
import { useTheme } from "../../theme";

type InputProps = Omit<ComponentProps<typeof PaperTextInput>, "mode" | "label"> & {
  label?: string;
  hint?: string;
};

const Input: React.FC<InputProps> = ({ label, error, hint, style, contentStyle, ...rest }) => {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, { color: theme.palette.text }]}>{label}</Text> : null}
      <PaperTextInput
        {...rest}
        mode="outlined"
        error={!!error}
        style={[styles.input, style]}
        outlineColor={theme.palette.border}
        activeOutlineColor={theme.palette.accent}
        textColor={theme.palette.text}
        placeholderTextColor={theme.palette.muted}
        contentStyle={[styles.content, contentStyle]}
      />
      {hint ? (
        <Text style={[styles.hint, { color: theme.palette.muted }]}>{hint}</Text>
      ) : null}
      {error ? (
        <Text style={[styles.error, { color: theme.palette.danger }]}>{error}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  label: {
    textAlign: I18nManager.isRTL ? "right" : "left",
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    textAlign: I18nManager.isRTL ? "right" : "left",
  },
  content: {
    textAlign: I18nManager.isRTL ? "right" : "left",
  },
  hint: {
    textAlign: I18nManager.isRTL ? "right" : "left",
    fontSize: 11,
  },
  error: {
    textAlign: I18nManager.isRTL ? "right" : "left",
    fontSize: 11,
  },
});

export default Input;
