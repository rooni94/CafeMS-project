import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button } from "../../components/ui";
import { accountingApi } from "../../services/accounting";
import { useI18n } from "../../i18n";

const ExpenseCaptureScreen: React.FC = () => {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [attachment, setAttachment] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { t, isRTL } = useI18n();

  const pickImage = async () => {
    const res = await ImagePicker.launchCameraAsync({ base64: false });
    if (!res.canceled) {
      setAttachment(res.assets[0]);
    }
  };

  const submit = async () => {
    setMessage(null);
    const payload: any = {
      title,
      amount: Number(amount) || 0,
      category: "operational",
    };
    try {
      await accountingApi.recordExpense(payload);
      setMessage(t("accounting.expenseSaveSuccess", "ØªÙ… Ø­ÙØ¸ Ø§Ù„Ù…ØµØ±ÙˆÙ."));
    } catch {
      setMessage(t("accounting.expenseSaveError", "ØªØ¹Ø°Ø± Ø­ÙØ¸ Ø§Ù„Ù…ØµØ±ÙˆÙ."));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("accounting.expenseCaptureTitle", "Ø§Ù„ØªÙ‚Ø§Ø· Ø¥ÙŠØµØ§Ù„")}</Text>
      <TextInput
        style={styles.input}
        placeholder={t("accounting.expenseDescriptionPlaceholder", "ÙˆØµÙ Ø§Ù„Ù…ØµØ±ÙˆÙ")}
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={styles.input}
        placeholder={t("accounting.amountPlaceholder", "Ø§Ù„Ù…Ø¨Ù„Øº")}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />
      <Button title={t("accounting.captureReceiptButton", "Ø§Ù„ØªÙ‚Ø§Ø· Ø¥ÙŠØµØ§Ù„")} onPress={pickImage} />
      {attachment && (
        <Text style={styles.note}>
          {t("accounting.attachmentAdded", "ØªÙ… Ø¥Ø±ÙØ§Ù‚ ØµÙˆØ±Ø©")}: {attachment.fileName || "receipt"}
        </Text>
      )}
      {message && <Text style={styles.message}>{message}</Text>}
      <Button title={t("accounting.saveExpenseButton", "Ø­ÙØ¸ Ø§Ù„Ù…ØµØ±ÙˆÙ")} onPress={submit} />
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
  note: { fontSize: 12, marginVertical: 6 },
  message: { fontSize: 13, color: "#0f766e", marginVertical: 6 },
});

export default ExpenseCaptureScreen;
