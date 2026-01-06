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
import { useI18n } from "../../i18n";

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
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);
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
      Alert.alert(
        t("dashboard.hrDocsMissingTitle", "بيانات ناقصة"),
        t("dashboard.hrDocsMissingBody", "أدخل اسم الوثيقة.")
      );
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
      Alert.alert(
        t("dashboard.hrDocsSentTitle", "تم الإرسال"),
        t("dashboard.hrDocsSentBody", "تم إرسال الوثيقة (قد تحتاج مراجعة).")
      );
    } catch {
      Alert.alert(
        t("dashboard.hrDocsSendErrorTitle", "تعذر الإرسال"),
        t("dashboard.hrDocsSendErrorBody", "حدث خطأ أثناء إرسال الوثيقة.")
      );
    } finally {
      setSaving(false);
    }
  };

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title={t("dashboard.hrDocsTitle", "وثائق الموارد البشرية")}
        subtitle={t("dashboard.hrDocsSubtitle", "رفع الوثائق ومتابعة حالتها.")}
      />
    );
  }

  return (
    <DashboardShell title={t("dashboard.hrDocsTitle", "وثائق الموارد البشرية")} subtitle={t("dashboard.hrDocsSubtitle", "رفع الوثائق ومتابعة حالتها.")}>
      <DashboardSection title={t("dashboard.hrDocsUploadTitle", "رفع وثيقة")} subtitle={t("dashboard.hrDocsUploadSubtitle", "أدخل البيانات ثم إرسال.")}>
        <Input label={t("dashboard.hrDocsNameLabel", "اسم الوثيقة")} value={name} onChangeText={setName} />
        <Input label={t("dashboard.hrDocsTypeLabel", "نوع الوثيقة (اختياري)")} value={docType} onChangeText={setDocType} />
        <Input label={t("dashboard.hrDocsIssueDateLabel", "تاريخ الإصدار (YYYY-MM-DD)")} value={issueDate} onChangeText={setIssueDate} />
        <Input label={t("dashboard.hrDocsExpiryDateLabel", "تاريخ الانتهاء (YYYY-MM-DD)")} value={expiryDate} onChangeText={setExpiryDate} />
        <Button title={saving ? t("common.sending", "جارٍ الإرسال...") : t("common.send", "إرسال")} onPress={createDoc} disabled={saving} />
      </DashboardSection>

      <DashboardSection title={t("dashboard.hrDocsMineTitle", "وثائقي")} subtitle={isLoading ? t("common.loading", "جاري التحميل...") : t("dashboard.hrDocsMineSubtitle", "آخر الوثائق.")}>
        {docs.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>{t("dashboard.hrDocsEmpty", "لا توجد وثائق.")}</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {docs.slice(0, 50).map((d) => (
              <DashboardListItem
                key={d.id}
                title={d.name}
                subtitle={`${t("dashboard.hrDocsTypeLabelShort", "النوع")}: ${d.doc_type || "-"} • ${t("dashboard.hrDocsIssueLabelShort", "الإصدار")}: ${d.issue_date || "-"} • ${t("dashboard.hrDocsExpiryLabelShort", "الانتهاء")}: ${d.expiry_date || "-"} • ${t("dashboard.hrDocsStatusLabelShort", "الحالة")}: ${d.status || "-"}`}
                icon="document-text-outline"
              />
            ))}
          </View>
        )}
      </DashboardSection>
    </DashboardShell>
  );
};

const createStyles = (_theme: ReturnType<typeof useTheme>, isRTL: boolean) =>
  StyleSheet.create({
    empty: {
      textAlign: isRTL ? "right" : "left",
      fontSize: 13,
    },
  });

export default DashboardHRDocuments;