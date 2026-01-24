import React, {useEffect, useMemo, useRef, useState} from "react";
import { View, Text, StyleSheet, Image, ImageBackground, Dimensions, Pressable, ScrollView } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Carousel from "react-native-reanimated-carousel";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";

import Screen from "../components/Screen";
import { Button, Card } from "../components/ui";
import FloatingCart from "../components/FloatingCart";
import { api } from "../services/api";
import { Category } from "../types";
import { useStoreSettings } from "../context/StoreSettingsContext";
import { useCart } from "../context/CartContext";
import { useTheme } from "../theme";
import { resolveMediaUrl } from "../utils/media";
import { normalizeArabicText, normalizeBrandName } from "../utils/text";
import { goToStack, goToTab } from "../navigation/helpers";
import DashboardSection from "./dashboard/components/DashboardSection";
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
  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);
  const { settings } = useStoreSettings();
  const { totalQuantity } = useCart();
  const heroFallback = copy.heroFallback;

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

  const brandName = normalizeBrandName(settings?.store_name, copy.brandFallback);
  const [brandFirst, ...brandRest] = brandName.split(" ");
  const brandSecond = brandRest.join(" ");

  const safeCategories = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        name: normalizeArabicText(category.name),
        description: category.description ? normalizeArabicText(category.description) : undefined,
      })),
    [categories]
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

  if (categoriesLoading) {
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
            <View style={styles.brandBlock}>
              <Text style={styles.brandTitle} numberOfLines={1}>
                <Text style={styles.brandOrange}>{brandFirst || brandName} </Text>
                <Text style={styles.brandPurple}>{brandSecond || ""}</Text>
              </Text>
            </View>
            <Pressable style={styles.cartBadge} onPress={() => goToStack(navigation, "Cart")}>
              <Ionicons name="cart-outline" size={22} color="#f59e0b" />
              {totalQuantity > 0 ? (
                <View style={[styles.cartCount, { backgroundColor: "#f59e0b" }]}>
                  <Text style={styles.cartCountText}>{totalQuantity}</Text>
                </View>
              ) : null}
            </Pressable>
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

        <DashboardSection title={copy.home.categoriesTitle} subtitle={copy.home.quickIntro}>
          <View style={styles.categoryGrid}>
            {categoryCards.map((category, index) => (
              <View key={String(category.id)} style={styles.categoryItem}>
                <Pressable
                  style={({ pressed }) => [styles.categoryCard, pressed && styles.categoryPressed]}
                  onPress={() => goToTab(navigation, "Menu", { categoryId: category.id })}
                >
                  <Image source={{ uri: category.image }} style={styles.categoryImage} resizeMode="cover" />
                  <View style={styles.categoryOverlay} />
                  <View style={styles.categoryGlass}>
                    <View style={styles.categoryBadge}>
                      <Ionicons
                        name={index % 2 === 0 ? "sparkles-outline" : "leaf-outline"}
                        size={14}
                        color={theme.palette.accent}
                      />
                      <Text style={styles.categoryBadgeText} numberOfLines={1}>
                        {category.name}
                      </Text>
                    </View>
                    <View style={styles.categoryAction}>
                      <Ionicons
                        name={isRTL ? "arrow-back-circle" : "arrow-forward-circle"}
                        size={20}
                        color={theme.palette.accent}
                      />
                    </View>
                  </View>
                </Pressable>
              </View>
            ))}
          </View>
        </DashboardSection>
      </ScrollView>

      {showFloatingCart ? <FloatingCart /> : null}
    </Screen>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>, isRTL: boolean) =>
  StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 24,
    gap: 6,
    writingDirection: isRTL ? "rtl" : "ltr",
  },
  headerSection: {
    borderRadius: 22,
  },
  headerRow: {
    flexDirection: isRTL ? "row-reverse" : "row",
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
    end: 9,
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
  categoryGrid: {
    flexDirection: isRTL ? "row-reverse" : "row",
    flexWrap: "wrap",
    justifyContent: isRTL ? "flex-start" : "space-between",
  },
  categoryItem: {
    width: "49.5%",
    marginBottom: 10,
  },
  categoryCard: {
    width: "100%",
    height: 170,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: theme.palette.surface,
    borderWidth: 1,
    borderColor: theme.palette.border,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  categoryPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.96,
  },
  categoryImage: {
    ...StyleSheet.absoluteFillObject,
  },
  categoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  categoryGlass: {
    ...StyleSheet.absoluteFillObject,
    padding: 14,
    justifyContent: "space-between",
  },
  categoryBadge: {
    alignSelf: isRTL ? "flex-end" : "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.palette.text,
  },
  categoryAction: {
    alignSelf: isRTL ? "flex-start" : "flex-end",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    padding: 4,
    marginTop: 8,
  },
});

export default HomeScreen;
