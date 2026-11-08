/**
 * Data hooks of the Calls screen that do more than pass a request through:
 * today's summary (the API caps page_size at 100, so totals come from
 * `count`) and the agent filter's translated extension fallback.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const get = vi.fn();
vi.mock("@/api/axios", () => ({ default: { get: (...args: unknown[]) => get(...args) } }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (key === "ext" ? `შიდა ${values?.ext}` : key),
}));

import { useCallAgents, useTodaySummary } from "@/app/(tenant)/calls/_components/use-call-logs";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const today = (h: number) => {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d.toISOString();
};

describe("useTodaySummary", () => {
  beforeEach(() => get.mockReset());

  it("never asks for more than the API's 100-row page and takes totals from count", async () => {
    get.mockImplementation((_url: string, config?: { params: Record<string, unknown> }) => {
      const params = config?.params ?? {};
      if (params.status__in) return Promise.resolve({ data: { results: [], count: 37 } });
      return Promise.resolve({
        data: {
          count: 240,
          results: [
            { id: 1, status: "answered", started_at: today(9), answered_at: today(9), duration: "00:02:00" },
            { id: 2, status: "missed", started_at: today(8), duration: null },
          ],
        },
      });
    });

    const { result } = renderHook(() => useTodaySummary(0), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toEqual({ total: 240, missed: 37, avgSeconds: 120 });
    for (const [, { params }] of get.mock.calls) {
      expect(params.page_size).toBeLessThanOrEqual(100);
      expect(params.started_after).toBeTruthy();
    }
    const missedCall = get.mock.calls.find(([, { params }]) => params.status__in);
    expect(missedCall?.[1].params.status__in).toBe("missed,no_answer");
  });
});

describe("useCallAgents", () => {
  beforeEach(() => get.mockReset());

  it("labels a user without a name by the translated extension", async () => {
    get.mockResolvedValue({ data: { results: [{ user: 7, user_name: "", extension: "107" }] } });
    const { result } = renderHook(() => useCallAgents(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual([{ id: 7, name: "შიდა 107" }]);
  });
});
