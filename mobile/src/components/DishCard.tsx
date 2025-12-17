import React from "react";
import {
  Pressable,
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { Product } from "../types";
import CurrencyAmount from "./CurrencyAmount";

type DishCardProps = {
  product: Product;
  onPress?: () => void;
  onAdd?: () => void;
  style?: ViewStyle;
};

const DishCard: React.FC<DishCardProps> = ({
  product,
  onPress,
  onAdd,
  style,
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.card,
      style,
      pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
    ]}
  >
    {product.image ? (
      <Image source={{ uri: product.image }} style={styles.image} />
    ) : (
      <View style={[styles.image, styles.imageFallback]}>
        <Text style={styles.imageFallbackText}>لا تتوفر صورة</Text>
      </View>
    )}

    <View style={styles.info}>
      <Text style={styles.name} numberOfLines={1}>
        {product.name}
      </Text>
      {product.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {product.description}
        </Text>
      ) : null}
      <View style={styles.row}>
        <CurrencyAmount value={product.price} color="#b45309" symbolSize={14} textStyle={styles.price} />
        {onAdd ? (
          <Pressable onPress={onAdd} style={styles.addButton}>
            <Text style={styles.addButtonText}>أضف</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: "#fff",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#fef3c7",
  },
  image: {
    width: "100%",
    height: 140,
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fffbeb",
  },
  imageFallbackText: {
    fontSize: 12,
    color: "#b45309",
  },
  info: {
    padding: 12,
    gap: 6,
  },
  name: {
    fontWeight: "700",
    fontSize: 15,
    color: "#111827",
    textAlign: "right",
  },
  description: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "right",
  },
  price: {
    fontWeight: "700",
    color: "#b45309",
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#f59e0b",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});

export default DishCard;
