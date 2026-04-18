/**
 * Serialise a schema.org object into a <script type="application/ld+json">
 * block. Rendered server-side so it lands in the initial HTML response
 * where Google, Bing, and LLM crawlers parse structured data.
 *
 * We strip `<` defensively — schema.org data should never contain HTML,
 * and escaping protects against accidental injection via user-provided
 * fields (review comments, product names, etc.).
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Array<Record<string, unknown>> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
