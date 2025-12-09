// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isDev = process.env.NODE_ENV === 'development'

Sentry.init({
  dsn: "https://1f20202250984298ee551e42cf7482a6@o4510357410611200.ingest.de.sentry.io/4510495304712272",
  release: process.env.NEXT_PUBLIC_APP_VERSION || process.env.VERCEL_GIT_COMMIT_SHA,

  // Disable Sentry in development - logs will go to console instead
  enabled: !isDev,
  debug: isDev,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: isDev ? 0 : 1,

  // Enable logs to be sent to Sentry
  enableLogs: !isDev,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

