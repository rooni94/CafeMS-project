import React, { useMemo, useState } from "react";
import { Alert, Image, Linking, StyleSheet, Text, View } from "react-native";
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

const DOC_LABELS: Record<string, { key: string; fallback: string }> = {
  passport: { key: "myHr.docTypePassport", fallback: "جواز سفر" },
  residence: { key: "myHr.docTypeResidence", fallback: "إقامة" },
  contract: { key: "myHr.docTypeContract", fallback: "عقد" },
  certificate: { key: "myHr.docTypeCertificate", fallback: "شهادة" },
  insurance: { key: "myHr.docTypeInsurance", fallback: "تأمين" },
  other: { key: "myHr.docTypeOther", fallback: "أخرى" },
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const lastDaysIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const LEAVE_TYPE_OPTIONS: Array<{ value: string; key: string; fallback: string }> = [
  { value: "annual", key: "myHr.leaveTypeAnnual", fallback: "سنوية" },
  { value: "sick", key: "myHr.leaveTypeSick", fallback: "مرضية" },
  { value: "emergency", key: "myHr.leaveTypeEmergency", fallback: "طارئة" },
  { value: "unpaid", key: "myHr.leaveTypeUnpaid", fallback: "بدون راتب" },
  { value: "other", key: "myHr.leaveTypeOther", fallback: "أخرى" },
];

const asList = <T,>(data: any): T[] => {
  if (Array.isArray(data)) return data as T[];
  return (data?.results || []) as T[];
};

const statusLabel = (status: string | null | undefined, t: (key: string, fallback?: string) => string) => {
  if (!status) return "—";
  if (status === "pending") return t("myHr.statusPending", "بانتظار المراجعة");
  if (status === "approved") return t("myHr.statusApproved", "مقبولة");
  if (status === "rejected") return t("myHr.statusRejected", "مرفوضة");
  if (status === "paid") return t("myHr.statusPaid", "مدفوع");
  if (status === "unpaid") return t("myHr.statusUnpaid", "غير مدفوع");
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

const toIsoDate = (value: string): string | null => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return raw;
  const dmy = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return null;
};

const MyHRScreen: React.FC = () => {
  const theme = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);
  const qc = useQueryClient();

  const docTypeOptions = useMemo(
    () =>
      Object.entries(DOC_LABELS).map(([value, entry]) => ({
        value,
        label: t(entry.key, entry.fallback),
      })),
    [t],
  );

  const leaveTypeOptions = useMemo(
    () => LEAVE_TYPE_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.key, opt.fallback) })),
    [t],
  );

  const docTypeLabel = (type: string) => {
    const entry = DOC_LABELS[type];
    return entry ? t(entry.key, entry.fallback) : type;
  };

  const leaveTypeLabel = (value?: string | null) => {
    const entry = LEAVE_TYPE_OPTIONS.find((opt) => opt.value === value);
    return entry ? t(entry.key, entry.fallback) : value || "-";
  };

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
      setAttendanceMsg(t("myHr.checkInSuccess", "تم تسجيل حضورك بنجاح."));
      qc.invalidateQueries({ queryKey: ["my-hr", "attendance"] });
    } catch (e: any) {
      setAttendanceMsg(parseApiError(e) || t("myHr.checkInError", "تعذر تسجيل الحضور. حاول مرة أخرى."));
    }
  };

  const handleCheckOut = async () => {
    setAttendanceMsg(null);
    try {
      await api.post("hr/my/attendance/check-out/");
      setAttendanceMsg(t("myHr.checkOutSuccess", "تم تسجيل الانصراف بنجاح."));
      qc.invalidateQueries({ queryKey: ["my-hr", "attendance"] });
    } catch (e: any) {
      setAttendanceMsg(parseApiError(e) || t("myHr.checkOutError", "تعذر تسجيل الانصراف. حاول مرة أخرى."));
    }
  };

  const submitLeave = async () => {
    if (!leaveStart.trim() || !leaveEnd.trim()) {
      Alert.alert(
        t("myHr.alertNoticeTitle", "تنبيه"),
        t("myHr.leaveDatesMissing", "الرجاء اختيار تاريخ البداية والنهاية."),
      );
      return;
    }
    setLeaveSaving(true);
    try {
      const startDate = toIsoDate(leaveStart);
      const endDate = toIsoDate(leaveEnd);
      if (!startDate || !endDate) {
        throw new Error(t("myHr.invalidDate", "صيغة التاريخ غير صحيحة. استخدم YYYY-MM-DD أو DD-MM-YYYY."));
      }
      await api.post("hr/my/leaves/", {
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: leaveReason.trim() || undefined,
      });
      setLeaveType("annual");
      setLeaveStart("");
      setLeaveEnd("");
      setLeaveReason("");
      qc.invalidateQueries({ queryKey: ["my-hr", "leaves"] });
      Alert.alert(t("myHr.alertSuccessTitle", "تم"), t("myHr.leaveSubmitted", "تم إرسال طلب الإجازة."));
    } catch (e: any) {
      Alert.alert(
        t("myHr.alertSendErrorTitle", "تعذر الإرسال"),
        parseApiError(e) || t("myHr.leaveSubmitError", "تعذر إرسال طلب الإجازة."),
      );
    } finally {
      setLeaveSaving(false);
    }
  };

  const submitWorkReport = async () => {
    if (!reportDate.trim()) {
      Alert.alert(t("myHr.alertNoticeTitle", "تنبيه"), t("myHr.workDateMissing", "الرجاء اختيار التاريخ."));
      return;
    }
    setReportSaving(true);
    try {
      const reportIsoDate = toIsoDate(reportDate);
      if (!reportIsoDate) {
        throw new Error(t("myHr.invalidDate", "صيغة التاريخ غير صحيحة. استخدم YYYY-MM-DD أو DD-MM-YYYY."));
      }
      await api.post("hr/my/work-reports/", {
        date: reportIsoDate,
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
      Alert.alert(t("myHr.alertSuccessTitle", "تم"), t("myHr.workSubmitted", "تم إرسال تقرير العمل."));
    } catch (e: any) {
      Alert.alert(
        t("myHr.alertSendErrorTitle", "تعذر الإرسال"),
        parseApiError(e) || t("myHr.workSubmitError", "تعذر إرسال تقرير العمل."),
      );
    } finally {
      setReportSaving(false);
    }
  };

  const submitRaise = async () => {
    if (!raiseAmount.trim()) {
      Alert.alert(t("myHr.alertNoticeTitle", "تنبيه"), t("myHr.raiseAmountMissing", "الرجاء إدخال المبلغ المطلوب."));
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
      Alert.alert(t("myHr.alertSuccessTitle", "تم"), t("myHr.raiseSubmitted", "تم إرسال طلب زيادة الراتب."));
    } catch (e: any) {
      Alert.alert(
        t("myHr.alertSendErrorTitle", "تعذر الإرسال"),
        parseApiError(e) || t("myHr.raiseSubmitError", "تعذر إرسال طلب زيادة الراتب."),
      );
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
      Alert.alert(
        t("myHr.alertActionErrorTitle", "تعذر التنفيذ"),
        parseApiError(e) || t("myHr.notificationsMarkError", "تعذر تعليم التنبيهات كمقروء."),
      );
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
      Alert.alert(t("myHr.alertNoticeTitle", "تنبيه"), t("myHr.documentNameMissing", "يرجى إدخال اسم المستند."));
      return;
    }
    if (!docFileUri) {
      Alert.alert(t("myHr.alertNoticeTitle", "تنبيه"), t("myHr.documentFileMissing", "يرجى اختيار ملف أو صورة للمستند."));
      return;
    }

    setDocSaving(true);
    try {
      const formData = new FormData();
      formData.append("document_type", docType);
      formData.append("document_name", docName.trim());
      const issueDate = toIsoDate(docIssueDate);
      const expiryDate = toIsoDate(docExpiryDate);
      if (docIssueDate.trim() && !issueDate) {
        throw new Error(t("myHr.invalidDate", "صيغة التاريخ غير صحيحة. استخدم YYYY-MM-DD أو DD-MM-YYYY."));
      }
      if (docExpiryDate.trim() && !expiryDate) {
        throw new Error(t("myHr.invalidDate", "صيغة التاريخ غير صحيحة. استخدم YYYY-MM-DD أو DD-MM-YYYY."));
      }
      if (issueDate) formData.append("issue_date", issueDate);
      if (expiryDate) formData.append("expiry_date", expiryDate);

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
      Alert.alert(t("myHr.alertUploadSuccessTitle", "تم الرفع"), t("myHr.documentUploadSuccess", "تم رفع المستند بنجاح."));
    } catch (e: any) {
      Alert.alert(
        t("myHr.alertUploadErrorTitle", "تعذر الرفع"),
        parseApiError(e) || t("myHr.documentUploadError", "حدث خطأ أثناء رفع المستند."),
      );
    } finally {
      setDocSaving(false);
    }
  };

  const docStatusLabel = (d: MyDocument) => {
    if (d.is_expired) return t("myHr.documentStatusExpired", "منتهي");
    if (d.is_expiring_soon) {
      if (typeof d.days_to_expiry === "number") {
        return t("myHr.documentStatusExpiringIn", "قارب على الانتهاء ({days} يوم)").replace(
          "{days}",
          String(d.days_to_expiry),
        );
      }
      return t("myHr.documentStatusExpiringSoon", "قارب على الانتهاء");
    }
    return t("myHr.documentStatusActive", "ساري");
  };

  const StatusPill = ({ value }: { value?: string | null }) => {
    const tint = statusTint(theme, value || undefined);
    return (
      <View style={[styles.statusPill, { backgroundColor: `${tint}14`, borderColor: `${tint}33` }]}>
        <Text style={[styles.statusPillText, { color: tint }]} numberOfLines={1}>
          {statusLabel(value || undefined, t)}
        </Text>
      </View>
    );
  };

  return (
    <DashboardShell
      title={t("myHr.title", "طلباتي وحقوقي الوظيفية")}
      subtitle={t(
        "myHr.subtitle",
        "من هنا يمكنك إدارة الحضور، الإجازات، تقارير العمل، طلبات الزيادة، الرواتب والتنبيهات.",
      )}
    >
      <DashboardSection
        title={t("myHr.attendanceTitle", "الحضور اليومي")}
        subtitle={t("myHr.attendanceSubtitle", "سجّل حضورك وانصرافك، وسيظهر مباشرة في الموارد البشرية.")}
      >
        <View style={styles.actionsRow}>
          <Button title={t("myHr.checkInNow", "تسجيل حضور الآن")} color={theme.palette.success} onPress={handleCheckIn} />
          <Button title={t("myHr.checkOutNow", "تسجيل انصراف الآن")} color={theme.palette.danger} onPress={handleCheckOut} />
        </View>
        {attendanceMsg ? <Text style={[styles.notice, { color: theme.palette.muted }]}>{attendanceMsg}</Text> : null}

        <Text style={[styles.smallLabel, { color: theme.palette.muted }]}>
          {t("myHr.attendanceLatestLabel", "آخر سجلات الحضور:")}
        </Text>
        {attendanceLoading ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>{t("myHr.attendanceLoading", "جارٍ تحميل الحضور...")}</Text>
        ) : attendance.length === 0 ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>
            {t("myHr.attendanceEmpty", "لا توجد سجلات حضور لعرضها.")}
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {attendance.slice(0, 10).map((a) => (
              <DashboardListItem
                key={a.id}
                title={a.date}
                subtitle={`${t("myHr.attendanceCheckInLabel", "الحضور")}: ${a.check_in || "-"} • ${t(
                  "myHr.attendanceCheckOutLabel",
                  "الانصراف",
                )}: ${a.check_out || "-"} • ${a.status || ""}`}
                icon="calendar-outline"
                right={
                  a.total_hours ? (
                    <Text style={[styles.mutedRight, { color: theme.palette.muted }]}>
                      {`${a.total_hours} ${t("myHr.hoursShort", "س")}`}
                    </Text>
                  ) : undefined
                }
              />
            ))}
          </View>
        )}
      </DashboardSection>

      <DashboardSection
        title={t("myHr.leaveTitle", "طلبات الإجازة")}
        subtitle={t("myHr.leaveSubtitle", "قدّم طلب إجازة مع التواريخ والسبب.")}
      >
        <Select
          label={t("myHr.leaveTypeLabel", "نوع الإجازة")}
          value={leaveType}
          options={leaveTypeOptions}
          onChange={(v) => setLeaveType(String(v))}
        />
        <View style={styles.actionsRow}>
          <View style={{ flex: 1 }}>
            <Input label={t("myHr.leaveStartLabel", "من تاريخ")} value={leaveStart} onChangeText={setLeaveStart} placeholder={todayIso()} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label={t("myHr.leaveEndLabel", "إلى تاريخ")} value={leaveEnd} onChangeText={setLeaveEnd} placeholder={todayIso()} />
          </View>
        </View>
        <Input
          label={t("myHr.leaveReasonLabel", "السبب (اختياري)")}
          value={leaveReason}
          onChangeText={setLeaveReason}
          multiline
          numberOfLines={3}
        />
        <Button
          title={leaveSaving ? t("common.sending", "جارٍ الإرسال...") : t("myHr.leaveSubmit", "إرسال الطلب")}
          onPress={submitLeave}
          disabled={leaveSaving}
          loading={leaveSaving}
        />

        {leaveLoading ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>{t("myHr.leaveLoading", "جارٍ تحميل الطلبات...")}</Text>
        ) : leaves.length === 0 ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>{t("myHr.leaveEmpty", "لا توجد طلبات حالياً.")}</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {leaves.map((l) => (
              <DashboardListItem
                key={l.id}
                title={`${l.start_date} → ${l.end_date}`}
                subtitle={`${leaveTypeLabel(l.leave_type)}${
                  l.days_requested != null ? ` • ${l.days_requested} ${t("myHr.dayUnit", "يوم")}` : ""
                }${l.reason ? ` • ${l.reason}` : ""}`}
                icon="leaf-outline"
                right={<StatusPill value={l.status} />}
              />
            ))}
          </View>
        )}
      </DashboardSection>

      <DashboardSection
        title={t("myHr.workReportTitle", "تقرير عمل / سبب غياب")}
        subtitle={t("myHr.workReportSubtitle", "أدخل ساعات عملك أو سبب الغياب ليظهر لمسؤول الموارد البشرية.")}
      >
        <Input label={t("myHr.workReportDateLabel", "التاريخ")} value={reportDate} onChangeText={setReportDate} placeholder={todayIso()} />
        <View style={styles.actionsRow}>
          <View style={{ flex: 1 }}>
            <Input
              label={t("myHr.workReportHoursLabel", "ساعات العمل")}
              value={reportHours}
              onChangeText={setReportHours}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label={t("myHr.workReportOvertimeLabel", "ساعات إضافية")}
              value={reportOvertime}
              onChangeText={setReportOvertime}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
        </View>
        <Input
          label={t("myHr.workReportReasonLabel", "سبب الغياب (إن وجد)")}
          value={reportReason}
          onChangeText={setReportReason}
          multiline
          numberOfLines={2}
        />
        <Input
          label={t("myHr.workReportNotesLabel", "ملاحظات إضافية")}
          value={reportNotes}
          onChangeText={setReportNotes}
          multiline
          numberOfLines={2}
        />
        <Button
          title={reportSaving ? t("common.sending", "جارٍ الإرسال...") : t("myHr.workReportSubmit", "إرسال التقرير")}
          color={theme.status.info}
          onPress={submitWorkReport}
          disabled={reportSaving}
          loading={reportSaving}
        />

        {workLoading ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>{t("myHr.workReportLoading", "جارٍ تحميل التقارير...")}</Text>
        ) : workReports.length === 0 ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>{t("myHr.workReportEmpty", "لا توجد تقارير عمل حالياً.")}</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {workReports.map((w) => (
              <DashboardListItem
                key={w.id}
                title={w.date}
                subtitle={`${t("myHr.workReportHoursShort", "ساعات")}: ${w.hours_worked} • ${t(
                  "myHr.workReportOvertimeShort",
                  "إضافي",
                )}: ${w.overtime_hours} • ${w.absence_reason || w.notes || ""}`}
                icon="document-text-outline"
                right={<StatusPill value={w.status === "pending" ? "pending" : "approved"} />}
              />
            ))}
          </View>
        )}
      </DashboardSection>

      <DashboardSection
        title={t("myHr.raiseTitle", "طلب زيادة راتب")}
        subtitle={t("myHr.raiseSubtitle", "يمكنك إرسال طلب زيادة راتب مع توضيح السبب.")}
      >
        <Input
          label={t("myHr.raiseAmountLabel", "المبلغ المطلوب")}
          value={raiseAmount}
          onChangeText={setRaiseAmount}
          keyboardType="numeric"
          placeholder="0"
        />
        <Input
          label={t("myHr.raiseReasonLabel", "السبب (اختياري)")}
          value={raiseReason}
          onChangeText={setRaiseReason}
          multiline
          numberOfLines={2}
        />
        <Button
          title={raiseSaving ? t("common.sending", "جارٍ الإرسال...") : t("myHr.raiseSubmit", "إرسال الطلب")}
          onPress={submitRaise}
          disabled={raiseSaving}
          loading={raiseSaving}
        />

        {raisesLoading ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>{t("myHr.raiseLoading", "جارٍ تحميل الطلبات...")}</Text>
        ) : raises.length === 0 ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>
            {t("myHr.raiseEmpty", "لا توجد طلبات زيادة راتب حالياً.")}
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {raises.map((r) => (
              <DashboardListItem
                key={r.id}
                title={r.created_at?.slice(0, 10) || "—"}
                subtitle={`${t("myHr.raiseAmountShortLabel", "المبلغ")}: ${r.requested_amount}${r.reason ? ` • ${r.reason}` : ""}`}
                icon="cash-outline"
                right={<StatusPill value={r.status} />}
              />
            ))}
          </View>
        )}
      </DashboardSection>

      <DashboardSection
        title={t("myHr.payrollTitle", "سجلات الرواتب الخاصة بي")}
        subtitle={t("myHr.payrollSubtitle", "قائمة الرواتب المسجّلة لك في النظام حسب الشهور.")}
      >
        {payrollLoading ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>{t("myHr.payrollLoading", "جارٍ تحميل بيانات الرواتب...")}</Text>
        ) : payrolls.length === 0 ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>{t("myHr.payrollEmpty", "لا توجد سجلات رواتب حتى الآن.")}</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {payrolls.map((p) => {
              const net = safeNumber(p.net_salary);
              return (
                <DashboardListItem
                  key={p.id}
                  title={p.month?.slice(0, 7) || "—"}
                  subtitle={`${t("myHr.payrollBasicLabel", "أساسي")}: ${p.basic_salary} • ${t("myHr.payrollNetLabel", "صافي")}: ${p.net_salary}`}
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

      <DashboardSection
        title={t("myHr.notificationsTitle", "تنبيهاتي")}
        subtitle={t("myHr.notificationsSubtitle", "هنا تظهر آخر التنبيهات المتعلقة بطلباتك ورواتبك.")}
      >
        <Button
          title={notifSaving ? t("myHr.notificationsUpdating", "جارٍ التحديث...") : t("myHr.notificationsMarkAll", "تعليم الكل كمقروء")}
          variant="secondary"
          size="sm"
          onPress={markAllNotificationsRead}
          disabled={notifSaving}
          loading={notifSaving}
        />

        {notifLoading ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>{t("myHr.notificationsLoading", "جارٍ تحميل التنبيهات...")}</Text>
        ) : notifications.length === 0 ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>
            {t("myHr.notificationsEmpty", "لا توجد تنبيهات حالياً.")}
          </Text>
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

      <DashboardSection
        title={t("myHr.documentsUploadTitle", "رفع مستند")}
        subtitle={t("myHr.documentsUploadSubtitle", "يمكنك رفع صورة للمستند وربطها ببياناته.")}
      >
        <Select label={t("myHr.documentsTypeLabel", "نوع المستند")} value={docType} options={docTypeOptions} onChange={setDocType} />
        <Input label={t("myHr.documentsNameLabel", "اسم المستند")} value={docName} onChangeText={setDocName} />
        <View style={styles.actionsRow}>
          <View style={{ flex: 1 }}>
            <Input
              label={t("myHr.documentsIssueDateLabel", "تاريخ الإصدار (اختياري)")}
              value={docIssueDate}
              onChangeText={setDocIssueDate}
              placeholder={todayIso()}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label={t("myHr.documentsExpiryDateLabel", "تاريخ الانتهاء (اختياري)")}
              value={docExpiryDate}
              onChangeText={setDocExpiryDate}
              placeholder={todayIso()}
            />
          </View>
        </View>
        <Button
          title={docFileUri ? t("myHr.documentsChangeFile", "تغيير الملف") : t("myHr.documentsPickFile", "اختيار ملف")}
          variant="secondary"
          onPress={pickDocumentImage}
        />
        {docFileUri ? <Image source={{ uri: docFileUri }} style={styles.preview} /> : null}
        <Button
          title={docSaving ? t("common.sending", "جارٍ الإرسال...") : t("myHr.documentsUploadButton", "رفع المستند")}
          onPress={submitDocument}
          disabled={docSaving}
          loading={docSaving}
        />
      </DashboardSection>

      <DashboardSection
        title={t("myHr.documentsTitle", "مستنداتي")}
        subtitle={
          documents.length
            ? t("myHr.documentsSubtitle", "آخر المستندات المرفوعة.")
            : t("myHr.documentsEmptySubtitle", "لا توجد مستندات بعد.")
        }
      >
        {documents.length === 0 ? (
          <Text style={[styles.notice, { color: theme.palette.muted }]}>{t("myHr.documentsEmpty", "لا توجد مستندات.")}</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {documents.slice(0, 20).map((d) => (
              <DashboardListItem
                key={d.id}
                title={`${docTypeLabel(d.document_type)} • ${d.document_name}`}
                subtitle={`${docStatusLabel(d)}${
                  d.expiry_date ? ` • ${t("myHr.documentsExpiryShort", "الانتهاء")}: ${d.expiry_date}` : ""
                }`}
                icon="folder-open-outline"
                onPress={
                  d.file
                    ? () => {
                        Linking.openURL(d.file as string).catch(() =>
                          Alert.alert(
                            t("myHr.alertOpenErrorTitle", "تعذر الفتح"),
                            t("myHr.documentOpenError", "تعذر فتح الملف على هذا الجهاز."),
                          )
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

const createStyles = (theme: ReturnType<typeof useTheme>, isRTL: boolean) =>
  StyleSheet.create({
    actionsRow: {
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
      justifyContent: "space-between",
    },
    notice: {
      textAlign: isRTL ? "right" : "left",
      fontSize: 13,
      lineHeight: 18,
    },
    smallLabel: {
      textAlign: isRTL ? "right" : "left",
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
      textAlign: isRTL ? "right" : "left",
    },
  });

export default MyHRScreen;
