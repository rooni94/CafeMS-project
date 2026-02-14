import React from "react";
import { View, Text, StyleSheet, ScrollView, ViewStyle, StyleProp } from "react-native";
import { useRoute } from "@react-navigation/native";
import Screen from "../../../components/Screen";
import { Card } from "../../../components/ui";
import { ButtonDensityProvider } from "../../../components/ui/Button";
import { useTheme } from "../../../theme";
import { useI18n } from "../../../i18n";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

const DashboardShell: React.FC<Props> = ({ title, subtitle, children, headerRight, contentContainerStyle }) => {
  const theme = useTheme();
  const { isRTL } = useI18n();
  const styles = React.useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);
  const route = useRoute();
  const routeName = typeof route?.name === "string" ? route.name : "";
  const compactButtons = routeName.startsWith("Dashboard") || routeName === "HRDashboard";

  return (
    <Screen scrollable={false} style={{ backgroundColor: theme.palette.background }}>
      <ButtonDensityProvider value={compactButtons ? "compact" : "default"}>
        <ScrollView contentContainerStyle={[styles.container, contentContainerStyle]}>
          <Card style={styles.headerCard}>
            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
            </View>
          </Card>
          {children}
        </ScrollView>
      </ButtonDensityProvider>
    </Screen>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>, isRTL: boolean) =>
  StyleSheet.create({
    container: {
      gap: 6,
      paddingHorizontal: 4,
      paddingTop: 6,
      paddingBottom: 12,
    },
    headerCard: {
      borderRadius: 22,
      borderColor: theme.palette.border,
      backgroundColor: theme.palette.surface,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    headerText: {
      flex: 1,
      alignItems: "flex-start",
      gap: 6,
    },
    headerRight: {
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: 18,
      fontWeight: "900",
      color: theme.palette.text,
      textAlign: isRTL ? "right" : "left",
    },
    subtitle: {
      fontSize: 13,
      color: theme.palette.muted,
      textAlign: isRTL ? "right" : "left",
    },
  });

export default DashboardShell;
