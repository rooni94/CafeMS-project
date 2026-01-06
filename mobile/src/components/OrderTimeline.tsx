import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { OrderStatus } from "../types";
import { useTheme } from "../theme";
import { useI18n } from "../i18n";

const TIMELINE_ICONS: Record<OrderStatus, keyof typeof Ionicons.glyphMap> = {
  pending: "time-outline",
  confirmed: "checkmark-circle-outline",
  preparing: "restaurant-outline",
  ready: "cube-outline",
  completed: "checkmark-done-outline",
  cancelled: "close-circle-outline",
  failed: "alert-circle-outline",
  refunded: "refresh-outline",
  paid: "checkmark-done-outline",
};

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
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(isRTL), [isRTL]);
  const steps = useMemo(
    () => [
      { status: "pending" as const, label: t("orders.timeline.pending", "قيد المراجعة") },
      { status: "confirmed" as const, label: t("orders.timeline.confirmed", "تم التأكيد") },
      { status: "preparing" as const, label: t("orders.timeline.preparing", "قيد التحضير") },
      { status: "ready" as const, label: t("orders.timeline.ready", "جاهز للاستلام") },
      { status: "completed" as const, label: t("orders.timeline.completed", "مكتمل") },
    ],
    [t]
  );
  const normalized = normalizeStatus(status);
  const activeIndex = normalized ? steps.findIndex((s) => s.status === normalized) : -1;

  if (status === "cancelled" || status === "failed" || status === "refunded") {
    const label =
      status === "cancelled"
        ? t("orders.timeline.cancelled", "تم إلغاء الطلب")
        : status === "failed"
        ? t("orders.timeline.failed", "فشلت العملية")
        : t("orders.timeline.refunded", "تم استرجاع المبلغ");

    const icon = TIMELINE_ICONS[status];

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
        <Text style={[styles.specialText, { color: theme.palette.text }]}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
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
                <Ionicons
                  name={TIMELINE_ICONS[step.status]}
                  size={18}
                  color={isActive ? "#fff" : theme.palette.accent}
                />
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
                {step.label}
              </Text>
            </View>

            {index < steps.length - 1 ? (
              <View style={[styles.connector, { backgroundColor: connectorActive ? theme.palette.accent : theme.palette.border }]} />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const createStyles = (isRTL: boolean) =>
  StyleSheet.create({
  container: {
    flexDirection: "row",
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
  },
  special: {
    flexDirection: "row",
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
    textAlign: isRTL ? "right" : "left",
    fontSize: 13,
    fontWeight: "800",
  },
});

export default OrderTimeline;
