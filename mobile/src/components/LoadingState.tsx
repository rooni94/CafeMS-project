import React from "react";
import { ActivityIndicator, Text, View, StyleSheet } from "react-native";
import { useI18n } from "../i18n";

type LoadingStateProps = {
  message?: string;
};

const LoadingState: React.FC<LoadingStateProps> = ({ message }) => {
  const { t } = useI18n();
  return (
    <View style={styles.container}>
      <ActivityIndicator color="#f59e0b" />
      <Text style={styles.text}>{message || t("common.loading", "جارٍ التحميل...")}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#fef3c7",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  text: {
    color: "#92400e",
    fontSize: 13,
  },
});

export default LoadingState;
