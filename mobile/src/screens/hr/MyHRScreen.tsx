import React, { useMemo, useState } from "react";
import { Alert, Image, Linking, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";

import { Button, Input, Select } from "../../components/ui";
import { api } from "../../services/api";
import { useTheme } from "../../theme";
import DashboardShell from "../dashboard/components/DashboardShell";
import DashboardSection from "../dashboard/components/DashboardSection";
import DashboardListItem from "../dashboard/components/DashboardListItem";
import { copy } from "../../config/copy";

type MyLeave = {
  id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  reason?: string | null;
  created_at?: string;
};

type MyAttendance = {
  id: number;
  date: string;
  check_in?: string | null;
  check_out?: string | null;
  status: string;
  total_hours?: string;
};

type MyDocument = {
  id: number;
  document_type: string;
  document_name: string;
  issue_date?: string | null;
  expiry_date?: string | null;
  file?: string | null;
  is_expired?: boolean;
  is_expiring_soon?: boolean;
  days_to_expiry?: number | null;
};

const DOC_LABELS: Record<string, string> = {
  passport: "جواز سفر",
  residence: "إقامة",
  contract: "عقد",
  certificate: "شهادة",
  insurance: "تأمين",
  other: "أخرى",
};

const docTypeOptions = Object.entries(DOC_LABELS).map(([value, label]) => ({ value, label }));

const todayIso = () => new Date().toISOString().slice(0, 10);
const lastDaysIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const MyHRScreen: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const qc = useQueryClient();

  const [attendanceMsg, setAttendanceMsg] = useState<string | null>(null);

  const [leaveType, setLeaveType] = useState("annual");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveSaving, setLeaveSaving] = useState(false);

  const [docType, setDocType] = useState<string>("passport");
  const [docName, setDocName] = useState("");
  const [docIssueDate, setDocIssueDate] = useState("");
  const [docExpiryDate, setDocExpiryDate] = useState("");
  const [docFileUri, setDocFileUri] = useState<string | null>(null);
  const [docSaving, setDocSaving] = useState(false);

  const { data: attendance = [] } = useQuery<MyAttendance[]>({
    queryKey: ["my-hr", "attendance"],
    queryFn: async () => {
      const fromStr = lastDaysIso(14);
      const res = await api.get("hr/my/attendance/", { params: { from: fromStr } });
      return res.data || [];
    },
  });

  const { data: leaves = [] } = useQuery<MyLeave[]>({
    queryKey: ["my-hr", "leaves"],
    queryFn: async () => {
      const res = await api.get("hr/my/leaves/");
      return res.data || [];
    },
  });

  const { data: documents = [] } = useQuery<MyDocument[]>({
    queryKey: ["my-hr", "documents"],
    queryFn: async () => {
      const res = await api.get("hr/my/documents/");
      return res.data || [];
    },
  });

  const handleCheckIn = async () => {
    setAttendanceMsg(null);
    try {
      await api.post("hr/my/attendance/check-in/");
      setAttendanceMsg("تم تسجيل الحضور بنجاح.");
      qc.invalidateQueries({ queryKey: ["my-hr", "attendance"] });
    } catch (e: any) {
      setAttendanceMsg(e?.response?.data?.detail || "تعذر تسجيل الحضور.");
    }
  };

  const handleCheckOut = async () => {
    setAttendanceMsg(null);
    try {
      await api.post("hr/my/attendance/check-out/");
      setAttendanceMsg("تم تسجيل الانصراف بنجاح.");
      qc.invalidateQueries({ queryKey: ["my-hr", "attendance"] });
    } catch (e: any) {
      setAttendanceMsg(e?.response?.data?.detail || "تعذر تسجيل الانصراف.");
    }
  };

  const submitLeave = async () => {
    if (!leaveStart.trim() || !leaveEnd.trim()) {
      Alert.alert("تنبيه", "يرجى إدخال تاريخ البداية وتاريخ النهاية.");
      return;
    }
    setLeaveSaving(true);
    try {
      await api.post("hr/my/leaves/", {
        leave_type: leaveType,
        start_date: leaveStart.trim(),
        end_date: leaveEnd.trim(),
        reason: leaveReason.trim() || undefined,
      });
      setLeaveType("annual");
      setLeaveStart("");
      setLeaveEnd("");
      setLeaveReason("");
      qc.invalidateQueries({ queryKey: ["my-hr", "leaves"] });
      Alert.alert("تم الإرسال", "تم إرسال طلب الإجازة.");
    } catch {
      Alert.alert("تعذر الإرسال", "حدث خطأ أثناء إرسال طلب الإجازة.");
    } finally {
      setLeaveSaving(false);
    }
  };

  const pickDocumentImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!res.canceled) {
      setDocFileUri(res.assets[0]?.uri || null);
    }
  };

  const submitDocument = async () => {
    if (!docName.trim()) {
      Alert.alert("تنبيه", "يرجى إدخال اسم المستند.");
      return;
    }
    if (!docFileUri) {
      Alert.alert("تنبيه", "يرجى اختيار ملف أو صورة للمستند.");
      return;
    }

    setDocSaving(true);
    try {
      const formData = new FormData();
      formData.append("document_type", docType);
      formData.append("document_name", docName.trim());
      if (docIssueDate.trim()) formData.append("issue_date", docIssueDate.trim());
      if (docExpiryDate.trim()) formData.append("expiry_date", docExpiryDate.trim());

      const fileName = `document-${Date.now()}.jpg`;
      formData.append("file", {
        uri: docFileUri,
        name: fileName,
        type: "image/jpeg",
      } as any);

      await api.post("hr/my/documents/", formData, { headers: { "Content-Type": "multipart/form-data" } });

      setDocName("");
      setDocIssueDate("");
      setDocExpiryDate("");
      setDocFileUri(null);
      qc.invalidateQueries({ queryKey: ["my-hr", "documents"] });
      Alert.alert("تم الرفع", "تم رفع المستند بنجاح.");
    } catch (e: any) {
      Alert.alert("تعذر الرفع", e?.response?.data?.detail || "حدث خطأ أثناء رفع المستند.");
    } finally {
      setDocSaving(false);
    }
  };

  const docStatusLabel = (d: MyDocument) => {
    if (d.is_expired) return "منتهي";
    if (d.is_expiring_soon) {
      return typeof d.days_to_expiry === "number"
        ? `قارب على الانتهاء (${d.days_to_expiry} يوم)`
        : "قارب على الانتهاء";
    }
    return "ساري";
  };

  return (
    <DashboardShell title="طلباتي" subtitle="الحضور والانصراف وطلبات الإجازة ورفع المستندات.">
      <DashboardSection title="الحضور والانصراف" subtitle="سجّل حضورك وانصرافك بسرعة.">
        <View style={styles.actionsRow}>
          <Button title="تسجيل الحضور" onPress={handleCheckIn} />
          <Button title="تسجيل الانصراف" variant="secondary" onPress={handleCheckOut} />
        </View>
        {attendanceMsg ? <Text style={[styles.notice, { color: theme.palette.muted }]}>{attendanceMsg}</Text> : null}
        <View style={{ gap: 10 }}>
          {attendance.slice(0, 7).map((a) => (
            <DashboardListItem
              key={a.id}
              title={a.date}
              subtitle={`دخول: ${a.check_in || "-"} • خروج: ${a.check_out || "-"} • ${a.status || ""}`}
              icon="calendar-outline"
            />
          ))}
        </View>
      </DashboardSection>

      <DashboardSection title="طلبات الإجازات" subtitle="أدخل التواريخ بصيغة YYYY-MM-DD.">
        <Input label="نوع الإجازة" value={leaveType} onChangeText={setLeaveType} placeholder="annual / sick / ..." />
        <View style={styles.actionsRow}>
          <View style={{ flex: 1 }}>
            <Input label="تاريخ البداية" value={leaveStart} onChangeText={setLeaveStart} placeholder={todayIso()} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="تاريخ النهاية" value={leaveEnd} onChangeText={setLeaveEnd} placeholder={todayIso()} />
          </View>
        </View>
        <Input label="السبب (اختياري)" value={leaveReason} onChangeText={setLeaveReason} multiline numberOfLines={2} />
        <Button title={leaveSaving ? copy.messages.loading : "إرسال الطلب"} onPress={submitLeave} disabled={leaveSaving} />
        <View style={{ gap: 10 }}>
          {leaves.slice(0, 10).map((l) => (
            <DashboardListItem
              key={l.id}
              title={`${l.leave_type} • ${l.status}`}
              subtitle={`${l.start_date} → ${l.end_date}${l.reason ? ` • ${l.reason}` : ""}`}
              icon="leaf-outline"
            />
          ))}
        </View>
      </DashboardSection>

      <DashboardSection title="رفع مستند" subtitle="يمكنك رفع صورة للمستند وربطها ببياناته.">
        <Select label="نوع المستند" value={docType} options={docTypeOptions} onChange={setDocType} />
        <Input label="اسم المستند" value={docName} onChangeText={setDocName} />
        <View style={styles.actionsRow}>
          <View style={{ flex: 1 }}>
            <Input label="تاريخ الإصدار (اختياري)" value={docIssueDate} onChangeText={setDocIssueDate} placeholder={todayIso()} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="تاريخ الانتهاء (اختياري)" value={docExpiryDate} onChangeText={setDocExpiryDate} placeholder={todayIso()} />
          </View>
        </View>
        <Button title={docFileUri ? "تغيير الملف" : "اختيار ملف"} variant="secondary" onPress={pickDocumentImage} />
        {docFileUri ? <Image source={{ uri: docFileUri }} style={styles.preview} /> : null}
        <Button title={docSaving ? copy.messages.loading : "رفع المستند"} onPress={submitDocument} disabled={docSaving} />
      </DashboardSection>

      <DashboardSection title="مستنداتي" subtitle={documents.length ? "آخر المستندات المرفوعة." : "لا توجد مستندات بعد."}>
        {documents.length === 0 ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>لا توجد مستندات.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {documents.slice(0, 20).map((d) => (
              <DashboardListItem
                key={d.id}
                title={`${DOC_LABELS[d.document_type] || d.document_type} • ${d.document_name}`}
                subtitle={`${docStatusLabel(d)}${d.expiry_date ? ` • الانتهاء: ${d.expiry_date}` : ""}`}
                icon="folder-open-outline"
                onPress={
                  d.file
                    ? () => {
                        Linking.openURL(d.file as string).catch(() =>
                          Alert.alert("تعذر الفتح", "تعذر فتح الملف على هذا الجهاز.")
                        );
                      }
                    : undefined
              }
              />
            ))}
          </View>
        )}
      </DashboardSection>
    </DashboardShell>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    actionsRow: {
      flexDirection: "row-reverse",
      gap: 10,
      alignItems: "center",
      justifyContent: "space-between",
    },
    notice: {
      textAlign: "right",
      fontSize: 13,
      lineHeight: 18,
      writingDirection: "rtl",
    },
    preview: {
      width: "100%",
      height: 160,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.palette.border,
    },
  });

export default MyHRScreen;

