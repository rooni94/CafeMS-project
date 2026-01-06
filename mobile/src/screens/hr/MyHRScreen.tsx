import React, { useMemo, useState } from "react";
import { Alert, Image, Linking, StyleSheet, Text, View, I18nManager } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";

import { Button, Input, Select } from "../../components/ui";
import CurrencyAmount from "../../components/CurrencyAmount";
import { api, parseApiError } from "../../services/api";
import { useTheme } from "../../theme";
import DashboardShell from "../dashboard/components/DashboardShell";
import DashboardSection from "../dashboard/components/DashboardSection";
import DashboardListItem from "../dashboard/components/DashboardListItem";
import { useI18n } from "../../i18n";

type MyLeave = {
  id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: "pending" | "approved" | "rejected" | string;
  reason?: string | null;
  days_requested?: number;
  created_at?: string;
  decided_at?: string | null;
};

type MyAttendance = {
  id: number;
  date: string;
  check_in?: string | null;
  check_out?: string | null;
  status: string;
  total_hours?: string;
};

type MyWorkReport = {
  id: number;
  date: string;
  hours_worked: string;
  overtime_hours: string;
  absence_reason?: string | null;
  notes?: string | null;
  status: string;
  created_at: string;
};

type MyRaiseRequest = {
  id: number;
  requested_amount: string;
  reason?: string | null;
  status: "pending" | "approved" | "rejected" | string;
  created_at: string;
  decided_at?: string | null;
};

type MyPayroll = {
  id: number;
  month: string;
  basic_salary: string;
  net_salary: string;
  payment_status: string;
};

type MyNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
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

const leaveTypeOptions = [
  { value: "annual", label: "سنوية" },
  { value: "sick", label: "مرضية" },
  { value: "emergency", label: "طارئة" },
  { value: "unpaid", label: "بدون راتب" },
  { value: "other", label: "أخرى" },
];

const asList = <T,>(data: any): T[] => {
  if (Array.isArray(data)) return data as T[];
  return (data?.results || []) as T[];
};

const statusLabel = (status?: string | null) => {
  if (!status) return "—";
  if (status === "pending") return "بانتظار المراجعة";
  if (status === "approved") return "مقبولة";
  if (status === "rejected") return "مرفوضة";
  if (status === "paid") return "مدفوع";
  if (status === "unpaid") return "غير مدفوع";
  return status;
};

const statusTint = (theme: ReturnType<typeof useTheme>, status?: string | null) => {
  if (status === "approved" || status === "paid") return theme.palette.success;
  if (status === "rejected") return theme.palette.danger;
  if (status === "pending") return theme.status.warning;
  return theme.palette.muted;
};

