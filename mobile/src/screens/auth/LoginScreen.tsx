import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, Pressable } from "react-native";
import Screen from "../../components/Screen";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { Button, Input, Card } from "../../components/ui";
import { useTheme } from "../../theme";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { copy } from "../../config/copy";

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { settings } = useStoreSettings();
  const { login, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!username || !password) {
      Alert.alert("تنبيه", copy.messages.required || "يرجى تعبئة الحقول المطلوبة");
      return;
    }
    try {
      await login(username.trim(), password);
      navigation.goBack();
    } catch (err: any) {
      setError(err?.message || "تعذر تسجيل الدخول، حاول مرة أخرى");
    }
  };

  return (
    <Screen scrollable={false} style={{ backgroundColor: theme.palette.background }}>
      <View style={styles.header}>
        <Text style={styles.brand}>{settings?.store_name || copy.brandFallback}</Text>
        <Text style={styles.subtitle}>أدخل بياناتك للوصول لطلباتك ونقاط الولاء.</Text>
      </View>

      <View style={styles.segmentWrapper}>
        <View style={[styles.segmentButton, styles.segmentActive, { backgroundColor: theme.palette.accent }]}>
          <Text style={styles.segmentActiveText}>تسجيل الدخول</Text>
        </View>
        <View style={[styles.segmentButton, styles.segmentGhost, { borderColor: theme.palette.accent }]}>
          <Text style={[styles.segmentGhostText, { color: theme.palette.accentSoft }]} onPress={() => navigation.navigate("Register")}>
            إنشاء حساب
          </Text>
        </View>
      </View>

      <Card>
        <Input label="اسم المستخدم" placeholder="أدخل اسم المستخدم" value={username} onChangeText={setUsername} />
        <Input label="كلمة المرور" placeholder="أدخل كلمة المرور" secureTextEntry value={password} onChangeText={setPassword} />
        <Button title={loading ? copy.messages.loading : "تسجيل الدخول"} onPress={handleSubmit} />
      </Card>

      <Pressable style={styles.resetRow} onPress={() => navigation.navigate("ResetPassword")}>
        <Text style={styles.resetText}>نسيت كلمة المرورٟ استعادة كلمة المرور</Text>
      </Pressable>

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
  resetRow: {
    alignItems: "flex-end",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  resetText: {
    color: "#F59E0B",
    fontSize: 13,
    fontWeight: "700",
  },
  error: {
    textAlign: "center",
    color: "#C24141",
    marginTop: 8,
  },
});

export default LoginScreen;
