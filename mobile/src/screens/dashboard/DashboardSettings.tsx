import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useTheme } from "../../theme";
import DashboardShell from "./components/DashboardShell";
import DashboardAccessDenied from "./components/DashboardAccessDenied";
import DashboardSection from "./components/DashboardSection";
import { has } from "./components/permissions";

type StoreSettings = {
  store_name?: string;
  contact_address?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_hours?: string;
  hero_title?: string;
  hero_subtitle?: string;
};

const DashboardSettings: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const qc = useQueryClient();
  const { user, permissions } = useAuth();

  const allowed = has(user, permissions, "can_manage_store_settings");

  const { data: settings, isLoading } = useQuery<StoreSettings>({
    queryKey: ["dashboard", "store-settings"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("store/settings/");
      return res.data;
    },
  });

  const [form, setForm] = useState<StoreSettings>({
    store_name: "",
    contact_address: "",
    contact_phone: "",
    contact_email: "",
    contact_hours: "",
    hero_title: "",
    hero_subtitle: "",
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      store_name: settings.store_name || "",
      contact_address: settings.contact_address || "",
      contact_phone: settings.contact_phone || "",
      contact_email: settings.contact_email || "",
      contact_hours: settings.contact_hours || "",
      hero_title: settings.hero_title || "",
      hero_subtitle: settings.hero_subtitle || "",
    });
  }, [settings]);

  if (!allowed) {
    return <DashboardAccessDenied title="إعدادات المتجر" subtitle="تحديث بيانات المتجر ومحتوى الواجهة." />;
  }

  const save = async () => {
    try {
      await api.patch("store/settings/", {
        store_name: form.store_name,
        contact_address: form.contact_address,
        contact_phone: form.contact_phone,
        contact_email: form.contact_email,
        contact_hours: form.contact_hours,
        hero_title: form.hero_title,
        hero_subtitle: form.hero_subtitle,
      });
      qc.invalidateQueries({ queryKey: ["dashboard", "store-settings"] });
      Alert.alert("تم الحفظ", "تم تحديث إعدادات المتجر بنجاح.");
    } catch {
      Alert.alert("تعذر الحفظ", "حدث خطأ أثناء حفظ الإعدادات.");
    }
  };

  return (
    <DashboardShell title="إعدادات المتجر" subtitle="تحديث بيانات المتجر ومحتوى الواجهة.">
      <DashboardSection title="البيانات الأساسية" subtitle={isLoading ? "جاري التحميل..." : "قم بتحديث البيانات ثم احفظ."}>
        <Input label="اسم المتجر" value={form.store_name || ""} onChangeText={(v) => setForm((p) => ({ ...p, store_name: v }))} />
        <Input label="العنوان" value={form.contact_address || ""} onChangeText={(v) => setForm((p) => ({ ...p, contact_address: v }))} />
        <Input
          label="رقم التواصل"
          value={form.contact_phone || ""}
          keyboardType="phone-pad"
          onChangeText={(v) => setForm((p) => ({ ...p, contact_phone: v }))}
        />
        <Input
          label="البريد الإلكتروني"
          value={form.contact_email || ""}
          keyboardType="email-address"
          onChangeText={(v) => setForm((p) => ({ ...p, contact_email: v }))}
        />
        <Input label="ساعات العمل" value={form.contact_hours || ""} onChangeText={(v) => setForm((p) => ({ ...p, contact_hours: v }))} />
      </DashboardSection>

      <DashboardSection title="الواجهة الرئيسية" subtitle="نص العنوان والوصف في واجهة المستخدم.">
        <Input label="عنوان البطل" value={form.hero_title || ""} onChangeText={(v) => setForm((p) => ({ ...p, hero_title: v }))} />
        <Input
          label="وصف البطل"
          value={form.hero_subtitle || ""}
          onChangeText={(v) => setForm((p) => ({ ...p, hero_subtitle: v }))}
          multiline
          numberOfLines={3}
        />
        <Button title="حفظ الإعدادات" onPress={save} />
      </DashboardSection>

      {settings ? (
        <DashboardSection title="القيم الحالية" subtitle="للتأكد من البيانات الموجودة حالياً.">
          <View style={styles.kv}>
            <Text style={[styles.k, { color: theme.palette.muted }]}>اسم المتجر</Text>
            <Text style={[styles.v, { color: theme.palette.text }]}>{settings.store_name || "-"}</Text>
          </View>
          <View style={styles.kv}>
            <Text style={[styles.k, { color: theme.palette.muted }]}>العنوان</Text>
            <Text style={[styles.v, { color: theme.palette.text }]}>{settings.contact_address || "-"}</Text>
          </View>
          <View style={styles.kv}>
            <Text style={[styles.k, { color: theme.palette.muted }]}>رقم التواصل</Text>
            <Text style={[styles.v, { color: theme.palette.text }]}>{settings.contact_phone || "-"}</Text>
          </View>
          <View style={styles.kv}>
            <Text style={[styles.k, { color: theme.palette.muted }]}>البريد الإلكتروني</Text>
            <Text style={[styles.v, { color: theme.palette.text }]}>{settings.contact_email || "-"}</Text>
          </View>
        </DashboardSection>
      ) : null}
    </DashboardShell>
  );
};

const createStyles = (_theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    kv: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
    },
    k: {
      fontSize: 12,
      fontWeight: "700",
    },
    v: {
      flex: 1,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "left",
    },
  });

export default DashboardSettings;
