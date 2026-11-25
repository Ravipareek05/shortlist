import * as Sentry from "@sentry/node"

// Sentry is optional: it only starts when SENTRY_DSN is set.
export const sentryEnabled = Boolean(process.env.SENTRY_DSN)

if (sentryEnabled) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [Sentry.mongooseIntegration()],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    sendDefaultPii: false,
  })
}
