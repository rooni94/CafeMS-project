import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { OrderStatus } from "../types";
import { useTheme } from "../theme";
import { decodeUnicodeEscapes } from "../utils/text";

const STEPS: Array<{
  status: OrderStatus;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { status: "pending", label: "\\u0642\\u064a\\u062f \\u0627\\u0644\\u0645\\u0631\\u0627\\u062c\\u0639\\u0629", icon: "time-outline" },
  { status: "confirmed", label: "\\u062a\\u0645 \\u0627\\u0644\\u062a\\u0623\\u0643\\u064a\\u062f", icon: "checkmark-circle-outline" },
  { status: "preparing", label: "\\u0642\\u064a\\u062f \\u0627\\u0644\\u062a\\u062d\\u0636\\u064a\\u0631", icon: "restaurant-outline" },
  { status: "ready", label: "\\u062c\\u0627\\u0647\\u0632 \\u0644\\u0644\\u0627\\u0633\\u062a\\u0644\\u0627\\u0645", icon: "cube-outline" },
  { status: "completed", label: "\\u0645\\u0643\\u062a\\u0645\\u0644", icon: "checkmark-done-outline" },
];

type OrderTimelineProps = {
  status?: OrderStatus | null;
};

const normalizeStatus = (status?: OrderStatus | null): OrderStatus | null => {
  if (!status) return null;
  if (status === "paid") return "completed";
  if (["failed", "refunded", "cancelled"].includes(status)) return null;
  return status;
};

const OrderTimeline: React.FC<OrderTimelineProps> = ({ status }) => {
  const theme = useTheme();
  const normalized = normalizeStatus(status);
  const activeIndex = normalized ? STEPS.findIndex((s) => s.status === normalized) : -1;

  if (status === "cancelled" || status === "failed" || status === "refunded") {
    const label =
      status === "cancelled"
        ? "\\u062a\\u0645 \\u0625\\u0644\\u063a\\u0627\\u0621 \\u0627\\u0644\\u0637\\u0644\\u0628"
        : status === "failed"
        ? "\\u0641\\u0634\\u0644\\u062a \\u0627\\u0644\\u0639\\u0645\\u0644\\u064a\\u0629"
        : "\\u062a\\u0645 \\u0627\\u0633\\u062a\\u0631\\u062c\\u0627\\u0639 \\u0627\\u0644\\u0645\\u0628\\u0644\\u063a";

    const icon: keyof typeof Ionicons.glyphMap =
      status === "cancelled"
        ? "close-circle-outline"
        : status === "failed"
        ? "alert-circle-outline"
        : "refresh-outline";

    const color =
      status === "failed"
        ? theme.palette.danger
        : status === "cancelled"
        ? theme.palette.muted
        : theme.palette.accent;

    return (
      <View style={[styles.special, { borderColor: theme.palette.border, backgroundColor: theme.palette.surfaceAlt }]}>
        <View style={[styles.specialIcon, { backgroundColor: `${color}14`, borderColor: `${color}33` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.specialText, { color: theme.palette.text }]}>{decodeUnicodeEscapes(label)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {STEPS.map((step, index) => {
        const isActive = activeIndex >= index && activeIndex !== -1;
        const connectorActive = activeIndex > index && activeIndex !== -1;

        return (
          <React.Fragment key={step.status}>
            <View style={styles.step}>
              <View
                style={[
                  styles.circle,
                  {
                    backgroundColor: isActive ? theme.palette.accent : `${theme.palette.accent}14`,
                    borderColor: isActive ? theme.palette.accent : theme.palette.border,
                  },
                ]}
              >
                <Ionicons name={step.icon} size={18} color={isActive ? "#fff" : theme.palette.accent} />
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  {
                    color: isActive ? theme.palette.text : theme.palette.muted,
                    fontWeight: isActive ? "800" : "700",
                  },
                ]}
                numberOfLines={2}
              >
                {decodeUnicodeEscapes(step.label)}
              </Text>
            </View>

            {index < STEPS.length - 1 ? (
              <View style={[styles.connector, { backgroundColor: connectorActive ? theme.palette.accent : theme.palette.border }]} />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row-reverse",
    alignItems: "center",
  },
  step: {
    width: 62,
    alignItems: "center",
    gap: 6,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  connector: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    marginHorizontal: 6,
  },
  stepLabel: {
    fontSize: 11,
    textAlign: "center",
    writingDirection: "rtl",
  },
  special: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  specialIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  specialText: {
    flex: 1,
    textAlign: "right",
    writingDirection: "rtl",
    fontSize: 13,
    fontWeight: "800",
  },
});

export default OrderTimeline;