export const formatCurrency = (value: number | string, currency?: string) => {
  const amount = typeof value === "number" ? value : Number(value) || 0;
  const suffix = currency ? ` ${currency}` : "";
  return `${amount.toFixed(2)}${suffix}`;
};

export const formatDateTime = (value: string) => {
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return value;
  }
};
