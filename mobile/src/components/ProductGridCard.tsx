import React from "react";
import { View, Text, StyleSheet, Image, Pressable, StyleProp, ViewStyle } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Product } from "../types";
import { useTheme } from "../theme";
import CurrencyAmount from "./CurrencyAmount";

type Props = {
  product: Product & { image?: string | null };
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onAdd?: () => void;
  priceColor?: string;
};

const ProductGridCard: React.FC<Props> = ({ product, style, onPress, onAdd, priceColor }) => {
  const theme = useTheme();
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
            <Text style={styles.imageFallbackText}>لا توجد صورة</Text>
          </View>
        )}
      </View>

      <Text style={styles.productName} numberOfLines={1}>
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
          accessibilityLabel="إضافة إلى السلة"
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
      width: "47%",
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
      textAlign: "center",
    },
    productName: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.palette.text,
      textAlign: "center",
      alignSelf: "stretch",
    },
    price: {
      fontSize: 14,
      fontWeight: "800",
      marginTop: 6,
      textAlign: "center",
      alignSelf: "stretch",
    },
    addBtn: {
      position: "absolute",
      left: 10,
      bottom: 10,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default ProductGridCard;
