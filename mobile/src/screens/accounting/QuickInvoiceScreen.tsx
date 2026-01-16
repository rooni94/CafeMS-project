import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Button } from "../../components/ui";
import { accountingApi } from "../../services/accounting";
import { useI18n } from "../../i18n";

const QuickInvoiceScreen: React.FC = () => {
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const { t, isRTL } = useI18n();

  const submit = async () => {
    setMessage(null);
    try {
      await accountingApi.quickInvoice({
        order: Number(orderId) || null,
        total_amount: Number(amount) || 0,
      });
      setMessage(t("accounting.quickInvoiceSuccess", "ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ ÙØ§ØªÙˆØ±Ø© Ø³Ø±ÙŠØ¹Ø©"));
    } catch (err: any) {
      setMessage(t("accounting.quickInvoiceError", "ØªØ¹Ø°Ø± Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„ÙØ§ØªÙˆØ±Ø©"));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("accounting.quickInvoiceTitle", "ÙØ§ØªÙˆØ±Ø© Ø³Ø±ÙŠØ¹Ø©")}</Text>
      <TextInput
        style={styles.input}
        placeholder={t("accounting.orderIdPlaceholder", "Ø±Ù‚Ù… Ø§Ù„Ø·Ù„Ø¨")}
        keyboardType="numeric"
        value={orderId}
        onChangeText={setOrderId}
      />
      <TextInput
        style={styles.input}
        placeholder={t("accounting.amountPlaceholder", "Ø§Ù„Ù…Ø¨Ù„Øº")}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />
      {message && <Text style={styles.message}>{message}</Text>}
      <Button title={t("common.save", "Ø­ÙØ¸")} onPress={submit} />
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
