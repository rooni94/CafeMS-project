import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";

import Screen from "../../components/Screen";
import DishCard from "../../components/DishCard";
import EmptyState from "../../components/EmptyState";
import LoadingState from "../../components/LoadingState";
import ProductAddonsModal from "../../components/ProductAddonsModal";
import { Button, Card, Input } from "../../components/ui";
import { useCart } from "../../context/CartContext";
import { api } from "../../services/api";
import { Product, ProductAddon } from "../../types";
import { normalizeArabicText } from "../../utils/text";
import { useI18n } from "../../i18n";

const ProductsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { addItem, totalQuantity } = useCart();
  const { copy, t } = useI18n();
  const [search, setSearch] = useState("");
  const [addonProduct, setAddonProduct] = useState<Product | null>(null);

  const {
    data: products = [],
    isLoading,
    isError,
  } = useQuery<Product[]>({
    queryKey: ["products", "catalog"],
    queryFn: async () => {
      const res = await api.get("products/items/");
      return res.data;
    },
  });

  const filteredProducts = useMemo(() => {
    const safeList = products.map((product) => ({
      ...product,
      name: normalizeArabicText(product.name),
      description: product.description ? normalizeArabicText(product.description) : undefined,
    }));
    const query = search.trim().toLowerCase();
    if (!query) return safeList;
    return safeList.filter((product) => product.name.toLowerCase().includes(query));
  }, [products, search]);

  const handleAddRequest = (product: Product) => {
    if (product.addons && product.addons.length > 0) {
      setAddonProduct(product);
      return;
    }
    addItem({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image: product.image,
      quantity: 1,
    });
  };

  const handleConfirmAddons = (addons: ProductAddon[]) => {
    if (!addonProduct) return;
    const addonsTotal = addons.reduce((sum, addon) => sum + (Number(addon.price_delta) || 0), 0);
    addItem({
      id: addonProduct.id,
      name: addonProduct.name,
      price: Number(addonProduct.price) + addonsTotal,
      image: addonProduct.image,
      quantity: 1,
      addons,
    });
    setAddonProduct(null);
  };

  if (isLoading) {
    return (
      <Screen scrollable={false}>
        <LoadingState message={copy.menu.loading} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <EmptyState
          title={t("products.loadErrorTitle", "تعذر تحميل المنتجات")}
          description={t("products.loadErrorBody", "حدث خطأ أثناء تحميل المنتجات. حاول مرة أخرى لاحقاً.")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>{t("products.title", "تصفّح المنتجات")}</Text>
        <Text style={styles.body}>
          {t(
            "products.subtitle",
            "ابحث عن المنتج وأضفه للسلة بسرعة. إذا كان للمنتج إضافات ستظهر لك نافذة لاختيارها قبل الإضافة."
          )}
        </Text>
        <Input placeholder={copy.menu.searchPlaceholder} value={search} onChangeText={setSearch} />
        <Button
          title={
            totalQuantity > 0
              ? `${t("products.goToCart", "اذهب إلى السلة")} (${totalQuantity})`
              : t("products.goToCart", "اذهب إلى السلة")
          }
          variant="secondary"
          onPress={() => navigation.navigate("Cart")}
        />
      </Card>

      {filteredProducts.length === 0 ? (
        <EmptyState title={copy.menu.emptyTitle} description={copy.menu.emptyDescription} />
      ) : (
        <View style={styles.grid}>
          {filteredProducts.map((product) => (
            <DishCard
              key={product.id}
              product={product}
              style={styles.productCard}
              onPress={() => navigation.navigate("ProductDetails", { productId: product.id })}
              onAdd={() => handleAddRequest(product)}
            />
          ))}
        </View>
      )}

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
  title: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "right",
  },
  body: {
    fontSize: 13,
    color: "#475569",
    textAlign: "right",
  },
  grid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    alignSelf: "stretch",
  },
  productCard: {
    width: "49.5%",
    marginBottom: 12,
  },
});

export default ProductsScreen;
