import React from "react";
import SaudiRiyalSymbol from "./SaudiRiyalSymbol";

type Props = {
  value: number | string | null | undefined;
  precision?: number;
  className?: string;
  amountClassName?: string;
  symbolClassName?: string;
  fallback?: React.ReactNode;
};

const CurrencyAmount: React.FC<Props> = ({
  value,
  precision = 2,
  className,
  amountClassName,
  symbolClassName,
  fallback = "—",
}) => {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return <>{fallback}</>;

  return (
    <span
      className={[
        "inline-flex flex-row-reverse items-center gap-1 whitespace-nowrap",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className={amountClassName}>{numeric.toFixed(precision)}</span>
      <SaudiRiyalSymbol className={symbolClassName || "w-[1em] h-[1em]"} />
    </span>
  );
};

export default CurrencyAmount;
