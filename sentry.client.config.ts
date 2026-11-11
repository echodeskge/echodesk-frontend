// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { resolveSentryOptions } from "@/lib/sentry-options";

// `process.env.NEXT_PUBLIC_*` / `NODE_ENV` are inlined at build time — keep
// the literal references here (not inside the helper) so Next can replace them.
// Env DSN first, then the public project DSN (src/lib/sentry-options.ts).
const { dsn, enabled, environment, tracesSampleRate } = resolveSentryOptions({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
  nodeEnv: process.env.NODE_ENV,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
});

Sentry.init({
  dsn,
  // Only production builds report; dev/test runs stay out of the production
  // project (see src/lib/sentry-options.ts).
  enabled,
  environment,

  // Add optional integrations for additional features
  integrations: [
    Sentry.replayIntegration(),
  ],

  // 10% of transactions in production (sentry-options.ts).
  tracesSampleRate,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
