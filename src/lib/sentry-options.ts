/**
 * Shared runtime options for the three Sentry entry points
 * (sentry.client/server/edge.config.ts).
 *
 * Sentry only ever reports from production builds: `next dev` / `next build`
 * runs on laptops (NODE_ENV=development, localhost ports) used to end up in
 * the production project because `enabled` was never set. The DSN is read
 * from the environment first and falls back to the project's public
 * client-side DSN (safe to keep in source; production has no DSN build arg
 * wired yet, so the fallback is what keeps reporting alive there).
 */
export interface SentryRuntimeInput {
  /** NEXT_PUBLIC_SENTRY_DSN ?? SENTRY_DSN, as read in the config file. */
  dsn: string | undefined;
  /** process.env.NODE_ENV */
  nodeEnv: string | undefined;
  /** Optional explicit environment tag (SENTRY_ENVIRONMENT); defaults to NODE_ENV. */
  environment?: string | undefined;
}

export interface SentryRuntimeOptions {
  dsn: string;
  enabled: boolean;
  environment: string;
  tracesSampleRate: number;
}

/** Public (client-side) DSN of the EchoDesk web project — used when no env DSN is set. */
export const DEFAULT_SENTRY_DSN =
  "https://b9a702d6abdafabd1d2b7af8e9bede1a@o4510624823443456.ingest.de.sentry.io/4510625079361616";

export const PRODUCTION_TRACES_SAMPLE_RATE = 0.1;

export function resolveSentryOptions({ dsn, nodeEnv, environment }: SentryRuntimeInput): SentryRuntimeOptions {
  const isProduction = nodeEnv === "production";
  return {
    dsn: dsn?.trim() || DEFAULT_SENTRY_DSN,
    // Only production builds report; dev/test runs stay out of the project.
    enabled: isProduction,
    environment: environment?.trim() || nodeEnv || "development",
    // 10% of transactions in production; the full rate elsewhere is moot
    // because the SDK is disabled there.
    tracesSampleRate: isProduction ? PRODUCTION_TRACES_SAMPLE_RATE : 1,
  };
}
