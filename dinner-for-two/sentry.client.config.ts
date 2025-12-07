// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (!dsn) {
  console.error('❌ NEXT_PUBLIC_SENTRY_DSN is not set! Sentry will not work.');
}

Sentry.init({
  dsn: dsn,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out known errors that we don't want to track
  beforeSend(event, hint) {
    const error = hint.originalException;
    
    // Ignore validation errors (they're expected and handled)
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (
        message.includes('valid dish name') ||
        message.includes('invalid_input') ||
        message.includes('не название блюда') ||
        message.includes('not a food-related') ||
        message.includes('связанное с едой')
      ) {
        return null; // Don't send to Sentry
      }
    }

    // Add React error context
    if (event.exception) {
      event.exception.values?.forEach((exception) => {
        if (exception.value?.includes('Minified React error')) {
          exception.value = `React Error: ${exception.value}`;
          event.tags = { ...event.tags, react_error: true };
        }
      });
    }

    return event;
  },
});

// Capture React errors that might not be caught by ErrorBoundary
if (typeof window !== 'undefined') {
  // Capture unhandled errors
  window.addEventListener('error', (event) => {
    if (event.error) {
      Sentry.captureException(event.error, {
        tags: { error_type: 'unhandled_error' },
        contexts: {
          react: {
            errorBoundary: false,
          },
        },
      });
    }
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    Sentry.captureException(event.reason, {
      tags: { error_type: 'unhandled_promise_rejection' },
    });
  });
}


