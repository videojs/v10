---
status: decided
date: 2026-02-26
---

# Disable Netlify Edge Functions in Dev

## Decision

Set `NETLIFY_DEV=1` before `astro dev` to disable `@netlify/vite-plugin` entirely, preventing Deno from spawning during local development.

```jsonc
// site/package.json
"dev": "NETLIFY_DEV=1 astro dev"
```

## Context

Running `pnpm dev` intermittently crashes with a fatal Deno OOM error:

```
Fatal process out of memory: JSDispatchTable::AllocateAndInitializeEntry
```

The crash originates in V8 isolate initialization — before any of our code runs. Netlify's dev server spawns Deno web workers for edge functions, and a known Deno/V8 bug ([denoland/deno_core#1091](https://github.com/denoland/deno_core/issues/1091)) causes OOM during `JSDispatchTable` allocation.

Our only edge function is `site/netlify/edge-functions/markdown-negotiation.ts`, which serves `.md` files for requests with `Accept: text/markdown` on `/blog/*` and `/docs/*` paths (for LLM consumption).

## Alternatives Considered

- **Bump `@netlify/vite-plugin`** — Upgraded 2.8.0 → 2.10.2. OOM still reproduces; the root cause is in Deno's V8, not Netlify's tooling.

- **Move edge function to Astro middleware** — Prerendered pages are served as static files from the CDN. Astro middleware only runs for SSR pages, so it never intercepts the static `/blog/*` and `/docs/*` routes.

- **Move to a serverless function** — Serverless functions don't support the `header` config property. Our edge function relies on `header: { accept: 'text/markdown' }` to scope to markdown-requesting clients. Without it, the function would run on every `/blog/*` and `/docs/*` request.

- **`DENO_V8_FLAGS=--max-old-space-size=8192`** — Targets the JS heap, not V8 internal structures like `JSDispatchTable`. Could make things worse by increasing per-isolate memory reservation.

- **Early-return in dev (`context.deploy.context === 'dev'`)** — The OOM occurs during Deno isolate initialization, before any handler code runs. Early-return can't prevent it.

- **`middleware: false` on `@netlify/vite-plugin`** — Only skips registering the Vite request middleware. `NetlifyDev` is still created and `start()` still spawns Deno.

- **`devFeatures: false` on `@astrojs/netlify`** — Only controls `images` and `environmentVariables`. The adapter never passes `edgeFunctions` to `@netlify/vite-plugin`, so edge functions always default to enabled.

- **Pass `edgeFunctions: { enabled: false }` to `@netlify/vite-plugin`** — The correct lever (`NetlifyDev` skips Deno when `edgeFunctions.enabled` is `false`), but `@astrojs/netlify` doesn't expose this option. Would require patching adapter internals — fragile and breaks on updates.

## Rationale

`NETLIFY_DEV=1` is an official escape hatch in `@netlify/vite-plugin`. When set, the plugin's factory returns `[]` — no `NetlifyDev` instance, no Deno, no OOM.

**What we lose in dev:**

| Feature | Impact |
|---|---|
| Netlify Image CDN | Falls back to Astro's built-in image service (still works) |
| Redirect emulation | Only affects legacy routes (`/city`, `/fantasy`, etc.) |
| Edge function emulation | The markdown negotiation function doesn't matter in dev |
| Blob storage | Not used in typical dev workflow |

None of these are essential for local development. The Astro adapter still handles SSR, sessions, and builds normally.

**Tracking:** [#588](https://github.com/videojs/v10/issues/588)
