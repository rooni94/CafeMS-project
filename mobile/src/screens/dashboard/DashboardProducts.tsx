import React, { useState } from "react";
import { Text, StyleSheet, ScrollView, View, TextInput, Alert, Switch, Image } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Card, Button } from "../../components/ui";
import { useTheme } from "../../theme";
import { api } from "../../services/api";
import DashboardShell from "./components/DashboardShell";

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
};

const DashboardProducts: React.FC = () => {
  const theme = useTheme();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [price, setPrice] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [stock, setStock] = useState<string>("");
  const [available, setAvailable] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [addons, setAddons] = useState<ProductAddonRow[]>([]);
  const [addonName, setAddonName] = useState("");
  const [addonPrice, setAddonPrice] = useState<string>("");
  const [addonEditingId, setAddonEditingId] = useState<number | null>(null);
  const [addonsLoading, setAddonsLoading] = useState(false);
  const [addonsSaving, setAddonsSaving] = useState(false);

  const { data: products } = useQuery<ProductRow[]>({
    queryKey: ["products-admin"],
    queryFn: async () => {
      const res = await api.get("products/items/");
      return res.data.results || res.data;
    },
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
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
    setAddonName("");
    setAddonPrice("");
    setAddonEditingId(null);
  };

  const resetAddonForm = () => {
    setAddonName("");
    setAddonPrice("");
    setAddonEditingId(null);
  };

  const loadAddons = async (productId: number) => {
    setAddonsLoading(true);
    try {
      const res = await api.get(`products/addons/?product=${productId}`);
      const data = res.data?.results || res.data || [];
      setAddons(data);
    } catch (error) {
      console.warn("load addons error", error);
      setAddons([]);
    } finally {
      setAddonsLoading(false);
    }
  };

  const saveAddon = async () => {
    if (!editingId) return;
    if (!addonName.trim()) {
      Alert.alert("تنبيه", "يرجى إدخال اسم الإضافة.");
      return;
    }
    setAddonsSaving(true);
    try {
      const payload = {
        name: addonName.trim(),
        price_delta: Number(addonPrice) || 0,
      };
      if (addonEditingId) {
        await api.patch(`products/addons/${addonEditingId}/`, payload);
      } else {
        await api.post("products/addons/", { product_id: editingId, ...payload });
      }
      await loadAddons(editingId);
      resetAddonForm();
    } catch {
      Alert.alert("خطأ", "تعذر حفظ الإضافة.");
    } finally {
      setAddonsSaving(false);
    }
  };

  const editAddon = (addon: ProductAddonRow) => {
    setAddonEditingId(addon.id);
    setAddonName(addon.name);
    setAddonPrice(String(addon.price_delta ?? ""));
  };

  const deleteAddon = (addonId: number) => {
    if (!editingId) return;
    Alert.alert("حذف", "هل أنت متأكد من حذف الإضافة؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`products/addons/${addonId}/`);
            await loadAddons(editingId);
          } catch {
            Alert.alert("خطأ", "تعذر حذف الإضافة.");
          }
        },
      },
    ]);
  };

  const saveProduct = async () => {
    if (!name.trim() || !price) {
      Alert.alert("تنبيه", "أدخل الاسم والسعر.");
      return;
    }
    setSaving(true);
    try {
      const formData: any = new FormData();
      formData.append("name", name.trim());
      formData.append("price", Number(price));
      formData.append("description", description);
      if (stock) formData.append("stock", Number(stock));
      formData.append("available", available);
      if (categoryId) formData.append("category", Number(categoryId));
      if (imageUri) {
        const filename = imageUri.split("/").pop() || "image.jpg";
        formData.append("image", {
          uri: imageUri,
          name: filename,
          type: "image/jpeg",
        } as any);
      }

      if (editingId) {
        await api.patch(`products/items/${editingId}/`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("products/items/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      resetForm();
      qc.invalidateQueries({ queryKey: ["products-admin"] });
    } catch {
      Alert.alert("خطأ", "تعذر حفظ المنتج.");
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
    setStock(p.stock ? String(p.stock) : "");
    setAvailable(p.available ?? true);
    setImageUri(p.image || null);
    resetAddonForm();
    loadAddons(p.id);
  };

  const deleteProduct = async (id: number) => {
    try {
      await api.delete(`products/items/${id}/`);
      qc.invalidateQueries({ queryKey: ["products-admin"] });
      if (editingId === id) resetForm();
    } catch {
      Alert.alert("خطأ", "تعذر حذف المنتج.");
    }
  };

  return (
    <DashboardShell title="إدارة المنتجات" subtitle="إضافة منتجات، صور، وتفعيل/تعطيل مع إدارة الإضافات.">
        <Card>
          <Text style={styles.title}>المنتجات</Text>
          <Text style={styles.helper}>إدارة المنتجات مع التحكم في التوفر والصور.</Text>
        </Card>

        <Card style={{ gap: 8 }}>
          <Text style={styles.sectionTitle}>{editingId ? "تعديل منتج" : "إضافة منتج"}</Text>
          <TextInput placeholder="اسم المنتج" value={name} onChangeText={setName} style={styles.input} textAlign="right" />
          <TextInput
            placeholder="السعر"
            value={price}
            onChangeText={setPrice}
            style={styles.input}
            keyboardType="numeric"
            textAlign="right"
          />
          <TextInput
            placeholder="الوصف (اختياري)"
            value={description}
            onChangeText={setDescription}
            style={styles.input}
            textAlign="right"
          />
          <TextInput
            placeholder="المخزون (اختياري)"
            value={stock}
            onChangeText={setStock}
            style={styles.input}
            keyboardType="numeric"
            textAlign="right"
          />
          <TextInput
            placeholder="معرف التصنيف (اختياري)"
            value={categoryId}
            onChangeText={setCategoryId}
            style={styles.input}
            keyboardType="number-pad"
            textAlign="right"
          />
          <View style={styles.switchRow}>
            <Text style={styles.sub}>متاح</Text>
            <Switch value={available} onValueChange={setAvailable} />
          </View>
          <Button title={imageUri ? "تغيير الصورة" : "اختيار صورة"} variant="secondary" onPress={pickImage} />
          {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : null}
          <Button title={saving ? "جارٍ الحفظ..." : "حفظ"} onPress={saveProduct} disabled={saving} />
          {editingId ? <Button title="إلغاء التعديل" variant="ghost" onPress={resetForm} /> : null}
        </Card>

        <Card style={{ gap: 8 }}>
          <Text style={styles.sectionTitle}>إضافات المنتج</Text>
          {editingId ? (
            <>
              <TextInput
                placeholder="اسم الإضافة"
                value={addonName}
                onChangeText={setAddonName}
                style={styles.input}
                textAlign="right"
              />
              <TextInput
                placeholder="السعر"
                value={addonPrice}
                onChangeText={setAddonPrice}
                style={styles.input}
                keyboardType="numeric"
                textAlign="right"
              />
              <Button
                title={addonsSaving ? "جاري الحفظ..." : addonEditingId ? "تحديث" : "إضافة"}
                onPress={saveAddon}
                disabled={addonsSaving}
              />
              {addonEditingId ? <Button title="إلغاء" variant="ghost" onPress={resetAddonForm} /> : null}
              {addonsLoading ? (
                <Text style={styles.sub}>جاري تحميل إضافات...</Text>
              ) : addons.length === 0 ? (
                <Text style={styles.sub}>لا توجد إضافات بعد.</Text>
              ) : (
                addons.map((addon) => (
                  <View key={addon.id} style={styles.row}>
                    <View style={{ flex: 1, alignItems: "flex-end" }}>
                      <Text style={styles.name}>{addon.name}</Text>
                      <Text style={styles.sub}>+ {Number(addon.price_delta || 0).toFixed(2)} ?.?</Text>
                    </View>
                    <Button title="تعديل" variant="secondary" onPress={() => editAddon(addon)} />
                    <Button title="حذف" variant="ghost" onPress={() => deleteAddon(addon.id)} />
                  </View>
                ))
              )}
            </>
          ) : (
            <Text style={styles.sub}>اختر منتجًا لعرض إضافات.</Text>
          )}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>قائمة المنتجات</Text>
          {products &&
            products.slice(0, 20).map((p) => (
              <View key={p.id} style={styles.row}>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={styles.name}>{p.name}</Text>
                  <Text style={styles.sub}>
                    السعر: {Number(p.price).toFixed(2)} ? التصنيف:{" "}
                    {typeof p.category === "object" ? p.category?.name : p.category ?? "-"}
                  </Text>
                  {p.description ? <Text style={styles.sub}>{p.description}</Text> : null}
                  <Text style={styles.sub}>
                    المخزون: {p.stock ?? "-"} ? {p.available ? "متاح" : "غير متاح"}
                  </Text>
                </View>
                {p.image ? <Image source={{ uri: p.image }} style={styles.thumb} /> : null}
                <Button title="تعديل" variant="secondary" onPress={() => editProduct(p)} />
                <Button title="حذف" variant="ghost" onPress={() => deleteProduct(p.id)} />
              </View>
            ))}
        </Card>
    </DashboardShell>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
  },
  helper: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "right",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 10,
    textAlign: "right",
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
  },
  sub: {
    fontSize: 12,
    color: "#6b7280",
  },
  switchRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  preview: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    marginTop: 6,
  },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: 10,
  },
});

export default DashboardProducts;
