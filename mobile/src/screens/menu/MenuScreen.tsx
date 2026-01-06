import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, FlatList, ToastAndroid, Platform } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";

import Screen from "../../components/Screen";
import EmptyState from "../../components/EmptyState";
import LoadingState from "../../components/LoadingState";
import { api } from "../../services/api";
import { Category, Product, ProductAddon } from "../../types";
import { useCart } from "../../context/CartContext";
import { resolveMediaUrl } from "../../utils/media";
import { normalizeArabicText } from "../../utils/text";
import FloatingCart from "../../components/FloatingCart";
import { useTheme } from "../../theme";
import ProductAddonsModal from "../../components/ProductAddonsModal";
import ProductGridCard from "../../components/ProductGridCard";
import { Card } from "../../components/ui";
import { safeGoBack } from "../../navigation/helpers";
import { useI18n } from "../../i18n";

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
  const { copy, t } = useI18n();
  const initialCategory: number | null = route.params?.categoryId ?? null;
  const styles = useMemo(() => createStyles(theme), [theme]);

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
      image:
        resolveMediaUrl(category.image) ||
        copy.categoryFallbacks[index % copy.categoryFallbacks.length].image,
    }));
  }, [categories, copy]);

  const activeCategoryName = useMemo(() => {
    if (activeCategory == null) return copy.menu.allCategories;
    return decoratedCategories.find((cat) => cat.id === activeCategory)?.name || copy.menu.allCategories;
  }, [activeCategory, decoratedCategories, copy]);

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
          (typeof product.category === "number"
            ? product.category === activeCategory
            : product.category?.id === activeCategory);
        const matchesSearch = normalizedSearch ? product.name.toLowerCase().includes(normalizedSearch) : true;
        return matchesCategory && matchesSearch;
      });
  }, [products, activeCategory, search]);

  const toastAdded = () => {
    if (Platform.OS === "android") {
      ToastAndroid.show(t("menu.addedToCart", "تمت إضافة المنتج إلى السلة"), ToastAndroid.SHORT);
    }
  };

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
    toastAdded();
  };

  const handleConfirmAddons = (addons: ProductAddon[]) => {
    if (!addonProduct) return;
    const addonsTotal = addons.reduce((sum, addon) => sum + (Number(addon.price_delta) || 0), 0);
    addItem({
      id: addonProduct.id,
      name: addonProduct.name,
      price: Number(addonProduct.price) + addonsTotal,
      quantity: 1,
      image: addonProduct.image,
      addons,
    });
    setAddonProduct(null);
    toastAdded();
  };

  if (categoriesLoading || productsLoading) {
    return (
      <Screen scrollable={false}>
        <LoadingState message={copy.menu.loading} />
      </Screen>
    );
  }

  return (
    <Screen scrollable={false} style={{ backgroundColor: theme.palette.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <Pressable onPress={() => setShowSearch((prev) => !prev)} style={styles.iconBtn}>
            <Ionicons name="search" size={20} color={theme.palette.text} />
          </Pressable>
          <Text style={styles.title}>{activeCategoryName}</Text>
          <Pressable onPress={() => safeGoBack(navigation, { tab: "Home" })} style={styles.iconBtn}>
            <Ionicons name="chevron-forward" size={20} color={theme.palette.text} />
          </Pressable>
        </View>

        {showSearch && (
          <View style={styles.searchWrap}>
            <TextInput
              placeholder={copy.menu.searchPlaceholder}
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              textAlign="right"
            />
          </View>
        )}

        <Card style={styles.sectionCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            <Pressable onPress={() => setActiveCategory(null)} style={styles.categoryPill}>
              <Text style={[styles.categoryText, activeCategory == null && styles.categoryTextActive]}>{copy.menu.filterAll}</Text>
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
        </Card>

        {filteredProducts.length === 0 ? (
          <EmptyState title={copy.menu.emptyTitle} description={copy.menu.emptyDescription} />
        ) : (
          <Card style={styles.sectionCard}>
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => String(item.id)}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={styles.gridList}
              columnWrapperStyle={styles.gridRow}
              renderItem={({ item: product }) => (
                <View style={styles.gridItem}>
                  <ProductGridCard
                    product={product}
                    style={styles.productCard}
                    onPress={() => navigation.navigate("ProductDetails", { productId: product.id })}
                    onAdd={() => handleAddRequest(product)}
                    priceColor={theme.palette.success}
                  />
                </View>
              )}
            />
          </Card>
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
    container: {
      paddingHorizontal: 4,
      paddingTop: 6,
      paddingBottom: 120,
      gap: 6,
    },
    topBar: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 2,
    },
    title: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.palette.text,
      textAlign: "center",
      flex: 1,
      writingDirection: "rtl",
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    searchWrap: {
      marginBottom: 2,
    },
    searchInput: {
      backgroundColor: theme.palette.surface,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: theme.palette.border,
      color: theme.palette.text,
      writingDirection: "rtl",
    },
    categoryRow: {
      flexDirection: "row-reverse",
      gap: 12,
      paddingHorizontal: 2,
    },
    categoryPill: {
      paddingVertical: 6,
    },
    categoryText: {
      color: theme.palette.muted,
      fontWeight: "700",
      fontSize: 14,
      writingDirection: "rtl",
    },
    categoryTextActive: {
      color: theme.palette.text,
    },
    gridList: {
      paddingTop: 4,
      paddingBottom: 4,
    },
    gridRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    gridItem: {
      width: "49.5%",
    },
    productCard: {},
    sectionCard: {
      borderRadius: 22,
      borderColor: theme.palette.border,
      backgroundColor: theme.palette.surface,
    },
  });

export default MenuScreen;
