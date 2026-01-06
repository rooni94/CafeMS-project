import React from "react";
import { Pressable, StyleSheet, Text, View, StyleProp, ViewStyle } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../../theme";

type Props = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const DashboardListItem: React.FC<Props> = ({ title, subtitle, icon, onPress, right, style }) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.rowPressed : null, style]}
    >
      <View style={styles.left}>
        {right ?? (onPress ? <Ionicons name="chevron-back" size={18} color={theme.palette.muted} /> : null)}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: theme.palette.surfaceAlt, borderColor: theme.palette.border }]}>
          <Ionicons name={icon} size={18} color={theme.palette.accentSoft} />
        </View>
      ) : null}
    </Pressable>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 9,
      paddingHorizontal: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.palette.border,
      backgroundColor: theme.palette.surface,
    },
    rowPressed: {
      opacity: 0.96,
      transform: [{ scale: 0.995 }],
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    body: {
      flex: 1,
      alignItems: "flex-end",
      gap: 3,
    },
    title: {
      fontSize: 14,
      fontWeight: "800",
      color: theme.palette.text,
      textAlign: "auto",
    },
    subtitle: {
      fontSize: 12,
      color: theme.palette.muted,
      textAlign: "auto",
      lineHeight: 18,
    },
    left: {
      minWidth: 26,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default DashboardListItem;
