import React, { ComponentProps } from "react";
import { StyleSheet, StyleProp, ViewStyle, TextStyle } from "react-native";
import { Button as PaperButton } from "react-native-paper";
import { useTheme } from "../../theme";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "link";
type ButtonSize = "md" | "sm";

type ButtonProps = Omit<
  ComponentProps<typeof PaperButton>,
  "children" | "mode"
> & {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
  color?: string;
  textColor?: string;
};

const Button: React.FC<ButtonProps> = ({
  title,
  variant = "primary",
  size = "md",
  loading,
  style,
  color,
  textColor,
  contentStyle,
  labelStyle,
  ...rest
}) => {
  const theme = useTheme();

  const mode =
    variant === "primary"
      ? "contained"
      : variant === "secondary" || variant === "danger"
      ? "outlined"
      : "text";

  const baseTint =
    color ||
    (variant === "danger"
      ? theme.palette.danger
      : theme.palette.accent);

  const buttonColor = variant === "primary" ? baseTint : undefined;
  const finalTextColor: string | undefined =
    textColor ||
    (variant === "secondary" || variant === "danger" || variant === "ghost" || variant === "link"
      ? baseTint
      : undefined);

  const outlineStyle: StyleProp<ViewStyle> =
    variant === "secondary" || variant === "danger"
      ? { borderColor: `${baseTint}66`, borderWidth: 1.4 }
      : undefined;

  const sizing =
    variant === "link" ? styles.contentLink : size === "sm" ? styles.contentSm : styles.contentMd;
  const labelSizing: TextStyle = size === "sm" || variant === "link" ? styles.labelSm : styles.labelMd;
  const buttonSizing: StyleProp<ViewStyle> =
    variant === "link" ? styles.buttonLink : size === "sm" ? styles.buttonSm : styles.buttonMd;

  return (
    <PaperButton
      mode={mode}
      loading={loading}
      buttonColor={buttonColor}
      textColor={finalTextColor}
      contentStyle={[styles.contentBase, sizing, contentStyle]}
      style={[styles.buttonBase, buttonSizing, outlineStyle, style]}
      labelStyle={[
        styles.labelBase,
        labelSizing,
        finalTextColor ? { color: finalTextColor } : undefined,
        labelStyle,
      ]}
      uppercase={false}
      {...rest}
    >
      {title}
    </PaperButton>
  );
};

const styles = StyleSheet.create({
  buttonBase: {
    borderRadius: 999,
  },
  buttonMd: {
    minHeight: 50,
  },
  buttonSm: {
    minHeight: 44,
  },
  buttonLink: {
    minHeight: 0,
  },
  contentBase: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  contentMd: {
    paddingVertical: 14,
  },
  contentSm: {
    paddingVertical: 10,
  },
  contentLink: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  labelBase: {
    textAlign: "center",
    letterSpacing: 0,
    includeFontPadding: false,
  },
  labelMd: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },
  labelSm: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
  },
});

export default Button;
