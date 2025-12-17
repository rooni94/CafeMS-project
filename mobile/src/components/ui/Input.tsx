import React, { ComponentProps } from "react";
import { View, Text, StyleSheet } from "react-native";
import { TextInput as PaperTextInput } from "react-native-paper";
import { useTheme } from "../../theme";

type InputProps = Omit<ComponentProps<typeof PaperTextInput>, "mode"> & {
  hint?: string;
};

const Input: React.FC<InputProps> = ({ label, error, hint, style, ...rest }) => {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <PaperTextInput
        {...rest}
        mode="outlined"
        label={label}
        error={!!error}
        style={[styles.input, style]}
        outlineColor={theme.palette.border}
        activeOutlineColor={theme.palette.accent}
        textColor={theme.palette.text}
        placeholderTextColor={theme.palette.muted}
        contentStyle={{ textAlign: "right" }}
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
  input: {
    textAlign: "right",
  },
  hint: {
    textAlign: "right",
    fontSize: 11,
  },
  error: {
    textAlign: "right",
    fontSize: 11,
  },
});

export default Input;
