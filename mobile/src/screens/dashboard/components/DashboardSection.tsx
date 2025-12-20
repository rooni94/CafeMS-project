import React from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Card } from "../../../components/ui";
import { useTheme } from "../../../theme";

type Props = {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const DashboardSection: React.FC<Props> = ({ title, subtitle, children, style }) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <Card style={[styles.card, style]} contentStyle={styles.content}>
      {title ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
      {children ?? null}
    </Card>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    card: {
      borderRadius: 22,
      borderColor: theme.palette.border,
      backgroundColor: theme.palette.surface,
    },
    content: {
      paddingVertical: 8,
      gap: 6,
    },
    header: {
      gap: 4,
      alignItems: "flex-end",
    },
    title: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.palette.text,
      textAlign: "right",
    },
    subtitle: {
      fontSize: 12,
      color: theme.palette.muted,
      textAlign: "right",
      lineHeight: 18,
    },
  });

export default DashboardSection;
