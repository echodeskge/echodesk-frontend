import axios from 'axios';
import type {
  Testimonial,
  PaginatedTestimonialList,
  ContactSubmissionCreateRequest,
  ContactSubmitResponse,
  NewsletterSubscribeRequest,
  NewsletterSubscribeResponse,
} from '@/api/generated/interfaces';

/**
 * Public marketing API — no auth needed. Mirrors the pattern used in
 * `src/hooks/useBlog.ts`: a plain axios instance so the tenant-auth
 * interceptors in `src/api/axios.ts` don't add an Authorization header
 * (which would cause CORS issues for anonymous visitors on echodesk.ge).
 *
 * Server components can fetch the same endpoints directly with
 * `fetch()` — the `fetchTestimonialsServer` helper below is used by
 * the homepage testimonials strip.
 */

const marketingAxios = axios.create({
  timeout: 30000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

export const MARKETING_API_BASE = `${
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.echodesk.ge'
}/api/marketing/public`;

// ---------------------------------------------------------------------------
// Server-side fetchers (import from server components).
// ---------------------------------------------------------------------------

/**
 * Fetches active testimonials, locale-resolved server-side. Returns a
 * flattened array so callers don't need to worry about pagination —
 * there are only ~6-20 testimonials total.
 *
 * Returns an empty array on failure; the Testimonials component renders
 * nothing when the list is empty, so the homepage still ships.
 */
export async function fetchTestimonialsServer(lang: 'ka' | 'en' = 'ka'): Promise<Testimonial[]> {
  try {
    const res = await fetch(`${MARKETING_API_BASE}/testimonials/?lang=${lang}`, {
      next: { revalidate: 300 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as PaginatedTestimonialList;
    return data.results || [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Client-side POST helpers. Throw on non-2xx so RHF submit handlers can
// surface toasts / error states.
// ---------------------------------------------------------------------------

export async function submitContact(
  payload: ContactSubmissionCreateRequest,
): Promise<ContactSubmitResponse> {
  const res = await marketingAxios.post<ContactSubmitResponse>(
    `${MARKETING_API_BASE}/contact/submit/`,
    payload,
  );
  return res.data;
}

export async function subscribeNewsletter(
  payload: NewsletterSubscribeRequest,
): Promise<NewsletterSubscribeResponse> {
  const res = await marketingAxios.post<NewsletterSubscribeResponse>(
    `${MARKETING_API_BASE}/newsletter/subscribe/`,
    payload,
  );
  return res.data;
}
