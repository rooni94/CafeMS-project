import React, { useState } from "react";
import { Text, StyleSheet, ScrollView, View, TextInput, Alert, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Screen from "../../components/Screen";
import { Card, Button } from "../../components/ui";
import { useTheme } from "../../theme";
import { api } from "../../services/api";

type ContactMessage = {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  is_read?: boolean;
};

const DashboardMessages: React.FC = () => {
  const theme = useTheme();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reply, setReply] = useState<string>("");
  const { data: messages } = useQuery<ContactMessage[]>({
    queryKey: ["contact-messages"],
    queryFn: async () => {
      const res = await api.get("contact/messages/");
      return res.data.results || res.data;
    },
  });

  const sendReply = async () => {
    if (!selectedId || !reply.trim()) {
      Alert.alert("تنبيه", "اختر رسالة واكتب الرد.");
      return;
    }
    try {
      await api.post(`contact/messages/${selectedId}/reply/`, { reply });
      Alert.alert("تم", "تم إرسال الرد.");
      setReply("");
    } catch {
      Alert.alert("خطأ", "تعذر إرسال الرد.");
    }
  };

  return (
    <Screen style={{ backgroundColor: theme.palette.background }}>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
        <Card>
          <Text style={styles.title}>الرسائل والاستفسارات</Text>
          <Text style={styles.helper}>عرض رسائل التواصل والرد عليها وإدارتها.</Text>
        </Card>

        <Card style={{ gap: 8 }}>
          <Text style={styles.sectionTitle}>الإجراءات</Text>
          <Button title="صندوق الوارد" onPress={() => {}} />
          <Button title="مقروءة" variant="secondary" onPress={() => {}} />
          <Button title="المؤرشفة" variant="ghost" onPress={() => {}} />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>قائمة الرسائل</Text>
          {messages && messages.length > 0 ? (
            <View style={{ marginTop: 8, gap: 10 }}>
              {messages.slice(0, 5).map((msg) => (
                <Pressable
                  key={msg.id}
                  style={[
                    styles.row,
                    selectedId === msg.id && { backgroundColor: "#f1f5f9" },
                  ]}
                  onPress={() => setSelectedId(msg.id)}
                >
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.msgTitle}>{msg.subject || "بدون عنوان"}</Text>
                    <Text style={styles.msgSub}>
                      {msg.name || "ضيف"} • {msg.email || msg.phone || ""}
                    </Text>
                    <Text style={styles.msgBody} numberOfLines={2}>
                      {msg.message}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: msg.is_read ? "#e5e7eb" : "#fef08a" }]}>
                    <Text style={styles.badgeText}>{msg.is_read ? "مقروء" : "جديد"}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.helper}>لا توجد رسائل حالياً.</Text>
          )}
        </Card>

        <Card style={{ gap: 10 }}>
          <Text style={styles.sectionTitle}>رد على رسالة</Text>
          <Text style={styles.helper}>
            اختر رسالة من القائمة، ثم اكتب الرد هنا.
          </Text>
          <TextInput
            placeholder="اكتب الرد..."
            placeholderTextColor="#94a3b8"
            value={reply}
            onChangeText={setReply}
            style={styles.input}
            multiline
            textAlign="right"
          />
          <Button title="إرسال الرد" onPress={sendReply} />
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
  },
  helper: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "right",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 6,
  },
  row: {
    flexDirection: "row-reverse",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  msgTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  msgSub: {
    fontSize: 12,
    color: "#6b7280",
  },
  msgBody: {
    fontSize: 12,
    color: "#374151",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#fff",
    textAlignVertical: "top",
    minHeight: 80,
  },
});

export default DashboardMessages;
