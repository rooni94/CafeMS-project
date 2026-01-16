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
      setMessage(t("accounting.paymentCollectionSuccess", "ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯ÙØ¹Ø©."));
    } catch (err) {
      setMessage(t("accounting.paymentCollectionError", "ØªØ¹Ø°Ø± ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯ÙØ¹Ø©."));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("accounting.paymentCollectionTitle", "ØªØ­ØµÙŠÙ„ Ø¯ÙØ¹Ø©")}</Text>
      <TextInput
        style={styles.input}
        placeholder={t("accounting.paymentCollectionCustomerPlaceholder", "Ø§Ù„Ù…Ø¹Ø±Ù / Ø§Ù„Ø¹Ù…ÙŠÙ„")}
        value={customer}
        onChangeText={setCustomer}
      />
      <TextInput
        style={styles.input}
        placeholder={t("accounting.amountPlaceholder", "Ø§Ù„Ù…Ø¨Ù„Øº")}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />
      <TextInput
        style={styles.input}
        placeholder={t("accounting.referencePlaceholder", "Ù…Ø±Ø¬Ø¹")}
        value={reference}
        onChangeText={setReference}
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
  message: { fontSize: 13, color: "#0f766e", marginVertical: 6 },
});

export default PaymentCollectionScreen;
