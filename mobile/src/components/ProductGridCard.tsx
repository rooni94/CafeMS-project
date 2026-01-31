import React from "react";
import { View, Text, StyleSheet, Image, Pressable, StyleProp, ViewStyle } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Product } from "../types";
import { useTheme } from "../theme";
import CurrencyAmount from "./CurrencyAmount";
import { useI18n } from "../i18n";

type Props = {
  product: Product & { image?: string | null };
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onAdd?: () => void;
  priceColor?: string;
};

const ProductGridCard: React.FC<Props> = ({ product, style, onPress, onAdd, priceColor }) => {
  const theme = useTheme();
  const { t, isRTL } = useI18n();
  const styles = React.useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        style,
        pressed && { opacity: 0.96, transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={styles.imageWrap}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageFallbackText}>{t("product.noImage", "\u0644\u0627 \u062a\u0648\u062c\u062f \u0635\u0648\u0631\u0629")}</Text>
          </View>
        )}
      </View>

      <Text style={styles.productName} numberOfLines={3}>
        {product.name}
      </Text>
      <CurrencyAmount
        value={product.price}
        color={priceColor || theme.palette.success}
        symbolSize={14}
        textStyle={[styles.price, { color: priceColor || theme.palette.success }]}
      />

      {onAdd ? (
        <Pressable
          style={[styles.addBtn, { backgroundColor: theme.palette.accent }]}
          onPress={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          accessibilityLabel={t("product.addToCart", "\u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0627\u0644\u0633\u0644\u0629")}
        >
          <Ionicons name="add" size={18} color="#fff" />
        </Pressable>
      ) : null}
    </Pressable>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>, isRTL: boolean) =>
  StyleSheet.create({
    card: {
      width: "100%",
      backgroundColor: theme.palette.surface,
      borderRadius: 24,
      padding: 6,
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
      aspectRatio: 4 / 3,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: theme.palette.surfaceAlt,
    },
    image: {
      width: "100%",
      height: "100%",
      borderRadius: 18,
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
      textAlign: "center",
    },
    productName: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.palette.text,
      textAlign: "center",
      alignSelf: "stretch",
      lineHeight: 18,
    },
    price: {
      fontSize: 14,
      fontWeight: "800",
      marginTop: 2,
      textAlign: "center",
      alignSelf: "stretch",
    },
    addBtn: {
      position: "absolute",
      bottom: 8,
      start: 8,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default ProductGridCard;
