import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Alert } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Button } from "../../components/ui";
import { useTheme } from "../../theme";
import { api } from "../../services/api";
import DashboardShell from "./components/DashboardShell";

type HRDocument = {
  id: number;
  name: string;
  doc_type?: string;
  issue_date?: string;
  expiry_date?: string;
  status?: string;
  file?: string;
};

const DashboardHRDocuments: React.FC = () => {
  const theme = useTheme();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [docType, setDocType] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const { data: docs } = useQuery<HRDocument[]>({
    queryKey: ["hr-documents"],
    queryFn: async () => {
      const res = await api.get("hr/my/documents/");
      return res.data.results || res.data;
    },
  });

  const uploadDoc = async () => {
    if (!name.trim()) {
      Alert.alert("تنبيه", "أدخل اسم المستند.");
      return;
    }
    try {
      await api.post("hr/my/documents/", {
        name: name.trim(),
        doc_type: docType || undefined,
        issue_date: issueDate || undefined,
        expiry_date: expiryDate || undefined,
      });
      qc.invalidateQueries({ queryKey: ["hr-documents"] });
      setName("");
      setDocType("");
      setIssueDate("");
      setExpiryDate("");
      Alert.alert("تم", "تم رفع المستند (بدون ملف).");
    } catch {
      Alert.alert("خطأ", "تعذر رفع المستند.");
    }
  };

  return (
    <DashboardShell title="مستندات الموارد البشرية" subtitle="إضافة مستندات ومتابعة حالات الانتهاء والتنبيه.">
        <Card>
          <Text style={styles.title}>مستنداتي</Text>
          <Text style={styles.helper}>رفع مستندات الموارد البشرية (اسم، نوع، تواريخ).</Text>
        </Card>

        <Card style={{ gap: 8 }}>
          <Text style={styles.sectionTitle}>رفع مستند</Text>
          <TextInput placeholder="اسم المستند" value={name} onChangeText={setName} style={styles.input} textAlign="right" />
          <TextInput placeholder="نوع المستند" value={docType} onChangeText={setDocType} style={styles.input} textAlign="right" />
          <TextInput placeholder="تاريخ الإصدار (YYYY-MM-DD)" value={issueDate} onChangeText={setIssueDate} style={styles.input} textAlign="right" />
          <TextInput placeholder="تاريخ الانتهاء (YYYY-MM-DD)" value={expiryDate} onChangeText={setExpiryDate} style={styles.input} textAlign="right" />
          <Button title="رفع المستند" onPress={uploadDoc} />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>قائمة المستندات</Text>
          {docs && docs.length > 0 ? (
            <View style={{ marginTop: 8, gap: 10 }}>
              {docs.map((d) => (
                <View key={d.id} style={styles.row}>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.name}>{d.name}</Text>
                    <Text style={styles.sub}>النوع: {d.doc_type || "-"}</Text>
                    <Text style={styles.sub}>الإصدار: {d.issue_date || "-"}</Text>
                    <Text style={styles.sub}>الانتهاء: {d.expiry_date || "-"}</Text>
                    <Text style={styles.sub}>الحالة: {d.status || "-"}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.helper}>لا يوجد مستندات.</Text>
          )}
        </Card>
    </DashboardShell>
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
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 10,
    textAlign: "right",
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
  },
  sub: {
    fontSize: 12,
    color: "#6b7280",
  },
});

export default DashboardHRDocuments;
