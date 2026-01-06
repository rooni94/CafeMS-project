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
  const { t } = useI18n();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

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
          <Image source={{ uri: product.image }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageFallbackText}>{t("product.noImage", "لا توجد صورة")}</Text>
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
          accessibilityLabel={t("product.addToCart", "إضافة إلى السلة")}
        >
          <Ionicons name="add" size={18} color="#fff" />
        </Pressable>
      ) : null}
    </Pressable>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    card: {
      width: "100%",
      backgroundColor: theme.palette.surface,
      borderRadius: 24,
      padding: 8,
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
      height: 106,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
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
      left: 8,
      bottom: 8,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default ProductGridCard;
