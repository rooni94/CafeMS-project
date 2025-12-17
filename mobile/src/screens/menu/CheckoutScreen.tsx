import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert } from "react-native";
import Screen from "../../components/Screen";
import EmptyState from "../../components/EmptyState";
import LoadingState from "../../components/LoadingState";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { Address, DeliveryMode, PaymentMethod } from "../../types";
import { api, parseApiError } from "../../services/api";
import { useNavigation } from "@react-navigation/native";
import CurrencyAmount from "../../components/CurrencyAmount";

const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<any>();
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

  const hasItems = items.length > 0;
  const selectedAddress = addressId === "custom" ? customAddress.trim() : addresses.find((addr) => addr.id === addressId)?.details || "";

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

  if (!hasItems) {
    return (
      <Screen scrollable={false}>
        <EmptyState title="لا يوجد طلب" description="أضف أصنافاً للسلة للمتابعة بإتمام الطلب." />
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen scrollable={false}>
        <EmptyState
          title="سجل الدخول لإتمام الطلب"
          description="نحتاج حسابك لحفظ العنوان والدفع وتتبع الطلب."
        >
          <Pressable onPress={() => navigation.navigate("Login")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>تسجيل الدخول</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Register")} style={[styles.secondaryButton, { marginTop: 10 }]}>
            <Text style={styles.secondaryText}>إنشاء حساب جديد</Text>
          </Pressable>
        </EmptyState>
      </Screen>
    );
  }

  const handleSubmit = async () => {
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
      const message = parseApiError(err);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>مراجعة الطلب</Text>
        {items.map((item) => (
          <View style={styles.orderRow} key={item.key}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.addons && item.addons.length > 0 ? (
                <Text style={styles.itemAddons}>+ {item.addons.map((addon) => addon.name).join("? ")}</Text>
              ) : null}
              <View style={styles.itemMetaRow}>
                <CurrencyAmount value={item.price} color="#6b7280" symbolSize={12} textStyle={styles.itemMetaText} />
                <Text style={styles.itemMetaText}>× {item.quantity}</Text>
              </View>
            </View>
            <Pressable onPress={() => removeItem(item.key)}>
              <Text style={styles.removeText}>حذف</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.summary}>
          {summaryRows.map((row) => (
            <View style={styles.summaryRow} key={row.label}>
              <Text style={styles.summaryLabel}>{row.label}</Text>
              {row.kind === "currency" ? (
                <CurrencyAmount value={row.value as number} color="#111827" symbolSize={12} textStyle={styles.summaryValue} />
              ) : (
                <Text style={styles.summaryValue}>{row.value as string}</Text>
              )}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>طريقة الاستلام</Text>
        <View style={styles.chipGroup}>
          <Pressable
            onPress={() => setDeliveryMode("pickup")}
            style={[styles.chip, deliveryMode === "pickup" && styles.chipActive]}
          >
            <Text style={[styles.chipText, deliveryMode === "pickup" && styles.chipTextActive]}>استلام من المتجر</Text>
          </Pressable>
          <Pressable
            onPress={() => setDeliveryMode("delivery")}
            style={[styles.chip, deliveryMode === "delivery" && styles.chipActive]}
          >
            <Text style={[styles.chipText, deliveryMode === "delivery" && styles.chipTextActive]}>توصيل للعنوان</Text>
          </Pressable>
        </View>
        {deliveryMode === "delivery" && (
          <View style={{ gap: 8 }}>
            {addressesLoading ? (
              <LoadingState message="جارٍ تحميل العناوين..." />
            ) : (
              <>
                {addresses.map((addr) => (
                  <Pressable
                    key={addr.id}
                    onPress={() => setAddressId(addr.id)}
                    style={[styles.addressCard, addressId === addr.id && styles.addressActive]}
                  >
                    <Text style={styles.addressLabel}>{addr.label}</Text>
                    <Text style={styles.addressDetails}>{addr.details}</Text>
                  </Pressable>
                ))}
              </>
            )}
            <TextInput
              style={styles.textarea}
              multiline
              numberOfLines={4}
              placeholder="اكتب عنوان التوصيل بالتفصيل"
              placeholderTextColor="#a8a29e"
              value={addressId === "custom" ? customAddress : addresses.find((addr) => addr.id === addressId)?.details || ""}
              onChangeText={(text) => {
                setAddressId("custom");
                setCustomAddress(text);
              }}
            />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>طريقة الدفع</Text>
        <View style={styles.chipGroup}>
          {(["cash", "card", "wallet"] as PaymentMethod[]).map((method) => (
            <Pressable
              key={method}
              onPress={() => setPaymentMethod(method)}
              style={[styles.chip, paymentMethod === method && styles.chipActive]}
            >
              <Text style={[styles.chipText, paymentMethod === method && styles.chipTextActive]}>
                {method === "cash" ? "دفع نقدي عند الاستلام" : method === "card" ? "بطاقة (جهاز نقاط البيع)" : "محفظة رقمية"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable onPress={handleSubmit} disabled={submitting} style={[styles.submitButton, submitting && { opacity: 0.7 }]}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>تأكيد الطلب</Text>}
      </Pressable>
    </Screen>
  );
};

const styles = StyleSheet.create({
  section: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#fef3c7",
    backgroundColor: "#fff",
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontWeight: "700",
    fontSize: 16,
    color: "#92400e",
    textAlign: "right",
  },
  orderRow: {
    flexDirection: "row-reverse",
    gap: 12,
    alignItems: "center",
  },
  itemName: {
    fontWeight: "600",
    textAlign: "right",
  },
  itemAddons: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "right",
  },
  itemMetaRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  itemMetaText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "right",
  },
  removeText: {
    color: "#dc2626",
    fontSize: 12,
  },
  summary: {
    borderTopWidth: 1,
    borderColor: "#fef3c7",
    paddingTop: 12,
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    color: "#6b7280",
  },
  summaryValue: {
    fontWeight: "700",
    color: "#b45309",
  },
  chipGroup: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  chipActive: {
    backgroundColor: "#f59e0b",
    borderColor: "#f59e0b",
  },
  chipText: {
    color: "#92400e",
    fontSize: 12,
  },
  chipTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  addressCard: {
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  addressActive: {
    borderColor: "#f59e0b",
    backgroundColor: "#fffbeb",
  },
  addressLabel: {
    fontWeight: "700",
    textAlign: "right",
  },
  addressDetails: {
    textAlign: "right",
    color: "#6b7280",
    fontSize: 12,
  },
  textarea: {
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderRadius: 16,
    padding: 12,
    textAlignVertical: "top",
    minHeight: 90,
  },
  errorText: {
    color: "#dc2626",
    textAlign: "right",
  },
  submitButton: {
    borderRadius: 999,
    backgroundColor: "#f59e0b",
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
  },
  submitText: {
    color: "#fff",
    fontWeight: "700",
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: "#f59e0b",
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  secondaryText: {
    color: "#4b5563",
    fontWeight: "600",
  },
});

export default CheckoutScreen;
