import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button } from "../../components/ui";
import { accountingApi } from "../../services/accounting";

const ExpenseCaptureScreen: React.FC = () => {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [attachment, setAttachment] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
      setMessage("تم حفظ المصروف.");
    } catch {
      setMessage("تعذر حفظ المصروف.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>التقاط إيصال</Text>
      <TextInput
        style={styles.input}
        placeholder="وصف المصروف"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={styles.input}
        placeholder="المبلغ"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />
      <Button label="التقاط إيصال" onPress={pickImage} />
      {attachment && <Text style={styles.note}>تم إرفاق صورة: {attachment.fileName || "receipt"}</Text>}
      {message && <Text style={styles.message}>{message}</Text>}
      <Button label="حفظ المصروف" onPress={submit} />
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
