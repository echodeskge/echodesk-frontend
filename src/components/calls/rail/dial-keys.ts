/** Keypad keys in display order with their letters (EchoDesk Redesign). */
export const DIAL_KEYS: ReadonlyArray<{ key: string; letters: string }> = [
  { key: "1", letters: "" },
  { key: "2", letters: "ABC" },
  { key: "3", letters: "DEF" },
  { key: "4", letters: "GHI" },
  { key: "5", letters: "JKL" },
  { key: "6", letters: "MNO" },
  { key: "7", letters: "PQRS" },
  { key: "8", letters: "TUV" },
  { key: "9", letters: "WXYZ" },
  { key: "*", letters: "" },
  { key: "0", letters: "+" },
  { key: "#", letters: "" },
];

/** `call-rail-key-<k>`: digits as is, `*` → `star`, `#` → `hash`. */
export function dialKeyTestId(key: string): string {
  if (key === "*") return "call-rail-key-star";
  if (key === "#") return "call-rail-key-hash";
  return `call-rail-key-${key}`;
}
