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

type LeaveRow = {
  id: number;
  type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
};

type PayrollRow = {
  id: number;
  period?: string;
  amount?: number;
  status?: string;
};

type NotificationRow = {
  id: number;
  title?: string;
  body?: string;
  created_at?: string;
};

const DashboardHRRequests: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const qc = useQueryClient();
  const { user, permissions } = useAuth();
  const { t } = useI18n();

  const allowed = hasAny(user, permissions, [
    "can_view_hr_dashboard",
    "can_manage_hr_leaves",
    "can_manage_hr_payroll",
    "can_manage_hr_work_reports",
    "can_manage_hr_reports",
    "can_manage_attendance",
    "can_view_hr_performance",
  ]);

  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [workHours, setWorkHours] = useState("");
  const [overtimeHours, setOvertimeHours] = useState("");
  const [workNotes, setWorkNotes] = useState("");
  const [raiseAmount, setRaiseAmount] = useState("");
  const [raiseReason, setRaiseReason] = useState("");

  const { data: leaves = [] } = useQuery<LeaveRow[]>({
    queryKey: ["dashboard", "hr-my-leaves"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("hr/my/leaves/");
      return res.data?.results || res.data || [];
    },
  });

  const { data: payrolls = [] } = useQuery<PayrollRow[]>({
    queryKey: ["dashboard", "hr-my-payrolls"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("hr/my/payrolls/");
      return res.data?.results || res.data || [];
    },
  });

  const { data: notifications = [] } = useQuery<NotificationRow[]>({
    queryKey: ["dashboard", "hr-my-notifications"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("hr/my/notifications/");
      return res.data?.results || res.data || [];
    },
  });

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title={t("dashboard.hrRequestsTitle", "طلبات الموارد البشرية")}
        subtitle={t("dashboard.hrRequestsSubtitle", "إرسال الطلبات ومتابعة حالتها.")}
      />
    );
  }

  const submitLeave = async () => {
    if (!leaveType.trim() || !startDate.trim() || !endDate.trim()) {
      Alert.alert(
        t("dashboard.hrLeaveMissingTitle", "بيانات ناقصة"),
        t("dashboard.hrLeaveMissingBody", "أدخل نوع الإجازة وتاريخ البداية والنهاية.")
      );
      return;
    }
    try {
      await api.post("hr/my/leave-requests/", {
        type: leaveType.trim(),
        start_date: startDate.trim(),
        end_date: endDate.trim(),
      });
      qc.invalidateQueries({ queryKey: ["dashboard", "hr-my-leaves"] });
      setLeaveType("");
      setStartDate("");
      setEndDate("");
      Alert.alert(
        t("dashboard.hrLeaveSentTitle", "تم الإرسال"),
        t("dashboard.hrLeaveSentBody", "تم إرسال طلب الإجازة.")
      );
    } catch {
      Alert.alert(
        t("dashboard.hrLeaveErrorTitle", "تعذر الإرسال"),
        t("dashboard.hrLeaveErrorBody", "حدث خطأ أثناء إرسال طلب الإجازة.")
      );
    }
  };

  const submitWorkReport = async () => {
    if (!workDate.trim()) {
      Alert.alert(
        t("dashboard.hrWorkMissingTitle", "بيانات ناقصة"),
        t("dashboard.hrWorkMissingBody", "أدخل التاريخ.")
      );
      return;
    }
    try {
      await api.post("hr/my/work-reports/", {
        date: workDate.trim(),
        work_hours: workHours.trim() ? Number(workHours) : 0,
        overtime_hours: overtimeHours.trim() ? Number(overtimeHours) : 0,
        notes: workNotes,
      });
      setWorkDate("");
      setWorkHours("");
      setOvertimeHours("");
      setWorkNotes("");
      Alert.alert(
        t("dashboard.hrWorkSentTitle", "تم الإرسال"),
        t("dashboard.hrWorkSentBody", "تم إرسال تقرير العمل.")
      );
    } catch {
      Alert.alert(
        t("dashboard.hrWorkErrorTitle", "تعذر الإرسال"),
        t("dashboard.hrWorkErrorBody", "حدث خطأ أثناء إرسال تقرير العمل.")
      );
    }
  };

  const submitRaise = async () => {
    if (!raiseAmount.trim()) {
      Alert.alert(
        t("dashboard.hrRaiseMissingTitle", "بيانات ناقصة"),
        t("dashboard.hrRaiseMissingBody", "أدخل مبلغ طلب الزيادة.")
      );
      return;
    }
    try {
      await api.post("hr/my/raises/", {
        amount_requested: Number(raiseAmount),
        reason: raiseReason,
      });
      setRaiseAmount("");
      setRaiseReason("");
      Alert.alert(
        t("dashboard.hrRaiseSentTitle", "تم الإرسال"),
        t("dashboard.hrRaiseSentBody", "تم إرسال طلب الزيادة.")
      );
    } catch {
      Alert.alert(
        t("dashboard.hrRaiseErrorTitle", "تعذر الإرسال"),
        t("dashboard.hrRaiseErrorBody", "حدث خطأ أثناء إرسال طلب الزيادة.")
      );
    }
  };

  return (
    <DashboardShell title={t("dashboard.hrRequestsTitle", "طلبات الموارد البشرية")} subtitle={t("dashboard.hrRequestsSubtitle", "إرسال الطلبات ومتابعة حالتها.")}>
      <DashboardSection title={t("dashboard.hrLeaveTitle", "طلب إجازة")} subtitle={t("dashboard.hrLeaveSubtitle", "أدخل البيانات بالتنسيق YYYY-MM-DD.")}>
        <Input label={t("dashboard.hrLeaveTypeLabel", "نوع الإجازة")} value={leaveType} onChangeText={setLeaveType} placeholder={t("dashboard.hrLeaveTypePlaceholder", "مثال: سنوية")} />
        <Input label={t("dashboard.hrLeaveStartLabel", "تاريخ البداية")} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
        <Input label={t("dashboard.hrLeaveEndLabel", "تاريخ النهاية")} value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
        <Button title={t("dashboard.hrLeaveSubmit", "إرسال طلب الإجازة")} onPress={submitLeave} />
      </DashboardSection>

      <DashboardSection title={t("dashboard.hrLeaveListTitle", "طلباتي (إجازات)")} subtitle={t("dashboard.hrLeaveListSubtitle", "آخر الطلبات.")}>
        {leaves.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>{t("dashboard.hrRequestsEmpty", "لا توجد طلبات.")}</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {leaves.slice(0, 20).map((l) => (
              <DashboardListItem
                key={l.id}
                title={l.type || t("dashboard.hrLeaveDefault", "إجازة")}
                subtitle={`${l.start_date || "-"} → ${l.end_date || "-"} • ${t("dashboard.hrStatusLabel", "الحالة")}: ${l.status || "-"}`}
                icon="leaf-outline"
              />
            ))}
          </View>
        )}
      </DashboardSection>

      <DashboardSection title={t("dashboard.hrWorkTitle", "تقرير عمل")} subtitle={t("dashboard.hrWorkSubtitle", "ساعات العمل والإضافي.")}>
        <Input label={t("dashboard.hrWorkDateLabel", "التاريخ")} value={workDate} onChangeText={setWorkDate} placeholder="YYYY-MM-DD" />
        <Input label={t("dashboard.hrWorkHoursLabel", "ساعات العمل")} value={workHours} onChangeText={setWorkHours} keyboardType="number-pad" placeholder={t("dashboard.hrWorkHoursPlaceholder", "مثال: 8")} />
        <Input label={t("dashboard.hrOvertimeLabel", "ساعات إضافي")} value={overtimeHours} onChangeText={setOvertimeHours} keyboardType="number-pad" placeholder={t("dashboard.hrOvertimePlaceholder", "مثال: 2")} />
        <Input label={t("dashboard.hrNotesLabel", "ملاحظات (اختياري)")} value={workNotes} onChangeText={setWorkNotes} multiline numberOfLines={3} />
        <Button title={t("dashboard.hrWorkSubmit", "إرسال التقرير")} onPress={submitWorkReport} />
      </DashboardSection>

      <DashboardSection title={t("dashboard.hrPayrollTitle", "الرواتب")} subtitle={t("dashboard.hrPayrollSubtitle", "ملخص الفترات السابقة (إن كانت متاحة).")}>
        {payrolls.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>{t("dashboard.hrPayrollEmpty", "لا توجد بيانات.")}</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {payrolls.slice(0, 10).map((p) => (
              <DashboardListItem
                key={p.id}
                title={`${t("dashboard.hrPayrollPeriod", "فترة")}: ${p.period || "-"}`}
                subtitle={`${t("dashboard.hrPayrollAmount", "المبلغ")}: ${p.amount ?? "-"} • ${t("dashboard.hrStatusLabel", "الحالة")}: ${p.status || "-"}`}
                icon="card-outline"
              />
            ))}
          </View>
        )}
      </DashboardSection>

      <DashboardSection title={t("dashboard.hrRaiseTitle", "طلب زيادة")} subtitle={t("dashboard.hrRaiseSubtitle", "اطلب زيادة مع سبب مختصر.")}>
        <Input label={t("dashboard.hrRaiseAmountLabel", "المبلغ")} value={raiseAmount} onChangeText={setRaiseAmount} keyboardType="number-pad" placeholder={t("dashboard.hrRaiseAmountPlaceholder", "مثال: 500")} />
        <Input label={t("dashboard.hrRaiseReasonLabel", "السبب (اختياري)")} value={raiseReason} onChangeText={setRaiseReason} multiline numberOfLines={3} />
        <Button title={t("dashboard.hrRaiseSubmit", "إرسال الطلب")} onPress={submitRaise} />
      </DashboardSection>

      <DashboardSection title={t("dashboard.hrNotificationsTitle", "إشعارات")} subtitle={t("dashboard.hrNotificationsSubtitle", "آخر التنبيهات.")}>
        {notifications.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>{t("dashboard.hrNotificationsEmpty", "لا توجد إشعارات.")}</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {notifications.slice(0, 20).map((n) => (
              <DashboardListItem
                key={n.id}
                title={n.title || t("dashboard.hrNotificationDefault", "إشعار")}
                subtitle={`${n.body || "-"}${n.created_at ? ` • ${new Date(n.created_at).toLocaleString()}` : ""}`}
                icon="notifications-outline"
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
      textAlign: "auto",
      fontSize: 13,
    },
  });

export default DashboardHRRequests;
