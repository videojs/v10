import process from 'node:process';

import * as Sentry from '@sentry/astro';

// Only the deployed Netlify Function runtime sets AWS_LAMBDA_FUNCTION_NAME;
// it's absent during `astro build`. Gating on it keeps errors from pre-render
// (e.g. a broken PR) out of Sentry — we only want live request failures.
const isLambdaRuntime = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

// Alert for production (videojs.org) and branch-deploy (next.videojs.org) only.
// Deploy-preview errors are the PR author's to triage before merge.
const context = import.meta.env.CONTEXT;
const isAlertingContext = context === 'production' || context === 'branch-deploy';

Sentry.init({
  dsn: 'https://6bcdfa6b82da6dd4d7753618a9a69c7c@o43841.ingest.us.sentry.io/4510671167160320',
  environment: context || 'development',
  enabled: import.meta.env.PROD && isLambdaRuntime && isAlertingContext,
  release: import.meta.env.COMMIT_REF || import.meta.env.DEPLOY_ID || undefined,
  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/astro/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
