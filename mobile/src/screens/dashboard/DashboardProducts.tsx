import React, { useMemo, useState } from "react";
import { Alert, Image, StyleSheet, Switch, Text, View, useWindowDimensions } from "react-native";
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
import StatBadge from "./components/StatBadge";
import { has } from "./components/permissions";
import { useI18n } from "../../i18n";

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
  const { isRTL } = useI18n();
  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
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
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "unavailable">("all");
  const [stockFilter, setStockFilter] = useState<"all" | "out">("all");

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
    let list = products;
    if (availabilityFilter !== "all") {
      const target = availabilityFilter === "available";
      list = list.filter((p) => (p.available ?? true) === target);
    }
    if (stockFilter === "out") {
      list = list.filter((p) => (p.stock ?? 0) <= 0);
    }
    if (!q) return list;
    return list.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search, availabilityFilter, stockFilter]);

  const stats = useMemo(() => {
    const total = products.length;
    const availableCount = products.filter((p) => p.available ?? true).length;
    const outOfStockCount = products.filter((p) => p.stock != null && Number(p.stock) <= 0).length;
    const categoryIds = new Set<number>();
    products.forEach((p) => {
      const id = typeof p.category === "object" ? p.category?.id : p.category;
      if (typeof id === "number") categoryIds.add(id);
    });
    return {
      total,
      availableCount,
      unavailableCount: Math.max(total - availableCount, 0),
      outOfStockCount,
      categoriesCount: categoryIds.size,
    };
  }, [products]);

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

  const fieldSize = isWide ? styles.fieldHalf : styles.fieldFull;

  return (
    <DashboardShell title="المنتجات" subtitle="إضافة وتعديل المنتجات وإدارة الإضافات (الخيارات).">
      <DashboardSection title="ملخص سريع" subtitle="مؤشرات مختصرة لأهم الأرقام.">
        <View style={styles.statsRow}>
          <StatBadge label="الإجمالي" value={stats.total} color={theme.palette.accentSoft} />
          <StatBadge label="متاح" value={stats.availableCount} color={theme.palette.success} />
          <StatBadge label="غير متاح" value={stats.unavailableCount} color={theme.palette.muted} />
          <StatBadge label="نفد" value={stats.outOfStockCount} color={theme.palette.danger} />
          <StatBadge label="الفئات" value={stats.categoriesCount} color={theme.status.info} />
        </View>
      </DashboardSection>

      <DashboardSection title={editingId ? "تعديل منتج" : "إضافة منتج"} subtitle="املأ البيانات ثم احفظ.">
        <View style={styles.formGrid}>
          <View style={[styles.field, fieldSize]}>
            <Input label="اسم المنتج" value={name} onChangeText={setName} placeholder="مثال: ساندوتش دجاج" />
          </View>
          <View style={[styles.field, fieldSize]}>
            <Input label="السعر" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="مثال: 12" />
          </View>
          <View style={[styles.field, fieldSize]}>
            <Input
              label="رقم الفئة (اختياري)"
              value={categoryId}
              onChangeText={setCategoryId}
              keyboardType="number-pad"
              hint="يمكنك تركها فارغة."
            />
          </View>
          <View style={[styles.field, fieldSize]}>
            <Input label="المخزون (اختياري)" value={stock} onChangeText={setStock} keyboardType="number-pad" />
          </View>
          <View style={[styles.field, styles.fieldFull]}>
            <Input label="الوصف (اختياري)" value={description} onChangeText={setDescription} multiline numberOfLines={3} />
          </View>
        </View>

        <View style={styles.switchRow}>
          <View>
            <Text style={[styles.switchLabel, { color: theme.palette.text }]}>متاح للبيع</Text>
            <Text style={[styles.switchHint, { color: theme.palette.muted }]}>إظهار المنتج في القائمة</Text>
          </View>
          <Switch value={available} onValueChange={setAvailable} thumbColor={available ? theme.palette.accent : "#f1f5f9"} />
        </View>

        <View style={styles.imageRow}>
          <Button title={imageUri ? "تغيير الصورة" : "اختيار صورة"} variant="secondary" onPress={pickImage} />
          {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : null}
        </View>

        <View style={styles.actionsRow}>
          <Button title={saving ? "جارٍ الحفظ..." : "حفظ المنتج"} onPress={saveProduct} disabled={saving} />
          {editingId ? <Button title="إلغاء التعديل" variant="ghost" onPress={resetForm} /> : null}
        </View>
      </DashboardSection>

      {editingId ? (
        <DashboardSection title="إضافات المنتج" subtitle={addonsLoading ? "جارٍ التحميل..." : "أضف خيارات إضافية لهذا المنتج."}>
          <View style={styles.formGrid}>
            <View style={[styles.field, fieldSize]}>
              <Input label={addonEditingId ? "تعديل اسم الإضافة" : "اسم الإضافة"} value={addonName} onChangeText={setAddonName} placeholder="مثال: جبن" />
            </View>
            <View style={[styles.field, fieldSize]}>
              <Input label="سعر الإضافة" value={addonPrice} onChangeText={setAddonPrice} keyboardType="decimal-pad" placeholder="مثال: 1.5" />
            </View>
          </View>
          <View style={styles.actionsRow}>
            <Button title={addonsSaving ? "جارٍ الحفظ..." : addonEditingId ? "تحديث الإضافة" : "إضافة"} onPress={saveAddon} disabled={addonsSaving} />
            {addonEditingId ? <Button title="إلغاء" variant="ghost" onPress={resetAddonForm} /> : null}
          </View>

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
                    <View style={styles.inlineActions}>
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

      <DashboardSection title="قائمة المنتجات" subtitle={isLoading ? "جارٍ التحميل..." : "اضغط على منتج للتعديل."}>
        <Input label="بحث" value={search} onChangeText={setSearch} placeholder="اكتب اسم المنتج..." />
        <View style={styles.chipsRow}>
          <Button title="الكل" variant={availabilityFilter === "all" ? "primary" : "ghost"} onPress={() => setAvailabilityFilter("all")} />
          <Button title="متاح" variant={availabilityFilter === "available" ? "primary" : "ghost"} onPress={() => setAvailabilityFilter("available")} />
          <Button title="غير متاح" variant={availabilityFilter === "unavailable" ? "primary" : "ghost"} onPress={() => setAvailabilityFilter("unavailable")} />
          <Button title="نفد" variant={stockFilter === "out" ? "primary" : "ghost"} onPress={() => setStockFilter((v) => (v === "out" ? "all" : "out"))} />
        </View>
        <View style={styles.statsRow}>
          <StatBadge label="النتائج" value={filteredProducts.length} color={theme.palette.accentSoft} />
          <StatBadge label="المعروض" value={Math.min(50, filteredProducts.length)} color={theme.status.info} />
        </View>

        {filteredProducts.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>لا توجد منتجات.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {filteredProducts.slice(0, 50).map((p) => (
              <DashboardListItem
                key={p.id}
                title={p.name}
                subtitle={`ID: ${p.id}${p.category ? " • فئة: " + (typeof p.category === "object" ? p.category.name : p.category) : ""}${
                  p.stock != null ? ` • المخزون: ${p.stock}` : ""
                }${p.available ? " • متاح" : " • غير متاح"}`}
                icon="fast-food-outline"
                onPress={() => editProduct(p)}
                right={
                  <View style={styles.inlineActions}>
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

const createStyles = (theme: ReturnType<typeof useTheme>, isRTL: boolean) =>
  StyleSheet.create({
    statsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    formGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    field: {
      flexGrow: 1,
      minWidth: 160,
    },
    fieldHalf: {
      width: "48%",
    },
    fieldFull: {
      width: "100%",
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 6,
      gap: 12,
    },
    switchLabel: {
      fontSize: 13,
      fontWeight: "900",
      textAlign: isRTL ? "right" : "left",
    },
    switchHint: {
      fontSize: 11,
      textAlign: isRTL ? "right" : "left",
      marginTop: 2,
      fontWeight: "700",
    },
    imageRow: {
      gap: 10,
    },
    preview: {
      width: "100%",
      height: 160,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.palette.border,
      backgroundColor: theme.palette.surfaceAlt,
    },
    actionsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "space-between",
      alignItems: "center",
    },
    inlineActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    empty: {
      textAlign: isRTL ? "right" : "left",
      fontSize: 13,
    },
    priceText: {
      fontSize: 13,
      fontWeight: "900",
      color: theme.palette.text,
    },
  });

export default DashboardProducts;
