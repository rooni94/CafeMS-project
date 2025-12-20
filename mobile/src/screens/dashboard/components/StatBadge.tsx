import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "../../../theme";

type Props = {
  label: string;
  value: string | number;
  color?: string;
  style?: ViewStyle;
};

const StatBadge: React.FC<Props> = ({ label, value, color = "#f59e0b", style }) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.container,
        { borderColor: theme.palette.border, backgroundColor: theme.palette.surface },
        style,
      ]}
    >
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={[styles.label, { color: theme.palette.muted }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: "800",
  },
  label: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
});

export default StatBadge;
