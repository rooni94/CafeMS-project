import React from "react";
import { View, Text, StyleSheet } from "react-native";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
}) => (
  <View style={styles.container}>
    <View style={{ flex: 1 }}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
    {action}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "auto",
    color: "#111827",
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "auto",
    marginTop: 4,
  },
});

export default SectionHeader;
