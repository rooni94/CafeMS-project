import React from "react";
import { View, Text, StyleSheet } from "react-native";

type EmptyStateProps = {
  title: string;
  description?: string;
  children?: React.ReactNode;
};

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  children,
}) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    {description ? <Text style={styles.description}>{description}</Text> : null}
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontWeight: "600",
    color: "#92400e",
    textAlign: "center",
  },
  description: {
    color: "#b45309",
    fontSize: 12,
    textAlign: "center",
  },
});

export default EmptyState;
