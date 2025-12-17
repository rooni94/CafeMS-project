import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { OrderStatus } from "../types";

const STATUS_STEPS: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
];

const statusLabel = (status: OrderStatus) => {
  switch (status) {
    case "pending":
      return "قيد المراجعة";
    case "confirmed":
      return "تم التأكيد";
    case "preparing":
      return "قيد التحضير";
    case "ready":
      return "جاهز";
    case "completed":
      return "مكتمل";
    case "paid":
      return "مدفوع";
    case "failed":
      return "فشل الدفع";
    case "refunded":
      return "تم رد المبلغ";
    case "cancelled":
      return "ملغي";
    default:
      return status;
  }
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
  const normalized = normalizeStatus(status);
  const activeIndex =
    normalized && STATUS_STEPS.includes(normalized)
      ? STATUS_STEPS.indexOf(normalized)
      : -1;

  return (
    <View style={styles.container}>
      {STATUS_STEPS.map((step, index) => {
        const isActive = activeIndex >= index && activeIndex !== -1;
        return (
          <View style={styles.step} key={step}>
            <View
              style={[
                styles.circle,
                isActive ? styles.circleActive : styles.circleInactive,
              ]}
            >
              <Text style={styles.circleText}>{index + 1}</Text>
            </View>
            <Text
              style={[
                styles.stepLabel,
                isActive ? styles.activeLabel : undefined,
              ]}
            >
              {statusLabel(step)}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  step: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  circleActive: {
    backgroundColor: "#f59e0b",
  },
  circleInactive: {
    backgroundColor: "#fef3c7",
  },
  circleText: {
    color: "#fff",
    fontWeight: "700",
  },
  stepLabel: {
    fontSize: 11,
    color: "#6b7280",
    textAlign: "center",
  },
  activeLabel: {
    color: "#92400e",
    fontWeight: "600",
  },
});

export default OrderTimeline;
