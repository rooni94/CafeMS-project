import React from "react";
import { Pressable, StyleSheet, Text, View, StyleProp, ViewStyle } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../../theme";
import { useI18n } from "../../../i18n";

type Props = {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

const DashboardTile: React.FC<Props> = ({ title, subtitle, icon, onPress, color, style }) => {
  const theme = useTheme();
  const { isRTL } = useI18n();
  const styles = React.useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);
  const tint = color || theme.palette.accent;
  const chevronName = isRTL ? "chevron-back" : "chevron-forward";

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && styles.pressed, style]}>
      <View style={[styles.iconWrap, { backgroundColor: `${tint}18`, borderColor: `${tint}33` }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={3}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name={chevronName} size={18} color={theme.palette.muted} />
    </Pressable>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>, isRTL: boolean) =>
  StyleSheet.create({
    tile: {
      width: "49.5%",
      minHeight: 84,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.palette.border,
      backgroundColor: theme.palette.surface,
      padding: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    pressed: {
      opacity: 0.96,
      transform: [{ scale: 0.995 }],
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 13,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    textWrap: {
      flex: 1,
      alignItems: isRTL ? "flex-end" : "flex-start",
      gap: 4,
    },
    title: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "900",
      color: theme.palette.text,
      textAlign: isRTL ? "right" : "left",
    },
    subtitle: {
      fontSize: 11,
      color: theme.palette.muted,
      textAlign: isRTL ? "right" : "left",
      lineHeight: 16,
    },
  });

export default DashboardTile;
