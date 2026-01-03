import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import EmptyState from "../../components/EmptyState";
import LoadingState from "../../components/LoadingState";
import CurrencyAmount from "../../components/CurrencyAmount";
import { Button, Input, Select } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { api, parseApiError } from "../../services/api";
import { useTheme } from "../../theme";
import { Address, DeliveryMode, PaymentMethod } from "../../types";
import DashboardShell from "../dashboard/components/DashboardShell";
import DashboardSection from "../dashboard/components/DashboardSection";
import DashboardTile from "../dashboard/components/DashboardTile";

const paymentLabel = (method: PaymentMethod) => {
  if (method === "cash") return "دفع نقدي عند الاستلام";
  if (method === "card") return "بطاقة (جهاز نقاط البيع)";
  return "محفظة رقمية";
};

const deliveryLabel = (mode: DeliveryMode) => {
  if (mode === "pickup") return "استلام من المتجر";
  return "توصيل للعنوان";
};

const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user } = useAuth();
  const { items, totalPrice, clearCart, removeItem } = useCart();

  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("pickup");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<number | "custom">("custom");
  const [customAddress, setCustomAddress] = useState("");
  const [addressesLoading, setAddressesLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasItems = items.length > 0;

  useEffect(() => {
    if (!user) return;
    const loadAddresses = async () => {
      setAddressesLoading(true);
      try {
        const res = await api.get("auth/addresses/");
        const data: Address[] = res.data?.results || res.data || [];
        setAddresses(data);
        if (data.length) {
          const def = data.find((addr) => addr.is_default) || data[0];
          setAddressId(def.id);
        } else {
          setAddressId("custom");
        }
      } catch {
        setAddresses([]);
        setAddressId("custom");
      } finally {
        setAddressesLoading(false);
      }
    };
    loadAddresses();
  }, [user]);

  const selectedAddress =
    addressId === "custom"
      ? customAddress.trim()
      : addresses.find((addr) => addr.id === addressId)?.details || "";

  const summaryRows = useMemo(
    () => [
      { label: "قيمة الأصناف", kind: "currency" as const, value: totalPrice },
      {
        label: "رسوم التوصيل",
        kind: deliveryMode === "delivery" ? ("text" as const) : ("currency" as const),
        value: deliveryMode === "delivery" ? "يتم حسابها عند التأكيد" : 0,
      },
      { label: "الإجمالي المبدئي", kind: "currency" as const, value: totalPrice },
    ],
    [totalPrice, deliveryMode]
  );

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert("تسجيل الدخول مطلوب", "يرجى تسجيل الدخول أو إنشاء حساب لإكمال الطلب.", [
        { text: "تسجيل الدخول", onPress: () => navigation.navigate("Login") },
        { text: "إنشاء حساب", onPress: () => navigation.navigate("Register") },
        { text: "إلغاء", style: "cancel" },
      ]);
      return;
    }

    if (!items.length) return;
    if (deliveryMode === "delivery" && (!selectedAddress || !selectedAddress.trim())) {
      setError("يرجى إدخال عنوان التوصيل.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        order_type: deliveryMode === "pickup" ? "takeaway" : "delivery",
        payment_method: paymentMethod === "card" ? "card_pos" : paymentMethod,
        delivery_address: deliveryMode === "delivery" ? selectedAddress : "",
        customer_name: user?.username,
        token: (typeof api.defaults.headers.common["Authorization"] === "string"
          ? (api.defaults.headers.common["Authorization"] as string).replace(/^Bearer\s+/i, "")
          : undefined),
        items: items.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          addon_ids: item.addons?.map((addon) => addon.id) || [],
        })),
      };
      const res = await api.post("orders/", payload);
      clearCart();
      Alert.alert("تم إنشاء الطلب", "تم إرسال طلبك بنجاح، يمكنك متابعة حالته الآن.");
      navigation.navigate("OrderTracking", { orderId: res.data?.id });
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasItems) {
    return (
      <DashboardShell title="إتمام الطلب" subtitle="أضف أصنافاً للسلة للمتابعة بإتمام الطلب.">
        <DashboardSection>
          <EmptyState title="لا يوجد طلب" description="أضف أصنافاً للسلة للمتابعة بإتمام الطلب." />
        </DashboardSection>
      </DashboardShell>
    );
  }

  if (!user) {
    return (
      <DashboardShell title="إتمام الطلب" subtitle="سجّل دخولك لإتمام الطلب وتتبع حالته.">
        <DashboardSection title="قبل إتمام الطلب" subtitle="نحتاج حسابك لحفظ العنوان والدفع وتتبع الطلب.">
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
        </DashboardSection>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="إتمام الطلب" subtitle="راجع طلبك ثم اختر طريقة الاستلام والدفع.">
      <DashboardSection title="مراجعة الطلب" subtitle="تأكد من الأصناف والكميات.">
        <View style={{ gap: 8 }}>
          {items.map((item) => (
            <View key={item.key} style={[styles.lineRow, { borderColor: theme.palette.border }]}>
              <View style={styles.lineBody}>
                <Text style={[styles.itemName, { color: theme.palette.text }]} numberOfLines={2}>
                  {item.name}
                </Text>
                {item.addons && item.addons.length > 0 ? (
                  <Text style={[styles.itemAddons, { color: theme.palette.muted }]} numberOfLines={2}>
                    + {item.addons.map((addon) => addon.name).join("، ")}
                  </Text>
                ) : null}
                <View style={styles.itemMetaRow}>
                  <Text style={[styles.itemMetaText, { color: theme.palette.muted }]}>× {item.quantity}</Text>
                  <CurrencyAmount value={item.price} color={theme.palette.muted} symbolSize={12} textStyle={styles.itemMetaText} />
                </View>
              </View>

              <Button
                title="حذف"
                variant="ghost"
                color="transparent"
                textColor={theme.palette.danger}
                onPress={() => removeItem(item.key)}
                contentStyle={{ paddingVertical: 0 }}
                style={{ alignSelf: "flex-start" }}
              />
            </View>
          ))}
        </View>

        <View style={[styles.summary, { borderColor: theme.palette.border }]}>
          {summaryRows.map((row) => (
            <View style={styles.summaryRow} key={row.label}>
              <Text style={[styles.summaryLabel, { color: theme.palette.muted }]}>{row.label}</Text>
              {row.kind === "currency" ? (
                <CurrencyAmount value={row.value as number} color={theme.palette.text} symbolSize={12} textStyle={styles.summaryValue} />
              ) : (
                <Text style={[styles.summaryValue, { color: theme.palette.text }]}>{row.value as string}</Text>
              )}
            </View>
          ))}
        </View>
      </DashboardSection>

      <DashboardSection title="طريقة الاستلام" subtitle={`المحدد حالياً: ${deliveryLabel(deliveryMode)}`}>
        <View style={styles.chipGroup}>
          {(["pickup", "delivery"] as DeliveryMode[]).map((mode) => {
            const active = deliveryMode === mode;
            return (
              <View key={mode} style={styles.chipItem}>
                <Pressable
                  onPress={() => setDeliveryMode(mode)}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? theme.palette.accent : theme.palette.border,
                      backgroundColor: active ? `${theme.palette.accent}18` : theme.palette.surfaceAlt,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? theme.palette.accent : theme.palette.text }]}>
                    {deliveryLabel(mode)}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        {deliveryMode === "delivery" ? (
          <View style={{ gap: 8 }}>
            {addressesLoading ? <LoadingState message="جارٍ تحميل العناوين..." /> : null}
            {!addressesLoading && addresses.length ? (
              <View style={{ gap: 8 }}>
                {addresses.map((addr) => {
                  const active = addressId === addr.id;
                  return (
                    <Pressable
                      key={addr.id}
                      onPress={() => setAddressId(addr.id)}
                      style={[
                        styles.addressCard,
                        {
                          borderColor: active ? theme.palette.accent : theme.palette.border,
                          backgroundColor: active ? `${theme.palette.accent}12` : theme.palette.surface,
                        },
                      ]}
                    >
                      <Text style={[styles.addressLabel, { color: theme.palette.text }]}>{addr.label}</Text>
                      <Text style={[styles.addressDetails, { color: theme.palette.muted }]}>{addr.details}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <Input
              label="عنوان التوصيل (يدوي)"
              placeholder="اكتب عنوان التوصيل بالتفصيل"
              value={addressId === "custom" ? customAddress : selectedAddress}
              onChangeText={(text) => {
                setAddressId("custom");
                setCustomAddress(text);
              }}
              multiline
              numberOfLines={4}
            />
          </View>
        ) : null}
      </DashboardSection>

      <DashboardSection title="طريقة الدفع" subtitle="اختر طريقة الدفع من القائمة.">
        <Select
          label="طريقة الدفع"
          value={paymentMethod}
          onChange={(v) => setPaymentMethod(v as PaymentMethod)}
          options={[
            { value: "cash", label: paymentLabel("cash") },
            { value: "card", label: paymentLabel("card") },
            { value: "wallet", label: paymentLabel("wallet") },
          ]}
        />
      </DashboardSection>

      {error ? (
        <DashboardSection>
          <Text style={[styles.errorText, { color: theme.palette.danger }]}>{error}</Text>
        </DashboardSection>
      ) : null}

      <DashboardSection>
        <Button title={submitting ? "جارٍ التأكيد..." : "تأكيد الطلب"} onPress={handleSubmit} disabled={submitting} loading={submitting} />
      </DashboardSection>
    </DashboardShell>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    lineRow: {
      flexDirection: "row-reverse",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 10,
      borderWidth: 1,
      borderRadius: 16,
      padding: 10,
      backgroundColor: theme.palette.surface,
    },
    lineBody: {
      flex: 1,
      alignItems: "flex-end",
      gap: 3,
    },
    itemName: {
      fontSize: 14,
      fontWeight: "900",
      textAlign: "right",
    },
    itemAddons: {
      fontSize: 12,
      lineHeight: 16,
      textAlign: "right",
    },
    itemMetaRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 8,
    },
    itemMetaText: {
      fontSize: 12,
      fontWeight: "800",
      textAlign: "right",
    },
    summary: {
      borderTopWidth: 1,
      paddingTop: 10,
      marginTop: 8,
      gap: 8,
    },
    summaryRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
    },
    summaryLabel: {
      fontSize: 12,
      fontWeight: "800",
      textAlign: "right",
    },
    summaryValue: {
      fontSize: 13,
      fontWeight: "900",
      textAlign: "right",
    },
    chipGroup: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    chipItem: {
      width: "49.5%",
      marginBottom: 6,
    },
    chip: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    chipText: {
      fontSize: 12,
      fontWeight: "900",
      textAlign: "center",
      writingDirection: "rtl",
    },
    addressCard: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 10,
      gap: 4,
    },
    addressLabel: {
      fontSize: 13,
      fontWeight: "900",
      textAlign: "right",
    },
    addressDetails: {
      fontSize: 12,
      lineHeight: 18,
      textAlign: "right",
    },
    errorText: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "800",
      textAlign: "right",
    },
  });

export default CheckoutScreen;


