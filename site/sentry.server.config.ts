import * as Sentry from '@sentry/astro';

Sentry.init({
  dsn: 'https://6bcdfa6b82da6dd4d7753618a9a69c7c@o43841.ingest.us.sentry.io/4510671167160320',
  environment: import.meta.env.CONTEXT || 'development',
  enabled: import.meta.env.PROD,
  release: import.meta.env.COMMIT_REF || import.meta.env.DEPLOY_ID || undefined,
  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/astro/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
