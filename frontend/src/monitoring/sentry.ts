import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;

Sentry.init({
  dsn,

  // Invitation URLs carry a private bearer token in their fragment.
  enabled: !import.meta.env.DEV && Boolean(dsn) && !window.location.pathname.startsWith('/convites/aceitar'),

  environment:
    import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE,

  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },
});
