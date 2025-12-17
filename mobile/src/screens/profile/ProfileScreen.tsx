import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Linking, KeyboardAvoidingView, Platform } from "react-native";
import Screen from "../../components/Screen";
import { Card, Button } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "../../theme";
import { goToTab, goToStack } from "../../navigation/helpers";
import { useNavigation } from "@react-navigation/native";
import CurrencyAmount from "../../components/CurrencyAmount";

type LoyaltyProfile = {
  membership_id?: string;
  qr_token?: string;
  points_balance?: number;
  apple_wallet_pass_url?: string;
  google_wallet_pass_url?: string;
};

type OrderSummary = { id: number; status: string; total: number; created_at: string };
type Address = { id: number; label: string; details: string; is_default?: boolean };

const ProfileScreen: React.FC = () => {
  const { user, accessToken, logout } = useAuth();
  const theme = useTheme();
  const navigation = useNavigation<any>();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyProfile | null>(null);

  const [newEmail, setNewEmail] = useState(user?.email || "");
  const [newPhone, setNewPhone] = useState((user as any)?.phone || "");

  const [pwOld, setPwOld] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwNew2, setPwNew2] = useState("");

  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPw, setLoadingPw] = useState(false);
  const [loadingLoyalty, setLoadingLoyalty] = useState(false);
  const [addressesError, setAddressesError] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [loyaltyError, setLoyaltyError] = useState<string | null>(null);

  const isAuthenticated = !!user && !!accessToken;

  const loadAddresses = useCallback(async () => {
    if (!accessToken) return;
    setLoadingAddresses(true);
    setAddressesError(null);
    try {
      const res = await api.get("auth/addresses/");
      setAddresses(res.data?.results || res.data || []);
    } catch {
      setAddresses([]);
      setAddressesError("تعذر تحميل العناوين.");
    } finally {
      setLoadingAddresses(false);
    }
  }, [accessToken]);

  const loadOrders = useCallback(async () => {
    if (!accessToken) return;
    setLoadingOrders(true);
    setOrdersError(null);
    try {
      const res = await api.get("orders/my-orders/");
      setOrders(res.data?.results || res.data || []);
    } catch {
      setOrders([]);
      setOrdersError("تعذر تحميل الطلبات.");
    } finally {
      setLoadingOrders(false);
    }
  }, [accessToken]);

  const loadLoyalty = useCallback(async () => {
    if (!accessToken) return;
    setLoadingLoyalty(true);
    setLoyaltyError(null);
    try {
      const res = await api.get("loyalty/profile/");
      setLoyalty(res.data?.profile || res.data?.profileData || res.data || null);
    } catch {
      setLoyalty(null);
      setLoyaltyError("تعذر تحميل بيانات الولاء.");
    } finally {
      setLoadingLoyalty(false);
    }
  }, [accessToken]);

  const updateProfile = async () => {
    setLoadingProfile(true);
    try {
      await api.patch("auth/me/", { email: newEmail || undefined, phone: newPhone || undefined });
    } finally {
      setLoadingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!pwOld || !pwNew || pwNew !== pwNew2) return;
    setLoadingPw(true);
    try {
      await api.post("auth/change-password/", { old_password: pwOld, new_password: pwNew, confirm_password: pwNew2 });
      setPwOld("");
      setPwNew("");
      setPwNew2("");
    } finally {
      setLoadingPw(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setAddresses([]);
      setOrders([]);
      setLoyalty(null);
      return;
    }
    loadAddresses();
    loadOrders();
    loadLoyalty();
  }, [isAuthenticated, loadAddresses, loadOrders, loadLoyalty]);

  useEffect(() => {
    setNewEmail(user?.email || "");
    setNewPhone((user as any)?.phone || "");
  }, [user]);

  const userName = useMemo(() => (user?.username ? user.username : "ضيف"), [user]);

  const quickLinks = [
    { label: "من نحن", icon: "business-outline", action: () => goToStack(navigation, "About") },
    { label: "قصتنا", icon: "book-outline", action: () => goToStack(navigation, "Story") },
    { label: "القائمة", icon: "restaurant-outline", action: () => goToTab(navigation, "Menu") },
    { label: "المكافات", icon: "gift-outline", action: () => goToStack(navigation, "Rewards") },
    { label: "الخصوصية", icon: "lock-closed-outline", action: () => goToStack(navigation, "Privacy") },
    { label: "الشروط والأحكام", icon: "document-text-outline", action: () => goToStack(navigation, "Terms") },
  ];

  return (
    <Screen scrollable={false} style={{ backgroundColor: "#f5f7fb" }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 120 }}>
          <Card style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={styles.heroName}>{isAuthenticated ? `أهلاً، ${userName}` : "مرحباً، سجل دخولك"}</Text>
                <Text style={styles.heroHelper}>
                  {isAuthenticated ? "يمكنك إدارة بياناتك وطلباتك ونقاط الولاء." : "للاطلاع على الطلبات وحفظ العناوين ونقاط الولاء."}
                </Text>
              </View>
              <View style={styles.avatarLarge}>
                <Ionicons name="person" size={28} color={theme.palette.accent} />
              </View>
            </View>
            {!isAuthenticated ? (
              <View style={styles.actionRow}>
                <Button title="تسجيل الدخول" onPress={() => navigation.navigate("Login")} style={{ flex: 1 }} />
                <Button title="إنشاء حساب" variant="ghost" color="transparent" textColor="#6138A1" onPress={() => navigation.navigate("Register")} style={{ flex: 1, borderWidth: 1, borderColor: "#6138A1" }} />
              </View>
            ) : (
              <View style={styles.fieldsRow}>
                <View style={styles.field}>
                  <Text style={styles.label}>البريد الإلكتروني</Text>
                  <TextInput value={newEmail} onChangeText={setNewEmail} style={styles.input} textAlign="right" />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>اسم المستخدم</Text>
                  <Text style={styles.value}>{userName}</Text>
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>رقم الجوال</Text>
                  <TextInput value={newPhone} onChangeText={setNewPhone} style={styles.input} keyboardType="phone-pad" textAlign="right" />
                </View>
                <Button title={loadingProfile ? "جاري الحفظ..." : "حفظ التغييرات"} onPress={updateProfile} disabled={loadingProfile} />
              </View>
            )}
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>الدعم</Text>
            <Button title="فتح محادثة دعم" onPress={() => goToTab(navigation, "Support")} />
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>معلومات</Text>
            <View style={styles.linksList}>
              {quickLinks.map((item) => (
                <Pressable key={item.label} style={styles.linkRow} onPress={item.action}>
                  <View style={styles.linkIcon}>
                    <Ionicons name={item.icon as any} size={20} color="#f59e0b" />
                  </View>
                  <Text style={styles.linkRowText}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          {isAuthenticated && (
            <>
              <Card>
                <Text style={styles.sectionTitle}>تغيير كلمة المرور</Text>
                <View style={{ gap: 8 }}>
                  <TextInput placeholder="كلمة المرور الحالية" value={pwOld} onChangeText={setPwOld} secureTextEntry style={styles.input} textAlign="right" />
                  <TextInput placeholder="كلمة المرور الجديدة" value={pwNew} onChangeText={setPwNew} secureTextEntry style={styles.input} textAlign="right" />
                  <TextInput placeholder="تأكيد كلمة المرور الجديدة" value={pwNew2} onChangeText={setPwNew2} secureTextEntry style={styles.input} textAlign="right" />
                </View>
                <Button title={loadingPw ? "جاري التحديث..." : "تغيير كلمة المرور"} onPress={changePassword} disabled={loadingPw} />
              </Card>

              <Card>
                <View style={styles.rowBetween}>
                  <Text style={styles.sectionTitle}>عناويني</Text>
                  <Pressable onPress={() => goToTab(navigation, "Orders")}>
                    <Text style={styles.link}>إدارة العناوين</Text>
                  </Pressable>
                </View>
                {loadingAddresses ? (
                  <ActivityIndicator />
                ) : addressesError ? (
                  <Text style={[styles.helper, { color: "#ef4444" }]}>{addressesError}</Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {addresses.map((a) => (
                      <View key={a.id} style={styles.listRow}>
                        <View style={{ flex: 1, alignItems: "flex-end" }}>
                          <Text style={styles.value}>{a.label}</Text>
                          <Text style={styles.helper}>{a.details}</Text>
                        </View>
                        {a.is_default ? <Text style={[styles.helper, { color: "#16a34a" }]}>افتراضي</Text> : null}
                      </View>
                    ))}
                    {addresses.length === 0 && <Text style={styles.helper}>لا توجد عناوين محفوظة.</Text>}
                  </View>
                )}
              </Card>

              <Card>
                <Text style={styles.sectionTitle}>برنامج الولاء</Text>
                {loadingLoyalty ? (
                  <ActivityIndicator />
                ) : loyaltyError ? (
                  <Text style={[styles.helper, { color: "#ef4444" }]}>{loyaltyError}</Text>
                ) : loyalty ? (
                  <View style={{ gap: 10 }}>
                    <View style={styles.rowBetween}>
                      <View style={{ flex: 1, alignItems: "flex-end", gap: 4 }}>
                        <Text style={styles.value}>الرصيد: {loyalty.points_balance ?? 0} نقطة</Text>
                        <Text style={styles.helper}>المكافأة التالية عند 100 نقطة</Text>
                      </View>
                    </View>
                    <View style={styles.loyaltyRow}>
                      <View style={{ alignItems: "center", gap: 6 }}>
                        {loyalty.qr_token ? <QRCode value={loyalty.qr_token} size={120} /> : null}
                        <Text style={styles.helper}>شارك الـ QR مع الكاشير لمسح البطاقة</Text>
                      </View>
                      <View style={{ gap: 6, flex: 1 }}>
                        <Text style={styles.value}>معرف العضوية</Text>
                        <Text style={styles.helper}>{loyalty.membership_id || "-"}</Text>
                        {loyalty.apple_wallet_pass_url ? (
                          <Pressable onPress={() => Linking.openURL(loyalty.apple_wallet_pass_url as string)} style={styles.linkBtn}>
                            <Text style={styles.link}>إضافة إلى Apple Wallet</Text>
                          </Pressable>
                        ) : null}
                        {loyalty.google_wallet_pass_url ? (
                          <Pressable onPress={() => Linking.openURL(loyalty.google_wallet_pass_url as string)} style={styles.linkBtn}>
                            <Text style={styles.link}>إضافة إلى Google Wallet</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.helper}>لا يوجد ملف ولاء متاح.</Text>
                )}
              </Card>

              <Card>
                <Text style={styles.sectionTitle}>طلباتي الأخيرة</Text>
                {loadingOrders ? (
                  <ActivityIndicator />
                ) : ordersError ? (
                  <Text style={[styles.helper, { color: "#ef4444" }]}>{ordersError}</Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {orders.map((o) => (
                      <View key={o.id} style={styles.listRow}>
                        <View style={{ flex: 1, alignItems: "flex-end" }}>
                          <Text style={styles.value}>طلب #{o.id}</Text>
                          <Text style={styles.helper}>{new Date(o.created_at).toLocaleString()}</Text>
                        </View>
                        <CurrencyAmount value={o.total} color="#b45309" symbolSize={12} textStyle={[styles.helper, { color: "#b45309" }]} />
                      </View>
                    ))}
                    {orders.length === 0 && <Text style={styles.helper}>لا توجد طلبات حتى الآن.</Text>}
                  </View>
                )}
                <Button title="اذهب لطلباتك" variant="secondary" onPress={() => goToTab(navigation, "Orders")} />
              </Card>

              <Pressable onPress={logout} style={styles.logout}>
                <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                <Text style={{ color: "#ef4444", fontWeight: "700" }}>تسجيل خروج</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    gap: 12,
  },
  heroRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  heroName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "right",
  },
  heroHelper: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "right",
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  actionRow: {
    flexDirection: "row-reverse",
    gap: 10,
  },
  fieldsRow: {
    gap: 10,
  },
  field: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    color: "#475569",
    textAlign: "right",
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    textAlign: "right",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    textAlign: "right",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "right",
    marginBottom: 8,
  },
  rowBetween: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  link: {
    color: "#F59E0B",
    fontWeight: "700",
  },
  helper: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "right",
  },
  listRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  loyaltyRow: {
    flexDirection: "row-reverse",
    gap: 12,
  },
  linksList: {
    gap: 10,
  },
  linkRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  linkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
  },
  linkRowText: {
    flex: 1,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  linkBtn: {
    paddingVertical: 8,
  },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
});

export default ProfileScreen;
