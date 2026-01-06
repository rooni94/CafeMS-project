import React, { useMemo, useState } from "react";
import { Alert, Image, StyleSheet, Text, View, I18nManager } from "react-native";
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
import { hasAny } from "./components/permissions";

type Category = {
  id: number;
  name: string;
  description?: string;
  image?: string | null;
};

type SubCategory = {
  id: number;
  name: string;
  description?: string;
  category?: number | { id: number; name: string };
  image?: string | null;
};

const DashboardCategories: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const qc = useQueryClient();
  const { user, permissions } = useAuth();

  const allowed = hasAny(user, permissions, ["can_manage_categories", "can_manage_subcategories"]);

  const [mode, setMode] = useState<"category" | "subcategory">("category");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["dashboard", "categories"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("products/categories/");
      return res.data?.results || res.data || [];
    },
  });

  const { data: subcategories = [], isLoading: subLoading } = useQuery<SubCategory[]>({
    queryKey: ["dashboard", "subcategories"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("products/subcategories/");
      return res.data?.results || res.data || [];
    },
  });

  if (!allowed) {
    return <DashboardAccessDenied title="الأقسام" subtitle="إدارة الأقسام والأقسام الفرعية." />;
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
    setDescription("");
    setParentId("");
    setImageUri(null);
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert("بيانات ناقصة", "أدخل الاسم.");
      return;
    }
    if (mode === "subcategory" && !parentId.trim()) {
      Alert.alert("بيانات ناقصة", "أدخل رقم الفئة الرئيسية للتصنيف الفرعي.");
      return;
    }

    setSaving(true);
    try {
      const formData: any = new FormData();
      formData.append("name", name.trim());
      formData.append("description", description);
      if (mode === "subcategory") formData.append("category", Number(parentId));
      if (imageUri) {
        const filename = imageUri.split("/").pop() || "image.jpg";
        formData.append("image", { uri: imageUri, name: filename, type: "image/jpeg" } as any);
      }

      if (mode === "subcategory") {
        if (editingId) {
          await api.patch(`products/subcategories/${editingId}/`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        } else {
          await api.post("products/subcategories/", formData, { headers: { "Content-Type": "multipart/form-data" } });
        }
        qc.invalidateQueries({ queryKey: ["dashboard", "subcategories"] });
      } else {
        if (editingId) {
          await api.patch(`products/categories/${editingId}/`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        } else {
          await api.post("products/categories/", formData, { headers: { "Content-Type": "multipart/form-data" } });
        }
        qc.invalidateQueries({ queryKey: ["dashboard", "categories"] });
      }

      resetForm();
    } catch {
      Alert.alert("تعذر الحفظ", "حدث خطأ أثناء الحفظ.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: Category | SubCategory, nextMode: "category" | "subcategory") => {
    setMode(nextMode);
    setEditingId(item.id);
    setName(item.name);
    setDescription(item.description || "");
    setImageUri(item.image || null);
    if (nextMode === "subcategory") {
      const parent = (item as SubCategory).category;
      setParentId(typeof parent === "object" ? String(parent?.id ?? "") : parent ? String(parent) : "");
    } else {
      setParentId("");
    }
  };

  const deleteItem = async (id: number, which: "category" | "subcategory") => {
    Alert.alert("تأكيد الحذف", "هل أنت متأكد؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          try {
            if (which === "subcategory") {
              await api.delete(`products/subcategories/${id}/`);
              qc.invalidateQueries({ queryKey: ["dashboard", "subcategories"] });
            } else {
              await api.delete(`products/categories/${id}/`);
              qc.invalidateQueries({ queryKey: ["dashboard", "categories"] });
            }
            if (editingId === id) resetForm();
          } catch {
            Alert.alert("تعذر الحذف", "حدث خطأ أثناء الحذف.");
          }
        },
      },
    ]);
  };

  return (
    <DashboardShell title="التصنيفات" subtitle="إدارة الفئات والتصنيفات الفرعية.">
      <DashboardSection title={editingId ? "تعديل" : "إضافة"} subtitle="اختر نوع التصنيف ثم أدخل البيانات.">
        <View style={styles.modeRow}>
          <Button title="فئة" variant={mode === "category" ? "primary" : "ghost"} onPress={() => setMode("category")} />
          <Button title="تصنيف فرعي" variant={mode === "subcategory" ? "primary" : "ghost"} onPress={() => setMode("subcategory")} />
        </View>

        <Input label={mode === "category" ? "اسم الفئة" : "اسم التصنيف الفرعي"} value={name} onChangeText={setName} />
        <Input label="وصف (اختياري)" value={description} onChangeText={setDescription} multiline numberOfLines={3} />
        {mode === "subcategory" ? (
          <Input
            label="رقم الفئة الرئيسية"
            value={parentId}
            onChangeText={setParentId}
            keyboardType="number-pad"
            hint="يمكنك معرفة الرقم من قائمة الفئات بالأسفل."
          />
        ) : null}

        <Button title={imageUri ? "تغيير الصورة" : "اختيار صورة"} variant="secondary" onPress={pickImage} />
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : null}

        <Button title={saving ? "جارٍ الحفظ..." : "حفظ"} onPress={save} disabled={saving} />
        {editingId ? <Button title="إلغاء التعديل" variant="ghost" onPress={resetForm} /> : null}
      </DashboardSection>

      <DashboardSection title="الفئات" subtitle={categoriesLoading ? "جاري التحميل..." : "اضغط للتعديل."}>
        {categories.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>لا توجد فئات.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {categories.map((cat) => (
              <DashboardListItem
                key={cat.id}
                title={cat.name}
                subtitle={`ID: ${cat.id}${cat.description ? ` • ${cat.description}` : ""}`}
                icon="albums-outline"
                onPress={() => startEdit(cat, "category")}
                right={
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    {cat.image ? <Image source={{ uri: cat.image }} style={styles.thumb} /> : null}
                    <Button title="تعديل" variant="secondary" onPress={() => startEdit(cat, "category")} />
                    <Button title="حذف" variant="ghost" onPress={() => deleteItem(cat.id, "category")} />
                  </View>
                }
              />
            ))}
          </View>
        )}
      </DashboardSection>

      <DashboardSection title="التصنيفات الفرعية" subtitle={subLoading ? "جاري التحميل..." : "اضغط للتعديل."}>
        {subcategories.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>لا توجد تصنيفات فرعية.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {subcategories.map((s) => (
              <DashboardListItem
                key={s.id}
                title={s.name}
                subtitle={`ID: ${s.id} • الفئة: ${typeof s.category === "object" ? s.category?.name : s.category ?? "-"}${s.description ? ` • ${s.description}` : ""}`}
                icon="layers-outline"
                onPress={() => startEdit(s, "subcategory")}
                right={
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    {s.image ? <Image source={{ uri: s.image }} style={styles.thumb} /> : null}
                    <Button title="تعديل" variant="secondary" onPress={() => startEdit(s, "subcategory")} />
                    <Button title="حذف" variant="ghost" onPress={() => deleteItem(s.id, "subcategory")} />
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
    modeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    preview: {
      width: "100%",
      height: 160,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.palette.border,
      backgroundColor: theme.palette.surfaceAlt,
    },
    thumb: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.palette.border,
      backgroundColor: theme.palette.surfaceAlt,
    },
    empty: {
      textAlign: I18nManager.isRTL ? "right" : "left",
      fontSize: 13,
    },
  });

export default DashboardCategories;
