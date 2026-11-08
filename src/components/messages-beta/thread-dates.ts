/**
 * Day dividers for the chat thread (design: "Today", "Yesterday", "12 March").
 * Chrome has no Georgian month names in Intl, so they are written out.
 */
const KA_MONTHS = [
  "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
  "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი",
];

export function dayKey(value: Date | string | number | null | undefined): string | null {
  if (value == null) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function dayLabel(
  value: Date | string | number,
  locale: string,
  labels: { today: string; yesterday: string },
  now: Date = new Date()
): string {
  const d = new Date(value);
  const key = dayKey(d);
  if (key === dayKey(now)) return labels.today;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (key === dayKey(y)) return labels.yesterday;
  const month = locale.startsWith("ka")
    ? KA_MONTHS[d.getMonth()]
    : d.toLocaleDateString(locale, { month: "long" });
  return d.getFullYear() === now.getFullYear()
    ? `${d.getDate()} ${month}`
    : `${d.getDate()} ${month} ${d.getFullYear()}`;
}
