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
import { has } from "./components/permissions";

type TableRow = {
  id: number;
  label: string;
  number?: number | null;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "maintenance";
  notes?: string;
};

const statusLabel = (s: TableRow["status"]) => {
  if (s === "available") return "متاح";
  if (s === "occupied") return "مشغول";
  if (s === "reserved") return "محجوز";
  return "صيانة";
};

const DashboardTables: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const qc = useQueryClient();
  const { user, permissions } = useAuth();

  const allowed = has(user, permissions, "can_manage_tables");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [number, setNumber] = useState("");
  const [capacity, setCapacity] = useState("2");
  const [status, setStatus] = useState<TableRow["status"]>("available");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: tables = [], isLoading } = useQuery<TableRow[]>({
    queryKey: ["dashboard", "tables"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("orders/pos/tables/");
      return res.data?.results || res.data || [];
    },
  });

  if (!allowed) {
    return <DashboardAccessDenied title="الطاولات" subtitle="إدارة الطاولات وحالاتها." />;
  }

  const resetForm = () => {
    setEditingId(null);
    setLabel("");
    setNumber("");
    setCapacity("2");
    setStatus("available");
    setNotes("");
  };

  const saveTable = async () => {
    if (!label.trim()) {
      Alert.alert("بيانات ناقصة", "أدخل اسم/وصف الطاولة.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        label: label.trim(),
        number: number.trim() ? Number(number) : null,
        capacity: capacity.trim() ? Number(capacity) : 2,
        status,
        notes,
      };

      if (editingId) {
        await api.patch(`orders/pos/tables/${editingId}/`, payload);
      } else {
        await api.post("orders/pos/tables/", payload);
      }
      qc.invalidateQueries({ queryKey: ["dashboard", "tables"] });
      resetForm();
    } catch {
      Alert.alert("تعذر الحفظ", "حدث خطأ أثناء حفظ الطاولة.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (tableId: number, value: TableRow["status"]) => {
    try {
      await api.patch(`orders/pos/tables/${tableId}/`, { status: value });
      qc.invalidateQueries({ queryKey: ["dashboard", "tables"] });
    } catch {
      Alert.alert("تعذر التحديث", "حدث خطأ أثناء تحديث الحالة.");
    }
  };

  const startEdit = (t: TableRow) => {
    setEditingId(t.id);
    setLabel(t.label);
    setNumber(t.number != null ? String(t.number) : "");
    setCapacity(t.capacity != null ? String(t.capacity) : "2");
    setStatus(t.status);
    setNotes(t.notes || "");
  };

  const deleteTable = async (id: number) => {
    Alert.alert("حذف الطاولة", "هل أنت متأكد؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`orders/pos/tables/${id}/`);
            qc.invalidateQueries({ queryKey: ["dashboard", "tables"] });
            if (editingId === id) resetForm();
          } catch {
            Alert.alert("تعذر الحذف", "حدث خطأ أثناء حذف الطاولة.");
          }
        },
      },
    ]);
  };

  return (
    <DashboardShell title="الطاولات" subtitle="إدارة طاولات الصالة وحالاتها.">
      <DashboardSection title={editingId ? "تعديل طاولة" : "إضافة طاولة"} subtitle="املأ البيانات ثم احفظ.">
        <Input label="اسم/وصف الطاولة" value={label} onChangeText={setLabel} placeholder="مثال: طاولة نافذة" />
        <Input label="رقم الطاولة (اختياري)" value={number} onChangeText={setNumber} keyboardType="number-pad" />
        <Input label="السعة" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />

        <Text style={[styles.label, { color: theme.palette.muted }]}>الحالة</Text>
        <View style={styles.statusRow}>
          {(["available", "occupied", "reserved", "maintenance"] as const).map((s) => (
            <Button key={s} title={statusLabel(s)} variant={status === s ? "primary" : "ghost"} onPress={() => setStatus(s)} />
          ))}
        </View>

        <Input label="ملاحظات (اختياري)" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
        <Button title={saving ? "جارٍ الحفظ..." : "حفظ"} onPress={saveTable} disabled={saving} />
        {editingId ? <Button title="إلغاء التعديل" variant="ghost" onPress={resetForm} /> : null}
      </DashboardSection>

      <DashboardSection title="قائمة الطاولات" subtitle={isLoading ? "جاري التحميل..." : "اضغط للتعديل، أو غيّر الحالة بسرعة."}>
        {tables.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>لا توجد طاولات.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {tables.slice(0, 50).map((t) => (
              <DashboardListItem
                key={t.id}
                title={t.label}
                subtitle={`#${t.id} • رقم: ${t.number ?? "-"} • سعة: ${t.capacity ?? "-"} • الحالة: ${statusLabel(t.status)}`}
                icon="grid-outline"
                onPress={() => startEdit(t)}
                right={
                  <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    {(["available", "occupied", "reserved", "maintenance"] as const).map((s) => (
                      <Button key={s} title={statusLabel(s)} variant={t.status === s ? "primary" : "secondary"} onPress={() => updateStatus(t.id, s)} />
                    ))}
                    <Button title="حذف" variant="ghost" onPress={() => deleteTable(t.id)} />
                  </View>
                }
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
    statusRow: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 8,
    },
    label: {
      fontSize: 12,
      fontWeight: "900",
      textAlign: "right",
    },
    empty: {
      textAlign: "right",
      fontSize: 13,
    },
  });

export default DashboardTables;
