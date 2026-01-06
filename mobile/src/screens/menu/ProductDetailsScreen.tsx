import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";

import Screen from "../../components/Screen";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import { api } from "../../services/api";
import { useCart } from "../../context/CartContext";
import { Product } from "../../types";
import { useTheme } from "../../theme";
import { AppStackParamList } from "../../navigation/AppNavigator";
import CurrencyAmount from "../../components/CurrencyAmount";
import { Button } from "../../components/ui";
import { normalizeArabicText } from "../../utils/text";
import { useI18n } from "../../i18n";

const ProductDetailsScreen: React.FC = () => {
  const route = useRoute<RouteProp<AppStackParamList, "ProductDetails">>();
  const { addItem } = useCart();
  const theme = useTheme();
  const { copy, t } = useI18n();
  const [quantity, setQuantity] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data: product, isLoading, isError } = useQuery<Product>({
    queryKey: ["product", route.params.productId],
    queryFn: async () => {
      const res = await api.get(`products/items/${route.params.productId}/`);
      return res.data;
    },
  });

  const safeProduct = useMemo(() => {
    if (!product) return null;
    return {
      ...product,
      name: normalizeArabicText(product.name),
      description: product.description ? normalizeArabicText(product.description) : undefined,
    };
  }, [product]);

  const addons = safeProduct?.addons || [];
  const selectedAddons = useMemo(
    () => addons.filter((addon) => selectedIds.includes(addon.id)),
    [addons, selectedIds]
  );

  const basePrice = Number(safeProduct?.price || 0) || 0;
  const addonsTotal = selectedAddons.reduce((sum, addon) => sum + (Number(addon.price_delta) || 0), 0);
  const unitTotal = basePrice + addonsTotal;
  const total = unitTotal * quantity;

  const toggleAddon = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const handleAddToCart = () => {
    if (!safeProduct) return;
    addItem({
      id: safeProduct.id,
      name: safeProduct.name,
      price: unitTotal,
      image: safeProduct.image,
      quantity,
      addons: selectedAddons,
    });
  };

  const styles = useMemo(() => createStyles(theme), [theme]);

  if (isLoading) {
    return (
      <Screen scrollable={false}>
        <LoadingState message={copy.messages.loading} />
      </Screen>
    );
  }

  if (isError || !safeProduct) {
    return (
      <Screen>
        <EmptyState
          title={t("product.loadErrorTitle", "تعذر تحميل المنتج")}
          description={t("product.loadErrorBody", "حدث خطأ أثناء تحميل تفاصيل المنتج. حاول مرة أخرى.")}
        />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.container}>
      <View style={styles.card}>
        {safeProduct.image ? (
          <Image source={{ uri: safeProduct.image }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Text style={styles.imageFallbackText}>{t("product.noImage", "لا توجد صورة")}</Text>
          </View>
        )}

        <View style={styles.details}>
          <Text style={styles.title}>{safeProduct.name}</Text>
          {safeProduct.description ? <Text style={styles.description}>{safeProduct.description}</Text> : null}

          <View style={styles.metaRow}>
            <Text style={styles.badge}>
              {safeProduct.available ? t("product.available", "متاح") : t("product.unavailable", "غير متاح")}
            </Text>
            <View style={styles.basePriceRow}>
              <Text style={styles.basePriceLabel}>{t("product.priceLabel", "السعر:")}</Text>
              <CurrencyAmount value={basePrice} color={theme.palette.accent} symbolSize={12} textStyle={styles.basePriceValue} />
            </View>
          </View>
        </View>
      </View>

      {addons.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("product.addonsTitle", "إضافات")}</Text>
          <View style={styles.addonList}>
            {addons.map((addon) => {
              const checked = selectedIds.includes(addon.id);
              return (
                <Pressable
                  key={addon.id}
                  onPress={() => toggleAddon(addon.id)}
                  style={[
                    styles.addonRow,
                    checked && { borderColor: theme.palette.accent, backgroundColor: theme.palette.surfaceAlt },
                  ]}
                >
                  <View style={styles.addonLabel}>
                    <View
                      style={[
                        styles.checkbox,
                        checked && { backgroundColor: theme.palette.accent, borderColor: theme.palette.accent },
                      ]}
                    >
                      {checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                    </View>
                    <Text style={styles.addonName}>{addon.name}</Text>
                  </View>
                  <View style={styles.addonPriceRow}>
                    <Text style={styles.addonPrice}>+</Text>
                    <CurrencyAmount value={Number(addon.price_delta || 0)} color={theme.palette.accent} symbolSize={12} textStyle={styles.addonPrice} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("product.quantityTitle", "الكمية")}</Text>
        <View style={styles.quantityRow}>
          <Pressable onPress={() => setQuantity((q) => Math.max(1, q - 1))} style={styles.qtyButton}>
            <Text style={styles.qtyButtonText}>-</Text>
          </Pressable>
          <Text style={styles.qtyValue}>{quantity}</Text>
          <Pressable onPress={() => setQuantity((q) => q + 1)} style={styles.qtyButton}>
            <Text style={styles.qtyButtonText}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.summary}>
        {addons.length > 0 ? (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("product.addonsTotal", "إجمالي الإضافات")}</Text>
            <CurrencyAmount value={addonsTotal} symbolSize={12} color={theme.palette.text} textStyle={styles.summaryValue} />
          </View>
        ) : null}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t("product.total", "الإجمالي")}</Text>
          <CurrencyAmount value={total} symbolSize={14} color={theme.palette.accent} textStyle={styles.summaryTotal} />
        </View>
      </View>

      <Button
        title={t("product.addToCart", "إضافة إلى السلة")}
        onPress={handleAddToCart}
        disabled={!safeProduct.available}
        style={styles.addToCart}
      />
    </Screen>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 12,
      paddingVertical: 16,
      gap: 12,
    },
    card: {
      borderRadius: 24,
      backgroundColor: theme.palette.surface,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.palette.border,
    },
    image: {
      width: "100%",
      height: 220,
    },
    imageFallback: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.palette.surfaceAlt,
    },
    imageFallbackText: {
      color: theme.palette.muted,
      fontSize: 12,
      writingDirection: "rtl",
    },
    details: {
      padding: 14,
      gap: 8,
    },
    title: {
      fontSize: 20,
      fontWeight: "800",
      textAlign: "right",
      color: theme.palette.text,
      writingDirection: "rtl",
    },
    description: {
      fontSize: 13,
      color: theme.palette.muted,
      textAlign: "right",
      writingDirection: "rtl",
    },
    metaRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: theme.palette.surfaceAlt,
      color: theme.palette.text,
      fontSize: 11,
      writingDirection: "rtl",
    },
    basePriceRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 6,
    },
    basePriceLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.palette.accent,
      writingDirection: "rtl",
    },
    basePriceValue: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.palette.accent,
    },
    section: {
      backgroundColor: theme.palette.surface,
      borderRadius: 20,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.palette.border,
      gap: 10,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "800",
      textAlign: "right",
      color: theme.palette.text,
      writingDirection: "rtl",
    },
    addonList: {
      gap: 10,
    },
    addonRow: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.palette.border,
      padding: 10,
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    addonLabel: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 8,
      flex: 1,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.palette.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.palette.surface,
    },
    addonName: {
      fontSize: 13,
      color: theme.palette.text,
      textAlign: "right",
      flex: 1,
      writingDirection: "rtl",
    },
    addonPrice: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.palette.accent,
    },
    addonPriceRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
    },
    quantityRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 16,
    },
    qtyButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.palette.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.palette.surfaceAlt,
    },
    qtyButtonText: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.palette.text,
    },
    qtyValue: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.palette.text,
    },
    summary: {
      backgroundColor: theme.palette.surface,
      borderRadius: 20,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.palette.border,
      gap: 8,
    },
    summaryRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    summaryLabel: {
      fontSize: 12,
      color: theme.palette.muted,
      writingDirection: "rtl",
    },
    summaryValue: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.palette.text,
    },
    summaryTotal: {
      fontSize: 16,
      fontWeight: "900",
      color: theme.palette.accent,
    },
    addToCart: {
      marginTop: 4,
    },
  });

export default ProductDetailsScreen;
