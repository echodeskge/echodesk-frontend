/**
 * Sentry must stay silent outside production builds: local `next dev`
 * sessions used to report into the production project because `enabled`
 * was never set. These tests pin the gating logic, the DSN resolution
 * (environment first, public project DSN as fallback) and the three
 * entry-point configs (client / server / edge).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  replayIntegration: vi.fn(() => ({ name: "Replay" })),
  captureRequestError: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => sentry);

import { DEFAULT_SENTRY_DSN, PRODUCTION_TRACES_SAMPLE_RATE, resolveSentryOptions } from "@/lib/sentry-options";

const DSN = "https://public@o1.ingest.example.sentry.io/1";
const ENV_KEYS = ["NEXT_PUBLIC_SENTRY_DSN", "SENTRY_DSN", "SENTRY_ENVIRONMENT", "NEXT_PUBLIC_SENTRY_ENVIRONMENT"] as const;

describe("resolveSentryOptions", () => {
  it("is disabled when NODE_ENV is not production, even with a DSN", () => {
    for (const nodeEnv of ["development", "test", undefined]) {
      const opts = resolveSentryOptions({ dsn: DSN, nodeEnv });
      expect(opts.enabled).toBe(false);
      expect(opts.dsn).toBe(DSN);
    }
  });

  it("resolves the DSN from the environment first, the public project DSN otherwise", () => {
    expect(resolveSentryOptions({ dsn: DSN, nodeEnv: "production" }).dsn).toBe(DSN);
    expect(resolveSentryOptions({ dsn: undefined, nodeEnv: "production" }).dsn).toBe(DEFAULT_SENTRY_DSN);
    expect(resolveSentryOptions({ dsn: "   ", nodeEnv: "production" }).dsn).toBe(DEFAULT_SENTRY_DSN);
    expect(DEFAULT_SENTRY_DSN).toMatch(/^https:\/\/[0-9a-f]+@o\d+\.ingest\.de\.sentry\.io\/\d+$/);
  });

  it("is enabled in production, sampling 10% of traces", () => {
    expect(resolveSentryOptions({ dsn: undefined, nodeEnv: "production" })).toEqual({
      dsn: DEFAULT_SENTRY_DSN,
      enabled: true,
      environment: "production",
      tracesSampleRate: PRODUCTION_TRACES_SAMPLE_RATE,
    });
    expect(PRODUCTION_TRACES_SAMPLE_RATE).toBe(0.1);
  });

  it("tags the environment from NODE_ENV unless overridden", () => {
    expect(resolveSentryOptions({ dsn: DSN, nodeEnv: "development" }).environment).toBe("development");
    expect(resolveSentryOptions({ dsn: DSN, nodeEnv: "production", environment: "staging" }).environment).toBe("staging");
    expect(resolveSentryOptions({ dsn: undefined, nodeEnv: undefined }).environment).toBe("development");
  });
});

describe("sentry.*.config.ts", () => {
  beforeEach(() => {
    vi.resetModules();
    sentry.init.mockClear();
    for (const key of ENV_KEYS) vi.stubEnv(key, "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const configs = {
    client: () => import("../../../sentry.client.config"),
    server: () => import("../../../sentry.server.config"),
    edge: () => import("../../../sentry.edge.config"),
  };

  for (const [name, load] of Object.entries(configs)) {
    it(`${name}: enabled=false outside production`, async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
      await load();
      expect(sentry.init).toHaveBeenCalledTimes(1);
      expect(sentry.init.mock.calls[0][0]).toMatchObject({ enabled: false, dsn: DSN, environment: "development" });
    });

    it(`${name}: enabled=true in production with the fallback DSN when no env DSN is set`, async () => {
      vi.stubEnv("NODE_ENV", "production");
      await load();
      expect(sentry.init.mock.calls[0][0]).toMatchObject({
        enabled: true,
        dsn: DEFAULT_SENTRY_DSN,
        environment: "production",
        tracesSampleRate: 0.1,
      });
    });

    it(`${name}: NEXT_PUBLIC_SENTRY_DSN wins over SENTRY_DSN and the fallback`, async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("SENTRY_DSN", "https://second@o1.ingest.example.sentry.io/2");
      vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
      await load();
      expect(sentry.init.mock.calls[0][0]).toMatchObject({ enabled: true, dsn: DSN });
    });

    it(`${name}: SENTRY_DSN is used when NEXT_PUBLIC_SENTRY_DSN is unset`, async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("SENTRY_DSN", DSN);
      await load();
      expect(sentry.init.mock.calls[0][0]).toMatchObject({ enabled: true, dsn: DSN });
    });
  }
});
