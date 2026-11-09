/**
 * Avatar initials that are safe for Georgian names.
 *
 * `String.prototype.toUpperCase()` maps Georgian Mkhedruli letters to
 * Mtavruli (U+1C90..), so "ნინო ბერიძე" would become "ᲜᲑ", which reads as a
 * different script to Georgian users. Georgian letters are therefore kept as
 * they are; every other letter is upper-cased.
 */
const GEORGIAN = /[Ⴀ-ჿᲐ-Ჿⴀ-⴯]/;

function upperFirst(word: string): string {
  const first = Array.from(word)[0] ?? "";
  if (!first || GEORGIAN.test(first)) return first;
  return first.toLocaleUpperCase("en");
}

/** Up to two initials: first letters of the first two words ("Nino Beridze" → "NB"). */
export function initials(name: string | null | undefined): string {
  const raw = (name ?? "").trim();
  if (!raw) return "?";
  // An e-mail as the display name: use its local part ("nino.b@x.ge" → "NB").
  const base = raw.includes("@") && !raw.includes(" ") ? raw.split("@")[0] : raw;
  const words = base.split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return upperFirst(words[0]);
  return upperFirst(words[0]) + upperFirst(words[1]);
}
