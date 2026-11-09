/**
 * Colour palette for boards and columns (plan FE-04: 17 swatches plus a hex
 * field). Tailwind 500 shades; the first one is the backend default for
 * `Board.color` (E31).
 */
export const DEFAULT_BOARD_COLOR = "#3b82f6";
export const DEFAULT_COLUMN_COLOR = "#6b7280";

export const COLOR_SWATCHES: readonly string[] = [
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#64748b",
];

const HEX = /^#[0-9a-fA-F]{6}$/;

/** `#rrggbb` only; the backend field is CharField(max_length=7). */
export function isHexColor(value: string | null | undefined): value is string {
  return typeof value === "string" && HEX.test(value);
}

/** Lower-cased `#rrggbb`, or the fallback when the value is not a hex colour. */
export function normalizeHex(value: string | null | undefined, fallback: string): string {
  return isHexColor(value) ? value.toLowerCase() : fallback;
}
