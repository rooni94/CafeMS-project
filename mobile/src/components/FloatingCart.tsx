import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCart } from "../context/CartContext";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../theme";

const FloatingCart: React.FC = () => {
  const { totalQuantity } = useCart();
  const navigation = useNavigation<any>();
  const theme = useTheme();

  return (
    <Pressable style={[styles.container, { backgroundColor: theme.palette.surface }]} onPress={() => navigation.navigate("Cart")}>
      <Ionicons name="cart-outline" size={20} color="#f59e0b" />
      {totalQuantity > 0 && (
        <View style={[styles.badge, { backgroundColor: theme.palette.accent }]}>
          <Text style={styles.badgeText}>{totalQuantity}</Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 20,
    top: 50,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    zIndex: 50,
  },
  badge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
});

export default FloatingCart;
