import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useTheme } from "../../theme";
import DashboardShell from "./components/DashboardShell";
import DashboardAccessDenied from "./components/DashboardAccessDenied";
import DashboardSection from "./components/DashboardSection";
import DashboardListItem from "./components/DashboardListItem";
import { hasAny } from "./components/permissions";

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
  const styles = useMemo(() => createStyles(theme), [theme]);
  const qc = useQueryClient();
  const { user, permissions } = useAuth();

  const allowed = hasAny(user, permissions, ["can_view_hr_dashboard", "can_manage_hr_documents"]);

  const [name, setName] = useState("");
  const [docType, setDocType] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: docs = [], isLoading } = useQuery<HRDocument[]>({
    queryKey: ["dashboard", "hr-documents"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("hr/my/documents/");
      return res.data?.results || res.data || [];
    },
  });

  const createDoc = async () => {
    if (!name.trim()) {
      Alert.alert("بيانات ناقصة", "أدخل اسم الوثيقة.");
      return;
    }
    setSaving(true);
    try {
      await api.post("hr/my/documents/", {
        name: name.trim(),
        doc_type: docType.trim() || undefined,
        issue_date: issueDate.trim() || undefined,
        expiry_date: expiryDate.trim() || undefined,
      });
      qc.invalidateQueries({ queryKey: ["dashboard", "hr-documents"] });
      setName("");
      setDocType("");
      setIssueDate("");
      setExpiryDate("");
      Alert.alert("تم الإرسال", "تم إرسال الوثيقة (قد تحتاج مراجعة).");
    } catch {
      Alert.alert("تعذر الإرسال", "حدث خطأ أثناء إرسال الوثيقة.");
    } finally {
      setSaving(false);
    }
  };

  if (!allowed) {
    return <DashboardAccessDenied title="وثائق الموارد البشرية" subtitle="رفع الوثائق ومتابعة حالتها." />;
  }

  return (
    <DashboardShell title="وثائق الموارد البشرية" subtitle="رفع الوثائق ومتابعة حالتها.">
      <DashboardSection title="رفع وثيقة" subtitle="أدخل البيانات ثم إرسال.">
        <Input label="اسم الوثيقة" value={name} onChangeText={setName} />
        <Input label="نوع الوثيقة (اختياري)" value={docType} onChangeText={setDocType} />
        <Input label="تاريخ الإصدار (YYYY-MM-DD)" value={issueDate} onChangeText={setIssueDate} />
        <Input label="تاريخ الانتهاء (YYYY-MM-DD)" value={expiryDate} onChangeText={setExpiryDate} />
        <Button title={saving ? "جارٍ الإرسال..." : "إرسال"} onPress={createDoc} disabled={saving} />
      </DashboardSection>

      <DashboardSection title="وثائقي" subtitle={isLoading ? "جاري التحميل..." : "آخر الوثائق."}>
        {docs.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>لا توجد وثائق.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {docs.slice(0, 50).map((d) => (
              <DashboardListItem
                key={d.id}
                title={d.name}
                subtitle={`النوع: ${d.doc_type || "-"} • الإصدار: ${d.issue_date || "-"} • الانتهاء: ${d.expiry_date || "-"} • الحالة: ${d.status || "-"}`}
                icon="document-text-outline"
              />
            ))}
          </View>
        )}
      </DashboardSection>
    </DashboardShell>
  );
};

const createStyles = (_theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    empty: {
      textAlign: "right",
      fontSize: 13,
    },
  });

export default DashboardHRDocuments;
