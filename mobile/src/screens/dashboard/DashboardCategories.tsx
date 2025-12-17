import React, { useState, useMemo } from "react";
import { Text, StyleSheet, ScrollView, View, TextInput, Alert, Image } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import Screen from "../../components/Screen";
import { Card, Button } from "../../components/ui";
import { useTheme } from "../../theme";
import { api } from "../../services/api";

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
  const qc = useQueryClient();
  const [isSub, setIsSub] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories-admin"],
    queryFn: async () => {
      const res = await api.get("products/categories/");
      return res.data.results || res.data;
    },
  });

  const { data: subcategories } = useQuery<SubCategory[]>({
    queryKey: ["subcategories-admin"],
    queryFn: async () => {
      const res = await api.get("products/subcategories/");
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
    setIsSub(false);
    setName("");
    setDescription("");
    setParentId("");
    setImageUri(null);
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert("تنبيه", "أدخل الاسم.");
      return;
    }
    if (isSub && !parentId) {
      Alert.alert("تنبيه", "اختر تصنيفاً رئيسياً للتصنيف الفرعي.");
      return;
    }
    const formData: any = new FormData();
    formData.append("name", name.trim());
    formData.append("description", description);
    if (isSub) formData.append("category", Number(parentId));
    if (imageUri) {
      const filename = imageUri.split("/").pop() || "image.jpg";
      formData.append("image", {
        uri: imageUri,
        name: filename,
        type: "image/jpeg",
      } as any);
    }
    try {
      if (isSub) {
        if (editingId) {
          await api.patch(`products/subcategories/${editingId}/`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        } else {
          await api.post("products/subcategories/", formData, { headers: { "Content-Type": "multipart/form-data" } });
        }
        qc.invalidateQueries({ queryKey: ["subcategories-admin"] });
      } else {
        if (editingId) {
          await api.patch(`products/categories/${editingId}/`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        } else {
          await api.post("products/categories/", formData, { headers: { "Content-Type": "multipart/form-data" } });
        }
        qc.invalidateQueries({ queryKey: ["categories-admin"] });
      }
      resetForm();
    } catch {
      Alert.alert("خطأ", "تعذر الحفظ.");
    }
  };

  const filteredSubsByParent = useMemo(() => {
    return (subcategories || []).reduce<Record<number, SubCategory[]>>((acc, item) => {
      const parent = typeof item.category === "object" ? item.category?.id : item.category || 0;
      acc[parent] = acc[parent] ? [...acc[parent], item] : [item];
      return acc;
    }, {});
  }, [subcategories]);

  const startEdit = (item: Category | SubCategory, sub: boolean) => {
    setIsSub(sub);
    const parent = sub ? (item as SubCategory).category : null;
    setEditingId(item.id);
    setName(item.name);
    setDescription(item.description || "");
    setParentId(sub ? (typeof parent === "object" ? String(parent?.id ?? "") : String(parent ?? "")) : "");
    setImageUri(item.image || null);
  };

  const deleteItem = async (id: number, sub: boolean) => {
    try {
      if (sub) {
        await api.delete(`products/subcategories/${id}/`);
        qc.invalidateQueries({ queryKey: ["subcategories-admin"] });
      } else {
        await api.delete(`products/categories/${id}/`);
        qc.invalidateQueries({ queryKey: ["categories-admin"] });
      }
      if (editingId === id) resetForm();
    } catch {
      Alert.alert("خطأ", "تعذر الحذف.");
    }
  };

  return (
    <Screen style={{ backgroundColor: theme.palette.background }}>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
        <Card>
          <Text style={styles.title}>الأصناف والأصناف الفرعية</Text>
          <Text style={styles.helper}>إدارة التصنيفات والصور، مع ربط التصنيف الفرعي بالرئيسي.</Text>
        </Card>

        <Card style={{ gap: 8 }}>
          <Text style={styles.sectionTitle}>{editingId ? "تعديل" : "إضافة"}</Text>
          <View style={styles.switchRow}>
            <Button title="تصنيف رئيسي" variant={!isSub ? "primary" : "ghost"} onPress={() => setIsSub(false)} />
            <Button title="تصنيف فرعي" variant={isSub ? "primary" : "ghost"} onPress={() => setIsSub(true)} />
          </View>
          <TextInput placeholder="الاسم" value={name} onChangeText={setName} style={styles.input} textAlign="right" />
          <TextInput placeholder="الوصف (اختياري)" value={description} onChangeText={setDescription} style={styles.input} textAlign="right" />
          {isSub && (
            <TextInput
              placeholder="معرف التصنيف الرئيسي"
              value={parentId}
              onChangeText={setParentId}
              style={styles.input}
              keyboardType="number-pad"
              textAlign="right"
            />
          )}
          <Button title={imageUri ? "تغيير الصورة" : "اختيار صورة"} variant="secondary" onPress={pickImage} />
          {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : null}
          <Button title="حفظ" onPress={save} />
          {editingId ? <Button title="إلغاء التعديل" variant="ghost" onPress={resetForm} /> : null}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>التصنيفات</Text>
          {categories?.map((cat) => (
            <View key={cat.id} style={styles.row}>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={styles.name}>{cat.name}</Text>
                {cat.description ? <Text style={styles.sub}>{cat.description}</Text> : null}
                {filteredSubsByParent[cat.id]?.length ? (
                  <View style={{ marginTop: 6, gap: 4 }}>
                    {filteredSubsByParent[cat.id].map((s) => (
                      <Text key={s.id} style={styles.sub}>فرعي: {s.name}</Text>
                    ))}
                  </View>
                ) : null}
              </View>
              {cat.image ? <Image source={{ uri: cat.image }} style={styles.thumb} /> : null}
              <View style={{ gap: 6 }}>
                <Button title="تعديل" variant="secondary" onPress={() => startEdit(cat, false)} />
                <Button title="حذف" variant="ghost" onPress={() => deleteItem(cat.id, false)} />
              </View>
            </View>
          ))}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>الأصناف الفرعية</Text>
          {subcategories?.map((s) => (
            <View key={s.id} style={styles.row}>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={styles.name}>{s.name}</Text>
                <Text style={styles.sub}>رئيسي: {typeof s.category === "object" ? s.category?.name : s.category ?? "-"}</Text>
                {s.description ? <Text style={styles.sub}>{s.description}</Text> : null}
              </View>
              {s.image ? <Image source={{ uri: s.image }} style={styles.thumb} /> : null}
              <View style={{ gap: 6 }}>
                <Button title="تعديل" variant="secondary" onPress={() => startEdit(s, true)} />
                <Button title="حذف" variant="ghost" onPress={() => deleteItem(s.id, true)} />
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </Screen>
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
    gap: 8,
    marginVertical: 6,
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

export default DashboardCategories;
