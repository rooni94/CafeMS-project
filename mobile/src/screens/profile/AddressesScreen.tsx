import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

import DashboardShell from "../dashboard/components/DashboardShell";
import DashboardSection from "../dashboard/components/DashboardSection";
import DashboardListItem from "../dashboard/components/DashboardListItem";
import { Button, Input } from "../../components/ui";
import { api, parseApiError } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../theme";
import { Address } from "../../types";

const AddressesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, accessToken } = useAuth();

  const isAuthenticated = !!user && !!accessToken;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [details, setDetails] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setLabel("");
    setDetails("");
    setIsDefault(false);
  }, []);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await api.get("auth/addresses/");
      const data: Address[] = res.data?.results || res.data || [];
      setAddresses(data);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    load();
  }, [isAuthenticated, load]);

  const selectForEdit = (addr: Address) => {
    setEditingId(addr.id);
    setLabel(addr.label || "");
    setDetails(addr.details || "");
    setIsDefault(!!addr.is_default);
  };

  const handleSave = async () => {
    if (!isAuthenticated) return;
    if (!label.trim() || !details.trim()) {
      Alert.alert("بيانات ناقصة", "يرجى إدخال اسم العنوان والتفاصيل.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        label: label.trim(),
        details: details.trim(),
        is_default: isDefault,
      };
      if (editingId) {
        await api.patch(`auth/addresses/${editingId}/`, payload);
      } else {
        await api.post("auth/addresses/", payload);
      }
      await load();
      resetForm();
      Alert.alert("تم", "تم حفظ العنوان بنجاح.");
    } catch (err) {
      Alert.alert("تعذر الحفظ", parseApiError(err) || "تعذر حفظ العنوان، حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isAuthenticated || !editingId) return;
    Alert.alert("حذف العنوان", "هل أنت متأكد من حذف هذا العنوان؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`auth/addresses/${editingId}/`);
            await load();
            resetForm();
          } catch (err) {
            Alert.alert("تعذر الحذف", parseApiError(err) || "تعذر حذف العنوان.");
          }
        },
      },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <DashboardShell title="العناوين" subtitle="سجّل الدخول لإدارة عناوين التوصيل.">
        <DashboardSection title="تنبيه" subtitle="هذه الصفحة متاحة للحسابات المسجلة فقط.">
          <Button title="تسجيل الدخول" onPress={() => navigation.navigate("Login")} />
        </DashboardSection>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="العناوين" subtitle="أضف وعدّل عناوينك لتسهيل طلبات التوصيل.">
      <DashboardSection
        title="العناوين المحفوظة"
        subtitle={loading ? "جاري التحميل..." : addresses.length ? "اختر عنواناً للتعديل أو أضف عنواناً جديداً." : "لا توجد عناوين بعد."}
      >
        {loading ? (
          <Text style={[styles.muted, { color: theme.palette.muted }]}>جاري التحميل...</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {addresses.map((addr) => (
              <DashboardListItem
                key={addr.id}
                title={addr.label}
                subtitle={addr.details}
                icon="location-outline"
                onPress={() => selectForEdit(addr)}
                right={addr.is_default ? <Text style={[styles.badge, { color: theme.palette.success }]}>افتراضي</Text> : null}
              />
            ))}
            <Button title="إضافة عنوان جديد" variant="secondary" onPress={resetForm} />
          </View>
        )}
      </DashboardSection>

      <DashboardSection title={editingId ? "تعديل العنوان" : "عنوان جديد"} subtitle="اكتب تفاصيل عنوانك بدقة لتسهيل التوصيل.">
        <Input label="اسم العنوان" value={label} onChangeText={setLabel} placeholder="مثل: المنزل، العمل" />
        <Input label="تفاصيل العنوان" value={details} onChangeText={setDetails} multiline numberOfLines={4} style={styles.textarea} />

        <Pressable style={styles.checkboxRow} onPress={() => setIsDefault((v) => !v)}>
          <View style={[styles.checkbox, { borderColor: theme.palette.border, backgroundColor: theme.palette.surfaceAlt }]}>
            <Ionicons name={isDefault ? "checkmark" : "remove-outline"} size={18} color={isDefault ? theme.palette.success : theme.palette.muted} />
          </View>
          <Text style={[styles.checkboxText, { color: theme.palette.text }]}>تعيين كعنوان افتراضي</Text>
        </Pressable>

        <View style={{ gap: 10 }}>
          <Button title={saving ? "جارٍ الحفظ..." : "حفظ"} onPress={handleSave} disabled={saving} />
          {editingId ? (
            <Button title="حذف" variant="ghost" color="transparent" textColor={theme.palette.danger} onPress={handleDelete} />
          ) : null}
        </View>
      </DashboardSection>
    </DashboardShell>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    muted: {
      textAlign: "right",
      fontSize: 13,
      lineHeight: 18,
    },
    badge: {
      fontSize: 12,
      fontWeight: "900",
    },
    textarea: {
      minHeight: 110,
    },
    checkboxRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 10,
      paddingVertical: 4,
    },
    checkbox: {
      width: 28,
      height: 28,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxText: {
      flex: 1,
      textAlign: "right",
      fontSize: 13,
      fontWeight: "800",
    },
  });

export default AddressesScreen;

