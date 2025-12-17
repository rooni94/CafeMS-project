import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Props = {
  label: string;
  value: string | number;
  color?: string;
};

const HRStatBadge: React.FC<Props> = ({ label, value, color = "#F59E0B" }) => {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
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
    color: "#6b7280",
    textAlign: "center",
  },
});

export default HRStatBadge;
