/**
 * Shared helpers for the FE-04 board admin tests. Each test file still
 * declares its own `vi.mock` calls (they are hoisted per file); these helpers
 * only route the mocked axios calls and render with a fresh QueryClient.
 */
import React from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

type Method = "get" | "post" | "put" | "patch" | "delete";
type Handler = (body?: unknown, config?: unknown) => unknown;
export type Routes = Partial<Record<`${Uppercase<Method>} ${string}`, unknown | Handler>>;

export class HttpError extends Error {
  response: { status: number; data: unknown };
  constructor(status: number, data: unknown = {}) {
    super(`HTTP ${status}`);
    this.response = { status, data };
  }
}

/** Route a mocked axios instance by "METHOD /url/" (query string ignored for matching unless the key has one). */
export function routeAxios(axios: Record<Method, ReturnType<typeof vi.fn>>, routes: Routes) {
  for (const method of ["get", "post", "put", "patch", "delete"] as Method[]) {
    axios[method].mockImplementation(async (url: string, a?: unknown, b?: unknown) => {
      const config = (method === "get" || method === "delete" ? a : b) as { params?: Record<string, unknown> } | undefined;
      const body = method === "get" || method === "delete" ? undefined : a;
      const page = config?.params?.page;
      const keys = [
        page ? `${method.toUpperCase()} ${url}#page=${page}` : null,
        `${method.toUpperCase()} ${url}`,
        `${method.toUpperCase()} ${url.split("?")[0]}`,
      ].filter(Boolean) as string[];
      const key = keys.find((k) => k in routes) as keyof Routes | undefined;
      if (!key) throw new HttpError(404, { detail: `unmocked ${method} ${url}` });
      const entry = routes[key];
      const result = typeof entry === "function" ? await (entry as Handler)(body, config) : entry;
      if (result instanceof HttpError) throw result;
      return { data: result };
    });
  }
}

export function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const utils = render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return { ...utils, client, invalidate };
}

/** next-intl stand-in: returns the key, plus JSON params when given. */
export const translate = (ns: string) => (key: string, params?: Record<string, unknown>) =>
  `${ns}.${key}${params ? ":" + JSON.stringify(params) : ""}`;

export function invalidatedKeys(invalidate: ReturnType<typeof vi.spyOn>): unknown[] {
  return invalidate.mock.calls.map((c) => (c[0] as { queryKey?: unknown })?.queryKey);
}
