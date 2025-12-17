import React from "react";
import { View, Text, StyleSheet, ScrollView, ViewStyle, StyleProp } from "react-native";
import Screen from "../../../components/Screen";
import { Card } from "../../../components/ui";
import { useTheme } from "../../../theme";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

const DashboardShell: React.FC<Props> = ({ title, subtitle, children, headerRight, contentContainerStyle }) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <Screen style={{ backgroundColor: theme.palette.background }}>
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
    </Screen>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      gap: 12,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 24,
    },
    headerCard: {
      borderRadius: 22,
      borderColor: theme.palette.border,
      backgroundColor: theme.palette.surface,
    },
    headerRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    headerText: {
      flex: 1,
      alignItems: "flex-end",
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
      textAlign: "right",
    },
    subtitle: {
      fontSize: 13,
      color: theme.palette.muted,
      textAlign: "right",
    },
  });

export default DashboardShell;

