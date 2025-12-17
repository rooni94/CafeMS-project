import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Screen from "../../components/Screen";
import { Card, Button } from "../../components/ui";
import { useTheme } from "../../theme";
import { api } from "../../services/api";

type TableRow = {
  id: number;
  label: string;
  number?: number | null;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "maintenance";
  notes?: string;
};

const DashboardTables: React.FC = () => {
  const theme = useTheme();
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [number, setNumber] = useState("");
  const [capacity, setCapacity] = useState("2");
  const [status, setStatus] = useState<TableRow["status"]>("available");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: tables } = useQuery<TableRow[]>({
    queryKey: ["tables"],
    queryFn: async () => {
      const res = await api.get("orders/pos/tables/");
      return res.data.results || res.data;
    },
  });

  const createTable = async () => {
    if (!label.trim()) return Alert.alert("تنبيه", "أدخل اسم/وصف الطاولة.");
    try {
      const payload = {
        label: label.trim(),
        number: number ? Number(number) : null,
        capacity: capacity ? Number(capacity) : 2,
        status,
        notes,
      };
      if (editingId) {
        await api.patch(`orders/pos/tables/${editingId}/`, payload);
      } else {
        await api.post("orders/pos/tables/", payload);
      }
      setLabel("");
      setNumber("");
      setCapacity("2");
      setStatus("available");
      setNotes("");
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["tables"] });
    } catch {
      Alert.alert("خطأ", "تعذر حفظ الطاولة.");
    }
  };

  const updateStatus = async (tableId: number, value: TableRow["status"]) => {
    try {
      await api.patch(`orders/pos/tables/${tableId}/`, { status: value });
      qc.invalidateQueries({ queryKey: ["tables"] });
    } catch {
      Alert.alert("خطأ", "تعذر تحديث الحالة.");
    }
  };

  const startEdit = (t: TableRow) => {
    setEditingId(t.id);
    setLabel(t.label);
    setNumber(t.number ? String(t.number) : "");
    setCapacity(t.capacity ? String(t.capacity) : "2");
    setStatus(t.status);
    setNotes(t.notes || "");
  };

  const deleteTable = async (id: number) => {
    try {
      await api.delete(`orders/pos/tables/${id}/`);
      qc.invalidateQueries({ queryKey: ["tables"] });
      if (editingId === id) {
        setEditingId(null);
        setLabel("");
        setNumber("");
        setCapacity("2");
        setStatus("available");
        setNotes("");
      }
    } catch {
      Alert.alert("خطأ", "تعذر حذف الطاولة.");
    }
  };

  return (
    <Screen style={{ backgroundColor: theme.palette.background }}>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
        <Card>
          <Text style={styles.title}>الطاولات</Text>
          <Text style={styles.helper}>إدارة الطاولات وحالات التوفر.</Text>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>{editingId ? "تعديل طاولة" : "إضافة طاولة"}</Text>
          <TextInput placeholder="اسم / تسمية الطاولة" value={label} onChangeText={setLabel} style={styles.input} />
          <TextInput
            placeholder="رقم الطاولة (اختياري)"
            value={number}
            onChangeText={setNumber}
            keyboardType="number-pad"
            style={styles.input}
          />
          <TextInput
            placeholder="السعة"
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="number-pad"
            style={styles.input}
          />
          <Text style={styles.sub}>الحالة</Text>
          <View style={styles.statusRow}>
            {["available", "occupied", "reserved", "maintenance"].map((s) => (
              <Button
                key={s}
                title={
                  s === "available"
                    ? "متاحة"
                    : s === "occupied"
                    ? "مشغولة"
                    : s === "reserved"
                    ? "محجوزة"
                    : "صيانة"
                }
                variant={status === s ? "primary" : "ghost"}
                onPress={() => setStatus(s as TableRow["status"])}
              />
            ))}
          </View>
          <TextInput placeholder="ملاحظات (اختياري)" value={notes} onChangeText={setNotes} style={styles.input} />
          <Button title="حفظ" onPress={createTable} />
          {editingId ? <Button title="إلغاء التعديل" variant="ghost" onPress={() => setEditingId(null)} /> : null}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>قائمة الطاولات</Text>
          {tables &&
            tables.slice(0, 10).map((t) => (
              <View key={t.id} style={styles.row}>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={styles.name}>{t.label}</Text>
                  <Text style={styles.sub}>
                    رقم: {t.number ?? "-"} ? سعة: {t.capacity ?? "-"} ? الحالة:{" "}
                    {t.status === "available"
                      ? "متاحة"
                      : t.status === "occupied"
                      ? "مشغولة"
                      : t.status === "reserved"
                      ? "محجوزة"
                      : "صيانة"}
                  </Text>
                  {t.notes ? <Text style={styles.sub}>{t.notes}</Text> : null}
                </View>
                <View style={{ gap: 6, alignItems: "flex-start" }}>
                  <Button title="تعديل" variant="secondary" onPress={() => startEdit(t)} />
                  <Button title="حذف" variant="ghost" onPress={() => deleteTable(t.id)} />
                  <View style={{ flexDirection: "row-reverse", gap: 6 }}>
                    {["available", "occupied", "reserved", "maintenance"].map((s) => (
                      <Button
                        key={s}
                        title={
                          s === "available"
                            ? "متاحة"
                            : s === "occupied"
                            ? "مشغولة"
                            : s === "reserved"
                            ? "محجوزة"
                            : "صيانة"
                        }
                        variant={t.status === s ? "primary" : "ghost"}
                        onPress={() => updateStatus(t.id, s as TableRow["status"])}
                      />
                    ))}
                  </View>
                </View>
              </View>
            ))}
        </Card>
      </ScrollView>
    </Screen>
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
    marginTop: 6,
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
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
  statusRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: 8,
  },
});

export default DashboardTables;
