import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  Dimensions,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Carousel from "react-native-reanimated-carousel";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import Screen from "../components/Screen";
import { Button, Card } from "../components/ui";
import DishCard from "../components/DishCard";
import { api } from "../services/api";
import { Category, Product, ProductAddon } from "../types";
import { useStoreSettings } from "../context/StoreSettingsContext";
import { useCart } from "../context/CartContext";
import { useTheme } from "../theme";
import { copy } from "../config/copy";
import { resolveMediaUrl } from "../utils/media";
import { normalizeArabicText } from "../utils/text";
import { goToStack, goToTab } from "../navigation/helpers";
import ProductAddonsModal from "../components/ProductAddonsModal";

const HERO_FALLBACK = copy.heroFallback;
const HERO_PLAY_INTERVAL = 6500;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_WIDTH = SCREEN_WIDTH - 24;

type HeroSlide = {
  title: string;
  description: string;
  button_text?: string;
  button_link?: string;
  image?: string;
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
  const homeCopy = copy.home;
  const brandName = normalizeArabicText(settings?.store_name) || copy.brandFallback;
  const [brandFirst, ...brandRest] = brandName.split(" ");
  const brandSecond = brandRest.join(" ");

  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [addonProduct, setAddonProduct] = useState<Product | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

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

  const tagline = normalizeArabicText(settings?.tagline) || copy.taglineFallback;

  const visibleProducts = useMemo(() => {
    if (activeCategory == null) return safeProducts.slice(0, 6);
    return safeProducts.filter((product) => {
      if (product.category == null) return false;
      if (typeof product.category === "number") {
        return product.category === activeCategory;
      }
      if (typeof product.category === "object") {
        return product.category?.id === activeCategory;
      }
      return false;
    });
  }, [safeProducts, activeCategory]);

  const categoryCards = useMemo(() => {
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
    if (["Home", "Menu", "Orders", "Profile"].includes(route)) {
      goToTab(navigation, route as any);
      return;
    }
    goToStack(navigation, route as any);
  };

  if (categoriesLoading || productsLoading) {
    return (
      <Screen scrollable={false}>
        <Text style={{ textAlign: "center", color: theme.palette.muted }}>{copy.messages.loading}</Text>
      </Screen>
    );
  }

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
  };

  return (
    <Screen style={{ backgroundColor: theme.palette.background }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24, gap: 14 }}
      >
        <View style={styles.headerRow}>
          <View style={styles.brandBlock}>
            <Text style={styles.brandTitle}>
              <Text style={styles.brandOrange}>{brandFirst || brandName} </Text>
              <Text style={styles.brandPurple}>{brandSecond || ''}</Text>
            </Text>
            <Text style={styles.brandTagline}>{tagline}</Text>
          </View>
          <Pressable style={styles.cartBadge} onPress={() => goToStack(navigation, 'Cart')}>
            <Ionicons name='cart-outline' size={22} color='#f59e0b' />
            {totalQuantity > 0 && (
              <View style={styles.cartCount}>
                <Text style={styles.cartCountText}>{totalQuantity}</Text>
              </View>
            )}
          </Pressable>
        </View>

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
                        title={item.button_text?.trim() || settings?.hero_button_text?.trim() || homeCopy.heroExploreCta}
                        color="#f59e0b"
                        textColor="#1f2937"
                        onPress={() => handleHeroCta(item.button_link)}
                        style={[styles.heroActionButton, styles.heroPrimaryBtn]}
                      />
                      <Button
                        title="ابدأ الطلب الآن"
                        variant="ghost"
                        color="transparent"
                        textColor="#f59e0b"
                        onPress={() => goToTab(navigation, "Menu")}
                        style={[styles.heroActionButton, styles.heroGhostButton]}
                      />
                    </View>
                  </View>
                </ImageBackground>
              )}
            />
          </View>
          <View style={[styles.pagination, { marginBottom: 6 }]}>
            {heroSlides.map((_, index) => (
              <View key={index} style={[styles.dot, index === heroIndex && styles.dotActive]} />
            ))}
          </View>
        </Card>

        <Card style={[styles.infoCard, { marginTop: 8 }]}>
          <Text style={[styles.sectionTitle, { color: '#0f172a' }]}>{homeCopy.quickIntro}</Text>
          <View style={styles.infoTags}>
            {(homeCopy.infoTags || []).map((text, idx) => {
              const icons = ['timer-outline', 'leaf-outline', 'shield-checkmark-outline'];
              return (
                <View key={`${text}-${idx}`} style={styles.tag}>
                  <Ionicons name={(icons[idx] || 'timer-outline') as any} size={16} color='#f59e0b' />
                  <Text style={styles.tagText}>{text}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        <View style={styles.quickActions}>
          {homeCopy.quickActions.map((item) => (
            <Pressable key={item.label} style={styles.quickCard} onPress={() => handleQuickAction(item.route)}>
              <View style={[styles.quickIcon, { backgroundColor: theme.palette.accent }]}>
                <Ionicons name={item.icon as any} size={20} color="#fff" />
              </View>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={styles.quickLabel}>{item.label}</Text>
                <Text style={styles.quickHelper}>{item.helper}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Card>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{homeCopy.categoriesTitle}</Text>
            <Button title={homeCopy.categoriesCta} variant="ghost" onPress={() => goToTab(navigation, "Menu")} style={{ borderWidth: 0 }} />
          </View>
          <View style={styles.categoryGrid}>
            {categoryCards.map((category, index) => (
              <Pressable
                key={`${category.id}-${index}`}
                style={styles.categoryCard}
                onPress={() => {
                  if (category.id) setActiveCategory(category.id);
                  goToTab(navigation, "Menu", { categoryId: category.id });
                }}
              >
                <ImageBackground source={{ uri: category.image }} style={styles.categoryImage} imageStyle={{ borderRadius: 18 }}>
                  <View style={styles.categoryOverlayWide}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                  </View>
                </ImageBackground>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card style={{ marginVertical: 10 }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{homeCopy.featuredTitle}</Text>
            <Button
              title={homeCopy.categoriesCta}
              variant="ghost"
              onPress={() => {
                setActiveCategory(null);
                goToTab(navigation, "Menu");
              }}
              style={{ borderWidth: 0 }}
            />
          </View>
          {visibleProducts.length === 0 ? (
            <Text style={styles.helperText}>{homeCopy.featuredEmpty}</Text>
          ) : (
            <View style={styles.productGrid}>
              {visibleProducts.map((product) => (
                <DishCard
                  key={product.id}
                  product={product}
                  style={styles.dishCard}
                  onPress={() =>
                    goToStack(navigation, "ProductDetails", {
                      productId: product.id,
                    })
                  }
                  onAdd={() => handleAddRequest(product)}
                />
              ))}
            </View>
          )}
          <Button title={homeCopy.featuredCta} variant="secondary" onPress={() => goToTab(navigation, "Menu")} />
        </Card>
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
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingTop: 4,
    marginBottom: 16,
    gap: 12,
  },
  brandBlock: {
    flex: 1,
    alignItems: "flex-end",
    gap: 4,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: "800",
    textAlign: "right",
  },
  brandOrange: { color: "#f59e0b" },
  brandPurple: { color: "#6138A1" },
  brandTagline: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "right",
  },
  cartBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  cartCount: {
    position: "absolute",
    top: 8,
    left: 10,
    backgroundColor: "#f59e0b",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cartCountText: {
    color: "#1f2937",
    fontWeight: "800",
    fontSize: 12,
  },
  heroCard: {
    padding: 0,
    marginBottom: 8,
    alignSelf: "center",
    width: HERO_WIDTH,
  },
  heroContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 0,
  },
  heroClip: {
    borderRadius: 32,
    overflow: "hidden",
    alignSelf: "center",
  },
  heroSlide: {
    width: "100%",
    height: 320,
    borderRadius: 26,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  heroImage: {
    borderRadius: 26,
  },
  heroOverlay: {
    backgroundColor: "rgba(17, 24, 39, 0.55)",
    padding: 20,
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
  },
  heroTitle: {
    color: "#fefcf7",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "right",
  },
  heroDescription: {
    color: "#f8fafc",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "right",
  },
  heroActions: {
    flexDirection: "row-reverse",
    gap: 12,
    marginTop: 10,
  },
  heroActionButton: {
    flex: 1,
  },
  heroPrimaryBtn: {
    backgroundColor: "#f59e0b",
    borderRadius: 18,
  },
  heroGhostButton: {
    borderWidth: 1.4,
    borderColor: "#f59e0b",
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  pagination: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    paddingVertical: 0,
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
  infoCard: {
    backgroundColor: "#fdfcf9",
    borderColor: "#f3f4f6",
    borderWidth: 1,
  },
  infoTags: {
    flexDirection: "row-reverse",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 8,
  },
  tag: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  tagText: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "700",
  },
  quickActions: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    marginBottom: 12,
    marginTop: -4,
  },
  quickCard: {
    flexBasis: "48%",
    maxWidth: "48%",
    marginHorizontal: "1%",
    marginBottom: 10,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    minHeight: 86,
  },
  quickIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    flexShrink: 1,
    flexWrap: "wrap",
    textAlign: "right",
  },
  quickHelper: {
    fontSize: 12,
    color: "#64748b",
    flexShrink: 1,
    flexWrap: "wrap",
    textAlign: "right",
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "right",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  categoryCard: {
    width: "48%",
    height: 140,
  },
  categoryImage: {
    flex: 1,
  },
  categoryOverlayWide: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "rgba(24, 24, 27, 0.35)",
    justifyContent: "flex-end",
    padding: 12,
  },
  categoryName: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "right",
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  dishCard: {
    width: "48%",
  },
  helperText: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "right",
    marginBottom: 12,
  },
});

export default HomeScreen;