const safeNumber = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const MyHRScreen: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { copy } = useI18n();
  const qc = useQueryClient();

  const [attendanceMsg, setAttendanceMsg] = useState<string | null>(null);

  const [leaveType, setLeaveType] = useState("annual");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveSaving, setLeaveSaving] = useState(false);

  const [reportDate, setReportDate] = useState("");
  const [reportHours, setReportHours] = useState("0");
  const [reportOvertime, setReportOvertime] = useState("0");
  const [reportReason, setReportReason] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [reportSaving, setReportSaving] = useState(false);

  const [raiseAmount, setRaiseAmount] = useState("");
  const [raiseReason, setRaiseReason] = useState("");
  const [raiseSaving, setRaiseSaving] = useState(false);

  const [notifSaving, setNotifSaving] = useState(false);

  const [docType, setDocType] = useState<string>("passport");
  const [docName, setDocName] = useState("");
  const [docIssueDate, setDocIssueDate] = useState("");
  const [docExpiryDate, setDocExpiryDate] = useState("");
  const [docFileUri, setDocFileUri] = useState<string | null>(null);
  const [docSaving, setDocSaving] = useState(false);

  const { data: attendance = [], isLoading: attendanceLoading } = useQuery<MyAttendance[]>({
    queryKey: ["my-hr", "attendance"],
    queryFn: async () => {
      const fromStr = lastDaysIso(30);
      const res = await api.get("hr/my/attendance/", { params: { from: fromStr } });
      return asList<MyAttendance>(res.data);
    },
  });

  const { data: leaves = [], isLoading: leaveLoading } = useQuery<MyLeave[]>({
    queryKey: ["my-hr", "leaves"],
    queryFn: async () => {
      const res = await api.get("hr/my/leaves/");
      return asList<MyLeave>(res.data);
    },
  });

  const { data: workReports = [], isLoading: workLoading } = useQuery<MyWorkReport[]>({
    queryKey: ["my-hr", "work-reports"],
    queryFn: async () => {
      const res = await api.get("hr/my/work-reports/");
      return asList<MyWorkReport>(res.data);
    },
  });

  const { data: raises = [], isLoading: raisesLoading } = useQuery<MyRaiseRequest[]>({
    queryKey: ["my-hr", "raises"],
    queryFn: async () => {
      const res = await api.get("hr/my/raises/");
      return asList<MyRaiseRequest>(res.data);
    },
  });

  const { data: payrolls = [], isLoading: payrollLoading } = useQuery<MyPayroll[]>({
    queryKey: ["my-hr", "payrolls"],
    queryFn: async () => {
      const res = await api.get("hr/my/payrolls/");
      return asList<MyPayroll>(res.data);
    },
  });

  const { data: notifications = [], isLoading: notifLoading } = useQuery<MyNotification[]>({
    queryKey: ["my-hr", "notifications"],
    queryFn: async () => {
      const res = await api.get("hr/my/notifications/");
      return asList<MyNotification>(res.data);
    },
  });

  const { data: documents = [] } = useQuery<MyDocument[]>({
    queryKey: ["my-hr", "documents"],
    queryFn: async () => {
      const res = await api.get("hr/my/documents/");
      return asList<MyDocument>(res.data);
    },
  });

  const handleCheckIn = async () => {
    setAttendanceMsg(null);
    try {
      await api.post("hr/my/attendance/check-in/");
      setAttendanceMsg("تم تسجيل حضورك بنجاح.");
      qc.invalidateQueries({ queryKey: ["my-hr", "attendance"] });
    } catch (e: any) {
      setAttendanceMsg(parseApiError(e) || "تعذر تسجيل الحضور. حاول مرة أخرى.");
    }
  };

  const handleCheckOut = async () => {
    setAttendanceMsg(null);
    try {
      await api.post("hr/my/attendance/check-out/");
      setAttendanceMsg("تم تسجيل الانصراف بنجاح.");
      qc.invalidateQueries({ queryKey: ["my-hr", "attendance"] });
    } catch (e: any) {
      setAttendanceMsg(parseApiError(e) || "تعذر تسجيل الانصراف. حاول مرة أخرى.");
    }
  };

  const submitLeave = async () => {
    if (!leaveStart.trim() || !leaveEnd.trim()) {
      Alert.alert("تنبيه", "الرجاء اختيار تاريخ البداية والنهاية.");
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
      Alert.alert("تم", "تم إرسال طلب الإجازة.");
    } catch (e: any) {
      Alert.alert("تعذر الإرسال", parseApiError(e) || "تعذر إرسال طلب الإجازة.");
    } finally {
      setLeaveSaving(false);
    }
  };

  const submitWorkReport = async () => {
    if (!reportDate.trim()) {
      Alert.alert("تنبيه", "الرجاء اختيار التاريخ.");
      return;
    }
    setReportSaving(true);
    try {
      await api.post("hr/my/work-reports/", {
        date: reportDate.trim(),
        hours_worked: reportHours || "0",
        overtime_hours: reportOvertime || "0",
        absence_reason: reportReason.trim() || undefined,
        notes: reportNotes.trim() || undefined,
      });
      setReportDate("");
      setReportHours("0");
      setReportOvertime("0");
      setReportReason("");
      setReportNotes("");
      qc.invalidateQueries({ queryKey: ["my-hr", "work-reports"] });
      Alert.alert("تم", "تم إرسال تقرير العمل.");
    } catch (e: any) {
      Alert.alert("تعذر الإرسال", parseApiError(e) || "تعذر إرسال تقرير العمل.");
    } finally {
      setReportSaving(false);
    }
  };

  const submitRaise = async () => {
    if (!raiseAmount.trim()) {
      Alert.alert("تنبيه", "الرجاء إدخال المبلغ المطلوب.");
      return;
    }
    setRaiseSaving(true);
    try {
      await api.post("hr/my/raises/", {
        requested_amount: raiseAmount.trim(),
        reason: raiseReason.trim() || undefined,
      });
      setRaiseAmount("");
      setRaiseReason("");
      qc.invalidateQueries({ queryKey: ["my-hr", "raises"] });
      Alert.alert("تم", "تم إرسال طلب زيادة الراتب.");
    } catch (e: any) {
      Alert.alert("تعذر الإرسال", parseApiError(e) || "تعذر إرسال طلب زيادة الراتب.");
    } finally {
      setRaiseSaving(false);
    }
  };

  const markAllNotificationsRead = async () => {
    setNotifSaving(true);
    try {
      await api.post("hr/my/notifications/mark-all-read/");
      qc.invalidateQueries({ queryKey: ["my-hr", "notifications"] });
    } catch (e: any) {
      Alert.alert("تعذر التنفيذ", parseApiError(e) || "تعذر تعليم التنبيهات كمقروء.");
    } finally {
      setNotifSaving(false);
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
      Alert.alert("تعذر الرفع", parseApiError(e) || "حدث خطأ أثناء رفع المستند.");
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

  const StatusPill = ({ value }: { value?: string | null }) => {
    const tint = statusTint(theme, value || undefined);
    return (
      <View style={[styles.statusPill, { backgroundColor: `${tint}14`, borderColor: `${tint}33` }]}>
        <Text style={[styles.statusPillText, { color: tint }]} numberOfLines={1}>
          {statusLabel(value || undefined)}
        </Text>
      </View>
    );
  };

  return (
    <DashboardShell title="طلباتي وحقوقي الوظيفية" subtitle="من هنا يمكنك إدارة الحضور، الإجازات، تقارير العمل، طلبات الزيادة، الرواتب والتنبيهات.">
      <DashboardSection title="الحضور اليومي" subtitle="سجّل حضورك وانصرافك، وسيظهر مباشرة في الموارد البشرية.">
        <View style={styles.actionsRow}>
          <Button title="تسجيل حضور الآن" color={theme.palette.success} onPress={handleCheckIn} />
          <Button title="تسجيل انصراف الآن" color={theme.palette.danger} onPress={handleCheckOut} />
        </View>
        {attendanceMsg ? <Text style={[styles.notice, { color: theme.palette.muted }]}>{attendanceMsg}</Text> : null}

        <Text style={[styles.smallLabel, { color: theme.palette.muted }]}>آخر سجلات الحضور:</Text>
        {attendanceLoading ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>جارٍ تحميل الحضور...</Text>
        ) : attendance.length === 0 ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>لا توجد سجلات حضور لعرضها.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {attendance.slice(0, 10).map((a) => (
              <DashboardListItem
                key={a.id}
                title={a.date}
                subtitle={`الحضور: ${a.check_in || "-"} • الانصراف: ${a.check_out || "-"} • ${a.status || ""}`}
                icon="calendar-outline"
                right={a.total_hours ? <Text style={[styles.mutedRight, { color: theme.palette.muted }]}>{`${a.total_hours} س`}</Text> : undefined}
              />
            ))}
          </View>
        )}
      </DashboardSection>

      <DashboardSection title="طلبات الإجازة" subtitle="قدّم طلب إجازة مع التواريخ والسبب.">
        <Select label="نوع الإجازة" value={leaveType} options={leaveTypeOptions} onChange={(v) => setLeaveType(String(v))} />
        <View style={styles.actionsRow}>
          <View style={{ flex: 1 }}>
            <Input label="من تاريخ" value={leaveStart} onChangeText={setLeaveStart} placeholder={todayIso()} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="إلى تاريخ" value={leaveEnd} onChangeText={setLeaveEnd} placeholder={todayIso()} />
          </View>
        </View>
        <Input label="السبب (اختياري)" value={leaveReason} onChangeText={setLeaveReason} multiline numberOfLines={3} />
        <Button title={leaveSaving ? copy.messages.loading : "إرسال الطلب"} onPress={submitLeave} disabled={leaveSaving} loading={leaveSaving} />

        {leaveLoading ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>جارٍ تحميل الطلبات...</Text>
        ) : leaves.length === 0 ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>لا توجد طلبات حالياً.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {leaves.map((l) => (
              <DashboardListItem
                key={l.id}
                title={`${l.start_date} → ${l.end_date}`}
                subtitle={`${l.leave_type}${l.days_requested != null ? ` • ${l.days_requested} يوم` : ""}${l.reason ? ` • ${l.reason}` : ""}`}
                icon="leaf-outline"
                right={<StatusPill value={l.status} />}
              />
            ))}
          </View>
        )}
      </DashboardSection>

      <DashboardSection title="تقرير عمل / سبب غياب" subtitle="أدخل ساعات عملك أو سبب الغياب ليظهر لمسؤول الموارد البشرية.">
        <Input label="التاريخ" value={reportDate} onChangeText={setReportDate} placeholder={todayIso()} />
        <View style={styles.actionsRow}>
          <View style={{ flex: 1 }}>
            <Input label="ساعات العمل" value={reportHours} onChangeText={setReportHours} keyboardType="numeric" placeholder="0" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="ساعات إضافية" value={reportOvertime} onChangeText={setReportOvertime} keyboardType="numeric" placeholder="0" />
          </View>
        </View>
        <Input label="سبب الغياب (إن وجد)" value={reportReason} onChangeText={setReportReason} multiline numberOfLines={2} />
        <Input label="ملاحظات إضافية" value={reportNotes} onChangeText={setReportNotes} multiline numberOfLines={2} />
        <Button title={reportSaving ? copy.messages.loading : "إرسال التقرير"} color={theme.status.info} onPress={submitWorkReport} disabled={reportSaving} loading={reportSaving} />

        {workLoading ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>جارٍ تحميل التقارير...</Text>
        ) : workReports.length === 0 ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>لا توجد تقارير عمل حالياً.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {workReports.map((w) => (
              <DashboardListItem
                key={w.id}
                title={w.date}
                subtitle={`ساعات: ${w.hours_worked} • إضافي: ${w.overtime_hours} • ${w.absence_reason || w.notes || ""}`}
                icon="document-text-outline"
                right={<StatusPill value={w.status === "pending" ? "pending" : "approved"} />}
              />
            ))}
          </View>
        )}
      </DashboardSection>

      <DashboardSection title="طلب زيادة راتب" subtitle="يمكنك إرسال طلب زيادة راتب مع توضيح السبب.">
        <Input label="المبلغ المطلوب" value={raiseAmount} onChangeText={setRaiseAmount} keyboardType="numeric" placeholder="0" />
        <Input label="السبب (اختياري)" value={raiseReason} onChangeText={setRaiseReason} multiline numberOfLines={2} />
        <Button title={raiseSaving ? copy.messages.loading : "إرسال الطلب"} onPress={submitRaise} disabled={raiseSaving} loading={raiseSaving} />

        {raisesLoading ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>جارٍ تحميل الطلبات...</Text>
        ) : raises.length === 0 ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>لا توجد طلبات زيادة راتب حالياً.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {raises.map((r) => (
              <DashboardListItem
                key={r.id}
                title={r.created_at?.slice(0, 10) || "—"}
                subtitle={`المبلغ: ${r.requested_amount}${r.reason ? ` • ${r.reason}` : ""}`}
                icon="cash-outline"
                right={<StatusPill value={r.status} />}
              />
            ))}
          </View>
        )}
      </DashboardSection>

      <DashboardSection title="سجلات الرواتب الخاصة بي" subtitle="قائمة الرواتب المسجّلة لك في النظام حسب الشهور.">
        {payrollLoading ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>جارٍ تحميل بيانات الرواتب...</Text>
        ) : payrolls.length === 0 ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>لا توجد سجلات رواتب حتى الآن.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {payrolls.map((p) => {
              const net = safeNumber(p.net_salary);
              return (
                <DashboardListItem
                  key={p.id}
                  title={p.month?.slice(0, 7) || "—"}
                  subtitle={`أساسي: ${p.basic_salary} • صافي: ${p.net_salary}`}
                  icon="wallet-outline"
                  right={
                    <View style={{ alignItems: "flex-start", gap: 6 }}>
                      <StatusPill value={p.payment_status} />
                      {net != null ? <CurrencyAmount value={net} color={theme.palette.text} symbolSize={11} /> : null}
                    </View>
                  }
                />
              );
            })}
          </View>
        )}
      </DashboardSection>

      <DashboardSection title="تنبيهاتي" subtitle="هنا تظهر آخر التنبيهات المتعلقة بطلباتك ورواتبك.">
        <Button
          title={notifSaving ? "جارٍ التحديث..." : "تعليم الكل كمقروء"}
          variant="secondary"
          size="sm"
          onPress={markAllNotificationsRead}
          disabled={notifSaving}
          loading={notifSaving}
        />

        {notifLoading ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>جارٍ تحميل التنبيهات...</Text>
        ) : notifications.length === 0 ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>لا توجد تنبيهات حالياً.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {notifications.slice(0, 10).map((n) => (
              <DashboardListItem
                key={n.id}
                title={n.title}
                subtitle={`${n.message} • ${n.created_at?.slice(0, 16).replace("T", " ")}`}
                icon="notifications-outline"
                style={!n.is_read ? styles.unreadRow : undefined}
                right={!n.is_read ? <View style={[styles.unreadDot, { backgroundColor: theme.palette.accent }]} /> : undefined}
              />
            ))}
          </View>
        )}
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
        <Button title={docSaving ? copy.messages.loading : "رفع المستند"} onPress={submitDocument} disabled={docSaving} loading={docSaving} />
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
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
      justifyContent: "space-between",
    },
    notice: {
      textAlign: I18nManager.isRTL ? "right" : "left",
      fontSize: 13,
      lineHeight: 18,
    },
    smallLabel: {
      textAlign: I18nManager.isRTL ? "right" : "left",
      fontSize: 12,
      fontWeight: "800",
    },
    preview: {
      width: "100%",
      height: 160,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.palette.border,
    },
    statusPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      maxWidth: 140,
    },
    statusPillText: {
      fontSize: 11,
      fontWeight: "800",
      textAlign: "center",
    },
    unreadRow: {
      borderColor: `${theme.palette.accent}33`,
      backgroundColor: `${theme.palette.accent}0f`,
    },
    unreadDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    mutedRight: {
      fontSize: 12,
      fontWeight: "800",
      textAlign: "left",
    },
  });

export default MyHRScreen;
