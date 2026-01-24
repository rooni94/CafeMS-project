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
import { useI18n } from "../../i18n";

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
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);
  const qc = useQueryClient();
  const { user, permissions } = useAuth();

  const statusLabel = (s: TableRow["status"]) => {
    if (s === "available") return t("dashboard.tablesStatusAvailable", "متاحة");
    if (s === "occupied") return t("dashboard.tablesStatusOccupied", "مشغولة");
    if (s === "reserved") return t("dashboard.tablesStatusReserved", "محجوزة");
    return t("dashboard.tablesStatusMaintenance", "تحت الصيانة");
  };

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
    return (
      <DashboardAccessDenied
        title={t("dashboard.tablesDeniedTitle", "الطاولات")}
        subtitle={t("dashboard.tablesDeniedSubtitle", "إدارة الطاولات وحالاتها.")}
      />
    );
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
      Alert.alert(t("dashboard.tablesMissingTitle", "بيانات ناقصة"), t("dashboard.tablesMissingBody", "يرجى إدخال اسم/وصف الطاولة."));
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
      Alert.alert(t("dashboard.tablesSaveErrorTitle", "تعذر الحفظ"), t("dashboard.tablesSaveErrorBody", "حدث خطأ أثناء حفظ الطاولة."));
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (tableId: number, value: TableRow["status"]) => {
    try {
      await api.patch(`orders/pos/tables/${tableId}/`, { status: value });
      qc.invalidateQueries({ queryKey: ["dashboard", "tables"] });
    } catch {
      Alert.alert(
        t("dashboard.tablesUpdateErrorTitle", "تعذر التحديث"),
        t("dashboard.tablesUpdateErrorBody", "حدث خطأ أثناء تحديث الحالة.")
      );
    }
  };

  const startEdit = (table: TableRow) => {
    setEditingId(table.id);
    setLabel(table.label);
    setNumber(table.number != null ? String(table.number) : "");
    setCapacity(table.capacity != null ? String(table.capacity) : "2");
    setStatus(table.status);
    setNotes(table.notes || "");
  };

  const deleteTable = async (id: number) => {
    Alert.alert(t("dashboard.tablesDeleteTitle", "حذف الطاولة"), t("dashboard.tablesDeleteConfirm", "هل أنت متأكد؟"), [
      { text: t("common.cancel", "إلغاء"), style: "cancel" },
      {
        text: t("common.delete", "حذف"),
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`orders/pos/tables/${id}/`);
            qc.invalidateQueries({ queryKey: ["dashboard", "tables"] });
            if (editingId === id) resetForm();
          } catch {
            Alert.alert(t("dashboard.tablesDeleteErrorTitle", "تعذر الحذف"), t("dashboard.tablesDeleteErrorBody", "حدث خطأ أثناء حذف الطاولة."));
          }
        },
      },
    ]);
  };

  return (
    <DashboardShell title={t("dashboard.tablesTitle", "الطاولات")} subtitle={t("dashboard.tablesSubtitle", "إدارة طاولات الصالة وحالاتها.")}>
      <DashboardSection
        title={editingId ? t("dashboard.tablesEditTitle", "تعديل طاولة") : t("dashboard.tablesAddTitle", "إضافة طاولة")}
        subtitle={t("dashboard.tablesFormSubtitle", "أدخل البيانات ثم احفظ.")}
      >
        <Input
          label={t("dashboard.tablesLabelLabel", "اسم/وصف الطاولة")}
          value={label}
          onChangeText={setLabel}
          placeholder={t("dashboard.tablesLabelPlaceholder", "مثال: طاولة قرب النافذة")}
        />
        <Input
          label={t("dashboard.tablesNumberLabel", "رقم الطاولة (اختياري)")}
          value={number}
          onChangeText={setNumber}
          keyboardType="number-pad"
        />
        <Input label={t("dashboard.tablesCapacityLabel", "السعة")} value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />

        <Text style={[styles.label, { color: theme.palette.muted }]}>{t("dashboard.tablesStatusLabel", "الحالة")}</Text>
        <View style={styles.statusRow}>
          {(["available", "occupied", "reserved", "maintenance"] as const).map((s) => (
            <Button key={s} title={statusLabel(s)} variant={status === s ? "primary" : "ghost"} onPress={() => setStatus(s)} />
          ))}
        </View>

        <Input label={t("dashboard.tablesNotesLabel", "ملاحظات (اختياري)")} value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
        <Button title={saving ? t("common.saving", "جارٍ الحفظ...") : t("common.save", "حفظ")} onPress={saveTable} disabled={saving} />
        {editingId ? <Button title={t("dashboard.tablesCancelEdit", "إلغاء التعديل")} variant="ghost" onPress={resetForm} /> : null}
      </DashboardSection>

      <DashboardSection
        title={t("dashboard.tablesListTitle", "قائمة الطاولات")}
        subtitle={
          isLoading
            ? t("dashboard.tablesLoading", "جارٍ التحميل...")
            : t("dashboard.tablesListSubtitle", "اضغط للتعديل أو غيّر الحالة سريعًا.")
        }
      >
        {tables.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>{t("dashboard.tablesEmpty", "لا توجد طاولات.")}</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {tables.slice(0, 50).map((table) => (
              <DashboardListItem
                key={table.id}
                title={table.label}
                subtitle={`#${table.id} • ${t("dashboard.tablesNumberShort", "رقم")}: ${table.number ?? "-"} • ${t("dashboard.tablesCapacityShort", "السعة")}: ${
                  table.capacity ?? "-"
                } • ${t("dashboard.tablesStatusShort", "الحالة")}: ${statusLabel(table.status)}`}
                icon="grid-outline"
                onPress={() => startEdit(table)}
                right={
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    {(["available", "occupied", "reserved", "maintenance"] as const).map((s) => (
                      <Button key={s} title={statusLabel(s)} variant={table.status === s ? "primary" : "secondary"} onPress={() => updateStatus(table.id, s)} />
                    ))}
                    <Button title={t("common.delete", "حذف")} variant="ghost" onPress={() => deleteTable(table.id)} />
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

const createStyles = (_theme: ReturnType<typeof useTheme>, isRTL: boolean) =>
  StyleSheet.create({
    statusRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    label: {
      fontSize: 12,
      fontWeight: "900",
      textAlign: isRTL ? "right" : "left",
    },
    empty: {
      textAlign: isRTL ? "right" : "left",
      fontSize: 13,
    },
  });

export default DashboardTables;

