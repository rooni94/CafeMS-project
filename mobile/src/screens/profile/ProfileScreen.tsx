import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import QRCode from "react-native-qrcode-svg";

import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../theme";
import { Button, Input, Select } from "../../components/ui";
import CurrencyAmount from "../../components/CurrencyAmount";
import FloatingCart from "../../components/FloatingCart";
import DashboardShell from "../dashboard/components/DashboardShell";
import DashboardSection from "../dashboard/components/DashboardSection";
import DashboardListItem from "../dashboard/components/DashboardListItem";
import DashboardTile from "../dashboard/components/DashboardTile";
import { useI18n } from "../../i18n";

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
  const { t, isRTL } = useI18n();
  const { accessToken } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword1, setNewPassword1] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = async () => {
    if (!accessToken) return;
    if (!oldPassword.trim() || !newPassword1.trim() || !newPassword2.trim()) {
      Alert.alert(
        t("profile.passwordMissingTitle", "بيانات ناقصة"),
        t("profile.passwordMissingBody", "يرجى إدخال كلمة المرور الحالية والجديدة.")
      );
      return;
    }
    if (newPassword1 !== newPassword2) {
      Alert.alert(
        t("profile.passwordMismatchTitle", "غير متطابقة"),
        t("profile.passwordMismatchBody", "كلمة المرور الجديدة غير متطابقة.")
      );
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
      Alert.alert(
        t("profile.passwordChangeSuccessTitle", "تم"),
        t("profile.passwordChangeSuccessBody", "تم تغيير كلمة المرور بنجاح.")
      );
    } catch (err: any) {
      Alert.alert(
        t("profile.passwordChangeErrorTitle", "تعذر التغيير"),
        t(
          "profile.passwordChangeErrorBody",
          "تحقق من كلمة المرور الحالية أو من قوة كلمة المرور الجديدة."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <Input
        label={t("profile.passwordCurrentLabel", "كلمة المرور الحالية")}
        value={oldPassword}
        onChangeText={setOldPassword}
        secureTextEntry
      />
      <Input
        label={t("profile.passwordNewLabel", "كلمة المرور الجديدة")}
        value={newPassword1}
        onChangeText={setNewPassword1}
        secureTextEntry
      />
      <Input
        label={t("profile.passwordConfirmLabel", "تأكيد كلمة المرور الجديدة")}
        value={newPassword2}
        onChangeText={setNewPassword2}
        secureTextEntry
      />
      <Button
        title={
          saving
            ? t("profile.passwordChanging", "جارٍ التغيير...")
            : t("profile.passwordChangeButton", "تغيير كلمة المرور")
        }
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
  const { locale, setLocale, t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);
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

  const handleWalletPass = useCallback(
    async (platform: "apple" | "google", url?: string) => {
      if (!url) return;
      try {
        await api.post(`loyalty/pass/${platform}/`);
      } catch {
        // Still attempt to open the pass URL even if the prep call fails.
      }
      Linking.openURL(url);
    },
    [accessToken]
  );

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
      Alert.alert(
        t("profile.saveSuccessTitle", "تم الحفظ"),
        t("profile.saveSuccessBody", "تم تحديث بيانات الحساب.")
      );
    } catch {
      Alert.alert(
        t("profile.saveErrorTitle", "تعذر الحفظ"),
        t("profile.saveErrorBody", "حدث خطأ أثناء حفظ البيانات.")
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    Alert.alert(
      t("profile.logoutSuccessTitle", "تم تسجيل الخروج"),
      t("profile.logoutSuccessBody", "تم تسجيل الخروج بنجاح.")
    );
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
          title: t("profile.tileLoginTitle", "تسجيل الدخول"),
          subtitle: t("profile.tileLoginSubtitle", "ادخل إلى حسابك"),
          icon: "log-in-outline" as const,
          onPress: () => navigation.navigate("Login"),
          color: theme.palette.accent,
        },
        {
          title: t("profile.tileRegisterTitle", "إنشاء حساب"),
          subtitle: t("profile.tileRegisterSubtitle", "حساب جديد خلال دقيقة"),
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
          title: t("profile.tileMyRequestsTitle", "طلباتي"),
          subtitle: t("profile.tileMyRequestsSubtitle", "الحضور والطلبات HR"),
          icon: "calendar-outline" as const,
          onPress: () => navigation.navigate("MyHR"),
          color: "#8b5cf6",
        },
      ];
      if (canManageSupport) {
        base.push({
          title: t("profile.tileSupportTitle", "الدعم"),
          subtitle: t("profile.tileSupportSubtitle", "تذاكر ومحادثات الدعم"),
          icon: "chatbubble-ellipses-outline" as const,
          onPress: () => navigation.navigate("DashboardSupport"),
          color: "#f97316",
        });
      }
      return base;
    }

    return [
      {
        title: t("profile.tileOrdersTitle", "طلباتي"),
        subtitle: t("profile.tileOrdersSubtitle", "آخر الطلبات والتتبع"),
        icon: "receipt-outline" as const,
        onPress: () => navigation.navigate("OrderTracking"),
        color: theme.palette.accent,
      },
      {
        title: t("profile.tileLoyaltyTitle", "الولاء"),
        subtitle: t("profile.tileLoyaltySubtitle", "نقاط وعضوية"),
        icon: "sparkles-outline" as const,
        onPress: () => navigation.navigate("Rewards"),
        color: "#22c55e",
      },
      {
        title: t("profile.tileContactTitle", "تواصل معنا"),
        subtitle: t("profile.tileContactSubtitle", "الدعم وخدمة العملاء"),
        icon: "call-outline" as const,
        onPress: () => navigation.navigate("Contact"),
        color: theme.palette.accentSoft,
      },
    ];
  },
    [isAuthenticated, isEmployee, canManageSupport, navigation, theme.palette, t]
  );

  const languageOptions = useMemo(
    () => [
      { value: "ar", label: t("settings.languageArabic", "العربية") },
      { value: "en", label: t("settings.languageEnglish", "English") },
    ],
    [t]
  );

  const welcomeSubtitle = isAuthenticated
    ? `${t("profile.welcomeGreeting", "مرحباً")} ${user?.username || ""} ${t(
        "profile.welcomeSuffix",
        "— إدارة الحساب والإعدادات."
      )}`
    : t("profile.welcomeGuest", "سجّل دخولك للوصول إلى طلباتك ونقاط الولاء.");

  const ordersSubtitle = ordersLoading
    ? t("profile.ordersLoading", "جاري التحميل...")
    : orders.length
    ? t("profile.ordersSubtitle", "آخر 5 طلبات.")
    : t("profile.ordersEmptySubtitle", "لا توجد طلبات بعد.");

  const addressesSubtitle = addressesLoading
    ? t("profile.addressesLoading", "جاري التحميل...")
    : addresses.length
    ? t("profile.addressesSubtitle", "عناوينك المحفوظة.")
    : t("profile.addressesEmptySubtitle", "لا توجد عناوين بعد.");

  const loyaltySubtitle = loyaltyLoading
    ? t("profile.loyaltyLoading", "جاري التحميل...")
    : t("profile.loyaltySubtitle", "نقاطك وعضويتك.");

  return (
    <View style={{ flex: 1 }}>
      <DashboardShell
      title={t("profile.title", "حسابي")}
      subtitle={welcomeSubtitle}
    >
      <DashboardSection title={t("profile.shortcutsTitle", "اختصارات")} subtitle={t("profile.shortcutsSubtitle", "وصول سريع للأقسام الأكثر استخداماً.")}>
        {!isAuthenticated ? (
          <View style={{ gap: 8 }}>
            <DashboardTile
              title={t("profile.tileLoginTitle", "تسجيل الدخول")}
              subtitle={t("profile.tileLoginSubtitle", "ادخل إلى حسابك")}
              icon="log-in-outline"
              onPress={() => navigation.navigate("Login")}
              color={theme.palette.accent}
              style={{ width: "100%" }}
            />
            <DashboardTile
              title={t("profile.tileRegisterTitle", "إنشاء حساب")}
              subtitle={t("profile.tileRegisterSubtitle", "حساب جديد خلال دقيقة")}
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
        <DashboardSection title={t("profile.accountDataTitle", "بيانات الحساب")} subtitle={t("profile.accountDataSubtitle", "حدّث بياناتك ثم احفظ.")}>
          <Input label={t("profile.usernameLabel", "اسم المستخدم")} value={user?.username || ""} editable={false} />
          <Input label={t("auth.emailLabel", "البريد الإلكتروني")} value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Input label={t("auth.phoneLabel", "رقم الجوال")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <View style={{ gap: 10 }}>
            <Button
              title={
                savingProfile
                  ? t("common.saving", "جارٍ الحفظ...")
                  : t("profile.saveChanges", "حفظ التعديلات")
              }
              onPress={saveProfile}
              disabled={savingProfile}
              style={{ width: "100%" }}
            />
            <Button
              title={t("profile.logoutTitle", "تسجيل الخروج")}
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

      <DashboardSection
        title={t("settings.languageTitle", "اللغة")}
        subtitle={t("settings.languageSubtitle", "اختر لغة التطبيق")}
      >
        <Select
          label={t("settings.languageTitle", "اللغة")}
          value={locale}
          options={languageOptions}
          onChange={(value) => setLocale(value as any)}
        />
      </DashboardSection>
      
      {isAuthenticated ? (
        <DashboardSection title={t("profile.passwordChangeTitle", "تغيير كلمة المرور")} subtitle={t("profile.passwordChangeSubtitle", "حدّث كلمة المرور لحماية حسابك.")}>
          <PasswordChangeForm />
        </DashboardSection>
      ) : null}

      {!isEmployee ? (
        <DashboardSection title={t("profile.linksTitle", "روابط")} subtitle={t("profile.linksSubtitle", "معلومات وبيانات المتجر.")}>
          <View style={{ gap: 10 }}>
            <DashboardListItem title={t("profile.aboutTitle", "من نحن")} subtitle={t("profile.aboutSubtitle", "تعرف على لاڤـا كافيـه")} icon="business-outline" onPress={() => navigation.navigate("About")} />
            <DashboardListItem title={t("profile.termsTitle", "الشروط والأحكام")} subtitle={t("profile.termsSubtitle", "سياسات الاستخدام")} icon="document-text-outline" onPress={() => navigation.navigate("Terms")} />
            <DashboardListItem title={t("profile.privacyTitle", "سياسة الخصوصية")} subtitle={t("profile.privacySubtitle", "حماية البيانات والخصوصية")} icon="shield-checkmark-outline" onPress={() => navigation.navigate("Privacy")} />
            <DashboardListItem title={t("profile.contactTitle", "تواصل معنا")} subtitle={t("profile.contactSubtitle", "دعم وخدمة العملاء")} icon="call-outline" onPress={() => navigation.navigate("Contact")} />
          </View>
        </DashboardSection>
      ) : null}

      {isAuthenticated && !isEmployee ? (
        <>
          <DashboardSection title={t("profile.recentOrdersTitle", "آخر الطلبات")} subtitle={ordersSubtitle}>
            {ordersLoading ? (
              <Text style={[styles.muted, { color: theme.palette.muted }]}>{t("profile.ordersLoading", "جاري التحميل...")}</Text>
            ) : orders.length === 0 ? (
              <Text style={[styles.muted, { color: theme.palette.muted }]}>{t("profile.noOrders", "لا توجد طلبات.")}</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {orders.slice(0, 5).map((o) => (
                  <DashboardListItem
                    key={o.id}
                    title={`${t("profile.orderLabel", "طلب")} #${o.id}`}
                    subtitle={`${o.status} • ${(o as any).created_at ? new Date((o as any).created_at).toLocaleString() : ""}`}
                    icon="receipt-outline"
                    onPress={() => navigation.navigate("OrderTracking", { orderId: o.id })}
                    right={<CurrencyAmount value={o.total} color={theme.palette.text} symbolSize={12} textStyle={styles.amount} />}
                  />
                ))}
              </View>
            )}
            <Button title={t("profile.viewAllOrders", "عرض كل الطلبات")} variant="secondary" onPress={() => navigation.navigate("OrderTracking")} />
          </DashboardSection>

          <DashboardSection title={t("profile.addressesTitle", "العناوين")} subtitle={addressesSubtitle}>
            {addressesLoading ? (
              <Text style={[styles.muted, { color: theme.palette.muted }]}>{t("profile.addressesLoading", "جاري التحميل...")}</Text>
            ) : addresses.length === 0 ? (
              <Text style={[styles.muted, { color: theme.palette.muted }]}>{t("profile.noAddresses", "لا توجد عناوين.")}</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {addresses.slice(0, 6).map((a) => (
                  <DashboardListItem
                    key={a.id}
                    title={a.label}
                    subtitle={a.details}
                    icon="location-outline"
                    right={a.is_default ? <Text style={[styles.badge, { color: theme.palette.success }]}>{t("profile.defaultBadge", "افتراضي")}</Text> : null}
                  />
                ))}
              </View>
            )}
            <Button title={t("profile.manageAddresses", "إدارة العناوين")} variant="secondary" onPress={() => navigation.navigate("Addresses")} />
          </DashboardSection>

          <DashboardSection title={t("profile.loyaltyTitle", "برنامج الولاء")} subtitle={loyaltySubtitle}>
            {loyaltyLoading ? (
              <Text style={[styles.muted, { color: theme.palette.muted }]}>{t("profile.loyaltyLoading", "جاري التحميل...")}</Text>
            ) : loyalty ? (
              <View style={{ gap: 12 }}>
                <View style={styles.kv}>
                  <Text style={[styles.k, { color: theme.palette.muted }]}>{t("profile.loyaltyPointsLabel", "النقاط")}</Text>
                  <Text style={[styles.v, { color: theme.palette.text }]}>{loyalty.points_balance ?? 0}</Text>
                </View>
                {loyalty.qr_token ? (
                  <View style={styles.qrWrap}>
                    <QRCode value={loyalty.qr_token} size={140} />
                    <Text style={[styles.muted, { color: theme.palette.muted }]}>
                      {t("profile.loyaltyQrHint", "اعرض هذا الرمز عند الكاشير لتسجيل النقاط.")}
                    </Text>
                  </View>
                ) : null}
                {loyalty.apple_wallet_pass_url ? (
                  <Button
                    title={t("profile.loyaltyAppleWallet", "إضافة إلى Apple Wallet")}
                    variant="secondary"
                    onPress={() =>
                      handleWalletPass("apple", loyalty.apple_wallet_pass_url)
                    }
                  />
                ) : null}
                {loyalty.google_wallet_pass_url ? (
                  <Button
                    title={t("profile.loyaltyGoogleWallet", "إضافة إلى Google Wallet")}
                    variant="secondary"
                    onPress={() =>
                      handleWalletPass("google", loyalty.google_wallet_pass_url)
                    }
                  />
                ) : null}
              </View>
            ) : (
              <Text style={[styles.muted, { color: theme.palette.muted }]}>{t("profile.loyaltyEmpty", "لا تتوفر بيانات الولاء حالياً.")}</Text>
            )}
          </DashboardSection>
        </>
      ) : null}
      
      {isAuthenticated ? (
        <DashboardSection
          title={t("profile.logoutSectionTitle", "تسجيل الخروج")}
          subtitle={t("profile.logoutSectionSubtitle", "إنهاء الجلسة الحالية بأمان.")}
        >
          <Button
            title={t("profile.logoutSectionTitle", "تسجيل الخروج")}
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

const createStyles = (theme: ReturnType<typeof useTheme>, isRTL: boolean) =>
  StyleSheet.create({
    tilesGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    tileItem: {
      width: "49.5%",
      marginBottom: 6,
    },
    muted: {
      textAlign: isRTL ? "right" : "left",
      fontSize: 13,
      lineHeight: 18,
    },
    kv: {
      flexDirection: "row",
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
