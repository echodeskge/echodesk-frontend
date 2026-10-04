/**
 * API client for the public booking site (book.echodesk.ge/<salon>).
 *
 * Deliberately a plain `fetch` wrapper and NOT the generated client in
 * `@/api`: that one attaches the staff token and, on any 401, wipes the staff
 * session and redirects to the dashboard login. Booking customers are a
 * separate kind of user with their own JWT, kept per salon in localStorage.
 */

export const SALON_SLUG_PATTERN = /^[a-z0-9][a-z0-9_-]{0,62}$/;

export function isValidSalonSlug(salon: string): boolean {
  return SALON_SLUG_PATTERN.test(salon);
}

/** Base URL of a salon's API, e.g. https://nitchiani.api.echodesk.ge */
export function bookingApiBase(salon: string): string {
  const template = process.env.NEXT_PUBLIC_BOOKING_API_TEMPLATE;
  if (template) return template.replace('{salon}', salon);
  const apiDomain = process.env.NEXT_PUBLIC_API_DOMAIN || 'api.echodesk.ge';
  return `https://${salon}.${apiDomain}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LocalizedText = Record<string, string> | string | null | undefined;

export type PaymentOption = 'cash' | 'deposit' | 'full';

export interface SalonInfo {
  schema_name: string;
  name: string;
  logo: string | null;
  preferred_language: string;
  description: Record<string, string>;
  address: string;
  phone: string;
  timezone: string;
  min_hours_before_booking: number;
  max_days_advance_booking: number;
  cancellation_hours_before: number;
  payment_options: PaymentOption[];
  card_payment_enabled: boolean;
  bank_transfer: { bank_name: string; iban: string; account_holder: string } | null;
}

export interface BookingCategory {
  id: number;
  name: LocalizedText;
  name_display: string;
  description_display: string;
  icon: string;
  display_order: number;
}

export interface BookingStaffMember {
  id: number;
  user: { id: number; first_name: string; last_name: string; full_name: string };
  bio: string;
  profile_image: string | null;
  average_rating: string | number | null;
  total_ratings: number;
}

export interface BookingService {
  id: number;
  name: LocalizedText;
  name_display: string;
  description_display: string;
  category: BookingCategory | null;
  base_price: string;
  deposit_percentage: number;
  deposit_amount: number;
  duration_minutes: number;
  booking_type: string;
  staff_members: BookingStaffMember[];
  image: string | null;
}

export interface BookingSlot {
  start_time: string;
  end_time: string;
  staff_id: number;
  staff_name: string;
  available_staff: { staff_id: number; staff_name: string }[];
}

export interface BookingClient {
  id: number;
  email: string | null;
  phone_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_verified: boolean;
}

export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type BookingPaymentStatus = 'pending' | 'deposit_paid' | 'fully_paid' | 'failed' | 'refunded';

export interface CustomerBooking {
  id: number;
  booking_number: string;
  client?: BookingClient;
  service: BookingService;
  staff: BookingStaffMember | null;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  payment_status: BookingPaymentStatus;
  payment_method: '' | 'cash' | 'card';
  total_amount: string;
  deposit_amount: string;
  paid_amount: string;
  remaining_amount: string;
  payment_url: string | null;
  client_notes: string;
  rating: number | null;
  review: string;
  cancelled_at: string | null;
  cancellation_reason: string;
  created_at: string;
  can_cancel: boolean;
  cancel_blocked_reason: string;
  manage_token?: string;
}

export interface BookingSession {
  access: string;
  refresh: string;
  client: BookingClient;
}

export interface NewBookingInput {
  service_id: number;
  staff_id?: number | null;
  date: string;
  start_time: string;
  client_notes?: string;
  payment_type?: PaymentOption;
}

export interface GuestDetails {
  first_name: string;
  last_name: string;
  phone_number: string;
  email?: string;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class BookingApiError extends Error {
  status: number;
  /** Field → first message, for form errors */
  fields: Record<string, string>;
  /** Machine-readable code when the API sends one (e.g. email_not_verified) */
  code?: string;

  constructor(status: number, message: string, fields: Record<string, string> = {}, code?: string) {
    super(message);
    this.name = 'BookingApiError';
    this.status = status;
    this.fields = fields;
    this.code = code;
  }
}

function firstString(value: unknown): string | null {
  if (typeof value === 'string') return value.trim().startsWith('<') ? null : value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstString(item);
      if (found) return found;
    }
  }
  return null;
}

/** Turn a DRF error body into one message plus per-field messages. */
export function parseApiError(status: number, body: unknown): BookingApiError {
  const fields: Record<string, string> = {};
  let message: string | null = null;
  let code: string | undefined;

  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const record = body as Record<string, unknown>;
    code = firstString(record.code) || undefined;
    for (const key of ['error', 'detail', 'message', 'non_field_errors']) {
      message = message || firstString(record[key]);
    }
    for (const [key, value] of Object.entries(record)) {
      if (['error', 'detail', 'message', 'non_field_errors', 'code'].includes(key)) continue;
      const found = firstString(value);
      if (found) fields[key] = found;
    }
    message = message || Object.values(fields)[0] || null;
  } else {
    message = firstString(body);
  }

  return new BookingApiError(status, message || '', fields, code);
}

// ---------------------------------------------------------------------------
// Session storage (per salon)
// ---------------------------------------------------------------------------

const sessionKey = (salon: string) => `booking_client_${salon}`;
const SESSION_EVENT = 'booking-session-changed';

export function getSession(salon: string): BookingSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(sessionKey(salon));
    return raw ? (JSON.parse(raw) as BookingSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(salon: string, session: BookingSession | null) {
  if (typeof window === 'undefined') return;
  try {
    if (session) window.localStorage.setItem(sessionKey(salon), JSON.stringify(session));
    else window.localStorage.removeItem(sessionKey(salon));
  } catch {
    // storage unavailable (private mode): the session just won't persist
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function onSessionChange(callback: () => void): () => void {
  window.addEventListener(SESSION_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(SESSION_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  /** Send the customer's token; on 401 refresh once, then sign out. */
  auth?: boolean;
  query?: Record<string, string | number | undefined | null>;
  signal?: AbortSignal;
}

async function rawRequest(salon: string, path: string, options: RequestOptions, access?: string) {
  const url = new URL(`${bookingApiBase(salon)}/api/bookings/${path}`);
  for (const [key, value] of Object.entries(options.query || {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (access) headers.Authorization = `Bearer ${access}`;

  return fetch(url.toString(), {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });
}

async function refreshAccess(salon: string, session: BookingSession): Promise<BookingSession | null> {
  const response = await rawRequest(salon, 'clients/token/refresh/', {
    method: 'POST',
    body: { refresh: session.refresh },
  });
  if (response.status === 400 || response.status === 401) return null; // refresh token no longer valid
  if (!response.ok) throw new BookingApiError(response.status, ''); // throttled / server trouble: keep the session
  const data = (await response.json()) as { access: string; refresh: string };
  const next = { ...session, access: data.access, refresh: data.refresh || session.refresh };
  saveSession(salon, next);
  return next;
}

export async function bookingRequest<T>(salon: string, path: string, options: RequestOptions = {}): Promise<T> {
  let session = options.auth ? getSession(salon) : null;
  if (options.auth && !session) throw new BookingApiError(401, '');

  let response: Response;
  try {
    response = await rawRequest(salon, path, options, session?.access);
    if (response.status === 401 && session) {
      session = await refreshAccess(salon, session);
      if (!session) {
        saveSession(salon, null);
        throw new BookingApiError(401, '');
      }
      response = await rawRequest(salon, path, options, session.access);
    }
  } catch (error) {
    if (error instanceof BookingApiError) throw error;
    if ((error as Error)?.name === 'AbortError') throw error;
    throw new BookingApiError(0, ''); // network failure
  }

  let body: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!response.ok) throw parseApiError(response.status, body);
  return body as T;
}

function listOf<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data?.results || [];
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export const bookingApi = {
  info: (salon: string) => bookingRequest<SalonInfo>(salon, 'client/info/'),

  services: async (salon: string, lang: string) =>
    listOf(await bookingRequest<BookingService[] | { results: BookingService[] }>(salon, 'client/services/', { query: { lang } })),

  service: (salon: string, id: number | string, lang: string) =>
    bookingRequest<BookingService>(salon, `client/services/${id}/`, { query: { lang } }),

  slots: async (salon: string, serviceId: number, date: string, staffId?: number | null, signal?: AbortSignal) =>
    (
      await bookingRequest<{ slots: BookingSlot[] }>(salon, `client/services/${serviceId}/slots/`, {
        query: { date, staff_id: staffId ?? undefined },
        signal,
      })
    ).slots,

  guestBook: (salon: string, input: NewBookingInput & GuestDetails, lang: string) =>
    bookingRequest<CustomerBooking>(salon, 'client/guest-bookings/', { method: 'POST', body: { ...input, lang } }),

  book: (salon: string, input: NewBookingInput, lang: string) =>
    bookingRequest<CustomerBooking>(salon, 'client/bookings/', { method: 'POST', body: { ...input, lang }, auth: true, query: { lang } }),

  managed: (salon: string, token: string, lang: string) =>
    bookingRequest<CustomerBooking>(salon, `client/manage/${encodeURIComponent(token)}/`, { query: { lang } }),

  cancelManaged: (salon: string, token: string, lang: string) =>
    bookingRequest<CustomerBooking>(salon, `client/manage/${encodeURIComponent(token)}/cancel/`, {
      method: 'POST',
      body: {},
      query: { lang },
    }),

  myBookings: async (salon: string, lang: string) =>
    listOf(
      await bookingRequest<CustomerBooking[] | { results: CustomerBooking[] }>(salon, 'client/bookings/', {
        auth: true,
        query: { lang, page_size: 100 },
      })
    ),

  cancel: (salon: string, id: number, lang: string) =>
    bookingRequest<CustomerBooking>(salon, `client/bookings/${id}/cancel/`, { method: 'POST', body: {}, auth: true, query: { lang } }),

  reschedule: (salon: string, id: number, date: string, startTime: string, lang: string) =>
    bookingRequest<CustomerBooking>(salon, `client/bookings/${id}/reschedule/`, {
      method: 'POST',
      body: { date, start_time: startTime },
      auth: true,
      query: { lang },
    }),

  rate: (salon: string, id: number, rating: number, review: string, lang: string) =>
    bookingRequest<CustomerBooking>(salon, `client/bookings/${id}/rate/`, {
      method: 'POST',
      body: { rating, review },
      auth: true,
      query: { lang },
    }),

  login: async (salon: string, email: string, password: string) => {
    const session = await bookingRequest<BookingSession>(salon, 'clients/login/', { method: 'POST', body: { email, password } });
    saveSession(salon, session);
    return session;
  },

  register: (
    salon: string,
    input: { email: string; phone_number: string; first_name: string; last_name: string; password: string; password_confirm: string },
    lang: string
  ) => bookingRequest<{ message: string }>(salon, 'clients/register/', { method: 'POST', body: { ...input, lang } }),

  verify: async (salon: string, email: string, code: string) => {
    const data = await bookingRequest<Partial<BookingSession> & { message: string }>(salon, 'clients/verify-email/', {
      method: 'POST',
      body: { email, code },
    });
    if (data.access && data.refresh && data.client) {
      saveSession(salon, { access: data.access, refresh: data.refresh, client: data.client });
    }
    return data;
  },

  resendVerification: (salon: string, email: string, lang: string) =>
    bookingRequest<{ message: string }>(salon, 'clients/resend-verification/', { method: 'POST', body: { email, lang } }),

  requestPasswordReset: (salon: string, email: string, lang: string) =>
    bookingRequest<{ message: string }>(salon, 'clients/password-reset/request/', { method: 'POST', body: { email, lang } }),

  confirmPasswordReset: (salon: string, email: string, code: string, newPassword: string) =>
    bookingRequest<{ message: string }>(salon, 'clients/password-reset/confirm/', {
      method: 'POST',
      body: { email, code, new_password: newPassword },
    }),

  logout: (salon: string) => saveSession(salon, null),
};

// ---------------------------------------------------------------------------
// Small pure helpers (unit-tested)
// ---------------------------------------------------------------------------

/** Payment choices offered for a service, given what the salon allows. */
export function paymentOptionsFor(info: Pick<SalonInfo, 'payment_options'>, service: Pick<BookingService, 'base_price' | 'deposit_percentage'>): PaymentOption[] {
  if (!Number(service.base_price)) return ['cash'];
  const options = info.payment_options.filter(
    (option) => option !== 'deposit' || (service.deposit_percentage > 0 && service.deposit_percentage < 100)
  );
  return options.length ? options : ['cash'];
}

/** Amount charged online now for a payment choice. */
export function amountDueNow(option: PaymentOption, service: Pick<BookingService, 'base_price' | 'deposit_amount'>): number {
  if (option === 'cash') return 0;
  if (option === 'deposit') return Number(service.deposit_amount) || 0;
  return Number(service.base_price) || 0;
}

/** A staff member's display name; empty when the business hasn't entered one. */
export function staffName(staff: Pick<BookingStaffMember, 'user'> | null | undefined): string {
  if (!staff) return '';
  return (staff.user.full_name || `${staff.user.first_name || ''} ${staff.user.last_name || ''}`).trim();
}

/** Today's date (YYYY-MM-DD) on the business's clock, not the visitor's. */
export function todayInTimezone(timeZone: string): string {
  try {
    // en-CA formats as YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch {
    return toIsoDate(new Date());
  }
}

export function addDays(isoDate: string, days: number): string {
  const date = fromIsoDate(isoDate);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** YYYY-MM-DD in local calendar terms (no timezone shifting). */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function fromIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** "10:00:00" → "10:00" */
export function shortTime(value: string): string {
  return value ? value.slice(0, 5) : '';
}

export function formatMoney(value: string | number): string {
  const amount = Number(value) || 0;
  return `${Number.isInteger(amount) ? amount : amount.toFixed(2)} ₾`;
}
