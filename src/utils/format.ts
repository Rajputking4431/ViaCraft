export const inr = (cents: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    cents / 100,
  );

export function stageLabel(stage: string) {
  return stage.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export const PRESERVATION_STAGES = [
  "submitted",
  "consultation",
  "item_received",
  "cleaning",
  "drying",
  "casting",
  "finishing",
  "quality_check",
  "ready_to_ship",
  "delivered",
] as const;
