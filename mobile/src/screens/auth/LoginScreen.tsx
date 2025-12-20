import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import Screen from "../../components/Screen";
import { Button, Card, Input } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { safeGoBack } from "../../navigation/helpers";
import { useTheme } from "../../theme";
import { copy } from "../../config/copy";

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { settings } = useStoreSettings();
  const { login, loading } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!username.trim() || !password.trim()) {
      Alert.alert("تنبيه", copy.messages.required);
      return;
    }
    try {
      await login(username.trim(), password);
      safeGoBack(navigation, { tab: "Profile" });
    } catch (err: any) {
      setError(err?.message || "تعذر تسجيل الدخول. تأكد من البيانات وحاول مرة أخرى.");
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
              <Text
                style={[
                  styles.badge,
                  { backgroundColor: theme.palette.accentSoft, color: theme.palette.accent },
                ]}
              >
                تسجيل الدخول
              </Text>
            </View>
            <Text style={[styles.subtitle, { color: theme.palette.muted }]}>
              سجّل دخولك للوصول إلى طلباتك وحفظ عناوينك ونقاط الولاء.
            </Text>
          </Card>

          <Card style={styles.card} contentStyle={{ gap: 12 }}>
            <Input
              label="اسم المستخدم"
              placeholder="اكتب اسم المستخدم"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <Input
              label="كلمة المرور"
              placeholder="اكتب كلمة المرور"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Button
              title={loading ? copy.messages.loading : "تسجيل الدخول"}
              onPress={handleSubmit}
              disabled={loading}
            />

            <View style={styles.linksRow}>
              <Button
                title="إنشاء حساب"
                variant="link"
                size="sm"
                onPress={() => navigation.navigate("Register")}
              />
              <Button
                title="نسيت كلمة المرور؟"
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
    linksRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
    },
    error: {
      textAlign: "right",
      fontSize: 13,
      fontWeight: "800",
      writingDirection: "rtl",
    },
  });

export default LoginScreen;
