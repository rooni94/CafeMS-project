import React, { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TextInput as PaperTextInput } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";

import Screen from "../../components/Screen";
import { Button, Card, Input } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { safeGoBack } from "../../navigation/helpers";
import { useTheme } from "../../theme";
import { normalizeBrandName } from "../../utils/text";
import { useI18n } from "../../i18n";

const STORAGE_KEY = "cafems-login";

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { copy, t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);
  const { settings } = useStoreSettings();
  const { login, loading } = useAuth();
  const brandName = normalizeBrandName(settings?.store_name, copy.brandFallback);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSaved = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed?.username) setUsername(parsed.username);
        if (parsed?.password) setPassword(parsed.password);
        if (parsed?.remember) setRemember(true);
      } catch {
        // ignore restore issues
      }
    };
    loadSaved();
  }, []);

  const handleSubmit = async () => {
    setError(null);
    if (!username.trim() || !password.trim()) {
      const alertFallback = isRTL ? "تنبيه" : "Notice";
      Alert.alert(t("auth.alertTitle", alertFallback), copy.messages.required);
      return;
    }
    try {
      await login(username.trim(), password);
      if (remember) {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ username: username.trim(), password, remember: true })
        );
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
      safeGoBack(navigation, { tab: "Profile" });
    } catch (err: any) {
      setError(
        err?.message ||
          t(
            "auth.loginError",
            "حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى أو تواصل مع الدعم."
          )
      );
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
              <Text
                style={[
                  styles.badge,
                  { backgroundColor: theme.palette.accentSoft, color: theme.palette.accent },
                ]}
              >
                {t("auth.loginTitle", isRTL ? "تسجيل الدخول" : "Sign in")}
              </Text>
            </View>
            <Text style={[styles.subtitle, { color: theme.palette.muted }]}>
              {t(
                "auth.loginSubtitle",
                isRTL
                  ? "سجّل دخولك لعرض آخر الطلبات، حفظ العناوين، ونقاط الولاء."
                  : "Sign in to access your orders, save addresses, and loyalty points."
              )}
            </Text>
          </Card>

          <Card style={styles.card} contentStyle={{ gap: 12 }}>
            <Input
              label={t("auth.usernameLabel", isRTL ? "اسم المستخدم" : "Username")}
              placeholder={t("auth.usernamePlaceholder", isRTL ? "اكتب اسم المستخدم" : "Enter username")}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoComplete="username"
              textContentType="username"
              importantForAutofill="yes"
            />
            <Input
              label={t("auth.passwordLabel", isRTL ? "كلمة المرور" : "Password")}
              placeholder={t("auth.passwordPlaceholder", isRTL ? "اكتب كلمة المرور" : "Enter password")}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoComplete="password"
              textContentType="password"
              importantForAutofill="yes"
              right={
                <PaperTextInput.Icon
                  icon={showPassword ? "eye-off" : "eye"}
                  color={theme.palette.muted}
                  onPress={() => setShowPassword((prev) => !prev)}
                  forceTextInputFocus={false}
                />
              }
            />

            <Pressable style={styles.rememberRow} onPress={() => setRemember((prev) => !prev)}>
              <View
                style={[
                  styles.rememberIcon,
                  remember && { borderColor: theme.palette.accent, backgroundColor: `${theme.palette.accent}22` },
                ]}
              >
                {remember ? <Ionicons name="checkmark" size={16} color={theme.palette.accent} /> : null}
              </View>
              <Text style={[styles.rememberText, { color: theme.palette.text }]}>
                {t(
                  "auth.rememberMe",
                  isRTL ? "حفظ اسم المستخدم وكلمة المرور" : "Remember username and password"
                )}
              </Text>
            </Pressable>

            <Button
              title={
                loading
                  ? copy.messages.loading
                  : t("auth.loginTitle", isRTL ? "تسجيل الدخول" : "Sign in")
              }
              onPress={handleSubmit}
              disabled={loading}
            />

            <View style={styles.linksRow}>
              <Button
                title={t("auth.createAccount", isRTL ? "إنشاء حساب" : "Create account")}
                variant="link"
                size="sm"
                onPress={() => navigation.navigate("Register")}
              />
              <Button
                title={t("auth.forgotPassword", isRTL ? "نسيت كلمة المرور؟" : "Forgot password?")}
                variant="link"
                size="sm"
                onPress={() => navigation.navigate("ResetPassword")}
              />
            </View>

            {error ? <Text style={[styles.error, { color: theme.palette.danger }]}>{error}</Text> : null}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>, isRTL: boolean) =>
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
      textAlign: isRTL ? "right" : "left",
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
      textAlign: isRTL ? "right" : "left",
    },
    card: {
      borderRadius: 22,
      borderColor: theme.palette.border,
      backgroundColor: theme.palette.surface,
    },
    linksRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    rememberRow: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 4,
    },
    rememberIcon: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.4,
      borderColor: theme.palette.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.palette.surfaceAlt,
    },
    rememberText: {
      flex: 1,
      fontSize: 13,
      textAlign: isRTL ? "right" : "left",
      fontWeight: "700",
    },
    error: {
      textAlign: isRTL ? "right" : "left",
      fontSize: 13,
      fontWeight: "800",
    },
  });

export default LoginScreen;
