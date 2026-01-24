import React, { ComponentProps, createContext, useContext } from "react";
import { StyleSheet, StyleProp, ViewStyle, TextStyle } from "react-native";
import { Button as PaperButton } from "react-native-paper";
import { useTheme } from "../../theme";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "link";
type ButtonSize = "md" | "sm";
type ButtonDensity = "default" | "compact";

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

export const ButtonDensityContext = createContext<ButtonDensity>("default");
export const ButtonDensityProvider = ButtonDensityContext.Provider;

const Button: React.FC<ButtonProps> = ({
  title,
  variant = "primary",
  size,
  loading,
  style,
  color,
  textColor,
  contentStyle,
  labelStyle,
  ...rest
}) => {
  const theme = useTheme();
  const density = useContext(ButtonDensityContext);
  const resolvedSize: ButtonSize = size || (density === "compact" ? "sm" : "md");

  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isDanger = variant === "danger";
  const isGhost = variant === "ghost";
  const isLink = variant === "link";

  const mode = isPrimary ? "contained" : isSecondary || isDanger ? "outlined" : "text";

  const baseTint =
    color ||
    (isDanger
      ? theme.palette.danger
      : theme.palette.accent);

  const buttonColor = isPrimary ? baseTint : undefined;
  const finalTextColor: string | undefined =
    textColor ||
    (isSecondary || isDanger || isGhost || isLink
      ? baseTint
      : undefined);

  const outlineStyle: StyleProp<ViewStyle> =
    isSecondary || isDanger
      ? { borderColor: `${baseTint}55`, borderWidth: 1 }
      : undefined;

  const surfaceStyle: StyleProp<ViewStyle> =
    isSecondary || isDanger
      ? { backgroundColor: `${baseTint}12` }
      : isGhost
      ? { backgroundColor: theme.palette.surfaceAlt }
      : undefined;

  const elevationStyle: StyleProp<ViewStyle> = isPrimary ? styles.elevated : undefined;

  const sizing = isLink ? styles.contentLink : resolvedSize === "sm" ? styles.contentSm : styles.contentMd;
  const labelSizing: TextStyle = resolvedSize === "sm" || isLink ? styles.labelSm : styles.labelMd;
  const buttonSizing: StyleProp<ViewStyle> = isLink ? styles.buttonLink : resolvedSize === "sm" ? styles.buttonSm : styles.buttonMd;

  return (
    <PaperButton
      mode={mode}
      loading={loading}
      buttonColor={buttonColor}
      textColor={finalTextColor}
      contentStyle={[styles.contentBase, sizing, contentStyle]}
      style={[styles.buttonBase, buttonSizing, surfaceStyle, outlineStyle, elevationStyle, style]}
      labelStyle={[
        styles.labelBase,
        labelSizing,
        finalTextColor ? { color: finalTextColor } : undefined,
        labelStyle,
      ]}
      rippleColor={`${baseTint}22`}
      uppercase={false}
      {...rest}
    >
      {title}
    </PaperButton>
  );
};

const styles = StyleSheet.create({
  buttonBase: {
    borderRadius: 14,
  },
  buttonMd: {
    minHeight: 42,
  },
  buttonSm: {
    minHeight: 32,
  },
  buttonLink: {
    minHeight: 0,
  },
  contentBase: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  contentMd: {
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  contentSm: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  contentLink: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  labelBase: {
    textAlign: "center",
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  labelMd: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
  labelSm: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  elevated: {
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
});

export default Button;
