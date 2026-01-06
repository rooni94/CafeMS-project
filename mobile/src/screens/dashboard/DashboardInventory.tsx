import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View, I18nManager } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useTheme } from "../../theme";
import DashboardShell from "./components/DashboardShell";
import DashboardAccessDenied from "./components/DashboardAccessDenied";
import DashboardSection from "./components/DashboardSection";
import DashboardListItem from "./components/DashboardListItem";
import StatBadge from "./components/StatBadge";
import { hasAny } from "./components/permissions";
import { useI18n } from "../../i18n";

type InventorySummary = {
  total_items: number;
  low_stock_items: number;
  out_of_stock_items: number;
};

type InventoryItem = {
  id: number;
  name: string;
  stock?: number;
  available?: boolean;
};

const DashboardInventory: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const qc = useQueryClient();
  const { user, permissions } = useAuth();
  const { t } = useI18n();

  const allowed = hasAny(user, permissions, ["can_manage_inventory", "can_view_dashboard"]);

  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [search, setSearch] = useState("");
  const [showLow, setShowLow] = useState(false);
  const [showOut, setShowOut] = useState(false);

  const { data: summary } = useQuery<InventorySummary>({
    queryKey: ["dashboard", "inventory-summary"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("orders/pos/inventory/summary/");
      return res.data;
    },
  });

  const { data: items = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["dashboard", "inventory-items"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("products/items/");
      return res.data?.results || res.data || [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((i) => (q ? i.name.toLowerCase().includes(q) : true))
      .filter((i) => (showLow ? (i.stock ?? 0) > 0 && (i.stock ?? 0) < 5 : true))
      .filter((i) => (showOut ? (i.stock ?? 0) <= 0 : true));
  }, [items, search, showLow, showOut]);

  const adjustInventory = async () => {
    if (!productId.trim() || !qty.trim()) {
      Alert.alert(
        t("dashboard.inventoryMissingTitle", "بيانات ناقصة"),
        t("dashboard.inventoryMissingBody", "أدخل رقم المنتج والكمية (+/-).")
      );
      return;
    }
    try {
      await api.post("orders/pos/inventory/adjust/", {
        product_id: Number(productId),
        quantity_change: Number(qty),
      });
      setProductId("");
      setQty("");
      qc.invalidateQueries({ queryKey: ["dashboard", "inventory-summary"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "inventory-items"] });
    } catch {
      Alert.alert(
        t("dashboard.inventoryAdjustErrorTitle", "تعذر التعديل"),
        t("dashboard.inventoryAdjustErrorBody", "حدث خطأ أثناء تعديل المخزون.")
      );
    }
  };

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title={t("dashboard.inventoryTitle", "المخزون")}
        subtitle={t("dashboard.inventorySubtitle", "متابعة الكميات وتعديلها بسرعة.")}
      />
    );
  }

  return (
    <DashboardShell title={t("dashboard.inventoryTitle", "المخزون")} subtitle={t("dashboard.inventorySubtitle", "متابعة الكميات وتعديلها بسرعة.")}>
      <DashboardSection title={t("dashboard.inventorySummaryTitle", "ملخص المخزون")} subtitle={t("dashboard.inventorySummarySubtitle", "نظرة عامة على حالة الأصناف.")}>
        <View style={styles.statsRow}>
          <StatBadge label={t("dashboard.inventoryStatsAll", "كل الأصناف")} value={summary?.total_items ?? "-"} color={theme.palette.accentSoft} />
          <StatBadge label={t("dashboard.inventoryStatsLow", "منخفض")} value={summary?.low_stock_items ?? "-"} color={theme.palette.accent} />
          <StatBadge label={t("dashboard.inventoryStatsOut", "نفد")} value={summary?.out_of_stock_items ?? "-"} color={theme.palette.danger} />
        </View>
      </DashboardSection>

      <DashboardSection title={t("dashboard.inventoryQuickAdjustTitle", "تعديل سريع")} subtitle={t("dashboard.inventoryQuickAdjustSubtitle", "استخدم (+) للإضافة و(-) للخصم.")}>
        <Input
          label={t("dashboard.inventoryProductIdLabel", "رقم المنتج")}
          value={productId}
          onChangeText={setProductId}
          keyboardType="number-pad"
          placeholder={t("dashboard.inventoryProductIdPlaceholder", "مثال: 15")}
        />
        <Input
          label={t("dashboard.inventoryQtyLabel", "تغيير الكمية")}
          value={qty}
          onChangeText={setQty}
          keyboardType="numbers-and-punctuation"
          placeholder={t("dashboard.inventoryQtyPlaceholder", "مثال: -2 أو 5")}
          hint={t("dashboard.inventoryQtyHint", "تأكد من إدخال قيمة رقمية.")}
        />
        <Button title={t("dashboard.inventoryApply", "تطبيق التعديل")} onPress={adjustInventory} />
      </DashboardSection>

      <DashboardSection
        title={t("dashboard.inventoryItemsTitle", "الأصناف")}
        subtitle={isLoading ? t("common.loading", "جاري التحميل...") : t("dashboard.inventoryItemsSubtitle", "يمكنك البحث أو تصفية النتائج.")}
      >
        <Input label={t("common.search", "بحث")} value={search} onChangeText={setSearch} placeholder={t("dashboard.inventorySearchPlaceholder", "اكتب اسم المنتج...")} />
        <View style={styles.filtersRow}>
          <Button title={t("dashboard.inventoryStatsLow", "منخفض")} variant={showLow ? "primary" : "ghost"} onPress={() => setShowLow((v) => !v)} />
          <Button title={t("dashboard.inventoryStatsOut", "نفد")} variant={showOut ? "primary" : "ghost"} onPress={() => setShowOut((v) => !v)} />
        </View>

        {filtered.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.palette.muted }]}>{t("common.noResults", "لا توجد نتائج.")}</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {filtered.slice(0, 40).map((item) => (
              <DashboardListItem
                key={item.id}
                title={item.name}
                subtitle={`ID: ${item.id} • ${t("dashboard.inventoryQtyLabelShort", "الكمية")}: ${item.stock ?? "-"} • ${
                  item.available ? t("dashboard.inventoryAvailable", "متاح للبيع") : t("dashboard.inventoryUnavailable", "غير متاح")
                }`}
                icon="cube-outline"
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
    statsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    filtersRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    emptyText: {
      textAlign: I18nManager.isRTL ? "right" : "left",
      fontSize: 13,
      lineHeight: 18,
    },
  });

export default DashboardInventory;
