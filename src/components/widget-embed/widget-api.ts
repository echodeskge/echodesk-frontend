/**
 * Thin `fetch` wrapper for the public widget endpoints.
 *
 * We deliberately do NOT use the generated API client here — those
 * functions are wired through the tenant auth interceptor, and the
 * widget is anonymous-by-design. This file stays tiny and framework-free
 * so the iframe bundle stays small.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_WIDGET_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://api.echodesk.ge';

export interface WidgetConfig {
  widget_token: string;
  brand_color: string;
  position: 'bottom-right' | 'bottom-left';
  welcome_message: string | { [lang: string]: string };
  pre_chat_form: {
    enabled?: boolean;
    name_required?: boolean;
    email_required?: boolean;
    [k: string]: unknown;
  };
  offline_message: string | { [lang: string]: string };
  voice_enabled?: boolean;
  is_online?: boolean;
  is_setup_mode?: boolean;
  origin_allowed?: boolean;
}

export interface WidgetSessionPayload {
  token: string;
  visitor_id: string;
  visitor_name?: string;
  visitor_email?: string;
  page_url?: string;
  referrer?: string;
}

export interface WidgetSessionResponse {
  session_id: string;
  is_new: boolean;
  session?: Record<string, unknown>;
}

export interface WidgetMessage {
  message_id: string;
  message_text: string;
  is_from_visitor: boolean;
  timestamp: string;
  attachments?: Array<{
    url: string;
    filename?: string;
    size?: number;
    content_type?: string;
  }>;
  sent_by_name?: string;
  [k: string]: unknown;
}

export class WidgetApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'WidgetApiError';
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { signal?: AbortSignal } = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'omit',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers || {}),
    },
  });

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const errCode =
      (body && typeof body === 'object' && 'error' in (body as Record<string, unknown>)
        ? String((body as Record<string, unknown>).error)
        : undefined) || undefined;
    throw new WidgetApiError(
      errCode || `HTTP ${res.status}`,
      res.status,
      errCode
    );
  }

  return body as T;
}

export function getConfig(token: string, signal?: AbortSignal) {
  return request<WidgetConfig>(
    `/api/widget/public/config/?token=${encodeURIComponent(token)}`,
    { method: 'GET', signal }
  );
}

export function createSession(
  payload: WidgetSessionPayload,
  signal?: AbortSignal
) {
  return request<WidgetSessionResponse>(`/api/widget/public/sessions/`, {
    method: 'POST',
    body: JSON.stringify(payload),
    signal,
  });
}

export function sendMessage(
  payload: {
    token: string;
    session_id: string;
    message_text: string;
    attachments?: WidgetMessage['attachments'];
  },
  signal?: AbortSignal
) {
  return request<WidgetMessage>(`/api/widget/public/messages/`, {
    method: 'POST',
    body: JSON.stringify(payload),
    signal,
  });
}

export function listMessages(
  params: { token: string; session_id: string; after?: string },
  signal?: AbortSignal
) {
  const qs = new URLSearchParams({
    token: params.token,
    session_id: params.session_id,
  });
  if (params.after) qs.set('after', params.after);
  return request<WidgetMessage[]>(
    `/api/widget/public/messages/list/?${qs.toString()}`,
    { method: 'GET', signal }
  );
}
