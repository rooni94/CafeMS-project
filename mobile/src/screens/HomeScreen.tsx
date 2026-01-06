import React, {useEffect, useMemo, useRef, useState} from "react";
import { View, Text, StyleSheet, Image, ImageBackground, Dimensions, Pressable, FlatList, ScrollView } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Carousel from "react-native-reanimated-carousel";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";

import Screen from "../components/Screen";
import { Button, Card } from "../components/ui";
import FloatingCart from "../components/FloatingCart";
import ProductGridCard from "../components/ProductGridCard";
import { api } from "../services/api";
import { Category, Product, ProductAddon } from "../types";
import { useStoreSettings } from "../context/StoreSettingsContext";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme";
import { resolveMediaUrl } from "../utils/media";
import { normalizeArabicText, normalizeBrandName } from "../utils/text";
import { goToStack, goToTab } from "../navigation/helpers";
import ProductAddonsModal from "../components/ProductAddonsModal";
import DashboardSection from "./dashboard/components/DashboardSection";
import DashboardTile from "./dashboard/components/DashboardTile";
import { useI18n } from "../i18n";

const HERO_PLAY_INTERVAL = 6500;
const HERO_HEIGHT = 240;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_WIDTH = SCREEN_WIDTH - 8;

type HeroSlide = {
  title: string;
  description: string;
  button_text?: string;
  button_link?: string;
  image?: string;
};

type QuickAction = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  helper: string;
  route: string;
};

type CategoryCard = {
  id: number;
  name: string;
  image: string;
};

