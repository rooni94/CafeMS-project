import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../components/Screen";
import { Card, Button } from "../components/ui";
import { useStoreSettings } from "../context/StoreSettingsContext";
import { useTheme } from "../theme";
import { copy } from "../config/copy";
import { normalizeArabicText } from "../utils/text";

const ContactScreen: React.FC = () => {
  const { settings } = useStoreSettings();
  const theme = useTheme();
  const phone = settings?.contact_phone || copy.contactFallback.phone;
  const email = settings?.contact_email || copy.contactFallback.email;
  const hours =
    normalizeArabicText(settings?.contact_hours) || copy.contactFallback.hours;
  const address =
    normalizeArabicText(settings?.contact_address) ||
    copy.contactFallback.address;
  const whatsapp =
    settings?.contact_whatsapp || copy.contactFallback.whatsapp;
  const description =
    normalizeArabicText(settings?.contact_description) ||
    "فريق خدمة الضيوف مستعد للإجابة عن استفساراتك على مدار الساعة.";

  const [name, setName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [message, setMessage] = useState("");

  const mailtoLink = useMemo(() => {
    const subject = encodeURIComponent("استفسار من تطبيق CafeMS Demo");
    const body = encodeURIComponent(
      `الاسم: ${name || "ضيف"}\nالهاتف: ${contactPhone || "-"}\n\n${message}`
    );
    return `mailto:${email}?subject=${subject}&body=${body}`;
  }, [name, contactPhone, message, email]);

  const infoItems = [
    {
      label: "الهاتف",
      value: phone,
      icon: "call-outline" as const,
      action: () => Linking.openURL(`tel:${phone}`).catch(() => null),
    },
    {
      label: "البريد الإلكتروني",
      value: email,
      icon: "mail-outline" as const,
      action: () => Linking.openURL(`mailto:${email}`).catch(() => null),
    },
    {
      label: "واتساب",
      value: whatsapp,
      icon: "logo-whatsapp" as const,
      action: () => Linking.openURL(`https://wa.me/${whatsapp}`).catch(() => null),
    },
  ];

  const handleSend = () => {
    if (!message.trim()) {
      Alert.alert("تنبيه", "الرجاء كتابة رسالتك قبل الإرسال.");
      return;
    }
    Linking.openURL(mailtoLink).catch(() =>
      Alert.alert("تنبيه", "تعذر فتح تطبيق البريد. جرّب التواصل عبر الهاتف أو واتساب.")
    );
  };

  return (
    <Screen style={{ backgroundColor: theme.palette.background }}>
      <Card style={styles.heroCard}>
        <Text style={styles.heroTitle}>يسعدنا التواصل معك</Text>
        <Text style={styles.heroDescription}>{description}</Text>
        <Button
          title="إرسال رسالة"
          variant="primary"
          onPress={handleSend}
        />
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>بيانات التواصل</Text>
        {infoItems.map((item) => (
          <Pressable
            key={item.label}
            onPress={item.action}
            style={styles.infoRow}
          >
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
            <View style={styles.infoIcon}>
              <Ionicons name={item.icon} size={18} color="#fff" />
            </View>
          </Pressable>
        ))}
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>العنوان وساعات العمل</Text>
        <Text style={styles.location}>{address}</Text>
        <Text style={styles.hours}>{hours}</Text>
        <Button
          title="فتح في الخرائط"
          variant="ghost"
          onPress={() =>
            Linking.openURL(
              `https://maps.google.com/?q=${encodeURIComponent(address)}`
            ).catch(() => null)
          }
        />
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>نموذج تواصل</Text>
        <View style={styles.form}>
          <TextInput
            placeholder="اسمك"
            placeholderTextColor="#94a3b8"
            value={name}
            onChangeText={setName}
            style={styles.input}
            textAlign="right"
          />
          <TextInput
            placeholder="رقم الهاتف"
            placeholderTextColor="#94a3b8"
            value={contactPhone}
            keyboardType="phone-pad"
            onChangeText={setContactPhone}
            style={styles.input}
            textAlign="right"
          />
          <TextInput
            placeholder="رسالتك"
            placeholderTextColor="#94a3b8"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            style={[styles.input, styles.textarea]}
            textAlign="right"
          />
          <Button title="إرسال" onPress={handleSend} />
        </View>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    gap: 10,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "right",
    color: "#111827",
  },
  heroDescription: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "right",
    lineHeight: 20,
  },
  sectionCard: {
    gap: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    textAlign: "right",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  infoText: {
    flex: 1,
    alignItems: "flex-end",
  },
  infoLabel: {
    fontSize: 12,
    color: "#94a3b8",
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  location: {
    fontSize: 15,
    color: "#111827",
    textAlign: "right",
  },
  hours: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "right",
  },
  form: {
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#fff",
  },
  textarea: {
    height: 110,
    textAlignVertical: "top",
  },
});

export default ContactScreen;
