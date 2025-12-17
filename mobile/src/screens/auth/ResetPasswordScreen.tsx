import React, { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import Screen from "../../components/Screen";
import { Button, Input, Card } from "../../components/ui";
import { useTheme } from "../../theme";
import { api } from "../../services/api";
import { useNavigation } from "@react-navigation/native";

const ResetPasswordScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim()) {
      Alert.alert("تنبيه", "يرجى إدخال البريد الإلكتروني المرتبط بالحساب.");
      return;
    }
    setLoading(true);
    try {
      await api.post("auth/password-reset/", { email: email.trim() });
      setSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "تعذر إرسال رابط إعادة التعيين، حاول لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable={false} style={{ backgroundColor: theme.palette.background }}>
      <View style={styles.header}>
        <Text style={styles.title}>استعادة كلمة المرور</Text>
        <Text style={styles.subtitle}>أدخل بريدك الإلكتروني وسنرسل رابط إعادة تعيين كلمة المرور.</Text>
      </View>
      <Card>
        <Input label="البريد الإلكتروني" placeholder="example@mail.com" value={email} onChangeText={setEmail} keyboardType="email-address" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {sent ? <Text style={styles.success}>تم إرسال الرابط، تفقد بريدك الإلكتروني.</Text> : null}
        <Button title={loading ? "جاري الإرسال..." : "إرسال رابط إعادة التعيين"} onPress={handleSubmit} disabled={loading} />
      </Card>
      <View style={styles.footer}>
        <Text style={styles.footerText}>تذكرت كلمة المرور؟</Text>
        <Text style={[styles.footerAction, { color: theme.palette.accent }]} onPress={() => navigation.navigate("Login")}>
          العودة لتسجيل الدخول
        </Text>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: "flex-end",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1F1A12",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "right",
    marginTop: 4,
  },
  error: {
    color: "#dc2626",
    textAlign: "right",
    marginBottom: 6,
  },
  success: {
    color: "#16a34a",
    textAlign: "right",
    marginBottom: 6,
  },
  footer: {
    marginTop: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  footerText: {
    color: "#6b7280",
    fontSize: 13,
  },
  footerAction: {
    fontSize: 13,
    fontWeight: "700",
  },
});

export default ResetPasswordScreen;
