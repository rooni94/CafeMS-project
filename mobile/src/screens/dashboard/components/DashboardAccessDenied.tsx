import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../../theme";
import DashboardShell from "./DashboardShell";
import DashboardSection from "./DashboardSection";
import { useI18n } from "../../../i18n";

type Props = {
  title: string;
  subtitle?: string;
  message?: string;
};

const DashboardAccessDenied: React.FC<Props> = ({ title, subtitle, message }) => {
  const theme = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(isRTL), [isRTL]);

  return (
    <DashboardShell title={title} subtitle={subtitle}>
      <DashboardSection
        title={t("dashboard.accessDeniedTitle", "غير مصرح")}
        subtitle={t("dashboard.accessDeniedSubtitle", "لا تملك صلاحية الوصول إلى هذه الصفحة.")}
      >
        <View style={styles.body}>
          <Text style={[styles.text, { color: theme.palette.muted }]}>
            {message ||
              t(
                "dashboard.accessDeniedBody",
                "إذا كنت تعتقد أن هذا خطأ، تواصل مع المدير لتحديث صلاحيات حسابك."
              )}
          </Text>
        </View>
      </DashboardSection>
    </DashboardShell>
  );
};

const createStyles = (isRTL: boolean) =>
  StyleSheet.create({
  body: {
    paddingTop: 4,
  },
  text: {
    textAlign: isRTL ? "right" : "left",
    fontSize: 13,
    lineHeight: 18,
  },
});

export default DashboardAccessDenied;
