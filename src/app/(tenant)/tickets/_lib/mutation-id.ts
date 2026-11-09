/**
 * Mutation echo ids (plan E11, §4.5).
 *
 * Every mutating request carries `X-Client-Mutation: <uuid>`. The backend
 * copies it into the board broadcast as `client_mutation_id`, so the tab that
 * made the change can recognise its own echo and skip re-applying it.
 *
 * Created in W0 (FE-01b) because the api module attaches the header; FE-02
 * owns it from W1. Writers call `issueMutationId()` and pass the id to the
 * `api.ts` function; realtime consumers call `isOwnEvent(frame)`.
 */

const TTL_MS = 30_000;
const remembered = new Map<string, number>();

export const MUTATION_HEADER = "X-Client-Mutation";

export function newMutationId(): string {
  const c = typeof globalThis !== "undefined" ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // RFC 4122 v4 fallback for old browsers / non-secure contexts.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function prune(now: number) {
  for (const [id, expires] of remembered) {
    if (expires <= now) remembered.delete(id);
  }
}

/** Remember an id this tab sent, for 30 seconds. */
export function rememberMutation(id: string, now: number = Date.now()): void {
  prune(now);
  remembered.set(id, now + TTL_MS);
}

/** True when `id` was sent by this tab within the last 30 seconds. */
export function isOwnMutation(id: string | null | undefined, now: number = Date.now()): boolean {
  if (!id) return false;
  prune(now);
  return remembered.has(id);
}

/**
 * A fresh id that is already remembered: the one call a write needs before
 * passing the id to an `api.ts` function (which sends it as the header).
 */
export function issueMutationId(now: number = Date.now()): string {
  const id = newMutationId();
  rememberMutation(id, now);
  return id;
}

/** True when a board event is the echo of a write this tab made (E11). */
export function isOwnEvent(event: { client_mutation_id?: string | null } | null | undefined, now?: number): boolean {
  return isOwnMutation(event?.client_mutation_id, now);
}

export function mutationHeaders(id?: string | null): Record<string, string> {
  return id ? { [MUTATION_HEADER]: id } : {};
}

/** Test helper. */
export function _resetMutations(): void {
  remembered.clear();
}
