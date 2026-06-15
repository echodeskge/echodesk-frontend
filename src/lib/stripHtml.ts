/**
 * Strip HTML tags from a string and decode common HTML entities so the result
 * is safe to render as plain text in surfaces that don't sanitize / use
 * dangerouslySetInnerHTML — kanban cards, list previews, search filters, etc.
 *
 * For surfaces that intentionally show formatted ticket descriptions, prefer
 * DOMPurify.sanitize + dangerouslySetInnerHTML instead.
 */
export function stripHtml(value?: string | null): string {
  if (!value) return "";
  // Replace tags with a space so adjacent text doesn't fuse together
  // (e.g. "<p>foo</p><p>bar</p>" → "foo bar", not "foobar").
  let text = value.replace(/<[^>]*>/g, " ");
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return text.replace(/\s+/g, " ").trim();
}
