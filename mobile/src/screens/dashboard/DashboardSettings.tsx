import React, { useState, useEffect } from "react";
import { Text, StyleSheet, TextInput, Alert, View } from "react-native";
import { Card, Button } from "../../components/ui";
import { useTheme } from "../../theme";
import { api } from "../../services/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardShell from "./components/DashboardShell";

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
  const qc = useQueryClient();
  const { data: settings } = useQuery<StoreSettings>({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const res = await api.get("store/settings/");
      return res.data;
    },
  });

  const [storeName, setStoreName] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactHours, setContactHours] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");

  useEffect(() => {
    if (settings) {
      setStoreName(settings.store_name || "");
      setContactAddress(settings.contact_address || "");
      setContactPhone(settings.contact_phone || "");
      setContactEmail(settings.contact_email || "");
      setContactHours(settings.contact_hours || "");
      setHeroTitle(settings.hero_title || "");
      setHeroSubtitle(settings.hero_subtitle || "");
    }
  }, [settings]);

  const saveSettings = async () => {
    try {
      await api.patch("store/settings/", {
        store_name: storeName,
        contact_address: contactAddress,
        contact_phone: contactPhone,
        contact_email: contactEmail,
        contact_hours: contactHours,
        hero_title: heroTitle,
        hero_subtitle: heroSubtitle,
      });
      qc.invalidateQueries({ queryKey: ["store-settings"] });
      Alert.alert("تم", "تم حفظ إعدادات المتجر.");
    } catch {
      Alert.alert("خطأ", "تعذر حفظ إعدادات المتجر.");
    }
  };

  return (
    <DashboardShell title="إعدادات المتجر" subtitle="تحديث بيانات المتجر التي تظهر للعميل على الواجهة.">
        <Card>
          <Text style={styles.title}>إعدادات المتجر</Text>
          <Text style={styles.helper}>تعديل بيانات المتجر والتواصل والنصوص الظاهرة في الواجهة.</Text>
        </Card>

        <Card style={{ gap: 8 }}>
          <Text style={styles.sectionTitle}>بيانات المتجر</Text>
          <TextInput placeholder="اسم المتجر" value={storeName} onChangeText={setStoreName} style={styles.input} textAlign="right" />
          <TextInput placeholder="العنوان" value={contactAddress} onChangeText={setContactAddress} style={styles.input} textAlign="right" />
          <TextInput placeholder="الهاتف" value={contactPhone} onChangeText={setContactPhone} style={styles.input} textAlign="right" />
          <TextInput placeholder="البريد الإلكتروني" value={contactEmail} onChangeText={setContactEmail} style={styles.input} textAlign="right" />
          <TextInput placeholder="ساعات العمل" value={contactHours} onChangeText={setContactHours} style={styles.input} textAlign="right" />
          <TextInput placeholder="عنوان الهيرو" value={heroTitle} onChangeText={setHeroTitle} style={styles.input} textAlign="right" />
          <TextInput placeholder="وصف الهيرو" value={heroSubtitle} onChangeText={setHeroSubtitle} style={styles.input} textAlign="right" />
          <Button title="حفظ الإعدادات" onPress={saveSettings} />
        </Card>

        {settings && (
          <Card style={{ gap: 6 }}>
            <Text style={styles.sectionTitle}>معاينة سريعة</Text>
            <View style={{ gap: 4 }}>
              <Text style={styles.helper}>اسم المتجر: {settings.store_name || "-"}</Text>
              <Text style={styles.helper}>العنوان: {settings.contact_address || "-"}</Text>
              <Text style={styles.helper}>الهاتف: {settings.contact_phone || "-"}</Text>
              <Text style={styles.helper}>البريد: {settings.contact_email || "-"}</Text>
              <Text style={styles.helper}>ساعات العمل: {settings.contact_hours || "-"}</Text>
              <Text style={styles.helper}>عنوان الهيرو: {settings.hero_title || "-"}</Text>
              <Text style={styles.helper}>وصف الهيرو: {settings.hero_subtitle || "-"}</Text>
            </View>
          </Card>
        )}
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
});

export default DashboardSettings;
