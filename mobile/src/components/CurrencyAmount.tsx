import React, { useMemo } from "react";
import { View, Text, StyleProp, StyleSheet, TextStyle, ViewStyle } from "react-native";
import SaudiRiyalSymbol from "./SaudiRiyalSymbol";
import { useI18n } from "../i18n";

type Props = {
  value: number | string | null | undefined;
  precision?: number;
  color?: string;
  symbolSize?: number;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fallback?: string;
};

const CurrencyAmount: React.FC<Props> = ({
  value,
  precision = 2,
  color = "#111827",
  symbolSize = 14,
  containerStyle,
  textStyle,
  fallback = "-",
}) => {
  const { isRTL } = useI18n();
  const styles = useMemo(() => createStyles(isRTL), [isRTL]);
  const numeric = typeof value === "number" ? value : Number(value);
  const isValid = Number.isFinite(numeric);
  const formatted = isValid ? numeric.toFixed(precision) : fallback;

  return (
    <View style={[styles.row, containerStyle]}>
      <Text style={textStyle}>{formatted}</Text>
      {isValid ? (
        <View style={styles.symbol}>
          <SaudiRiyalSymbol size={symbolSize} color={color} />
        </View>
      ) : null}
    </View>
  );
};

const createStyles = (_isRTL: boolean) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
    },
    symbol: {
      marginStart: 4,
    },
  });

export default CurrencyAmount;