const parseCategoryIdFromLink = (link?: string | null) => {
  if (!link) return null;
  try {
    const parsed = new URL(link, "https://example.invalid");
    const value = parsed.searchParams.get("category");
    if (!value) return null;
    const asNumber = Number(value);
    return Number.isFinite(asNumber) ? asNumber : null;
  } catch {
    const index = link.indexOf("category=");
    if (index === -1) return null;
    const candidate = link.slice(index + "category=".length);
    const asNumber = Number(candidate);
    return Number.isFinite(asNumber) ? asNumber : null;
  }
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { copy, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(isRTL), [isRTL]);
  const { settings } = useStoreSettings();
  const { addItem, totalQuantity } = useCart();
  const { user } = useAuth();
  const heroFallback = copy.heroFallback;

  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [addonProduct, setAddonProduct] = useState<Product | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [showFloatingCart, setShowFloatingCart] = useState(false);
  const showFloatingCartRef = useRef(false);

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

  const brandName = normalizeBrandName(settings?.store_name, copy.brandFallback);
  const [brandFirst, ...brandRest] = brandName.split(" ");
  const brandSecond = brandRest.join(" ");
  const tagline = normalizeArabicText(settings?.tagline) || copy.taglineFallback;

  const safeCategories = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        name: normalizeArabicText(category.name),
        description: category.description ? normalizeArabicText(category.description) : undefined,
      })),
    [categories]
  );

  const safeProducts = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        name: normalizeArabicText(product.name),
        description: product.description ? normalizeArabicText(product.description) : undefined,
      })),
    [products]
  );

  const heroSlides: HeroSlide[] = useMemo(() => {
    const source = settings?.hero_cards && settings.hero_cards.length > 0 ? settings.hero_cards : heroFallback;
    return source.map((card, index) => {
      const fallback = heroFallback[index % heroFallback.length];
      return {
        title: normalizeArabicText(card.title || fallback.title),
        description: normalizeArabicText(card.description || fallback.description),
        button_text: normalizeArabicText(card.button_text || fallback.button_text),
        button_link: card.button_link || fallback.button_link,
        image: resolveMediaUrl(card.image || fallback.image),
      };
    });
  }, [settings?.hero_cards, heroFallback]);

  useEffect(() => {
    setHeroIndex(0);
  }, [heroSlides.length]);

  const quickActions: QuickAction[] = useMemo(() => {
    const actions: QuickAction[] = [];
    const isGuest = !user;

    if (isGuest) {
      actions.push(
        {
          icon: "log-in-outline",
          label: copy.orders.login,
          helper: copy.orders.guestDescription,
          route: "Login",
        },
        {
          icon: "person-add-outline",
          label: copy.orders.register,
          helper: copy.orders.guestDescription,
          route: "Register",
        }
      );
    }

    actions.push(
      {
        icon: "gift-outline",
        label: copy.home.quickActions[3]?.label || copy.home.quickActions[0]?.label,
        helper: copy.home.quickActions[3]?.helper || copy.home.quickActions[0]?.helper,
        route: "Rewards",
      },
      {
        icon: "call-outline",
        label: copy.home.quickActions[4]?.label || copy.home.quickActions[0]?.label,
        helper: copy.home.quickActions[4]?.helper || copy.home.quickActions[0]?.helper,
        route: "Contact",
      }
    );

    return actions;
  }, [copy, user]);

  const categoryCards: CategoryCard[] = useMemo(() => {
    if (!safeCategories.length) {
      return copy.categoryFallbacks.map((item, index) => ({
        id: index,
        name: item.title,
        image: item.image,
      }));
    }
    return safeCategories.map((category, index) => ({
      id: category.id,
      name: category.name,
      image: resolveMediaUrl(category.image) || copy.categoryFallbacks[index % copy.categoryFallbacks.length].image,
    }));
  }, [copy, safeCategories]);

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    categoryCards.forEach((category) => map.set(category.id, category.name));
    return map;
  }, [categoryCards]);

  const visibleProducts = useMemo(() => {
    if (activeCategory == null) return safeProducts.slice(0, 6);
    return safeProducts.filter((product) => {
      if (product.category == null) return false;
      if (typeof product.category === "number") return product.category === activeCategory;
      if (typeof product.category === "object") return product.category?.id === activeCategory;
      return false;
    });
  }, [safeProducts, activeCategory]);

  const handleHeroCta = (link?: string | null) => {
    const categoryId = parseCategoryIdFromLink(link);
    if (categoryId) {
      goToTab(navigation, "Menu", { categoryId });
      return;
    }
    if (link && link.includes("order")) {
      goToStack(navigation, "OrderTracking");
      return;
    }
    goToTab(navigation, "Menu");
  };

  const handleQuickAction = (route: string) => {
    if (["Home", "Menu", "Orders", "Support", "MyHR", "Dashboard", "Profile"].includes(route)) {
      goToTab(navigation, route as any);
      return;
    }
    goToStack(navigation, route as any);
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
  };

  if (categoriesLoading || productsLoading) {
    return (
      <Screen scrollable={false}>
        <Text style={{ textAlign: "center", color: theme.palette.muted }}>{copy.messages.loading}</Text>
      </Screen>
    );
  }

  return (
    <Screen scrollable={false} style={{ backgroundColor: theme.palette.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset?.y ?? 0;
          const next = y > 80;
          if (showFloatingCartRef.current === next) return;
          showFloatingCartRef.current = next;
          setShowFloatingCart(next);
        }}
      >
        <DashboardSection style={styles.headerSection}>
          <View style={styles.headerRow}>
            <Pressable style={styles.cartBadge} onPress={() => goToStack(navigation, "Cart")}>
              <Ionicons name="cart-outline" size={22} color="#f59e0b" />
              {totalQuantity > 0 ? (
                <View style={[styles.cartCount, { backgroundColor: "#f59e0b" }]}>
                  <Text style={styles.cartCountText}>{totalQuantity}</Text>
                </View>
              ) : null}
            </Pressable>
            <View style={styles.brandBlock}>
              <Text style={styles.brandTitle} numberOfLines={1}>
                <Text style={styles.brandOrange}>{brandFirst || brandName} </Text>
                <Text style={styles.brandPurple}>{brandSecond || ""}</Text>
              </Text>
              <Text style={styles.brandTagline}>{tagline}</Text>
            </View>
          </View>
        </DashboardSection>

        <Card style={styles.heroCard} contentStyle={styles.heroContent}>
          <View style={styles.heroClip}>
            <Carousel
              width={HERO_WIDTH}
              height={HERO_HEIGHT}
              data={heroSlides}
              autoPlay
              autoPlayInterval={HERO_PLAY_INTERVAL}
              loop
              pagingEnabled
              onSnapToItem={(index) => setHeroIndex(index)}
              renderItem={({ item }) => (
                <Pressable onPress={() => handleHeroCta(item.button_link)} style={styles.heroSlide}>
                  <ImageBackground
                    source={item.image ? { uri: item.image } : require("../../assets/adaptive-icon.png")}
                    style={styles.heroSlide}
                    imageStyle={styles.heroImage}
                  >
                    <View style={styles.heroOverlay}>
                      <View style={styles.heroGlass}>
                        <View style={[styles.heroTag, { borderColor: theme.paper.colors.secondary }]}>
                          <Text style={styles.heroTagText}>{copy.home.infoTags?.[0] || ""}</Text>
                        </View>
                        <Text style={styles.heroTitle}>{item.title}</Text>
                        <Text style={styles.heroDescription}>{item.description}</Text>
                      </View>
                    </View>
                  </ImageBackground>
                </Pressable>
              )}
            />
          </View>
          <View style={styles.pagination}>
            {heroSlides.map((_, index) => (
              <View key={index} style={[styles.dot, index === heroIndex && styles.dotActive]} />
            ))}
          </View>
        </Card>

        <DashboardSection title={copy.home.shortcutsTitle} subtitle={copy.home.quickIntro}>
          <View style={styles.tileGrid}>
            {quickActions.map((item) => (
              <View key={`${item.route}-${item.label}`} style={styles.tileItem}>
                <DashboardTile
                  title={item.label}
                  subtitle={item.helper}
                  icon={item.icon}
                  onPress={() => handleQuickAction(item.route)}
                  color={theme.palette.accent}
                  style={{ width: "100%" }}
                />
              </View>
            ))}
          </View>
        </DashboardSection>

        <DashboardSection title={copy.home.categoriesTitle} subtitle={copy.home.quickIntro}>
          <View style={styles.categoryGrid}>
            {categoryCards.map((category) => (
              <View key={String(category.id)} style={styles.categoryItem}>
                <Pressable
                  style={styles.categoryCard}
                  onPress={() => {
                    setActiveCategory(category.id);
                    goToTab(navigation, "Menu", { categoryId: category.id });
                  }}
                >
                  <View style={styles.categoryImageWrap}>
                    <Image source={{ uri: category.image }} style={styles.categoryImage} resizeMode="cover" />
                  </View>
                  <View style={styles.categoryLabel}>
                    <Text style={styles.categoryLabelText} numberOfLines={1}>
                      {category.name}
                    </Text>
                  </View>
                </Pressable>
              </View>
            ))}
          </View>
          <Button title={copy.home.categoriesCta} variant="secondary" onPress={() => goToTab(navigation, "Menu")} />
        </DashboardSection>

        <DashboardSection title={copy.home.featuredTitle} subtitle={copy.home.quickIntro}>
          {visibleProducts.length === 0 ? (
            <Text style={styles.helperText}>{copy.home.featuredEmpty}</Text>
          ) : (
            <FlatList
              data={visibleProducts}
              keyExtractor={(item) => String(item.id)}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={styles.productGridList}
              columnWrapperStyle={styles.productGridRow}
              renderItem={({ item: product }) => (
                <View style={styles.productGridItem}>
                  <ProductGridCard
                    product={product}
                    onPress={() => goToStack(navigation, "ProductDetails", { productId: product.id })}
                    onAdd={() => handleAddRequest(product)}
                    priceColor={theme.palette.success}
                  />
                </View>
              )}
            />
          )}
          <Button title={copy.home.featuredCta} variant="secondary" onPress={() => goToTab(navigation, "Menu")} />
        </DashboardSection>
      </ScrollView>

      <ProductAddonsModal
        visible={!!addonProduct}
        product={addonProduct}
        onClose={() => setAddonProduct(null)}
        onConfirm={handleConfirmAddons}
      />

      {showFloatingCart ? <FloatingCart /> : null}
    </Screen>
  );
};

