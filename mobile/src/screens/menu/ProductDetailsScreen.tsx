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

const ProductDetailsScreen: React.FC = () => {
  const route = useRoute<RouteProp<AppStackParamList, "ProductDetails">>();
  const { addItem } = useCart();
  const theme = useTheme();
  const [quantity, setQuantity] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data: product, isLoading, isError } = useQuery<Product>({
    queryKey: ["product", route.params.productId],
    queryFn: async () => {
      const res = await api.get(`products/items/${route.params.productId}/`);
      return res.data;
    },
  });

  const addons = product?.addons || [];
  const selectedAddons = useMemo(
    () => addons.filter((addon) => selectedIds.includes(addon.id)),
    [addons, selectedIds]
  );

  const basePrice = Number(product?.price || 0) || 0;
  const addonsTotal = selectedAddons.reduce(
    (sum, addon) => sum + (Number(addon.price_delta) || 0),
    0
  );
  const unitTotal = basePrice + addonsTotal;
  const total = unitTotal * quantity;

  const toggleAddon = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  };

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      id: product.id,
      name: product.name,
      price: unitTotal,
      image: product.image,
      quantity,
      addons: selectedAddons,
    });
  };

  const styles = useMemo(() => createStyles(theme), [theme]);

  if (isLoading) {
    return (
      <Screen scrollable={false}>
        <LoadingState message="جاري تحميل المنتج..." />
      </Screen>
    );
  }

  if (isError || !product) {
    return (
      <Screen>
        <EmptyState
          title="تعذر تحميل المنتج"
          description="يرجى المحاولة مرة أخرى لاحقاً."
        />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.container}>
      <View style={styles.card}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Text style={styles.imageFallbackText}>صورة المنتج</Text>
          </View>
        )}

        <View style={styles.details}>
          <Text style={styles.title}>{product.name}</Text>
          {product.description ? (
            <Text style={styles.description}>{product.description}</Text>
          ) : null}
          <View style={styles.metaRow}>
            <Text style={styles.badge}>
              {product.available ? "متاح" : "غير متاح"}
            </Text>
            <View style={styles.basePriceRow}>
              <Text style={styles.basePriceLabel}>السعر الأساسي:</Text>
              <CurrencyAmount
                value={basePrice}
                color={theme.palette.accent}
                symbolSize={12}
                textStyle={styles.basePriceValue}
              />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        {addons.length > 0 ? <Text style={styles.sectionTitle}>إضافات</Text> : null}
        {addons.length === 0 ? (
          <Text style={styles.helperText}>لا توجد إضافات لهذا المنتج.</Text>
        ) : (
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
                      {checked ? (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      ) : null}
                    </View>
                    <Text style={styles.addonName}>{addon.name}</Text>
                  </View>
                  <View style={styles.addonPriceRow}>
                    <Text style={styles.addonPrice}>+</Text>
                    <CurrencyAmount
                      value={Number(addon.price_delta || 0)}
                      color={theme.palette.accent}
                      symbolSize={12}
                      textStyle={styles.addonPrice}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الكمية</Text>
        <View style={styles.quantityRow}>
          <Pressable
            onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            style={styles.qtyButton}
          >
            <Text style={styles.qtyButtonText}>-</Text>
          </Pressable>
          <Text style={styles.qtyValue}>{quantity}</Text>
          <Pressable onPress={() => setQuantity((q) => q + 1)} style={styles.qtyButton}>
            <Text style={styles.qtyButtonText}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>إجمالي إضافات</Text>
          <CurrencyAmount value={addonsTotal} symbolSize={12} color={theme.palette.text} textStyle={styles.summaryValue} />
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>الإجمالي</Text>
          <CurrencyAmount value={total} symbolSize={14} color={theme.palette.accent} textStyle={styles.summaryTotal} />
        </View>
      </View>

      <Pressable
        onPress={handleAddToCart}
        disabled={!product.available}
        style={[
          styles.addToCart,
          !product.available && { opacity: 0.6 },
        ]}
      >
        <Text style={styles.addToCartText}>أضف إلى السلة</Text>
      </Pressable>
    </Screen>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 12,
      paddingVertical: 16,
      gap: 16,
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
    },
    description: {
      fontSize: 13,
      color: theme.palette.muted,
      textAlign: "right",
    },
    metaRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: theme.palette.surfaceAlt,
      color: theme.palette.text,
      fontSize: 11,
    },
    basePrice: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.palette.accent,
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
      fontWeight: "700",
      textAlign: "right",
      color: theme.palette.text,
    },
    helperText: {
      fontSize: 12,
      color: theme.palette.muted,
      textAlign: "right",
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
    },
    addonLabel: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 8,
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
      fontWeight: "700",
      color: theme.palette.text,
    },
    qtyValue: {
      fontSize: 16,
      fontWeight: "700",
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
    },
    summaryLabel: {
      fontSize: 12,
      color: theme.palette.muted,
    },
    summaryValue: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.palette.text,
    },
    summaryTotal: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.palette.accent,
    },
    addToCart: {
      backgroundColor: theme.palette.accent,
      borderRadius: 24,
      paddingVertical: 14,
      alignItems: "center",
    },
    addToCartText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "700",
    },
  });

export default ProductDetailsScreen;
