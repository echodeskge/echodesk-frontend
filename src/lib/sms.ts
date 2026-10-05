// How an SMS text is billed. Mirrors booking_management/sms.py (sms_segments).

const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ ÆæßÉ!\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
const GSM_EXTENDED = "^{}\\[~]|€"

/** Plain Latin fits 160 characters per SMS; anything else (Georgian…) only 70. */
export function isGsmText(text: string): boolean {
  for (const char of text) {
    if (!GSM_BASIC.includes(char) && !GSM_EXTENDED.includes(char)) return false
  }
  return true
}

/** Billed length of a text: GSM extension characters count twice; Unicode counts UTF-16 units. */
export function smsLength(text: string): number {
  if (!isGsmText(text)) return text.length
  let length = 0
  for (const char of text) length += GSM_EXTENDED.includes(char) ? 2 : 1
  return length
}

/** Number of SMS a text is billed as (160/153 GSM, 70/67 Unicode). */
export function smsSegments(text: string): number {
  if (!text) return 0
  const length = smsLength(text)
  if (isGsmText(text)) return length <= 160 ? 1 : Math.ceil(length / 153)
  return length <= 70 ? 1 : Math.ceil(length / 67)
}

/** Fill {placeholders}; unknown ones stay as typed. */
export function renderSmsTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? values[key] : match)).trim()
}
