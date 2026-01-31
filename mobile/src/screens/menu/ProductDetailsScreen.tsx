import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, Image, Pressable, ScrollView } from "react-native";
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
import { Button, Card } from "../../components/ui";
import { normalizeArabicText } from "../../utils/text";
import { useI18n } from "../../i18n";
import { resolveMediaUrl } from "../../utils/media";
import FloatingCart from "../../components/FloatingCart";

const ProductDetailsScreen: React.FC = () => {
  const route = useRoute<RouteProp<AppStackParamList, "ProductDetails">>();
  const { addItem } = useCart();
  const theme = useTheme();
  const { copy, t, isRTL } = useI18n();
  const [quantity, setQuantity] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data: product, isLoading, isError } = useQuery<Product>({
    queryKey: ["product", route.params.productId],
    queryFn: async () => {
      const res = await api.get(`products/items/${route.params.productId}/`);
      return res.data;
    },
  });

  useEffect(() => {
    setQuantity(1);
    setSelectedIds([]);
  }, [route.params.productId]);

  const safeProduct = useMemo(() => {
    if (!product) return null;
    return {
      ...product,
      name: normalizeArabicText(product.name),
      description: product.description ? normalizeArabicText(product.description) : undefined,
      image: resolveMediaUrl(product.image),
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

  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);

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
        <EmptyState title={t("product.loadErrorTitle")} description={t("product.loadErrorBody")} />
      </Screen>
    );
  }

  const availabilityTone = safeProduct.available ? theme.palette.success : theme.palette.danger;

  return (
    <Screen scrollable={false} style={{ backgroundColor: theme.palette.background }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Card style={styles.heroCard} contentStyle={styles.heroContent}>
          <View style={styles.imageWrap}>
            {safeProduct.image ? (
              <Image source={{ uri: safeProduct.image }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={[styles.image, styles.imageFallback]}>
                <Text style={styles.imageFallbackText}>{t("product.noImage")}</Text>
              </View>
            )}
          </View>

          <View style={styles.heroBody}>
            <Text style={styles.title}>{safeProduct.name}</Text>
            {safeProduct.description ? <Text style={styles.description}>{safeProduct.description}</Text> : null}

            <View style={styles.metaRow}>
              <View style={[styles.pill, { borderColor: `${availabilityTone}55`, backgroundColor: `${availabilityTone}14` }]}>
                <Text style={[styles.pillText, { color: availabilityTone }]}>
                  {safeProduct.available ? t("product.available") : t("product.unavailable")}
                </Text>
              </View>
              <View style={styles.basePriceRow}>
                <Text style={styles.basePriceLabel}>{t("product.priceLabel")}</Text>
                <CurrencyAmount value={basePrice} color={theme.palette.accent} symbolSize={12} textStyle={styles.basePriceValue} />
              </View>
            </View>
          </View>
        </Card>

        {addons.length > 0 ? (
          <Card style={styles.sectionCard} contentStyle={styles.sectionContent}>
            <Text style={styles.sectionTitle}>{t("product.addonsTitle")}</Text>
            <View style={styles.addonList}>
              {addons.map((addon) => {
                const checked = selectedIds.includes(addon.id);
                const priceBlock = (
                  <View style={styles.addonPriceRow}>
                    <Text style={styles.addonPrice}>+</Text>
                    <CurrencyAmount
                      value={Number(addon.price_delta || 0)}
                      color={theme.palette.accent}
                      symbolSize={12}
                      textStyle={styles.addonPrice}
                    />
                  </View>
                );
                return (
                  <Pressable
                    key={addon.id}
                    onPress={() => toggleAddon(addon.id)}
                    style={[
                      styles.addonRow,
                      checked && { borderColor: theme.palette.accent, backgroundColor: `${theme.palette.accent}12` },
                    ]}
                  >
                    <View style={styles.addonLabel}>
                      {isRTL ? (
                        <>
                          <View
                            style={[
                              styles.checkbox,
                              checked && { backgroundColor: theme.palette.accent, borderColor: theme.palette.accent },
                            ]}
                          >
                            {checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                          </View>
                          <Text style={styles.addonName}>{addon.name}</Text>
                        </>
                      ) : (
                        <>
                          <View
                            style={[
                              styles.checkbox,
                              checked && { backgroundColor: theme.palette.accent, borderColor: theme.palette.accent },
                            ]}
                          >
                            {checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                          </View>
                          <Text style={styles.addonName}>{addon.name}</Text>
                        </>
                      )}
                    </View>
                    {priceBlock}
                  </Pressable>
                );
              })}
            </View>
          </Card>
        ) : null}

        <Card style={styles.sectionCard} contentStyle={styles.sectionContent}>
          <Text style={styles.sectionTitle}>{t("product.quantityTitle")}</Text>
          <View style={styles.quantityRow}>
            <Pressable onPress={() => setQuantity((q) => Math.max(1, q - 1))} style={styles.qtyButton}>
              <Ionicons name="remove" size={18} color={theme.palette.text} />
            </Pressable>
            <Text style={styles.qtyValue}>{quantity}</Text>
            <Pressable onPress={() => setQuantity((q) => q + 1)} style={styles.qtyButton}>
              <Ionicons name="add" size={18} color={theme.palette.text} />
            </Pressable>
          </View>
        </Card>

        <Card style={styles.sectionCard} contentStyle={styles.sectionContent}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("product.priceLabel")}</Text>
            <CurrencyAmount value={basePrice} symbolSize={12} color={theme.palette.text} textStyle={styles.summaryValue} />
          </View>
          {addons.length > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t("product.addonsTotal")}</Text>
              <CurrencyAmount value={addonsTotal} symbolSize={12} color={theme.palette.text} textStyle={styles.summaryValue} />
            </View>
          ) : null}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("product.total")}</Text>
            <CurrencyAmount value={total} symbolSize={14} color={theme.palette.accent} textStyle={styles.summaryTotal} />
          </View>
        </Card>

        <Button
          title={t("product.addToCart")}
          onPress={handleAddToCart}
          disabled={!safeProduct.available}
          style={styles.addToCart}
        />
      </ScrollView>

      <FloatingCart />
    </Screen>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>, isRTL: boolean) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 8,
      paddingTop: 10,
      paddingBottom: 24,
      gap: 10,
    },
    heroCard: {
      borderRadius: 24,
      backgroundColor: theme.palette.surface,
      borderWidth: 1,
      borderColor: theme.palette.border,
      overflow: "hidden",
    },
    heroContent: {
      padding: 0,
      gap: 0,
    },
    imageWrap: {
      width: "100%",
      height: 240,
      backgroundColor: theme.palette.surfaceAlt,
      overflow: "hidden",
      borderBottomWidth: 1,
      borderColor: theme.palette.border,
    },
    image: {
      width: "100%",
      height: "100%",
    },
    imageFallback: {
      alignItems: "center",
      justifyContent: "center",
    },
    imageFallbackText: {
      color: theme.palette.muted,
      fontSize: 12,
    },
    heroBody: {
      padding: 14,
      gap: 8,
      alignItems: "flex-start",
    },
    title: {
      fontSize: 20,
      fontWeight: "900",
      textAlign: isRTL ? "right" : "left",
      color: theme.palette.text,
    },
    description: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.palette.muted,
      textAlign: isRTL ? "right" : "left",
    },
    metaRow: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    pill: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    pillText: {
      fontSize: 11,
      fontWeight: "800",
      textAlign: "center",
    },
    basePriceRow: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      gap: 6,
    },
    basePriceLabel: {
      fontSize: 12,
      fontWeight: "800",
      color: theme.palette.muted,
      textAlign: isRTL ? "right" : "left",
    },
    basePriceValue: {
      fontSize: 12,
      fontWeight: "900",
      color: theme.palette.accent,
    },
    sectionCard: {
      borderRadius: 22,
      backgroundColor: theme.palette.surface,
      borderWidth: 1,
      borderColor: theme.palette.border,
    },
    sectionContent: {
      gap: 10,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "800",
      textAlign: isRTL ? "right" : "left",
      writingDirection: isRTL ? "rtl" : "ltr",
      color: theme.palette.text,
      alignSelf: "flex-start",
    },
    addonList: {
      gap: 10,
    },
    addonRow: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.palette.border,
      padding: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    addonLabel: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
      justifyContent: isRTL ? "flex-end" : "flex-start",
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
      textAlign: isRTL ? "right" : "left",
      flexShrink: 1,
    },
    addonPriceRow: {
      flexDirection: "row",
      direction: "ltr",
      alignItems: "center",
      gap: 4,
    },
    addonPrice: {
      fontSize: 12,
      fontWeight: "800",
      color: theme.palette.accent,
    },
    quantityRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 16,
    },
    qtyButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.palette.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.palette.surfaceAlt,
    },
    qtyValue: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.palette.text,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    summaryLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.palette.muted,
      textAlign: isRTL ? "right" : "left",
    },
    summaryValue: {
      fontSize: 12,
      fontWeight: "800",
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
