import { lazy, Suspense } from 'react';

// dashjs bundles imsc, which reads `window.getComputedStyle` at module scope, so the
// module throws the moment it is evaluated during Astro's prerender (#1343). A
// `client:only` directive is not enough on its own — Astro still emits a static import
// for the island — so BasicUsage is pulled in through a dynamic `import()` that only
// ever runs in the browser. Drop this wrapper once dashjs loads lazily in core.
const BasicUsage = lazy(() => import('./BasicUsage'));

/**
 * Client-only wrapper for the DashVideo demo. Renders nothing until the dashjs chunk
 * arrives; the 16/9 box that holds the space lives in the MDX page, since only markup
 * rendered on the server can reserve layout before hydration.
 */
export default function BasicUsageClient() {
  return (
    <Suspense fallback={null}>
      <BasicUsage />
    </Suspense>
  );
}
