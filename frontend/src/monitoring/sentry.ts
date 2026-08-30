import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;

Sentry.init({
  dsn,

  enabled: !import.meta.env.DEV && Boolean(dsn),

  environment:
    import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE,

  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },
});