const createStyles = (isRTL: boolean) =>
  StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 24,
    gap: 6,
  },
  headerSection: {
    borderRadius: 22,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  brandBlock: {
    flex: 1,
    alignItems: isRTL ? "flex-end" : "flex-start",
    gap: 4,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "900",
    textAlign: isRTL ? "right" : "left",
  },
  brandOrange: { color: "#f59e0b" },
  brandPurple: { color: "#6138A1" },
  brandTagline: {
    fontSize: 13,
    color: "#64748b",
    textAlign: isRTL ? "right" : "left",
  },
  cartBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    backgroundColor: "#fff",
  },
  cartCount: {
    position: "absolute",
    top: 7,
    right: 9,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cartCountText: {
    color: "#1f2937",
    fontWeight: "900",
    fontSize: 12,
  },
  heroCard: {
    padding: 0,
    alignSelf: "center",
    width: HERO_WIDTH,
  },
  heroContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 0,
  },
  heroClip: {
    borderRadius: 22,
    overflow: "hidden",
    alignSelf: "center",
    backgroundColor: "#ffffff",
  },
  heroSlide: {
    width: "100%",
    height: HERO_HEIGHT,
    borderRadius: 22,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  heroImage: {
    borderRadius: 22,
    backgroundColor: "#eef2f7",
  },
  heroOverlay: {
    padding: 14,
    gap: 10,
    alignItems: isRTL ? "flex-end" : "flex-start",
  },
  heroGlass: {
    alignSelf: isRTL ? "flex-end" : "flex-start",
    maxWidth: "78%",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
  },
  heroTag: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f59e0b",
    alignSelf: isRTL ? "flex-end" : "flex-start",
  },
  heroTagText: {
    color: "#111827",
    fontSize: 12,
    textAlign: isRTL ? "right" : "left",
  },
  heroTitle: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "900",
    textAlign: isRTL ? "right" : "left",
  },
  heroDescription: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 20,
    textAlign: isRTL ? "right" : "left",
  },
  heroActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  heroActionButton: {
    flex: 1,
  },
  heroPrimaryBtn: {
    borderRadius: 18,
  },
  heroGhostButton: {
    borderWidth: 1.4,
    borderColor: "#6138A1",
    borderRadius: 18,
    backgroundColor: "rgba(97, 56, 161, 0.12)",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 0,
    marginTop: -8,
    marginBottom: 0,
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e2e8f0",
  },
  dotActive: {
    width: 22,
    backgroundColor: "#f59e0b",
  },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tileItem: {
    width: "49.5%",
    marginBottom: 6,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryItem: {
    width: "49.5%",
    marginBottom: 10,
  },
  categoryCard: {
    width: "100%",
    height: 170,
    borderRadius: 20,
    padding: 0,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  categoryImageWrap: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: "#f7f3ea",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryLabel: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
    backgroundColor: "rgba(97, 56, 161, 0.35)",
  },
  categoryLabelText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 14,
  },
  productGridList: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  productGridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  productGridItem: {
    width: "49.5%",
  },
  helperText: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: isRTL ? "right" : "left",
    marginBottom: 6,
  },
});

export default HomeScreen;
