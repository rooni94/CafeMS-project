import React, {useEffect, useMemo, useState} from "react";
import { Modal, View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Product, ProductAddon } from "../types";
import { useTheme } from "../theme";
import CurrencyAmount from "./CurrencyAmount";
import { Button } from "./ui";
import { useI18n } from "../i18n";

type ProductAddonsModalProps = {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onConfirm: (addons: ProductAddon[]) => void;
};

const ProductAddonsModal: React.FC<ProductAddonsModalProps> = ({
  visible,
  product,
  onClose,
  onConfirm,
}) => {
  const theme = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(isRTL), [isRTL]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    setSelectedIds([]);
  }, [product?.id, visible]);

  const addons = product?.addons || [];
  const selectedAddons = useMemo(
    () => addons.filter((addon) => selectedIds.includes(addon.id)),
    [addons, selectedIds]
  );

  const basePrice = Number(product?.price || 0) || 0;
  const addonsTotal = selectedAddons.reduce(
    (sum, addon) => sum + (Number(addon.price_delta) || 0),
    0
  );

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: theme.palette.surface }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{product?.name || ""}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.list} contentContainerStyle={{ gap: 10 }}>
            {addons.length > 0 ? (
              addons.map((addon) => {
                const selected = selectedIds.includes(addon.id);
                return (
                  <Pressable
                    key={addon.id}
                    onPress={() =>
                      setSelectedIds((prev) =>
                        prev.includes(addon.id)
                          ? prev.filter((id) => id !== addon.id)
                          : [...prev, addon.id]
                      )
                    }
                    style={[
                      styles.addonRow,
                      { borderColor: selected ? theme.palette.accent : theme.palette.border },
                    ]}
                  >
                    <View style={styles.addonInfo}>
                      <View style={[styles.checkbox, selected && { backgroundColor: theme.palette.accent }]}>
                        {selected ? <Text style={styles.checkText}>✓</Text> : null}
                      </View>
                      <Text style={styles.addonName}>{addon.name}</Text>
                    </View>
                    <View style={styles.addonPriceRow}>
                      <Text style={[styles.addonPrice, { color: theme.palette.accent }]}>+</Text>
                      <CurrencyAmount
                        value={addon.price_delta}
                        color={theme.palette.accent}
                        symbolSize={12}
                        textStyle={[styles.addonPrice, { color: theme.palette.accent }]}
                      />
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <Text style={styles.empty}>{t("product.addonsEmpty", "لا توجد إضافات لهذا المنتج.")}</Text>
            )}
          </ScrollView>

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t("product.basePrice", "السعر الأساسي")}</Text>
              <CurrencyAmount value={basePrice} symbolSize={12} textStyle={styles.summaryValue} color={theme.palette.text} />
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t("product.addonsTotal", "إجمالي الإضافات")}</Text>
              <CurrencyAmount value={addonsTotal} symbolSize={12} textStyle={styles.summaryValue} color={theme.palette.text} />
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.summaryTotal]}>{t("product.total", "الإجمالي")}</Text>
              <CurrencyAmount
                value={basePrice + addonsTotal}
                symbolSize={12}
                textStyle={[styles.summaryValue, styles.summaryTotal]}
                color="#b45309"
              />
            </View>
          </View>

          <View style={styles.actions}>
            <Button title={t("product.addToCart", "إضافة إلى السلة")} onPress={() => onConfirm(selectedAddons)} style={{ width: "100%" }} />
            <Button title={t("common.cancel", "إلغاء")} variant="secondary" onPress={onClose} style={{ width: "100%" }} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (isRTL: boolean) =>
  StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: isRTL ? "right" : "left",
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  closeText: {
    fontSize: 18,
    color: "#111827",
  },
  list: {
    maxHeight: 260,
    marginBottom: 12,
  },
  addonRow: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addonInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "800",
  },
  addonName: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: isRTL ? "right" : "left",
  },
  addonPrice: {
    fontWeight: "700",
    fontSize: 12,
  },
  addonPriceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  empty: {
    textAlign: isRTL ? "right" : "left",
    color: "#6b7280",
  },
  summary: {
    borderTopWidth: 1,
    borderColor: "#fef3c7",
    paddingTop: 12,
    gap: 6,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  summaryTotal: {
    color: "#b45309",
    fontWeight: "800",
  },
  actions: {
    flexDirection: "column",
    gap: 8,
    marginTop: 12,
  },
});

export default ProductAddonsModal;
