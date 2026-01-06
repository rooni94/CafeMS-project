import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Button } from "../../components/ui";
import { accountingApi } from "../../services/accounting";
import { useI18n } from "../../i18n";

const QuickInvoiceScreen: React.FC = () => {
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const { t } = useI18n();

  const submit = async () => {
    setMessage(null);
    try {
      await accountingApi.quickInvoice({
        order: Number(orderId) || null,
        total_amount: Number(amount) || 0,
      });
      setMessage(t("accounting.quickInvoiceSuccess", "تم إنشاء فاتورة سريعة"));
    } catch (err: any) {
      setMessage(t("accounting.quickInvoiceError", "تعذر إنشاء الفاتورة"));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("accounting.quickInvoiceTitle", "فاتورة سريعة")}</Text>
      <TextInput
        style={styles.input}
        placeholder={t("accounting.orderIdPlaceholder", "رقم الطلب")}
        keyboardType="numeric"
        value={orderId}
        onChangeText={setOrderId}
      />
      <TextInput
        style={styles.input}
        placeholder={t("accounting.amountPlaceholder", "المبلغ")}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
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
  message: { fontSize: 13, color: "#0f766e", marginBottom: 8 },
});

export default QuickInvoiceScreen;
