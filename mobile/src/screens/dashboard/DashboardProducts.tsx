import React, { useMemo, useState } from "react";
import { Alert, Image, StyleSheet, Switch, Text, View, I18nManager } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Button, Input } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useTheme } from "../../theme";
import DashboardShell from "./components/DashboardShell";
import DashboardAccessDenied from "./components/DashboardAccessDenied";
import DashboardSection from "./components/DashboardSection";
import DashboardListItem from "./components/DashboardListItem";
import CurrencyAmount from "../../components/CurrencyAmount";
import { has } from "./components/permissions";

type ProductRow = {
  id: number;
  name: string;
  description?: string;
  price: number;
  stock?: number;
  available?: boolean;
  category?: number | { id: number; name: string };
  image?: string | null;
};

type ProductAddonRow = {
  id: number;
  name: string;
  price_delta: number;
  is_active?: boolean;
  sort_order?: number;
};

const DashboardProducts: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const qc = useQueryClient();
  const { user, permissions } = useAuth();

  const allowed = has(user, permissions, "can_manage_products");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [stock, setStock] = useState("");
  const [available, setAvailable] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [addons, setAddons] = useState<ProductAddonRow[]>([]);
  const [addonsLoading, setAddonsLoading] = useState(false);
  const [addonsSaving, setAddonsSaving] = useState(false);
  const [addonEditingId, setAddonEditingId] = useState<number | null>(null);
  const [addonName, setAddonName] = useState("");
  const [addonPrice, setAddonPrice] = useState("");
  const [search, setSearch] = useState("");

  const { data: products = [], isLoading } = useQuery<ProductRow[]>({
    queryKey: ["dashboard", "products"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("products/items/");
      return res.data?.results || res.data || [];
    },
  });

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  if (!allowed) {
    return <DashboardAccessDenied title="المنتجات" subtitle="إدارة المنتجات وإضافاتها." />;
  }

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setPrice("");
    setCategoryId("");
    setDescription("");
    setStock("");
    setAvailable(true);
    setImageUri(null);
    setAddons([]);
    resetAddonForm();
  };

  const resetAddonForm = () => {
    setAddonEditingId(null);
    setAddonName("");
    setAddonPrice("");
  };

  const loadAddons = async (productId: number) => {
    setAddonsLoading(true);
    try {
      let res;
      try {
        res = await api.get(`products/items/${productId}/addons/`);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          res = await api.get(`products/addons/?product=${productId}`);
        } else {
          throw err;
        }
      }
      const data = res.data?.results || res.data || [];
      setAddons(data);
    } catch {
      setAddons([]);
    } finally {
      setAddonsLoading(false);
    }
  };

  const saveAddon = async () => {
    if (!editingId) return;
    if (!addonName.trim()) {
      Alert.alert("بيانات ناقصة", "أدخل اسم الإضافة.");
      return;
    }
    setAddonsSaving(true);
    try {
      const payload = {
        name: addonName.trim(),
        price_delta: Number(addonPrice) || 0,
      };

      if (addonEditingId) {
        try {
          await api.patch(`products/items/${editingId}/addons/${addonEditingId}/`, payload);
        } catch (err: any) {
          if (err?.response?.status === 404) {
            await api.patch(`products/addons/${addonEditingId}/`, payload);
          } else {
            throw err;
          }
        }
      } else {
        try {
          await api.post(`products/items/${editingId}/addons/`, payload);
        } catch (err: any) {
          if (err?.response?.status === 404) {
            await api.post("products/addons/", { product_id: editingId, ...payload });
          } else {
            throw err;
          }
        }
      }

      await loadAddons(editingId);
      resetAddonForm();
    } catch {
      Alert.alert("تعذر الحفظ", "تعذر حفظ الإضافة.");
    } finally {
      setAddonsSaving(false);
    }
  };

  const editAddon = (addon: ProductAddonRow) => {
    setAddonEditingId(addon.id);
    setAddonName(addon.name);
    setAddonPrice(String(addon.price_delta ?? ""));
  };

  const deleteAddon = async (addonId: number) => {
    if (!editingId) return;
    Alert.alert("حذف الإضافة", "هل أنت متأكد؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          try {
            try {
              await api.delete(`products/items/${editingId}/addons/${addonId}/`);
            } catch (err: any) {
              if (err?.response?.status === 404) {
                await api.delete(`products/addons/${addonId}/`);
              } else {
                throw err;
              }
            }
            await loadAddons(editingId);
          } catch {
            Alert.alert("تعذر الحذف", "تعذر حذف الإضافة.");
          }
        },
      },
    ]);
  };

  const saveProduct = async () => {
    if (!name.trim() || !price.trim()) {
      Alert.alert("بيانات ناقصة", "أدخل اسم المنتج والسعر.");
      return;
    }

    setSaving(true);
    try {
      const formData: any = new FormData();
      formData.append("name", name.trim());
      formData.append("price", Number(price));
      formData.append("description", description);
      if (stock.trim()) formData.append("stock", Number(stock));
      formData.append("available", available);
      if (categoryId.trim()) formData.append("category", Number(categoryId));

      if (imageUri) {
        const filename = imageUri.split("/").pop() || "image.jpg";
        formData.append("image", { uri: imageUri, name: filename, type: "image/jpeg" } as any);
      }

      if (editingId) {
        await api.patch(`products/items/${editingId}/`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        await api.post("products/items/", formData, { headers: { "Content-Type": "multipart/form-data" } });
      }

      qc.invalidateQueries({ queryKey: ["dashboard", "products"] });
      resetForm();
    } catch {
      Alert.alert("تعذر الحفظ", "حدث خطأ أثناء حفظ المنتج.");
    } finally {
      setSaving(false);
    }
  };

  const editProduct = (p: ProductRow) => {
    setEditingId(p.id);
    setName(p.name);
    setPrice(String(p.price));
    setCategoryId(typeof p.category === "object" ? String(p.category.id) : p.category ? String(p.category) : "");
    setDescription(p.description || "");
    setStock(p.stock != null ? String(p.stock) : "");
    setAvailable(p.available ?? true);
    setImageUri(p.image || null);
    resetAddonForm();
    loadAddons(p.id);
  };

  const deleteProduct = async (id: number) => {
    Alert.alert("حذف المنتج", "هل أنت متأكد؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`products/items/${id}/`);
            qc.invalidateQueries({ queryKey: ["dashboard", "products"] });
            if (editingId === id) resetForm();
          } catch {
            Alert.alert("تعذر الحذف", "حدث خطأ أثناء حذف المنتج.");
          }
        },
      },
    ]);
  };

  return (
    <DashboardShell title="المنتجات" subtitle="إضافة وتعديل المنتجات وإدارة الإضافات (الخيارات).">
      <DashboardSection title={editingId ? "تعديل منتج" : "إضافة منتج"} subtitle="املأ البيانات ثم احفظ.">
        <Input label="اسم المنتج" value={name} onChangeText={setName} placeholder="مثال: ساندوتش دجاج" />
        <Input label="السعر" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="مثال: 12" />
        <Input label="رقم الفئة (اختياري)" value={categoryId} onChangeText={setCategoryId} keyboardType="number-pad" hint="يمكنك تركها فارغة." />
        <Input label="الوصف (اختياري)" value={description} onChangeText={setDescription} multiline numberOfLines={3} />
        <Input label="المخزون (اختياري)" value={stock} onChangeText={setStock} keyboardType="number-pad" />

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: theme.palette.text }]}>متاح للبيع</Text>
          <Switch value={available} onValueChange={setAvailable} thumbColor={available ? theme.palette.accent : "#f1f5f9"} />
        </View>

        <Button title={imageUri ? "تغيير الصورة" : "اختيار صورة"} variant="secondary" onPress={pickImage} />
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : null}

        <Button title={saving ? "جارٍ الحفظ..." : "حفظ المنتج"} onPress={saveProduct} disabled={saving} />
        {editingId ? <Button title="إلغاء التعديل" variant="ghost" onPress={resetForm} /> : null}
      </DashboardSection>

      {editingId ? (
        <DashboardSection title="إضافات المنتج" subtitle={addonsLoading ? "جاري التحميل..." : "أضف خيارات إضافية لهذا المنتج."}>
          <Input label={addonEditingId ? "تعديل اسم الإضافة" : "اسم الإضافة"} value={addonName} onChangeText={setAddonName} placeholder="مثال: جبن" />
          <Input label="سعر الإضافة" value={addonPrice} onChangeText={setAddonPrice} keyboardType="decimal-pad" placeholder="مثال: 1.5" />
          <Button title={addonsSaving ? "جارٍ الحفظ..." : addonEditingId ? "تحديث الإضافة" : "إضافة"} onPress={saveAddon} disabled={addonsSaving} />
          {addonEditingId ? <Button title="إلغاء" variant="ghost" onPress={resetAddonForm} /> : null}

          {addons.length === 0 ? (
            <Text style={[styles.empty, { color: theme.palette.muted }]}>لا توجد إضافات لهذا المنتج.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {addons.map((a) => (
                <DashboardListItem
                  key={a.id}
                  title={a.name}
                  subtitle={`السعر: ${a.price_delta ?? 0}`}
                  icon="add-circle-outline"
                  onPress={() => editAddon(a)}
                  right={
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Button title="تعديل" variant="secondary" onPress={() => editAddon(a)} />
                      <Button title="حذف" variant="ghost" onPress={() => deleteAddon(a.id)} />
                    </View>
                  }
                />
              ))}
            </View>
          )}
        </DashboardSection>
      ) : null}

      <DashboardSection title="قائمة المنتجات" subtitle={isLoading ? "جاري التحميل..." : "اضغط على منتج للتعديل."}>
        <Input label="بحث" value={search} onChangeText={setSearch} placeholder="اكتب اسم المنتج..." />
        {filteredProducts.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>لا توجد منتجات.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {filteredProducts.slice(0, 50).map((p) => (
              <DashboardListItem
                key={p.id}
                title={p.name}
                subtitle={`ID: ${p.id}${p.category ? " • فئة: " + (typeof p.category === "object" ? p.category.name : p.category) : ""}`}
                icon="fast-food-outline"
                onPress={() => editProduct(p)}
                right={
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <CurrencyAmount value={p.price} color={theme.palette.text} symbolSize={12} textStyle={styles.priceText} />
                    <Button title="تعديل" variant="secondary" onPress={() => editProduct(p)} />
                    <Button title="حذف" variant="ghost" onPress={() => deleteProduct(p.id)} />
                  </View>
                }
              />
            ))}
          </View>
        )}
      </DashboardSection>
    </DashboardShell>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 6,
    },
    switchLabel: {
      fontSize: 13,
      fontWeight: "900",
      textAlign: I18nManager.isRTL ? "right" : "left",
    },
    preview: {
      width: "100%",
      height: 160,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.palette.border,
      backgroundColor: theme.palette.surfaceAlt,
    },
    empty: {
      textAlign: I18nManager.isRTL ? "right" : "left",
      fontSize: 13,
    },
    priceText: {
      fontSize: 13,
      fontWeight: "900",
      color: theme.palette.text,
    },
  });

export default DashboardProducts;
