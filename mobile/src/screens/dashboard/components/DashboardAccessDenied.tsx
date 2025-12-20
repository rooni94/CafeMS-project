import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../../theme";
import DashboardShell from "./DashboardShell";
import DashboardSection from "./DashboardSection";

type Props = {
  title: string;
  subtitle?: string;
  message?: string;
};

const DashboardAccessDenied: React.FC<Props> = ({ title, subtitle, message }) => {
  const theme = useTheme();

  return (
    <DashboardShell title={title} subtitle={subtitle}>
      <DashboardSection title="غير مصرح" subtitle="لا تملك صلاحية الوصول إلى هذه الصفحة.">
        <View style={styles.body}>
          <Text style={[styles.text, { color: theme.palette.muted }]}>
            {message || "إذا كنت تعتقد أن هذا خطأ، تواصل مع المدير لتحديث صلاحيات حسابك."}
          </Text>
        </View>
      </DashboardSection>
    </DashboardShell>
  );
};

const styles = StyleSheet.create({
  body: {
    paddingTop: 4,
  },
  text: {
    textAlign: "right",
    fontSize: 13,
    lineHeight: 18,
  },
});

export default DashboardAccessDenied;

