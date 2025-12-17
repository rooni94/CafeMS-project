import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image, ToastAndroid, Platform } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";
import Screen from "../../components/Screen";
import EmptyState from "../../components/EmptyState";
import LoadingState from "../../components/LoadingState";
import { api } from "../../services/api";
import { Category, Product, ProductAddon } from "../../types";
import { useCart } from "../../context/CartContext";
import { copy } from "../../config/copy";
import { resolveMediaUrl } from "../../utils/media";
import { normalizeArabicText } from "../../utils/text";
import FloatingCart from "../../components/FloatingCart";
import { useTheme } from "../../theme";
import ProductAddonsModal from "../../components/ProductAddonsModal";
import CurrencyAmount from "../../components/CurrencyAmount";

type MenuCategory = {
  id: number;
  name: string;
  image?: string | null;
};

const MenuScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { addItem } = useCart();
  const theme = useTheme();
  const initialCategory: number | null = route.params?.categoryId ?? null;

  const [activeCategory, setActiveCategory] = useState<number | null>(initialCategory);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [addonProduct, setAddonProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (route.params?.categoryId) {
      setActiveCategory(route.params.categoryId);
    }
  }, [route.params?.categoryId]);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("products/categories/");
      return res.data;
    },
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await api.get("products/items/");
      return res.data;
    },
  });

  const decoratedCategories = useMemo<MenuCategory[]>(() => {
    if (!categories.length) {
      return copy.categoryFallbacks.map((item, index) => ({
        id: index,
        name: item.title,
        image: item.image,
      }));
    }
    return categories.map((category, index) => ({
      id: category.id,
      name: normalizeArabicText(category.name),
      image: resolveMediaUrl(category.image) || copy.categoryFallbacks[index % copy.categoryFallbacks.length].image,
    }));
  }, [categories]);

  const activeCategoryName = useMemo(() => {
    if (activeCategory == null) return "القائمة";
    return decoratedCategories.find((cat) => cat.id === activeCategory)?.name || "القائمة";
  }, [activeCategory, decoratedCategories]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return products
      .map((product) => ({
        ...product,
        name: normalizeArabicText(product.name),
        description: product.description ? normalizeArabicText(product.description) : undefined,
        image: resolveMediaUrl(product.image),
      }))
      .filter((product) => {
        const matchesCategory =
          activeCategory == null ||
          (typeof product.category === "number" ? product.category === activeCategory : product.category?.id === activeCategory);
        const matchesSearch = normalizedSearch ? product.name.toLowerCase().includes(normalizedSearch) : true;
        return matchesCategory && matchesSearch;
      });
  }, [products, activeCategory, search]);

  const handleAddRequest = (product: Product) => {
    if (product.addons && product.addons.length > 0) {
      setAddonProduct(product);
      return;
    }
    addItem({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      image: product.image,
    });
    if (Platform.OS === "android") {
      ToastAndroid.show("تمت إضافة المنتج إلى السلة", ToastAndroid.SHORT);
    }
  };

  const handleConfirmAddons = (addons: ProductAddon[]) => {
    if (!addonProduct) return;
    const addonsTotal = addons.reduce(
      (sum, addon) => sum + (Number(addon.price_delta) || 0),
      0
    );
    addItem({
      id: addonProduct.id,
      name: addonProduct.name,
      price: Number(addonProduct.price) + addonsTotal,
      quantity: 1,
      image: addonProduct.image,
      addons,
    });
    setAddonProduct(null);
    if (Platform.OS === "android") {
      ToastAndroid.show("تمت إضافة المنتج إلى السلة", ToastAndroid.SHORT);
    }
  };

  if (categoriesLoading || productsLoading) {
    return (
      <Screen scrollable={false}>
        <LoadingState message={copy.menu.loading} />
      </Screen>
    );
  }

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Screen scrollable={false} style={{ backgroundColor: theme.palette.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-forward" size={20} color={theme.palette.text} />
          </Pressable>
          <Text style={styles.title}>{activeCategoryName}</Text>
          <Pressable onPress={() => setShowSearch((prev) => !prev)} style={styles.iconBtn}>
            <Ionicons name="search" size={20} color={theme.palette.text} />
          </Pressable>
        </View>

        {showSearch && (
          <View style={styles.searchWrap}>
            <TextInput
              placeholder="ابحث عن منتج..."
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              textAlign="right"
            />
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          <Pressable onPress={() => setActiveCategory(null)} style={styles.categoryPill}>
            <Text style={[styles.categoryText, activeCategory == null && styles.categoryTextActive]}>الكل</Text>
          </Pressable>
          {decoratedCategories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <Pressable key={cat.id} onPress={() => setActiveCategory(cat.id)} style={styles.categoryPill}>
                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>{cat.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {filteredProducts.length === 0 ? (
          <EmptyState title={copy.menu.emptyTitle} description={copy.menu.emptyDescription} />
        ) : (
          <View style={styles.grid}>
            {filteredProducts.map((product) => (
              <Pressable
                key={product.id}
                onPress={() =>
                  navigation.navigate("ProductDetails", {
                    productId: product.id,
                  })
                }
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.96 }]}
              >
                <View style={styles.imageWrap}>
                  {product.image ? (
                    <Image source={{ uri: product.image }} style={styles.image} resizeMode="contain" />
                  ) : (
                    <View style={styles.imageFallback}>
                      <Text style={styles.imageFallbackText}>لا توجد صورة</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.productName} numberOfLines={1}>
                  {product.name}
                </Text>
                <CurrencyAmount value={product.price} color={theme.palette.success} symbolSize={14} textStyle={styles.price} />
                <Pressable style={styles.addBtn} onPress={() => handleAddRequest(product)}>
                  <Ionicons name="add" size={18} color="#fff" />
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <ProductAddonsModal
        visible={!!addonProduct}
        product={addonProduct}
        onClose={() => setAddonProduct(null)}
        onConfirm={handleConfirmAddons}
      />
      <FloatingCart />
    </Screen>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    topBar: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingTop: 6,
      marginBottom: 12,
    },
    title: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.palette.text,
      textAlign: "center",
      flex: 1,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    searchWrap: {
      paddingHorizontal: 12,
      marginBottom: 10,
    },
    searchInput: {
      backgroundColor: theme.palette.surface,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: theme.palette.border,
      color: theme.palette.text,
    },
    categoryRow: {
      flexDirection: "row-reverse",
      gap: 16,
      paddingHorizontal: 12,
      paddingBottom: 10,
    },
    categoryPill: {
      paddingVertical: 6,
    },
    categoryText: {
      color: theme.palette.muted,
      fontWeight: "700",
      fontSize: 14,
    },
    categoryTextActive: {
      color: theme.palette.text,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      gap: 14,
    },
    card: {
      width: "48%",
      backgroundColor: theme.palette.surface,
      borderRadius: 24,
      padding: 12,
      alignItems: "center",
      position: "relative",
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 4 },
      borderWidth: 1,
      borderColor: theme.palette.border,
    },
    imageWrap: {
      width: "100%",
      height: 120,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    image: {
      width: "85%",
      height: "100%",
    },
    imageFallback: {
      width: "100%",
      height: "100%",
      borderRadius: 18,
      backgroundColor: theme.palette.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    imageFallbackText: {
      fontSize: 12,
      color: theme.palette.muted,
    },
    productName: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.palette.text,
      textAlign: "right",
      alignSelf: "flex-end",
    },
    price: {
      fontSize: 14,
      fontWeight: "800",
      color: theme.palette.success,
      alignSelf: "flex-end",
      marginTop: 4,
    },
    addBtn: {
      position: "absolute",
      left: 10,
      bottom: 10,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.palette.accent,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default MenuScreen;
