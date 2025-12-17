import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Alert, Pressable } from "react-native";
import Screen from "../../components/Screen";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { Button, Input, Card } from "../../components/ui";
import { useTheme } from "../../theme";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { copy } from "../../config/copy";
import Ionicons from "@expo/vector-icons/Ionicons";

const passwordChecks = [
  { key: "len", label: "٨ أحرف أو أكثر", test: (pw: string) => pw.length >= 8 },
  { key: "lower", label: "حرف إنجليزي صغير واحد على الأقل (a-z)", test: (pw: string) => /[a-z]/.test(pw) },
  { key: "upper", label: "حرف إنجليزي كبير واحد على الأقل (A-Z)", test: (pw: string) => /[A-Z]/.test(pw) },
  { key: "digit", label: "رقم واحد على الأقل (0-9)", test: (pw: string) => /\d/.test(pw) },
  { key: "special", label: "رمز خاص واحد على الأقل (!@#..)", test: (pw: string) => /[^\w\s]/.test(pw) },
];

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { settings } = useStoreSettings();
  const { register, loading } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const checks = useMemo(
    () => passwordChecks.map((c) => ({ ...c, ok: c.test(password) })),
    [password]
  );

  const allChecksPassed = checks.every((c) => c.ok);

  const handleSubmit = async () => {
    setError(null);
    if (!username || !password || !confirmPassword) {
      Alert.alert("تنبيه", copy.messages.required || "يرجى تعبئة الحقول المطلوبة");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("تنبيه", copy.messages.passwordMismatch || "كلمتا المرور غير متطابقتين");
      return;
    }
    if (!allChecksPassed) {
      Alert.alert("تنبيه", "يجب استيفاء جميع شروط كلمة المرور قبل المتابعة");
      return;
    }
    if (!acceptedTerms) {
      Alert.alert("تنبيه", "يجب الموافقة على الشروط والأحكام والخصوصية");
      return;
    }
    try {
      await register({ username: username.trim(), email: email.trim(), phone: phone.trim(), password });
      Alert.alert("تم", "تم إنشاء الحساب بنجاح. يمكنك تسجيل الدخول الآن.");
      navigation.goBack();
    } catch (err: any) {
      setError(err?.message || "تعذر إنشاء الحساب");
    }
  };

  return (
    <Screen scrollable={false} style={{ backgroundColor: theme.palette.background }}>
      <View style={styles.header}>
        <Text style={styles.brand}>{settings?.store_name || copy.brandFallback}</Text>
        <Text style={styles.subtitle}>استخدم حسابك لحفظ طلباتك وعناوينك وإستعادة الطلبات عبر البريد الإلكتروني.</Text>
      </View>

      <View style={styles.segmentWrapper}>
        <View style={[styles.segmentButton, styles.segmentGhost, { borderColor: theme.palette.accent }]}>
          <Text style={[styles.segmentGhostText, { color: theme.palette.accentSoft }]} onPress={() => navigation.navigate("Login")}>
            تسجيل الدخول
          </Text>
        </View>
        <View style={[styles.segmentButton, styles.segmentActive, { backgroundColor: theme.palette.accent }]}>
          <Text style={styles.segmentActiveText}>إنشاء حساب جديد</Text>
        </View>
      </View>

      <Card>
        <Input label="اسم المستخدم" placeholder="أدخل اسم المستخدم" value={username} onChangeText={setUsername} />
        <Input label="البريد الإلكتروني" placeholder="example@mail.com" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Input label="رقم الجوال (اختياري)" placeholder="05xxxxxxxx" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Input label="كلمة المرور" placeholder="أدخل كلمة المرور" secureTextEntry value={password} onChangeText={setPassword} />
        <Input label="تأكيد كلمة المرور" placeholder="أعد إدخال كلمة المرور" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />

        <View style={styles.checklist}>
          {checks.map((c) => (
            <View key={c.key} style={styles.checkRow}>
              <Ionicons name={c.ok ? "checkmark-circle" : "ellipse-outline"} size={18} color={c.ok ? "#16a34a" : "#d1d5db"} />
              <Text style={[styles.checkText, c.ok && { color: "#16a34a" }]}>{c.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.termsRow}>
          <Pressable style={styles.checkbox} onPress={() => setAcceptedTerms(!acceptedTerms)}>
            <Ionicons name={acceptedTerms ? "checkmark" : "remove-outline"} size={18} color={acceptedTerms ? "#10b981" : "#cbd5e1"} />
          </Pressable>
          <Text style={styles.termsText}>أوافق على الشروط والأحكام وسياسة الخصوصية</Text>
        </View>

        <Button title={loading ? copy.messages.loading : "إنشاء الحساب"} onPress={handleSubmit} />
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: "flex-end",
    marginBottom: 16,
  },
  brand: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1F1A12",
  },
  subtitle: {
    fontSize: 15,
    color: "#7C6A58",
    textAlign: "right",
    marginTop: 4,
  },
  segmentWrapper: {
    flexDirection: "row-reverse",
    gap: 10,
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: "#f59e0b",
  },
  segmentActiveText: {
    color: "#fff",
    fontWeight: "700",
  },
  segmentGhost: {
    flex: 1,
    borderWidth: 1.2,
    borderColor: "#e0cbb4",
    backgroundColor: "#fff",
  },
  segmentGhostText: {
    fontWeight: "700",
  },
  checklist: {
    marginTop: 10,
    marginBottom: 8,
    gap: 6,
  },
  checkRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  checkText: {
    fontSize: 13,
    color: "#475569",
    textAlign: "right",
    flex: 1,
  },
  termsRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  termsText: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    color: "#111827",
    fontWeight: "600",
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    textAlign: "center",
    color: "#C24141",
    marginTop: 8,
  },
});

export default RegisterScreen;
