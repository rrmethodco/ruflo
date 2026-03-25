export function currency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function percent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function number(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function shortCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value}`;
}

export function dayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export function timeRange(start: string, end: string): string {
  return `${start}\u2013${end}`;
}
