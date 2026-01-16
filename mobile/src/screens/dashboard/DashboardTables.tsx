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
    if (s === "available") return t("dashboard.tablesStatusAvailable", "Ù…ØªØ§Ø­");
    if (s === "occupied") return t("dashboard.tablesStatusOccupied", "Ù…Ø´ØºÙˆÙ„");
    if (s === "reserved") return t("dashboard.tablesStatusReserved", "Ù…Ø­Ø¬ÙˆØ²");
    return t("dashboard.tablesStatusMaintenance", "ØµÙŠØ§Ù†Ø©");
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
        title={t("dashboard.tablesDeniedTitle", "Ø§Ù„Ø·Ø§ÙˆÙ„Ø§Øª")}
        subtitle={t("dashboard.tablesDeniedSubtitle", "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø·Ø§ÙˆÙ„Ø§Øª ÙˆØ­Ø§Ù„Ø§ØªÙ‡Ø§.")}
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
      Alert.alert(t("dashboard.tablesMissingTitle", "Ø¨ÙŠØ§Ù†Ø§Øª Ù†Ø§Ù‚ØµØ©"), t("dashboard.tablesMissingBody", "Ø£Ø¯Ø®Ù„ Ø§Ø³Ù…/ÙˆØµÙ Ø§Ù„Ø·Ø§ÙˆÙ„Ø©."));
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
      Alert.alert(t("dashboard.tablesSaveErrorTitle", "ØªØ¹Ø°Ø± Ø§Ù„Ø­ÙØ¸"), t("dashboard.tablesSaveErrorBody", "Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø­ÙØ¸ Ø§Ù„Ø·Ø§ÙˆÙ„Ø©."));
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (tableId: number, value: TableRow["status"]) => {
    try {
      await api.patch(`orders/pos/tables/${tableId}/`, { status: value });
      qc.invalidateQueries({ queryKey: ["dashboard", "tables"] });
    } catch {
      Alert.alert(t("dashboard.tablesUpdateErrorTitle", "ØªØ¹Ø°Ø± Ø§Ù„ØªØ­Ø¯ÙŠØ«"), t("dashboard.tablesUpdateErrorBody", "Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø­Ø§Ù„Ø©."));
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
    Alert.alert(t("dashboard.tablesDeleteTitle", "Ø­Ø°Ù Ø§Ù„Ø·Ø§ÙˆÙ„Ø©"), t("dashboard.tablesDeleteConfirm", "Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ØŸ"), [
      { text: t("common.cancel", "Ø¥Ù„ØºØ§Ø¡"), style: "cancel" },
      {
        text: t("common.delete", "Ø­Ø°Ù"),
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`orders/pos/tables/${id}/`);
            qc.invalidateQueries({ queryKey: ["dashboard", "tables"] });
            if (editingId === id) resetForm();
          } catch {
            Alert.alert(t("dashboard.tablesDeleteErrorTitle", "ØªØ¹Ø°Ø± Ø§Ù„Ø­Ø°Ù"), t("dashboard.tablesDeleteErrorBody", "Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø­Ø°Ù Ø§Ù„Ø·Ø§ÙˆÙ„Ø©."));
          }
        },
      },
    ]);
  };

  return (
    <DashboardShell title={t("dashboard.tablesTitle", "Ø§Ù„Ø·Ø§ÙˆÙ„Ø§Øª")} subtitle={t("dashboard.tablesSubtitle", "Ø¥Ø¯Ø§Ø±Ø© Ø·Ø§ÙˆÙ„Ø§Øª Ø§Ù„ØµØ§Ù„Ø© ÙˆØ­Ø§Ù„Ø§ØªÙ‡Ø§.")}>
      <DashboardSection
        title={editingId ? t("dashboard.tablesEditTitle", "ØªØ¹Ø¯ÙŠÙ„ Ø·Ø§ÙˆÙ„Ø©") : t("dashboard.tablesAddTitle", "Ø¥Ø¶Ø§ÙØ© Ø·Ø§ÙˆÙ„Ø©")}
        subtitle={t("dashboard.tablesFormSubtitle", "Ø§Ù…Ù„Ø£ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø«Ù… Ø§Ø­ÙØ¸.")}
      >
        <Input
          label={t("dashboard.tablesLabelLabel", "Ø§Ø³Ù…/ÙˆØµÙ Ø§Ù„Ø·Ø§ÙˆÙ„Ø©")}
          value={label}
          onChangeText={setLabel}
          placeholder={t("dashboard.tablesLabelPlaceholder", "Ù…Ø«Ø§Ù„: Ø·Ø§ÙˆÙ„Ø© Ù†Ø§ÙØ°Ø©")}
        />
        <Input
          label={t("dashboard.tablesNumberLabel", "Ø±Ù‚Ù… Ø§Ù„Ø·Ø§ÙˆÙ„Ø© (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)")}
          value={number}
          onChangeText={setNumber}
          keyboardType="number-pad"
        />
        <Input label={t("dashboard.tablesCapacityLabel", "Ø§Ù„Ø³Ø¹Ø©")} value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />

        <Text style={[styles.label, { color: theme.palette.muted }]}>{t("dashboard.tablesStatusLabel", "Ø§Ù„Ø­Ø§Ù„Ø©")}</Text>
        <View style={styles.statusRow}>
          {(["available", "occupied", "reserved", "maintenance"] as const).map((s) => (
            <Button key={s} title={statusLabel(s)} variant={status === s ? "primary" : "ghost"} onPress={() => setStatus(s)} />
          ))}
        </View>

        <Input label={t("dashboard.tablesNotesLabel", "Ù…Ù„Ø§Ø­Ø¸Ø§Øª (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)")} value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
        <Button title={saving ? t("common.saving", "Ø¬Ø§Ø±Ù Ø§Ù„Ø­ÙØ¸...") : t("common.save", "Ø­ÙØ¸")} onPress={saveTable} disabled={saving} />
        {editingId ? <Button title={t("dashboard.tablesCancelEdit", "Ø¥Ù„ØºØ§Ø¡ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„")} variant="ghost" onPress={resetForm} /> : null}
      </DashboardSection>

      <DashboardSection
        title={t("dashboard.tablesListTitle", "Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø·Ø§ÙˆÙ„Ø§Øª")}
        subtitle={
          isLoading
            ? t("dashboard.tablesLoading", "Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...")
            : t("dashboard.tablesListSubtitle", "Ø§Ø¶ØºØ· Ù„Ù„ØªØ¹Ø¯ÙŠÙ„ØŒ Ø£Ùˆ ØºÙŠÙ‘Ø± Ø§Ù„Ø­Ø§Ù„Ø© Ø¨Ø³Ø±Ø¹Ø©.")
        }
      >
        {tables.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>{t("dashboard.tablesEmpty", "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ø§ÙˆÙ„Ø§Øª.")}</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {tables.slice(0, 50).map((table) => (
              <DashboardListItem
                key={table.id}
                title={table.label}
                subtitle={`#${table.id} â€¢ ${t("dashboard.tablesNumberShort", "Ø±Ù‚Ù…")}: ${table.number ?? "-"} â€¢ ${t("dashboard.tablesCapacityShort", "Ø³Ø¹Ø©")}: ${
                  table.capacity ?? "-"
                } â€¢ ${t("dashboard.tablesStatusShort", "Ø§Ù„Ø­Ø§Ù„Ø©")}: ${statusLabel(table.status)}`}
                icon="grid-outline"
                onPress={() => startEdit(table)}
                right={
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    {(["available", "occupied", "reserved", "maintenance"] as const).map((s) => (
                      <Button key={s} title={statusLabel(s)} variant={table.status === s ? "primary" : "secondary"} onPress={() => updateStatus(table.id, s)} />
                    ))}
                    <Button title={t("common.delete", "Ø­Ø°Ù")} variant="ghost" onPress={() => deleteTable(table.id)} />
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

