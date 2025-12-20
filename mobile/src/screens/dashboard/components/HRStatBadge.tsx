import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../../theme";

type Props = {
  label: string;
  value: string | number;
  color?: string;
};

const HRStatBadge: React.FC<Props> = ({ label, value, color }) => {
  const theme = useTheme();
  const tint = color || theme.palette.accent;
  return (
    <View style={[styles.card, { borderColor: theme.palette.border, backgroundColor: theme.palette.surface }]}>
      <Text style={[styles.value, { color: tint }]}>{value}</Text>
      <Text style={[styles.label, { color: theme.palette.muted }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: "800",
  },
  label: {
    fontSize: 12,
    textAlign: "center",
  },
});

export default HRStatBadge;

