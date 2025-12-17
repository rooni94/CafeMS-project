import React, { ComponentProps } from "react";
import { StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Button as PaperButton } from "react-native-paper";
import { useTheme } from "../../theme";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = Omit<
  ComponentProps<typeof PaperButton>,
  "children" | "mode"
> & {
  title: string;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
  color?: string;
  textColor?: string;
};

const Button: React.FC<ButtonProps> = ({
  title,
  variant = "primary",
  loading,
  style,
  color,
  textColor,
  ...rest
}) => {
  const theme = useTheme();

  const mode = variant === "ghost" ? "text" : "contained";
  const buttonColor =
    color ||
    (variant === "primary"
      ? theme.palette.accent
      : variant === "secondary"
      ? theme.palette.accentSoft
      : undefined);
  const finalTextColor =
    textColor ||
    (variant === "ghost" ? color || theme.palette.accent : undefined);

  return (
    <PaperButton
      mode={mode}
      loading={loading}
      buttonColor={buttonColor}
      textColor={finalTextColor}
      contentStyle={styles.content}
      style={[styles.button, style]}
      labelStyle={[
        styles.label,
        finalTextColor ? { color: finalTextColor } : undefined,
      ]}
      uppercase={false}
      {...rest}
    >
      {title}
    </PaperButton>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 999,
  },
  content: {
    paddingVertical: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
  },
});

export default Button;
