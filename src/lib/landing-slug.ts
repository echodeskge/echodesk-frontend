/**
 * Shape check for the marketing `/[slug]` route.
 *
 * Landing-page slugs are plain path segments. Anything with a dot
 * (`robots.txt`, `apple-touch-icon-precomposed.png`, `.env`, …) is a file
 * probe that only reaches the route because the dot was percent-encoded
 * (`/robots%2etxt`) and so slipped past middleware's static-file skip.
 * Rejecting it up front keeps those requests from touching `cookies()` /
 * `headers()` and the landing-page API at all.
 */
export function isLandingSlug(slug: string | undefined | null): slug is string {
  if (!slug) return false;
  if (slug.includes(".")) return false;
  return true;
}
