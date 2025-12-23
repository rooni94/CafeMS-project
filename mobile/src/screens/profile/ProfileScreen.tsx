import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import QRCode from "react-native-qrcode-svg";

import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../theme";
import { Button, Input } from "../../components/ui";
import CurrencyAmount from "../../components/CurrencyAmount";
import FloatingCart from "../../components/FloatingCart";
import DashboardShell from "../dashboard/components/DashboardShell";
import DashboardSection from "../dashboard/components/DashboardSection";
import DashboardListItem from "../dashboard/components/DashboardListItem";
import DashboardTile from "../dashboard/components/DashboardTile";
import { decodeUnicodeEscapes } from "../../utils/text";

type Address = { id: number; label: string; details: string; is_default?: boolean };
type OrderRow = { id: number; status: string; total: number; created_at: string };
type LoyaltyProfile = {
  membership_id?: string;
  qr_token?: string;
  points_balance?: number;
  apple_wallet_pass_url?: string;
  google_wallet_pass_url?: string;
};

const PasswordChangeForm: React.FC = () => {
  const theme = useTheme();
  const { accessToken } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword1, setNewPassword1] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = async () => {
    if (!accessToken) return;
    if (!oldPassword.trim() || !newPassword1.trim() || !newPassword2.trim()) {
      Alert.alert("بيانات ناقصة", "يرجى إدخال كلمة المرور الحالية والجديدة.");
      return;
    }
    if (newPassword1 !== newPassword2) {
      Alert.alert("غير متطابقة", "كلمة المرور الجديدة غير متطابقة.");
      return;
    }

    setSaving(true);
    try {
      await api.post("auth/change-password/", {
        old_password: oldPassword,
        new_password1: newPassword1,
        new_password2: newPassword2,
      });
      setOldPassword("");
      setNewPassword1("");
      setNewPassword2("");
      Alert.alert("تم", "تم تغيير كلمة المرور بنجاح.");
    } catch (err: any) {
      Alert.alert("تعذر التغيير", "تحقق من كلمة المرور الحالية أو من قوة كلمة المرور الجديدة.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <Input label="كلمة المرور الحالية" value={oldPassword} onChangeText={setOldPassword} secureTextEntry />
      <Input label="كلمة المرور الجديدة" value={newPassword1} onChangeText={setNewPassword1} secureTextEntry />
      <Input label="تأكيد كلمة المرور الجديدة" value={newPassword2} onChangeText={setNewPassword2} secureTextEntry />
      <Button
        title={saving ? "جارٍ التغيير..." : "تغيير كلمة المرور"}
        onPress={handleChange}
        disabled={saving}
        style={{ width: "100%" }}
        color={theme.palette.accent}
      />
    </View>
  );
};

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = decodeUnicodeEscapes;
  const { user, accessToken, permissions, logout } = useAuth();

  const isAuthenticated = !!user && !!accessToken;
  const isEmployee = user?.role === "manager" || user?.role === "supervisor" || user?.role === "staff";
  const canManageSupport = user?.role === "manager" || !!permissions?.can_manage_support;

  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState((user as any)?.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [loyalty, setLoyalty] = useState<LoyaltyProfile | null>(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);

  useEffect(() => {
    setEmail(user?.email || "");
    setPhone((user as any)?.phone || "");
  }, [user]);

  const loadAddresses = useCallback(async () => {
    if (!accessToken) return;
    setAddressesLoading(true);
    try {
      const res = await api.get("auth/addresses/");
      setAddresses(res.data?.results || res.data || []);
    } catch {
      setAddresses([]);
    } finally {
      setAddressesLoading(false);
    }
  }, [accessToken]);

  const loadOrders = useCallback(async () => {
    if (!accessToken) return;
    setOrdersLoading(true);
    try {
      const res = await api.get("orders/my-orders/");
      setOrders(res.data?.results || res.data || []);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [accessToken]);

  const loadLoyalty = useCallback(async () => {
    if (!accessToken) return;
    setLoyaltyLoading(true);
    try {
      const res = await api.get("loyalty/profile/");
      setLoyalty(res.data?.profile || res.data || null);
    } catch {
      setLoyalty(null);
    } finally {
      setLoyaltyLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!isAuthenticated) {
      setAddresses([]);
      setOrders([]);
      setLoyalty(null);
      return;
    }
    if (!isEmployee) {
      loadAddresses();
      loadOrders();
      loadLoyalty();
    }
  }, [isAuthenticated, isEmployee, loadAddresses, loadOrders, loadLoyalty]);

  const saveProfile = async () => {
    if (!isAuthenticated) return;
    setSavingProfile(true);
    try {
      await api.patch("auth/me/", { email: email.trim() || undefined, phone: phone.trim() || undefined });
      Alert.alert("تم الحفظ", "تم تحديث بيانات الحساب.");
    } catch {
      Alert.alert("تعذر الحفظ", "حدث خطأ أثناء حفظ البيانات.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    Alert.alert("تم تسجيل الخروج", "تم تسجيل الخروج بنجاح.");
  };

  const tiles = useMemo(
    (): {
      title: string;
      subtitle: string;
      icon: any;
      onPress: () => void;
      color: string;
    }[] => {
    if (!isAuthenticated) {
      return [
        {
          title: "تسجيل الدخول",
          subtitle: "ادخل إلى حسابك",
          icon: "log-in-outline" as const,
          onPress: () => navigation.navigate("Login"),
          color: theme.palette.accent,
        },
        {
          title: "إنشاء حساب",
          subtitle: "حساب جديد خلال دقيقة",
          icon: "person-add-outline" as const,
          onPress: () => navigation.navigate("Register"),
          color: theme.palette.accentSoft,
        },
      ];
    }

    if (isEmployee) {
      const base: {
        title: string;
        subtitle: string;
        icon: any;
        onPress: () => void;
        color: string;
      }[] = [
        {
          title: "طلباتي",
          subtitle: "الحضور والطلبات HR",
          icon: "calendar-outline" as const,
          onPress: () => navigation.navigate("MyHR"),
          color: "#8b5cf6",
        },
      ];
      if (canManageSupport) {
        base.push({
          title: "الدعم",
          subtitle: "تذاكر ومحادثات الدعم",
          icon: "chatbubble-ellipses-outline" as const,
          onPress: () => navigation.navigate("DashboardSupport"),
          color: "#f97316",
        });
      }
      return base;
    }

    return [
      {
        title: "طلباتي",
        subtitle: "آخر الطلبات والتتبع",
        icon: "receipt-outline" as const,
        onPress: () => navigation.navigate("OrderTracking"),
        color: theme.palette.accent,
      },
      {
        title: "الولاء",
        subtitle: "نقاط وعضوية",
        icon: "sparkles-outline" as const,
        onPress: () => navigation.navigate("Rewards"),
        color: "#22c55e",
      },
      {
        title: "تواصل معنا",
        subtitle: "الدعم وخدمة العملاء",
        icon: "call-outline" as const,
        onPress: () => navigation.navigate("Contact"),
        color: theme.palette.accentSoft,
      },
    ];
  },
    [isAuthenticated, isEmployee, canManageSupport, navigation, theme.palette]
  );

  return (
    <View style={{ flex: 1 }}>
      <DashboardShell
      title="حسابي"
      subtitle={
        isAuthenticated
          ? `مرحباً ${user?.username || ""} — إدارة الحساب والإعدادات.`
          : "سجّل دخولك للوصول إلى طلباتك ونقاط الولاء."
      }
    >
      <DashboardSection title="اختصارات" subtitle="وصول سريع للأقسام الأكثر استخداماً.">
        {!isAuthenticated ? (
          <View style={{ gap: 8 }}>
            <DashboardTile
              title="تسجيل الدخول"
              subtitle="ادخل إلى حسابك"
              icon="log-in-outline"
              onPress={() => navigation.navigate("Login")}
              color={theme.palette.accent}
              style={{ width: "100%" }}
            />
            <DashboardTile
              title="إنشاء حساب"
              subtitle="حساب جديد خلال دقيقة"
              icon="person-add-outline"
              onPress={() => navigation.navigate("Register")}
              color={theme.palette.accentSoft}
              style={{ width: "100%" }}
            />
          </View>
        ) : (
          <View style={styles.tilesGrid}>
            {tiles.map((t) => (
              <View key={t.title} style={styles.tileItem}>
                <DashboardTile
                  title={t.title}
                  subtitle={t.subtitle}
                  icon={t.icon}
                  onPress={t.onPress}
                  color={t.color}
                  style={{ width: "100%" }}
                />
              </View>
            ))}
          </View>
        )}
      </DashboardSection>

      {isAuthenticated ? (
        <DashboardSection title="بيانات الحساب" subtitle="حدّث بياناتك ثم احفظ.">
          <Input label="اسم المستخدم" value={user?.username || ""} editable={false} />
          <Input label="البريد الإلكتروني" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Input label="رقم الجوال" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <View style={{ gap: 10 }}>
            <Button
              title={savingProfile ? "جارٍ الحفظ..." : "حفظ التعديلات"}
              onPress={saveProfile}
              disabled={savingProfile}
              style={{ width: "100%" }}
            />
            <Button
              title="تسجيل الخروج"
              icon="logout"
              variant="ghost"
              style={{ display: "none" }}
              color="transparent"
              textColor={theme.palette.danger}
              onPress={handleLogout}
            />
          </View>
        </DashboardSection>
      ) : null}

      {isAuthenticated ? (
        <DashboardSection title="تغيير كلمة المرور" subtitle="حدّث كلمة المرور لحماية حسابك.">
          <PasswordChangeForm />
        </DashboardSection>
      ) : null}

      {!isEmployee ? (
        <DashboardSection title="روابط" subtitle="معلومات وبيانات المتجر.">
          <View style={{ gap: 10 }}>
            <DashboardListItem title="من نحن" subtitle="تعرف على CafeMS Demo" icon="business-outline" onPress={() => navigation.navigate("About")} />
            <DashboardListItem title="الشروط والأحكام" subtitle="سياسات الاستخدام" icon="document-text-outline" onPress={() => navigation.navigate("Terms")} />
            <DashboardListItem title="سياسة الخصوصية" subtitle="حماية البيانات والخصوصية" icon="shield-checkmark-outline" onPress={() => navigation.navigate("Privacy")} />
            <DashboardListItem title="تواصل معنا" subtitle="دعم وخدمة العملاء" icon="call-outline" onPress={() => navigation.navigate("Contact")} />
          </View>
        </DashboardSection>
      ) : null}

      {isAuthenticated && !isEmployee ? (
        <>
          <DashboardSection title="آخر الطلبات" subtitle={ordersLoading ? "جاري التحميل..." : orders.length ? "آخر 5 طلبات." : "لا توجد طلبات بعد."}>
            {ordersLoading ? (
              <Text style={[styles.muted, { color: theme.palette.muted }]}>جاري التحميل...</Text>
            ) : orders.length === 0 ? (
              <Text style={[styles.muted, { color: theme.palette.muted }]}>لا توجد طلبات.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {orders.slice(0, 5).map((o) => (
                  <DashboardListItem
                    key={o.id}
                    title={`طلب #${o.id}`}
                    subtitle={`${o.status} • ${(o as any).created_at ? new Date((o as any).created_at).toLocaleString() : ""}`}
                    icon="receipt-outline"
                    onPress={() => navigation.navigate("OrderTracking", { orderId: o.id })}
                    right={<CurrencyAmount value={o.total} color={theme.palette.text} symbolSize={12} textStyle={styles.amount} />}
                  />
                ))}
              </View>
            )}
            <Button title="عرض كل الطلبات" variant="secondary" onPress={() => navigation.navigate("OrderTracking")} />
          </DashboardSection>

          <DashboardSection title="العناوين" subtitle={addressesLoading ? "جاري التحميل..." : addresses.length ? "عناوينك المحفوظة." : "لا توجد عناوين بعد."}>
            {addressesLoading ? (
              <Text style={[styles.muted, { color: theme.palette.muted }]}>جاري التحميل...</Text>
            ) : addresses.length === 0 ? (
              <Text style={[styles.muted, { color: theme.palette.muted }]}>لا توجد عناوين.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {addresses.slice(0, 6).map((a) => (
                  <DashboardListItem
                    key={a.id}
                    title={a.label}
                    subtitle={a.details}
                    icon="location-outline"
                    right={a.is_default ? <Text style={[styles.badge, { color: theme.palette.success }]}>افتراضي</Text> : null}
                  />
                ))}
              </View>
            )}
            <Button title="إدارة العناوين" variant="secondary" onPress={() => navigation.navigate("Addresses")} />
          </DashboardSection>

          <DashboardSection title="برنامج الولاء" subtitle={loyaltyLoading ? "جاري التحميل..." : "نقاطك وعضويتك."}>
            {loyaltyLoading ? (
              <Text style={[styles.muted, { color: theme.palette.muted }]}>جاري التحميل...</Text>
            ) : loyalty ? (
              <View style={{ gap: 12 }}>
                <View style={styles.kv}>
                  <Text style={[styles.k, { color: theme.palette.muted }]}>النقاط</Text>
                  <Text style={[styles.v, { color: theme.palette.text }]}>{loyalty.points_balance ?? 0}</Text>
                </View>
                {loyalty.qr_token ? (
                  <View style={styles.qrWrap}>
                    <QRCode value={loyalty.qr_token} size={140} />
                    <Text style={[styles.muted, { color: theme.palette.muted }]}>اعرض هذا الرمز عند الكاشير لتسجيل النقاط.</Text>
                  </View>
                ) : null}
                {loyalty.apple_wallet_pass_url ? (
                  <Button title="إضافة إلى Apple Wallet" variant="secondary" onPress={() => Linking.openURL(loyalty.apple_wallet_pass_url!)} />
                ) : null}
                {loyalty.google_wallet_pass_url ? (
                  <Button title="إضافة إلى Google Wallet" variant="secondary" onPress={() => Linking.openURL(loyalty.google_wallet_pass_url!)} />
                ) : null}
              </View>
            ) : (
              <Text style={[styles.muted, { color: theme.palette.muted }]}>لا تتوفر بيانات الولاء حالياً.</Text>
            )}
          </DashboardSection>
        </>
      ) : null}
      
      {isAuthenticated ? (
        <DashboardSection
          title={t("\\u062a\\u0633\\u062c\\u064a\\u0644 \\u0627\\u0644\\u062e\\u0631\\u0648\\u062c")}
          subtitle={t("\\u0625\\u0646\\u0647\\u0627\\u0621 \\u0627\\u0644\\u062c\\u0644\\u0633\\u0629 \\u0627\\u0644\\u062d\\u0627\\u0644\\u064a\\u0629 \\u0628\\u0623\\u0645\\u0627\\u0646.")}
        >
          <Button
            title={t("\\u062a\\u0633\\u062c\\u064a\\u0644 \\u0627\\u0644\\u062e\\u0631\\u0648\\u062c")}
            icon="logout"
            variant="danger"
            onPress={handleLogout}
            style={{ width: "100%" }}
          />
        </DashboardSection>
      ) : null}

    </DashboardShell>
      <FloatingCart />
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    tilesGrid: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    tileItem: {
      width: "49.5%",
      marginBottom: 6,
    },
    muted: {
      textAlign: "right",
      fontSize: 13,
      lineHeight: 18,
    },
    kv: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    k: {
      fontSize: 12,
      fontWeight: "800",
    },
    v: {
      fontSize: 14,
      fontWeight: "900",
    },
    amount: {
      fontSize: 13,
      fontWeight: "900",
    },
    badge: {
      fontSize: 12,
      fontWeight: "900",
    },
    qrWrap: {
      alignItems: "center",
      gap: 10,
    },
  });

export default ProfileScreen;
