import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Alert } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Button } from "../../components/ui";
import { useTheme } from "../../theme";
import { api } from "../../services/api";
import DashboardShell from "./components/DashboardShell";

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
  const qc = useQueryClient();
  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [workHours, setWorkHours] = useState("");
  const [overtimeHours, setOvertimeHours] = useState("");
  const [workNotes, setWorkNotes] = useState("");
  const [raiseAmount, setRaiseAmount] = useState("");
  const [raiseReason, setRaiseReason] = useState("");

  const { data: leaves } = useQuery<LeaveRow[]>({
    queryKey: ["hr-my-leaves"],
    queryFn: async () => {
      const res = await api.get("hr/my/leaves/");
      return res.data.results || res.data;
    },
  });

  const { data: payrolls } = useQuery<PayrollRow[]>({
    queryKey: ["hr-my-payrolls"],
    queryFn: async () => {
      const res = await api.get("hr/my/payrolls/");
      return res.data.results || res.data;
    },
  });

  // ملاحظة: يمكن تفعيل استعلام الحضور لاحقاً عند الحاجة لعرضه.

  const { data: notifications } = useQuery<NotificationRow[]>({
    queryKey: ["hr-my-notifications"],
    queryFn: async () => {
      const res = await api.get("hr/my/notifications/");
      return res.data.results || res.data;
    },
  });

  const submitLeave = async () => {
    if (!leaveType.trim() || !startDate || !endDate) {
      Alert.alert("تنبيه", "أدخل نوع الإجازة وبدايتها ونهايتها.");
      return;
    }
    try {
      await api.post("hr/my/leave-requests/", {
        type: leaveType.trim(),
        start_date: startDate,
        end_date: endDate,
      });
      qc.invalidateQueries({ queryKey: ["hr-my-leaves"] });
      setLeaveType("");
      setStartDate("");
      setEndDate("");
      Alert.alert("تم", "تم إرسال طلب الإجازة.");
    } catch {
      Alert.alert("خطأ", "تعذر إرسال الطلب.");
    }
  };

  const submitWorkReport = async () => {
    if (!workDate) {
      Alert.alert("تنبيه", "أدخل التاريخ.");
      return;
    }
    try {
      await api.post("hr/my/work-reports/", {
        date: workDate,
        work_hours: workHours ? Number(workHours) : 0,
        overtime_hours: overtimeHours ? Number(overtimeHours) : 0,
        notes: workNotes,
      });
      setWorkDate("");
      setWorkHours("");
      setOvertimeHours("");
      setWorkNotes("");
      Alert.alert("تم", "تم إرسال التقرير.");
    } catch {
      Alert.alert("خطأ", "تعذر إرسال التقرير.");
    }
  };

  const submitRaise = async () => {
    if (!raiseAmount.trim()) {
      Alert.alert("تنبيه", "أدخل مبلغ الطلب.");
      return;
    }
    try {
      await api.post("hr/my/raises/", {
        amount_requested: Number(raiseAmount),
        reason: raiseReason,
      });
      setRaiseAmount("");
      setRaiseReason("");
      Alert.alert("تم", "تم إرسال طلب زيادة الراتب.");
    } catch {
      Alert.alert("خطأ", "تعذر إرسال الطلب.");
    }
  };

  return (
    <DashboardShell title="طلبات الموارد البشرية" subtitle="مراجعة طلبات الإجازات وكشوف الرواتب.">
        <Card>
          <Text style={styles.title}>طلباتي وحقوقي الوظيفية</Text>
          <Text style={styles.helper}>الحضور اليومي، طلبات الإجازة، تقارير الغياب، الرواتب، طلبات الزيادة، والتنبيهات.</Text>
        </Card>

        <Card style={{ gap: 8 }}>
          <Text style={styles.sectionTitle}>طلب إجازة</Text>
          <TextInput placeholder="نوع الإجازة" value={leaveType} onChangeText={setLeaveType} style={styles.input} textAlign="right" />
          <TextInput placeholder="تاريخ البدء YYYY-MM-DD" value={startDate} onChangeText={setStartDate} style={styles.input} textAlign="right" />
          <TextInput placeholder="تاريخ النهاية YYYY-MM-DD" value={endDate} onChangeText={setEndDate} style={styles.input} textAlign="right" />
          <Button title="إرسال الطلب" onPress={submitLeave} />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>طلبات الإجازة</Text>
          {leaves && leaves.length > 0 ? (
            <View style={{ marginTop: 8, gap: 8 }}>
              {leaves.slice(0, 10).map((l) => (
                <View key={l.id} style={styles.row}>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.name}>{l.type || "إجازة"}</Text>
                    <Text style={styles.sub}>
                      {l.start_date} → {l.end_date} ? {l.status || "-"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.helper}>لا توجد طلبات.</Text>
          )}
        </Card>

        <Card style={{ gap: 8 }}>
          <Text style={styles.sectionTitle}>تقرير عمل / سبب غياب</Text>
          <TextInput placeholder="التاريخ YYYY-MM-DD" value={workDate} onChangeText={setWorkDate} style={styles.input} textAlign="right" />
          <TextInput placeholder="ساعات العمل" value={workHours} onChangeText={setWorkHours} style={styles.input} keyboardType="numeric" textAlign="right" />
          <TextInput placeholder="ساعات إضافية" value={overtimeHours} onChangeText={setOvertimeHours} style={styles.input} keyboardType="numeric" textAlign="right" />
          <TextInput placeholder="ملاحظات" value={workNotes} onChangeText={setWorkNotes} style={styles.input} textAlign="right" />
          <Button title="إرسال التقرير" onPress={submitWorkReport} />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>سجلات الرواتب</Text>
          {payrolls && payrolls.length > 0 ? (
            <View style={{ marginTop: 8, gap: 8 }}>
              {payrolls.slice(0, 5).map((p) => (
                <View key={p.id} style={styles.row}>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.name}>فترة: {p.period || "-"}</Text>
                    <Text style={styles.sub}>المبلغ: {p.amount ?? "-"} ? الحالة: {p.status || "-"}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.helper}>لا توجد بيانات رواتب.</Text>
          )}
        </Card>

        <Card style={{ gap: 8 }}>
          <Text style={styles.sectionTitle}>طلب زيادة راتب</Text>
          <TextInput placeholder="المبلغ المطلوب" value={raiseAmount} onChangeText={setRaiseAmount} style={styles.input} keyboardType="numeric" textAlign="right" />
          <TextInput placeholder="السبب" value={raiseReason} onChangeText={setRaiseReason} style={styles.input} textAlign="right" />
          <Button title="إرسال طلب زيادة" onPress={submitRaise} />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>تنبيهات</Text>
          {notifications && notifications.length > 0 ? (
            <View style={{ marginTop: 8, gap: 8 }}>
              {notifications.slice(0, 10).map((n) => (
                <View key={n.id} style={styles.row}>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.name}>{n.title || "تنبيه"}</Text>
                    <Text style={styles.sub}>{n.body || "-"} ? {n.created_at ? new Date(n.created_at).toLocaleString() : ""}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.helper}>لا توجد تنبيهات.</Text>
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

export default DashboardHRRequests;
