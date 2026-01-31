import React, { useMemo } from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import EmptyState from "../../components/EmptyState";
import { useCart } from "../../context/CartContext";
import { goToTab } from "../../navigation/helpers";
import { useTheme } from "../../theme";
import { Button } from "../../components/ui";
import CurrencyAmount from "../../components/CurrencyAmount";
import { useI18n } from "../../i18n";
import DashboardShell from "../dashboard/components/DashboardShell";
import DashboardSection from "../dashboard/components/DashboardSection";
import StatBadge from "../dashboard/components/StatBadge";
import { resolveMediaUrl } from "../../utils/media";

const CartScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { items, totalPrice, totalQuantity, updateQuantity, removeItem, clearCart } = useCart();
  const theme = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);

  if (items.length === 0) {
    return (
      <DashboardShell
        title={t("nav.cart")}
        subtitle={t("cart.emptyDescription")}
      >
        <DashboardSection>
          <EmptyState
            title={t("cart.emptyTitle")}
            description={t("cart.emptyDescription")}
          >
            <Button
              title={t("cart.browseMenu")}
              onPress={() => goToTab(navigation, "Menu")}
              style={{ width: "100%" }}
            />
          </EmptyState>
        </DashboardSection>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title={t("nav.cart")}
      subtitle={t("cart.subtitle")}
    >
      <DashboardSection
        title={t("cart.itemsTitle")}
        subtitle={t("cart.itemsSubtitle")}
      >
        <View style={styles.list}>
          {items.map((item) => {
            const lineTotal = item.price * item.quantity;
            const imageUrl = resolveMediaUrl(item.image);
            return (
              <View key={item.key} style={styles.itemRow}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.image} />
                ) : (
                  <View style={[styles.image, styles.imageFallback]}>
                    <Text style={styles.fallbackText}>{t("product.noImage")}</Text>
                  </View>
                )}

                <View style={styles.itemBody}>
                  <View style={styles.titleRow}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Button
                      title={t("cart.remove")}
                      variant="link"
                      color={theme.palette.danger}
                      textColor={theme.palette.danger}
                      onPress={() => removeItem(item.key)}
                      contentStyle={{ paddingVertical: 0, paddingHorizontal: 0 }}
                      style={{ alignSelf: "flex-start" }}
                    />
                  </View>
                  {item.addons && item.addons.length > 0 ? (
                    <Text style={styles.itemAddons} numberOfLines={2}>
                      + {item.addons.map((addon) => addon.name).join(isRTL ? "، " : ", ")}
                    </Text>
                  ) : null}
                  <View style={styles.metaRow}>
                    <CurrencyAmount
                      value={item.price}
                      color={theme.palette.muted}
                      symbolSize={12}
                      textStyle={styles.metaText}
                    />
                    <Text style={styles.metaText}>{t("cart.perItem")}</Text>
                  </View>
                </View>

                <View style={styles.actionsCol}>
                  <CurrencyAmount
                    value={lineTotal}
                    color={theme.palette.accent}
                    symbolSize={12}
                    textStyle={styles.lineTotal}
                  />
                  <View style={styles.qtyRow}>
                    <Pressable
                      onPress={() => updateQuantity(item.key, Math.max(1, item.quantity - 1))}
                      style={styles.qtyBtn}
                    >
                      <Ionicons name="remove" size={16} color={theme.palette.text} />
                    </Pressable>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <Pressable
                      onPress={() => updateQuantity(item.key, item.quantity + 1)}
                      style={styles.qtyBtn}
                    >
                      <Ionicons name="add" size={16} color={theme.palette.text} />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </DashboardSection>

      <DashboardSection
        title={t("cart.summaryTitle")}
        subtitle={t("cart.summarySubtitle")}
      >
        <View style={styles.statsRow}>
            <StatBadge
            label={t("cart.itemsCountLabel")}
            value={items.length}
            color={theme.palette.accentSoft}
          />
          <StatBadge
            label={t("cart.quantityLabel")}
            value={totalQuantity}
            color={theme.palette.accent}
          />
        </View>

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("cart.totalLabel")}</Text>
            <CurrencyAmount
              value={totalPrice}
              color={theme.palette.accent}
              symbolSize={14}
              textStyle={styles.summaryValue}
            />
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Button
            title={t("cart.clear")}
            variant="secondary"
            onPress={clearCart}
            style={{ flex: 1 }}
          />
          <Button
            title={t("cart.checkout")}
            onPress={() => navigation.navigate("Checkout")}
            style={{ flex: 1 }}
          />
        </View>
      </DashboardSection>
    </DashboardShell>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>, isRTL: boolean) =>
  StyleSheet.create({
    list: {
      gap: 10,
    },
    itemRow: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      gap: 10,
      padding: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.palette.border,
      backgroundColor: theme.palette.surface,
    },
    image: {
      width: 84,
      aspectRatio: 4 / 3,
      borderRadius: 18,
    },
    imageFallback: {
      backgroundColor: theme.palette.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
      padding: 6,
    },
    fallbackText: {
      color: theme.palette.muted,
      fontSize: 11,
      textAlign: "center",
    },
    itemBody: {
      flex: 1,
      alignItems: isRTL ? "flex-end" : "flex-start",
      gap: 4,
    },
    titleRow: {
      width: "100%",
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
    },
    itemName: {
      fontSize: 14,
      fontWeight: "900",
      color: theme.palette.text,
      textAlign: isRTL ? "right" : "left",
      flex: 1,
    },
    itemAddons: {
      fontSize: 12,
      lineHeight: 16,
      color: theme.palette.muted,
      textAlign: isRTL ? "right" : "left",
    },
    metaRow: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      gap: 6,
    },
    metaText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.palette.muted,
      textAlign: isRTL ? "right" : "left",
    },
    actionsCol: {
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minWidth: 88,
    },
    lineTotal: {
      fontSize: 14,
      fontWeight: "900",
      color: theme.palette.accent,
    },
    qtyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    qtyBtn: {
      width: 30,
      height: 30,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.palette.border,
      backgroundColor: theme.palette.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    qtyValue: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.palette.text,
      minWidth: 18,
      textAlign: "center",
    },
    statsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    summaryBox: {
      borderTopWidth: 1,
      borderColor: theme.palette.border,
      paddingTop: 10,
      marginTop: 4,
      gap: 8,
    },
    summaryRow: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    summaryLabel: {
      fontSize: 12,
      fontWeight: "800",
      color: theme.palette.muted,
      textAlign: isRTL ? "right" : "left",
    },
    summaryValue: {
      fontSize: 15,
      fontWeight: "900",
      color: theme.palette.accent,
      textAlign: isRTL ? "right" : "left",
    },
    actionsRow: {
      flexDirection: isRTL ? "row-reverse" : "row",
      gap: 8,
    },
  });

export default CartScreen;
