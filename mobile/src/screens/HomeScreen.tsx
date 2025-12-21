import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ImageBackground, Dimensions, Pressable, FlatList, ScrollView } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Carousel from "react-native-reanimated-carousel";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";

import Screen from "../components/Screen";
import { Button, Card } from "../components/ui";
import ProductGridCard from "../components/ProductGridCard";
import { api } from "../services/api";
import { Category, Product, ProductAddon } from "../types";
import { useStoreSettings } from "../context/StoreSettingsContext";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme";
import { copy } from "../config/copy";
import { resolveMediaUrl } from "../utils/media";
import { normalizeArabicText } from "../utils/text";
import { goToStack, goToTab } from "../navigation/helpers";
import ProductAddonsModal from "../components/ProductAddonsModal";
import DashboardSection from "./dashboard/components/DashboardSection";
import DashboardTile from "./dashboard/components/DashboardTile";

const HERO_FALLBACK = copy.heroFallback;
const HERO_PLAY_INTERVAL = 6500;
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
  const { settings } = useStoreSettings();
  const { addItem, totalQuantity } = useCart();
  const { user } = useAuth();

  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [addonProduct, setAddonProduct] = useState<Product | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);

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

  const brandName = normalizeArabicText(settings?.store_name) || copy.brandFallback;
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
    const source = settings?.hero_cards && settings.hero_cards.length > 0 ? settings.hero_cards : HERO_FALLBACK;
    return source.map((card, index) => {
      const fallback = HERO_FALLBACK[index % HERO_FALLBACK.length];
      return {
        title: normalizeArabicText(card.title || fallback.title),
        description: normalizeArabicText(card.description || fallback.description),
        button_text: normalizeArabicText(card.button_text || fallback.button_text),
        button_link: card.button_link || fallback.button_link,
        image: resolveMediaUrl(card.image || fallback.image),
      };
    });
  }, [settings?.hero_cards]);

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
          label: "تسجيل الدخول",
          helper: "ادخل إلى حسابك",
          route: "Login",
        },
        {
          icon: "person-add-outline",
          label: "إنشاء حساب",
          helper: "حساب جديد خلال دقيقة",
          route: "Register",
        }
      );
    }

    actions.push(
      {
        icon: "gift-outline",
        label: "نقاط الولاء",
        helper: "تابع نقاطك واستفد من العروض",
        route: "Rewards",
      },
      {
        icon: "call-outline",
        label: "تواصل معنا",
        helper: "الدعم وخدمة العملاء",
        route: "Contact",
      }
    );

    return actions;
  }, [user]);

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
  }, [safeCategories]);

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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
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
              height={320}
              data={heroSlides}
              autoPlay
              autoPlayInterval={HERO_PLAY_INTERVAL}
              loop
              pagingEnabled
              onSnapToItem={(index) => setHeroIndex(index)}
              renderItem={({ item }) => (
                <ImageBackground
                  source={item.image ? { uri: item.image } : require("../../assets/adaptive-icon.png")}
                  style={styles.heroSlide}
                  imageStyle={styles.heroImage}
                >
                  <View style={styles.heroOverlay}>
                    <View style={styles.heroTag}>
                      <Text style={styles.heroTagText}>نكهة أصلية بلمسة امتنان</Text>
                    </View>
                    <Text style={styles.heroTitle}>{item.title}</Text>
                    <Text style={styles.heroDescription}>{item.description}</Text>
                    <View style={styles.heroActions}>
                      <Button
                        title={item.button_text?.trim() || settings?.hero_button_text?.trim() || copy.home.heroExploreCta}
                        onPress={() => handleHeroCta(item.button_link)}
                        labelStyle={{ fontWeight: "800", fontSize: 14 }}
                        style={[styles.heroActionButton, styles.heroPrimaryBtn]}
                      />
                      <Button
                        title="ابدأ الطلب الآن"
                        variant="ghost"
                        color="transparent"
                        textColor="#ffffff"
                        labelStyle={{ fontWeight: "800", fontSize: 14 }}
                        onPress={() => goToTab(navigation, "Menu")}
                        style={[styles.heroActionButton, styles.heroGhostButton]}
                      />
                    </View>
                  </View>
                </ImageBackground>
              )}
            />
          </View>
          <View style={styles.pagination}>
            {heroSlides.map((_, index) => (
              <View key={index} style={[styles.dot, index === heroIndex && styles.dotActive]} />
            ))}
          </View>
        </Card>

        <DashboardSection title="اختصارات" subtitle={copy.home.quickIntro}>
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

        <DashboardSection title={copy.home.categoriesTitle} subtitle="اختر القسم الذي تريده.">
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
                  <ImageBackground
                    source={{ uri: category.image }}
                    style={styles.categoryImage}
                    imageStyle={styles.categoryImageStyle}
                  >
                    <View style={styles.categoryOverlay}>
                      <Text style={styles.categoryName} numberOfLines={2}>
                        {category.name}
                      </Text>
                    </View>
                  </ImageBackground>
                </Pressable>
              </View>
            ))}
          </View>
          <Button title={copy.home.categoriesCta} variant="secondary" onPress={() => goToTab(navigation, "Menu")} />
        </DashboardSection>

        <DashboardSection title={copy.home.featuredTitle} subtitle="منتجات مختارة من القائمة.">
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
    </Screen>
  );
};

const styles = StyleSheet.create({
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
    alignItems: "flex-end",
    gap: 4,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "900",
    textAlign: "right",
    writingDirection: "rtl",
  },
  brandOrange: { color: "#f59e0b" },
  brandPurple: { color: "#6138A1" },
  brandTagline: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "right",
    writingDirection: "rtl",
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
  },
  heroSlide: {
    width: "100%",
    height: 320,
    borderRadius: 22,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  heroImage: {
    borderRadius: 22,
  },
  heroOverlay: {
    backgroundColor: "rgba(17, 24, 39, 0.55)",
    padding: 18,
    gap: 10,
    alignItems: "flex-end",
  },
  heroTag: {
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  heroTagText: {
    color: "#fefefe",
    fontSize: 12,
    textAlign: "right",
    writingDirection: "rtl",
  },
  heroTitle: {
    color: "#fefcf7",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "right",
    writingDirection: "rtl",
  },
  heroDescription: {
    color: "#f8fafc",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "right",
    writingDirection: "rtl",
  },
  heroActions: {
    flexDirection: "row-reverse",
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
    borderColor: "#ffffff",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  pagination: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    paddingVertical: 8,
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
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tileItem: {
    width: "49.5%",
    marginBottom: 6,
  },
  categoryGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryItem: {
    width: "49.5%",
    marginBottom: 6,
  },
  categoryCard: {
    width: "100%",
    height: 136,
    borderRadius: 18,
    overflow: "hidden",
  },
  categoryImage: {
    flex: 1,
  },
  categoryImageStyle: {
    borderRadius: 18,
  },
  categoryOverlay: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "rgba(24, 24, 27, 0.35)",
    justifyContent: "flex-end",
    padding: 12,
  },
  categoryName: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    textAlign: "right",
    writingDirection: "rtl",
  },
  productGridList: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  productGridRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  productGridItem: {
    width: "49.5%",
  },
  helperText: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 6,
  },
});

export default HomeScreen;
