import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import Screen from "../../components/Screen";
import { Button, Input, Card } from "../../components/ui";
import { useTheme } from "../../theme";
import { api } from "../../services/api";
import { useI18n } from "../../i18n";

const ResetPasswordScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { copy, t } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim()) {
      Alert.alert(t("auth.alertTitle", "تنبيه"), t("auth.resetEmailRequired", "يرجى إدخال البريد الإلكتروني."));
      return;
    }
    setLoading(true);
    try {
      await api.post("auth/password-reset/", { email: email.trim() });
      setSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail || t("auth.resetError", "تعذر إرسال الرابط. حاول مرة أخرى لاحقاً."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable={false} style={{ backgroundColor: theme.palette.background }}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("auth.resetTitle", "إعادة تعيين كلمة المرور")}</Text>
        <Text style={styles.subtitle}>
          {t("auth.resetSubtitle", "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور.")}
        </Text>
      </View>

      <Card>
        <Input
          label={t("auth.emailLabel", "البريد الإلكتروني")}
          placeholder="example@mail.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {error ? <Text style={[styles.status, { color: theme.palette.danger }]}>{error}</Text> : null}
        {sent ? (
          <Text style={[styles.status, { color: theme.palette.success }]}>
            {t("auth.resetSent", "تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني.")}
          </Text>
        ) : null}

        <Button
          title={loading ? copy.messages.loading : t("auth.resetSubmit", "إرسال الرابط")}
          onPress={handleSubmit}
          disabled={loading}
        />
      </Card>

      <View style={styles.footer}>
        <Button
          title={t("auth.backToLogin", "العودة لتسجيل الدخول")}
          variant="ghost"
          onPress={() => navigation.navigate("Login")}
        />
      </View>
    </Screen>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    header: {
      alignItems: "flex-end",
      marginBottom: 12,
      paddingHorizontal: 4,
      gap: 4,
    },
    title: {
      fontSize: 22,
      fontWeight: "900",
      color: theme.palette.text,
      textAlign: "right",
      writingDirection: "rtl",
    },
    subtitle: {
      fontSize: 14,
      color: theme.palette.muted,
      textAlign: "right",
      writingDirection: "rtl",
    },
    status: {
      textAlign: "right",
      marginBottom: 6,
      fontSize: 13,
      fontWeight: "700",
      writingDirection: "rtl",
    },
    footer: {
      marginTop: 12,
      alignItems: "flex-end",
    },
  });

export default ResetPasswordScreen;
