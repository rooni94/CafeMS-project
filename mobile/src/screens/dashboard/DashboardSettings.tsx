import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { api } from "../../services/api";
import { useTheme } from "../../theme";
import DashboardShell from "./components/DashboardShell";
import DashboardAccessDenied from "./components/DashboardAccessDenied";
import DashboardSection from "./components/DashboardSection";
import { has } from "./components/permissions";
import { useI18n } from "../../i18n";

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
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);
  const qc = useQueryClient();
  const { user, permissions } = useAuth();
  const { refresh: refreshPublicSettings } = useStoreSettings();

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
    return (
      <DashboardAccessDenied
        title={t("dashboard.settingsTitle", "إعدادات المتجر")}
        subtitle={t("dashboard.settingsSubtitle", "تحديث بيانات المتجر ومحتوى الواجهة.")}
      />
    );
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
      await refreshPublicSettings();
      Alert.alert(t("dashboard.settingsSaveTitle", "تم الحفظ"), t("dashboard.settingsSaveBody", "تم تحديث إعدادات المتجر بنجاح."));
    } catch {
      Alert.alert(t("dashboard.settingsSaveErrorTitle", "تعذر الحفظ"), t("dashboard.settingsSaveErrorBody", "حدث خطأ أثناء حفظ الإعدادات."));
    }
  };

  return (
    <DashboardShell title={t("dashboard.settingsTitle", "إعدادات المتجر")} subtitle={t("dashboard.settingsSubtitle", "تحديث بيانات المتجر ومحتوى الواجهة.")}>
      <DashboardSection
        title={t("dashboard.settingsBasicsTitle", "البيانات الأساسية")}
        subtitle={
          isLoading
            ? t("dashboard.settingsLoading", "جاري التحميل...")
            : t("dashboard.settingsBasicsSubtitle", "قم بتحديث البيانات ثم احفظ.")
        }
      >
        <Input
          label={t("dashboard.settingsStoreNameLabel", "اسم المتجر")}
          value={form.store_name || ""}
          onChangeText={(v) => setForm((p) => ({ ...p, store_name: v }))}
        />
        <Input
          label={t("dashboard.settingsAddressLabel", "العنوان")}
          value={form.contact_address || ""}
          onChangeText={(v) => setForm((p) => ({ ...p, contact_address: v }))}
        />
        <Input
          label={t("dashboard.settingsPhoneLabel", "رقم التواصل")}
          value={form.contact_phone || ""}
          keyboardType="phone-pad"
          onChangeText={(v) => setForm((p) => ({ ...p, contact_phone: v }))}
        />
        <Input
          label={t("dashboard.settingsEmailLabel", "البريد الإلكتروني")}
          value={form.contact_email || ""}
          keyboardType="email-address"
          onChangeText={(v) => setForm((p) => ({ ...p, contact_email: v }))}
        />
        <Input
          label={t("dashboard.settingsHoursLabel", "ساعات العمل")}
          value={form.contact_hours || ""}
          onChangeText={(v) => setForm((p) => ({ ...p, contact_hours: v }))}
        />
      </DashboardSection>

      <DashboardSection title={t("dashboard.settingsHeroTitle", "الواجهة الرئيسية")} subtitle={t("dashboard.settingsHeroSubtitle", "نص العنوان والوصف في واجهة المستخدم.")}>
        <Input
          label={t("dashboard.settingsHeroHeadlineLabel", "عنوان البطل")}
          value={form.hero_title || ""}
          onChangeText={(v) => setForm((p) => ({ ...p, hero_title: v }))}
        />
        <Input
          label={t("dashboard.settingsHeroDescriptionLabel", "وصف البطل")}
          value={form.hero_subtitle || ""}
          onChangeText={(v) => setForm((p) => ({ ...p, hero_subtitle: v }))}
          multiline
          numberOfLines={3}
        />
        <Button title={t("dashboard.settingsSaveButton", "حفظ الإعدادات")} onPress={save} />
      </DashboardSection>

      {settings ? (
        <DashboardSection title={t("dashboard.settingsCurrentTitle", "القيم الحالية")} subtitle={t("dashboard.settingsCurrentSubtitle", "للتأكد من البيانات الموجودة حالياً.")}>
          <View style={styles.kv}>
            <Text style={[styles.k, { color: theme.palette.muted }]}>{t("dashboard.settingsStoreNameLabel", "اسم المتجر")}</Text>
            <Text style={[styles.v, { color: theme.palette.text }]}>{settings.store_name || "-"}</Text>
          </View>
          <View style={styles.kv}>
            <Text style={[styles.k, { color: theme.palette.muted }]}>{t("dashboard.settingsAddressLabel", "العنوان")}</Text>
            <Text style={[styles.v, { color: theme.palette.text }]}>{settings.contact_address || "-"}</Text>
          </View>
          <View style={styles.kv}>
            <Text style={[styles.k, { color: theme.palette.muted }]}>{t("dashboard.settingsPhoneLabel", "رقم التواصل")}</Text>
            <Text style={[styles.v, { color: theme.palette.text }]}>{settings.contact_phone || "-"}</Text>
          </View>
          <View style={styles.kv}>
            <Text style={[styles.k, { color: theme.palette.muted }]}>{t("dashboard.settingsEmailLabel", "البريد الإلكتروني")}</Text>
            <Text style={[styles.v, { color: theme.palette.text }]}>{settings.contact_email || "-"}</Text>
          </View>
        </DashboardSection>
      ) : null}
    </DashboardShell>
  );
};

const createStyles = (_theme: ReturnType<typeof useTheme>, isRTL: boolean) =>
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
      textAlign: isRTL ? "right" : "left",
    },
  });

export default DashboardSettings;
