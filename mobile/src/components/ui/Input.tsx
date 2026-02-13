import React, {ComponentProps, useMemo} from "react";
import { View, Text, StyleSheet } from "react-native";
import { TextInput as PaperTextInput } from "react-native-paper";
import { useTheme } from "../../theme";
import { useI18n } from "../../i18n";

type InputProps = Omit<ComponentProps<typeof PaperTextInput>, "mode" | "label"> & {
  label?: string;
  hint?: string;
};

const Input: React.FC<InputProps> = ({ label, error, hint, style, contentStyle, ...rest }) => {
  const theme = useTheme();
  const { isRTL } = useI18n();
  const styles = useMemo(() => createStyles(isRTL), [isRTL]);
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
        textAlign={isRTL ? "right" : "left"}
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

const createStyles = (isRTL: boolean) =>
  StyleSheet.create({
  container: {
    gap: 4,
  },
  label: {
    textAlign: isRTL ? "right" : "left",
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    textAlign: isRTL ? "right" : "left",
    writingDirection: isRTL ? "rtl" : "ltr",
  },
  content: {
    textAlign: isRTL ? "right" : "left",
    writingDirection: isRTL ? "rtl" : "ltr",
  },
  hint: {
    textAlign: isRTL ? "right" : "left",
    fontSize: 11,
  },
  error: {
    textAlign: isRTL ? "right" : "left",
    fontSize: 11,
  },
});

export default Input;
