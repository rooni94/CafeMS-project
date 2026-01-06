import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Menu, Divider } from "react-native-paper";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme";
import { useI18n } from "../../i18n";

export type SelectOption<T extends string> = { label: string; value: T };

type Props<T extends string> = {
  label?: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
};

const Select = <T extends string>({ label, value, options, onChange, placeholder, disabled }: Props<T>) => {
  const theme = useTheme();
  const { isRTL } = useI18n();
  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);
  const [open, setOpen] = useState(false);

  const selectedLabel = options.find((o) => o.value === value)?.label || placeholder || "";

  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, { color: theme.palette.text }]}>{label}</Text> : null}
      <Menu
        visible={open}
        onDismiss={() => setOpen(false)}
        anchor={
          <Pressable
            onPress={() => !disabled && setOpen(true)}
            style={[
              styles.field,
              { borderColor: theme.palette.border, backgroundColor: theme.palette.surface },
              disabled ? { opacity: 0.6 } : null,
            ]}
          >
            <Ionicons name="chevron-down" size={18} color={theme.palette.muted} />
            <Text style={[styles.value, { color: theme.palette.text }]} numberOfLines={1}>
              {selectedLabel}
            </Text>
          </Pressable>
        }
        contentStyle={[styles.menu, { backgroundColor: theme.palette.surface }]}
      >
        {options.map((opt, idx) => (
          <React.Fragment key={opt.value}>
            <Menu.Item
              title={opt.label}
              onPress={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              titleStyle={[styles.menuItem, { color: theme.palette.text }]}
              style={{ flexDirection: "row" }}
              leadingIcon={() =>
                opt.value === value ? <Ionicons name="checkmark" size={18} color={theme.palette.accent} /> : null
              }
            />
            {idx !== options.length - 1 ? <Divider /> : null}
          </React.Fragment>
        ))}
      </Menu>
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>, isRTL: boolean) =>
  StyleSheet.create({
    container: {
      gap: 4,
    },
    label: {
      textAlign: isRTL ? "right" : "left",
      fontSize: 13,
      fontWeight: "800",
    },
    field: {
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    value: {
      flex: 1,
      textAlign: isRTL ? "right" : "left",
      fontSize: 14,
      fontWeight: "700",
    },
    menu: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.palette.border,
      overflow: "hidden",
    },
    menuItem: {
      textAlign: isRTL ? "right" : "left",
      fontWeight: "800",
      fontSize: 13,
    },
  });

export default Select;