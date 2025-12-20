import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import Screen from "../../components/Screen";
import { Button, Card, Input } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { safeGoBack } from "../../navigation/helpers";
import { useTheme } from "../../theme";
import { copy } from "../../config/copy";

type Check = { key: string; label: string; ok: boolean };

const buildPasswordChecks = (password: string): Check[] => {
  const pw = password || "";
  return [
    { key: "len", label: "٨ أحرف على الأقل", ok: pw.length >= 8 },
    { key: "lower", label: "حرف صغير (a-z)", ok: /[a-z]/.test(pw) },
    { key: "upper", label: "حرف كبير (A-Z)", ok: /[A-Z]/.test(pw) },
    { key: "digit", label: "رقم (0-9)", ok: /\d/.test(pw) },
    { key: "special", label: "رمز خاص (!@#..)", ok: /[^\w\s]/.test(pw) },
  ];
};

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { settings } = useStoreSettings();
  const { register, loading } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checks = useMemo(() => buildPasswordChecks(password), [password]);
  const allChecksPassed = checks.every((c) => c.ok);

  const handleSubmit = async () => {
    setError(null);
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert("تنبيه", copy.messages.required);
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("تنبيه", copy.messages.passwordMismatch);
      return;
    }
    if (!allChecksPassed) {
      Alert.alert("تنبيه", "يرجى التأكد من أن كلمة المرور تطابق المتطلبات.");
      return;
    }
    if (!acceptedTerms) {
      Alert.alert("تنبيه", "يرجى الموافقة على الشروط والأحكام وسياسة الخصوصية للمتابعة.");
      return;
    }

    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
      });
      Alert.alert("تم", "تم إنشاء الحساب بنجاح.");
      safeGoBack(navigation, { tab: "Profile" });
    } catch (err: any) {
      setError(err?.message || "تعذر إنشاء الحساب. حاول مرة أخرى.");
    }
  };

  return (
    <Screen scrollable={false} style={{ backgroundColor: theme.palette.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Card style={styles.headerCard} contentStyle={styles.headerContent}>
            <View style={styles.brandRow}>
              <Text style={[styles.brand, { color: theme.palette.text }]} numberOfLines={1}>
                {settings?.store_name || copy.brandFallback}
              </Text>
              <Text style={[styles.badge, { backgroundColor: theme.palette.accentSoft, color: theme.palette.accent }]}>
                إنشاء حساب
              </Text>
            </View>
            <Text style={[styles.subtitle, { color: theme.palette.muted }]}>
              أنشئ حساباً جديداً للوصول إلى الطلبات والعناوين ونقاط الولاء.
            </Text>
          </Card>

          <Card style={styles.card} contentStyle={{ gap: 12 }}>
            <Input label="اسم المستخدم" placeholder="اكتب اسم المستخدم" value={username} onChangeText={setUsername} />
            <Input
              label="البريد الإلكتروني"
              placeholder="example@mail.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="رقم الجوال (اختياري)"
              placeholder="05xxxxxxxx"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <Input label="كلمة المرور" placeholder="اكتب كلمة المرور" secureTextEntry value={password} onChangeText={setPassword} />
            <Input
              label="تأكيد كلمة المرور"
              placeholder="أعد كتابة كلمة المرور"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View style={styles.checklist}>
              {checks.map((c) => (
                <View key={c.key} style={styles.checkRow}>
                  <Ionicons
                    name={c.ok ? "checkmark-circle" : "ellipse-outline"}
                    size={18}
                    color={c.ok ? theme.palette.success : theme.palette.border}
                  />
                  <Text style={[styles.checkText, { color: c.ok ? theme.palette.success : theme.palette.muted }]}>
                    {c.label}
                  </Text>
                </View>
              ))}
            </View>

            <Pressable style={styles.termsRow} onPress={() => setAcceptedTerms((v) => !v)}>
              <View
                style={[
                  styles.checkbox,
                  { borderColor: theme.palette.border, backgroundColor: theme.palette.surfaceAlt },
                ]}
              >
                <Ionicons
                  name={acceptedTerms ? "checkmark" : "remove-outline"}
                  size={18}
                  color={acceptedTerms ? theme.palette.success : theme.palette.muted}
                />
              </View>
              <Text style={[styles.termsText, { color: theme.palette.text }]}>أوافق على الشروط والأحكام</Text>
            </Pressable>

            <Button title={loading ? copy.messages.loading : "إنشاء حساب"} onPress={handleSubmit} disabled={loading} />

            <View style={styles.bottomRow}>
              <Text style={[styles.muted, { color: theme.palette.muted }]}>لديك حساب؟</Text>
              <Button title="تسجيل الدخول" variant="link" size="sm" onPress={() => navigation.navigate("Login")} />
            </View>

            {error ? <Text style={[styles.error, { color: theme.palette.danger }]}>{error}</Text> : null}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 24,
      gap: 12,
    },
    headerCard: {
      borderRadius: 22,
      borderColor: theme.palette.border,
      backgroundColor: theme.palette.surface,
    },
    headerContent: {
      gap: 8,
      alignItems: "flex-end",
    },
    brandRow: {
      width: "100%",
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    brand: {
      fontSize: 18,
      fontWeight: "900",
      textAlign: "right",
      flex: 1,
      writingDirection: "rtl",
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      fontSize: 12,
      fontWeight: "900",
      overflow: "hidden",
      writingDirection: "rtl",
    },
    subtitle: {
      fontSize: 13,
      lineHeight: 18,
      textAlign: "right",
      writingDirection: "rtl",
    },
    card: {
      borderRadius: 22,
      borderColor: theme.palette.border,
      backgroundColor: theme.palette.surface,
    },
    checklist: {
      gap: 6,
      paddingTop: 4,
      paddingBottom: 2,
    },
    checkRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 8,
    },
    checkText: {
      fontSize: 13,
      fontWeight: "800",
      textAlign: "right",
      flex: 1,
      writingDirection: "rtl",
    },
    termsRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
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
    termsText: {
      flex: 1,
      textAlign: "right",
      fontSize: 13,
      fontWeight: "900",
      writingDirection: "rtl",
    },
    bottomRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
    },
    muted: {
      fontSize: 13,
      fontWeight: "800",
      writingDirection: "rtl",
    },
    error: {
      textAlign: "right",
      fontSize: 13,
      fontWeight: "800",
      writingDirection: "rtl",
    },
  });

export default RegisterScreen;
