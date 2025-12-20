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
    return <DashboardAccessDenied title="طلبات الموارد البشرية" subtitle="إرسال الطلبات ومتابعة حالتها." />;
  }

  const submitLeave = async () => {
    if (!leaveType.trim() || !startDate.trim() || !endDate.trim()) {
      Alert.alert("بيانات ناقصة", "أدخل نوع الإجازة وتاريخ البداية والنهاية.");
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
      Alert.alert("تم الإرسال", "تم إرسال طلب الإجازة.");
    } catch {
      Alert.alert("تعذر الإرسال", "حدث خطأ أثناء إرسال طلب الإجازة.");
    }
  };

  const submitWorkReport = async () => {
    if (!workDate.trim()) {
      Alert.alert("بيانات ناقصة", "أدخل التاريخ.");
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
      Alert.alert("تم الإرسال", "تم إرسال تقرير العمل.");
    } catch {
      Alert.alert("تعذر الإرسال", "حدث خطأ أثناء إرسال تقرير العمل.");
    }
  };

  const submitRaise = async () => {
    if (!raiseAmount.trim()) {
      Alert.alert("بيانات ناقصة", "أدخل مبلغ طلب الزيادة.");
      return;
    }
    try {
      await api.post("hr/my/raises/", {
        amount_requested: Number(raiseAmount),
        reason: raiseReason,
      });
      setRaiseAmount("");
      setRaiseReason("");
      Alert.alert("تم الإرسال", "تم إرسال طلب الزيادة.");
    } catch {
      Alert.alert("تعذر الإرسال", "حدث خطأ أثناء إرسال طلب الزيادة.");
    }
  };

  return (
    <DashboardShell title="طلبات الموارد البشرية" subtitle="إرسال الطلبات ومتابعة حالتها.">
      <DashboardSection title="طلب إجازة" subtitle="أدخل البيانات بالتنسيق YYYY-MM-DD.">
        <Input label="نوع الإجازة" value={leaveType} onChangeText={setLeaveType} placeholder="مثال: سنوية" />
        <Input label="تاريخ البداية" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
        <Input label="تاريخ النهاية" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
        <Button title="إرسال طلب الإجازة" onPress={submitLeave} />
      </DashboardSection>

      <DashboardSection title="طلباتي (إجازات)" subtitle="آخر الطلبات.">
        {leaves.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>لا توجد طلبات.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {leaves.slice(0, 20).map((l) => (
              <DashboardListItem
                key={l.id}
                title={l.type || "إجازة"}
                subtitle={`${l.start_date || "-"} → ${l.end_date || "-"} • الحالة: ${l.status || "-"}`}
                icon="leaf-outline"
              />
            ))}
          </View>
        )}
      </DashboardSection>

      <DashboardSection title="تقرير عمل" subtitle="ساعات العمل والإضافي.">
        <Input label="التاريخ" value={workDate} onChangeText={setWorkDate} placeholder="YYYY-MM-DD" />
        <Input label="ساعات العمل" value={workHours} onChangeText={setWorkHours} keyboardType="number-pad" placeholder="مثال: 8" />
        <Input label="ساعات إضافي" value={overtimeHours} onChangeText={setOvertimeHours} keyboardType="number-pad" placeholder="مثال: 2" />
        <Input label="ملاحظات (اختياري)" value={workNotes} onChangeText={setWorkNotes} multiline numberOfLines={3} />
        <Button title="إرسال التقرير" onPress={submitWorkReport} />
      </DashboardSection>

      <DashboardSection title="الرواتب" subtitle="ملخص الفترات السابقة (إن كانت متاحة).">
        {payrolls.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>لا توجد بيانات.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {payrolls.slice(0, 10).map((p) => (
              <DashboardListItem
                key={p.id}
                title={`فترة: ${p.period || "-"}`}
                subtitle={`المبلغ: ${p.amount ?? "-"} • الحالة: ${p.status || "-"}`}
                icon="card-outline"
              />
            ))}
          </View>
        )}
      </DashboardSection>

      <DashboardSection title="طلب زيادة" subtitle="اطلب زيادة مع سبب مختصر.">
        <Input label="المبلغ" value={raiseAmount} onChangeText={setRaiseAmount} keyboardType="number-pad" placeholder="مثال: 500" />
        <Input label="السبب (اختياري)" value={raiseReason} onChangeText={setRaiseReason} multiline numberOfLines={3} />
        <Button title="إرسال الطلب" onPress={submitRaise} />
      </DashboardSection>

      <DashboardSection title="إشعارات" subtitle="آخر التنبيهات.">
        {notifications.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>لا توجد إشعارات.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {notifications.slice(0, 20).map((n) => (
              <DashboardListItem
                key={n.id}
                title={n.title || "إشعار"}
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
      textAlign: "right",
      fontSize: 13,
    },
  });

export default DashboardHRRequests;
