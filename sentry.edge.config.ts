// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { resolveSentryOptions } from "@/lib/sentry-options";

// Env DSN first, then the public project DSN (src/lib/sentry-options.ts).
const { dsn, enabled, environment, tracesSampleRate } = resolveSentryOptions({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
  nodeEnv: process.env.NODE_ENV,
  environment: process.env.SENTRY_ENVIRONMENT,
});

Sentry.init({
  dsn,
  // Only production builds report; dev/test runs stay out of the production
  // project (see src/lib/sentry-options.ts).
  enabled,
  environment,

  // 10% of transactions in production (sentry-options.ts).
  tracesSampleRate,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
