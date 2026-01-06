import React, { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, I18nManager } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import Screen from "../../components/Screen";
import { Button, Card, Input } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { safeGoBack } from "../../navigation/helpers";
import { useTheme } from "../../theme";
import { normalizeBrandName } from "../../utils/text";
import { useI18n } from "../../i18n";

type Check = { key: string; label: string; ok: boolean };

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { settings } = useStoreSettings();
  const { register, startPhoneRegistration, verifyPhoneOtp, loading } = useAuth();
  const { copy, t } = useI18n();
  const brandName = normalizeBrandName(settings?.store_name, copy.brandFallback);

  const [method, setMethod] = useState<"email" | "phone">("email");
  const [stage, setStage] = useState<"form" | "otp">("form");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [resendLeft, setResendLeft] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checks = useMemo<Check[]>(() => {
    const pw = password || "";
    return [
      { key: "len", label: t("auth.passwordCheckLength", "٨ أحرف على الأقل"), ok: pw.length >= 8 },
      { key: "lower", label: t("auth.passwordCheckLower", "حرف صغير (a-z)"), ok: /[a-z]/.test(pw) },
      { key: "upper", label: t("auth.passwordCheckUpper", "حرف كبير (A-Z)"), ok: /[A-Z]/.test(pw) },
      { key: "digit", label: t("auth.passwordCheckDigit", "رقم (0-9)"), ok: /\d/.test(pw) },
      { key: "special", label: t("auth.passwordCheckSpecial", "رمز خاص (!@#..)"), ok: /[^\w\s]/.test(pw) },
    ];
  }, [password, t]);
  const allChecksPassed = checks.every((c) => c.ok);

  useEffect(() => {
    if (method !== "phone" || stage !== "otp" || resendLeft <= 0) return;
    const id = setInterval(() => setResendLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [method, stage, resendLeft]);

  const handleSubmit = async () => {
    setError(null);
    if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert(t("auth.alertTitle", "تنبيه"), copy.messages.required);
      return;
    }
    if (method === "email" && !email.trim()) {
      Alert.alert(t("auth.alertTitle", "تنبيه"), copy.messages.required);
      return;
    }
    if (method === "phone" && !phone.trim()) {
      Alert.alert(t("auth.alertTitle", "تنبيه"), copy.messages.required);
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t("auth.alertTitle", "تنبيه"), copy.messages.passwordMismatch);
      return;
    }
    if (!allChecksPassed) {
      Alert.alert(
        t("auth.alertTitle", "تنبيه"),
        t("auth.passwordRequirements", "يرجى التأكد من أن كلمة المرور تطابق المتطلبات.")
      );
      return;
    }
    if (!acceptedTerms) {
      Alert.alert(
        t("auth.alertTitle", "تنبيه"),
        t("auth.acceptTerms", "يرجى الموافقة على الشروط والأحكام وسياسة الخصوصية للمتابعة.")
      );
      return;
    }

    try {
      if (method === "email") {
        await register({
          username: username.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password,
        });
        Alert.alert(
          t("auth.doneTitle", "تم"),
          t("auth.registerEmailSuccess", "تم إنشاء الحساب. يرجى تفعيل الحساب عبر البريد الإلكتروني ثم تسجيل الدخول.")
        );
        navigation.navigate("Login");
        return;
      }

      const res = await startPhoneRegistration({
        username: username.trim(),
        phone: phone.trim(),
        password,
      });
      setOtp("");
      setOtpPhone(res?.phone || phone.trim());
      setResendLeft(Number(res?.resend_seconds || 60));
      setStage("otp");
      Alert.alert(
        t("auth.doneTitle", "تم"),
        res?.detail || t("auth.otpSentPhone", "تم إرسال رمز التحقق إلى رقم الهاتف.")
      );
    } catch (err: any) {
      setError(err?.message || t("auth.registerError", "تعذر إنشاء الحساب. حاول مرة أخرى."));
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    if (!otp.trim()) {
      Alert.alert(t("auth.alertTitle", "تنبيه"), t("auth.otpRequired", "أدخل رمز التحقق."));
      return;
    }
    try {
      await verifyPhoneOtp(otpPhone || phone.trim(), otp.trim());
      Alert.alert(t("auth.doneTitle", "تم"), t("auth.otpVerified", "تم تفعيل الحساب بنجاح."));
      safeGoBack(navigation, { tab: "Profile" });
    } catch (err: any) {
      setError(err?.message || copy.messages.genericError);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    try {
      const res = await startPhoneRegistration({
        username: username.trim(),
        phone: otpPhone || phone.trim(),
        password,
      });
      setResendLeft(Number(res?.resend_seconds || 60));
      Alert.alert(
        t("auth.doneTitle", "تم"),
        res?.detail || t("auth.otpResent", "تم إرسال رمز التحقق.")
      );
    } catch (err: any) {
      setError(err?.message || copy.messages.genericError);
    }
  };

  return (
    <Screen scrollable={false} style={{ backgroundColor: theme.palette.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Card style={styles.headerCard} contentStyle={styles.headerContent}>
            <View style={styles.brandRow}>
              <Text style={[styles.brand, { color: theme.palette.text }]} numberOfLines={1}>
                {brandName}
              </Text>
              <Text style={[styles.badge, { backgroundColor: theme.palette.accentSoft, color: theme.palette.accent }]}>
                {t("auth.createAccount", "إنشاء حساب")}
              </Text>
            </View>
            <Text style={[styles.subtitle, { color: theme.palette.muted }]}>
              {t("auth.registerSubtitle", "أنشئ حساباً جديداً للوصول إلى الطلبات والعناوين ونقاط الولاء.")}
            </Text>
          </Card>

          <Card style={styles.card} contentStyle={{ gap: 12 }}>
            <View style={styles.methodRow}>
              <Pressable
                onPress={() => {
                  setMethod("email");
                  setStage("form");
                  setError(null);
                }}
                style={[
                  styles.methodButton,
                  method === "email"
                    ? { backgroundColor: theme.palette.accent, borderColor: theme.palette.accent }
                    : { backgroundColor: theme.palette.surfaceAlt, borderColor: theme.palette.border },
                ]}
              >
                <Text style={[styles.methodText, { color: method === "email" ? theme.paper.colors.onPrimary : theme.palette.muted }]}>
                  {t("auth.registerByEmail", "بالبريد الإلكتروني")}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setMethod("phone");
                  setStage("form");
                  setError(null);
                }}
                style={[
                  styles.methodButton,
                  method === "phone"
                    ? { backgroundColor: theme.palette.accent, borderColor: theme.palette.accent }
                    : { backgroundColor: theme.palette.surfaceAlt, borderColor: theme.palette.border },
                ]}
              >
                <Text style={[styles.methodText, { color: method === "phone" ? theme.paper.colors.onPrimary : theme.palette.muted }]}>
                  {t("auth.registerByPhone", "برقم الهاتف")}
                </Text>
              </Pressable>
            </View>

            {method === "phone" && stage === "otp" ? (
              <>
                <Input label={t("auth.phoneLabel", "رقم الهاتف")} value={otpPhone || phone} editable={false} />
                <Input
                  label={t("auth.otpLabel", "رمز التحقق")}
                  placeholder="123456"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                />

                <Button
                  title={loading ? copy.messages.loading : t("auth.verifyOtp", "تحقق")}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                />
                <Button
                  title={
                    resendLeft > 0
                      ? `${t("auth.otpResendAfter", "إعادة الإرسال بعد")} ${resendLeft}s`
                      : t("auth.otpResend", "إعادة إرسال الرمز")
                  }
                  onPress={handleResendOtp}
                  disabled={loading || resendLeft > 0}
                />
                <Button title={t("auth.back", "رجوع")} variant="link" size="sm" onPress={() => setStage("form")} />
              </>
            ) : (
              <>
                <Input
                  label={t("auth.usernameLabel", "اسم المستخدم")}
                  placeholder={t("auth.usernamePlaceholder", "اكتب اسم المستخدم")}
                  value={username}
                  onChangeText={setUsername}
                />

                {method === "email" ? (
                  <Input
                    label={t("auth.emailLabel", "البريد الإلكتروني")}
                    placeholder="example@mail.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                ) : null}

                <Input
                  label={
                    method === "phone"
                      ? t("auth.phoneLabel", "رقم الهاتف")
                      : t("auth.mobileOptionalLabel", "رقم الجوال (اختياري)")
                  }
                  placeholder={
                    method === "phone"
                      ? t("auth.phonePlaceholder", "+9665XXXXXXXXX")
                      : t("auth.mobilePlaceholder", "05xxxxxxxx")
                  }
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />

                <Input
                  label={t("auth.passwordLabel", "كلمة المرور")}
                  placeholder={t("auth.passwordPlaceholder", "اكتب كلمة المرور")}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
                <Input
                  label={t("auth.confirmPasswordLabel", "تأكيد كلمة المرور")}
                  placeholder={t("auth.confirmPasswordPlaceholder", "أعد كتابة كلمة المرور")}
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
                  <Text style={[styles.termsText, { color: theme.palette.text }]}>
                    {t("auth.acceptTermsText", "أوافق على الشروط والأحكام")}
                  </Text>
                </Pressable>

                <Button
                  title={
                    loading
                      ? copy.messages.loading
                      : method === "email"
                      ? t("auth.createAccount", "إنشاء حساب")
                      : t("auth.sendOtp", "إرسال رمز التحقق")
                  }
                  onPress={handleSubmit}
                  disabled={loading}
                />
              </>
            )}

            <View style={styles.bottomRow}>
              <Text style={[styles.muted, { color: theme.palette.muted }]}>{t("auth.haveAccount", "لديك حساب؟")}</Text>
              <Button
                title={t("auth.loginTitle", "تسجيل الدخول")}
                variant="link"
                size="sm"
                onPress={() => navigation.navigate("Login")}
              />
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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    brand: {
      fontSize: 18,
      fontWeight: "900",
      textAlign: I18nManager.isRTL ? "right" : "left",
      flex: 1,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      fontSize: 12,
      fontWeight: "900",
      overflow: "hidden",
    },
    subtitle: {
      fontSize: 13,
      lineHeight: 18,
      textAlign: I18nManager.isRTL ? "right" : "left",
    },
    card: {
      borderRadius: 22,
      borderColor: theme.palette.border,
      backgroundColor: theme.palette.surface,
    },
    methodRow: {
      flexDirection: "row",
      gap: 10,
    },
    methodButton: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 999,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    methodText: {
      fontSize: 13,
      fontWeight: "900",
    },
    checklist: {
      gap: 6,
      paddingTop: 4,
      paddingBottom: 2,
    },
    checkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    checkText: {
      fontSize: 13,
      fontWeight: "800",
      textAlign: I18nManager.isRTL ? "right" : "left",
      flex: 1,
    },
    termsRow: {
      flexDirection: "row",
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
      textAlign: I18nManager.isRTL ? "right" : "left",
      fontSize: 13,
      fontWeight: "900",
    },
    bottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    muted: {
      fontSize: 13,
      fontWeight: "800",
    },
    error: {
      textAlign: I18nManager.isRTL ? "right" : "left",
      fontSize: 13,
      fontWeight: "800",
    },
  });

export default RegisterScreen;
