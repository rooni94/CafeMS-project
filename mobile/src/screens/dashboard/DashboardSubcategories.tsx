import React, { useState } from "react";
import { Text, StyleSheet, ScrollView, View, TextInput, Alert, Image } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import Screen from "../../components/Screen";
import { Card, Button } from "../../components/ui";
import { useTheme } from "../../theme";
import { api } from "../../services/api";

type SubCategory = {
  id: number;
  name: string;
  description?: string;
  category?: number | { id: number; name: string };
  image?: string | null;
};



const DashboardSubcategories: React.FC = () => {
  const theme = useTheme();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

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
    setName("");
    setDescription("");
    setCategoryId("");
    setImageUri(null);
  };

  const saveSub = async () => {
    if (!name.trim()) return Alert.alert("تنبيه", "أدخل اسم التصنيف الفرعي.");
    if (!categoryId) return Alert.alert("تنبيه", "اختر تصنيفاً رئيسياً.");
    setSaving(true);
    try {
      const formData: any = new FormData();
      formData.append("name", name.trim());
      formData.append("description", description);
      formData.append("category", Number(categoryId));
      if (imageUri) {
        const filename = imageUri.split("/").pop() || "image.jpg";
        formData.append("image", {
          uri: imageUri,
          name: filename,
          type: "image/jpeg",
        } as any);
      }
      if (editingId) {
        await api.patch(`products/subcategories/${editingId}/`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("products/subcategories/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      resetForm();
      qc.invalidateQueries({ queryKey: ["subcategories-admin"] });
    } catch {
      Alert.alert("خطأ", "تعذر حفظ التصنيف الفرعي.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (s: SubCategory) => {
    setEditingId(s.id);
    setName(s.name);
    setDescription(s.description || "");
    setCategoryId(typeof s.category === "object" ? String(s.category.id) : s.category ? String(s.category) : "");
    setImageUri(s.image || null);
  };

  const deleteSub = async (id: number) => {
    try {
      await api.delete(`products/subcategories/${id}/`);
      qc.invalidateQueries({ queryKey: ["subcategories-admin"] });
      if (editingId === id) resetForm();
    } catch {
      Alert.alert("خطأ", "تعذر حذف التصنيف الفرعي.");
    }
  };

  return (
    <Screen style={{ backgroundColor: theme.palette.background }}>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
        <Card>
          <Text style={styles.title}>التصنيفات الفرعية</Text>
          <Text style={styles.helper}>إدارة التصنيفات الفرعية وربطها بالرئيسية مع الصور.</Text>
        </Card>

        <Card style={{ gap: 8 }}>
          <Text style={styles.sectionTitle}>{editingId ? "تعديل تصنيف فرعي" : "إضافة تصنيف فرعي"}</Text>
          <TextInput
            placeholder="اسم التصنيف الفرعي"
            value={name}
            onChangeText={setName}
            style={styles.input}
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
            placeholder="معرف التصنيف الرئيسي"
            value={categoryId}
            onChangeText={setCategoryId}
            style={styles.input}
            keyboardType="number-pad"
            textAlign="right"
          />
          <Button title={imageUri ? "تغيير الصورة" : "اختيار صورة"} variant="secondary" onPress={pickImage} />
          {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : null}
          <Button title={saving ? "جارٍ الحفظ..." : "حفظ"} onPress={saveSub} disabled={saving} />
          {editingId ? <Button title="إلغاء التعديل" variant="ghost" onPress={resetForm} /> : null}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>قائمة التصنيفات الفرعية</Text>
          {subcategories &&
            subcategories.map((s) => (
              <View key={s.id} style={styles.row}>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={styles.name}>{s.name}</Text>
                  <Text style={styles.sub}>
                    تصنيف رئيسي: {typeof s.category === "object" ? s.category?.name : s.category ?? "-"}
                  </Text>
                  {s.description ? <Text style={styles.sub}>{s.description}</Text> : null}
                </View>
                {s.image ? <Image source={{ uri: s.image }} style={styles.thumb} /> : null}
                <Button title="تعديل" variant="secondary" onPress={() => startEdit(s)} />
                <Button title="حذف" variant="ghost" onPress={() => deleteSub(s.id)} />
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

export default DashboardSubcategories;
