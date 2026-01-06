import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Button } from "../../components/ui";
import { accountingApi } from "../../services/accounting";
import { useI18n } from "../../i18n";

const PaymentCollectionScreen: React.FC = () => {
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const { t, isRTL } = useI18n();

  const submit = async () => {
    setMessage(null);
    try {
      await accountingApi.recordPayment({
        direction: "incoming",
        amount: Number(amount) || 0,
        customer,
        reference,
      });
      setMessage(t("accounting.paymentCollectionSuccess", "تم تسجيل الدفعة."));
    } catch (err) {
      setMessage(t("accounting.paymentCollectionError", "تعذر تسجيل الدفعة."));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("accounting.paymentCollectionTitle", "تحصيل دفعة")}</Text>
      <TextInput
        style={styles.input}
        placeholder={t("accounting.paymentCollectionCustomerPlaceholder", "المعرف / العميل")}
        value={customer}
        onChangeText={setCustomer}
      />
      <TextInput
        style={styles.input}
        placeholder={t("accounting.amountPlaceholder", "المبلغ")}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />
      <TextInput
        style={styles.input}
        placeholder={t("accounting.referencePlaceholder", "مرجع")}
        value={reference}
        onChangeText={setReference}
      />
      {message && <Text style={styles.message}>{message}</Text>}
      <Button label={t("common.save", "حفظ")} onPress={submit} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  message: { fontSize: 13, color: "#0f766e", marginVertical: 6 },
});

export default PaymentCollectionScreen;
