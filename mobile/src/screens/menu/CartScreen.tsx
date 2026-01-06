import React, { useMemo } from "react";
import { View, Text, StyleSheet, Image, Pressable, FlatList } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Screen from "../../components/Screen";
import EmptyState from "../../components/EmptyState";
import { useCart } from "../../context/CartContext";
import { goToTab } from "../../navigation/helpers";
import { useTheme } from "../../theme";
import { Card, Button } from "../../components/ui";
import CurrencyAmount from "../../components/CurrencyAmount";
import { useI18n } from "../../i18n";

const CartScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { items, totalPrice, updateQuantity, removeItem, clearCart } = useCart();
  const theme = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(isRTL), [isRTL]);

  if (items.length === 0) {
    return (
      <Screen scrollable={false}>
        <EmptyState
          title={t("cart.emptyTitle", "السلة فارغة")}
          description={t("cart.emptyDescription", "أضف اختياراتك من القائمة لنجهزها لك فوراً.")}
        >
          <Button title={t("cart.browseMenu", "استكشف القائمة")} onPress={() => goToTab(navigation, "Menu")} style={{ width: "100%" }} />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      <View style={{ flex: 1, gap: 12 }}>
        <FlatList
          data={items}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingBottom: 12, gap: 12 }}
          renderItem={({ item }) => {
            const lineTotal = item.price * item.quantity;
            return (
              <Card style={styles.cartItem}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.cartImage} />
                ) : (
                  <View style={[styles.cartImage, styles.cartImageFallback]}>
                    <Text style={styles.fallbackText}>{t("product.noImage", "لا توجد صورة")}</Text>
                  </View>
                )}
                <View style={{ flex: 1, gap: 4, alignItems: "flex-end" }}>
                  <Text style={styles.cartName}>{item.name}</Text>
                  {item.addons && item.addons.length > 0 ? (
                    <Text style={styles.cartAddons}>+ {item.addons.map((addon) => addon.name).join("? ")}</Text>
                  ) : null}
                  <View style={styles.cartPriceRow}>
                    <CurrencyAmount value={item.price} color={theme.palette.accent} symbolSize={12} textStyle={styles.cartPrice} />
                    <Text style={styles.cartPriceLabel}>{t("cart.perItem", "لكل وحدة")}</Text>
                  </View>
                  <CurrencyAmount value={lineTotal} color={theme.palette.accent} symbolSize={14} textStyle={styles.cartLineTotal} />
                  <View style={styles.quantityControls}>
                    <Pressable onPress={() => updateQuantity(item.key, Math.max(1, item.quantity - 1))} style={styles.qtyButton}>
                      <Text style={styles.qtyText}>-</Text>
                    </Pressable>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <Pressable onPress={() => updateQuantity(item.key, item.quantity + 1)} style={styles.qtyButton}>
                      <Text style={styles.qtyText}>+</Text>
                    </Pressable>
                  </View>
                </View>
                <Pressable onPress={() => removeItem(item.key)} style={styles.removeButton}>
                  <Text style={styles.removeText}>{t("cart.remove", "إزالة")}</Text>
                </Pressable>
              </Card>
            );
          }}
        />

        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("cart.totalLabel", "الإجمالي")}</Text>
            <CurrencyAmount value={totalPrice} color={theme.palette.accent} symbolSize={16} textStyle={styles.summaryValue} />
          </View>
          <View style={styles.actionsRow}>
            <Button title={t("cart.clear", "تفريغ السلة")} variant="danger" onPress={clearCart} style={{ flex: 1 }} />
            <Button title={t("cart.checkout", "إتمام الطلب")} onPress={() => navigation.navigate("Checkout")} style={{ flex: 1 }} />
          </View>
        </Card>
      </View>
    </Screen>
  );
};

const createStyles = (isRTL: boolean) =>
  StyleSheet.create({
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  cartImage: {
    width: 70,
    height: 70,
    borderRadius: 16,
  },
  cartImageFallback: {
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    color: "#94a3b8",
    fontSize: 12,
  },
  cartName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    textAlign: isRTL ? "right" : "left",
  },
  cartPrice: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: isRTL ? "right" : "left",
  },
  cartPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cartPriceLabel: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: isRTL ? "right" : "left",
  },
  cartAddons: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: isRTL ? "right" : "left",
  },
  cartLineTotal: {
    fontSize: 14,
    color: "#F59E0B",
    fontWeight: "700",
    textAlign: isRTL ? "right" : "left",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  qtyButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  qtyValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  removeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  removeText: {
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: "700",
  },
  summaryCard: {
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 15,
    color: "#334155",
    fontWeight: "700",
  },
  summaryValue: {
    fontSize: 18,
    color: "#111827",
    fontWeight: "800",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
});

export default CartScreen;