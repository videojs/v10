---
status: draft
date: 2026-03-12
---

# SPF Bundle Distribution & Tree-Shaking Strategy

## Context

SPF is a **framework** for building HLS playback engines. Its consumers range from
applications that embed `createPlaybackEngine` directly, to libraries that compose
only a handful of SPF primitives (e.g. just the HLS parsers, or just the ABR
algorithms). Because SPF will always contain more code than any single concrete use
case needs, the distribution strategy directly determines how much of SPF ends up in
a consumer's final bundle.

**This is an SPF-specific gap.** Every other non-empty package in the monorepo
(`utils`, `store`, `html`, `react`) already uses `unbundle: true` in their tsdown
config and, where applicable, `"sideEffects": false` in `package.json`. SPF is the
only package that uses neither. See §5 for the full monorepo comparison.

This document captures:

1. A snapshot of what is and isn't wired into the reference `createPlaybackEngine`
2. How tree-shaking currently behaves — within SPF's own build and for downstream consumers
3. The three levers available to improve things, with tradeoffs
4. How every other monorepo package already handles this

---

## 1. Current Build Setup

**Builder:** `tsdown` (wraps rolldown, the Rust port of Rollup)
**Format:** `es` (ESM) — required for tree-shaking at all
**Entry points** (from `tsdown.config.ts`):

| Entry | Output | Exports |
|---|---|---|
| `src/index.ts` | `dist/index.js` | `VERSION` only (public stub) |
| `src/dom/index.ts` | `dist/dom/index.js` | DOM utilities and features |
| `src/dom/playback-engine/index.ts` | `dist/dom/playback-engine/index.js` | `SpfMedia` (engine adapter) |

`src/all.ts` exists for bundle size measurement only — it is **not** a published entry
point and deliberately exports everything including internal APIs.

`src/core/index.ts` is currently empty — core exports are not yet publicly surfaced.

---

## 2. What `createPlaybackEngine` Uses vs. What Exists

### Wired into the engine

Every feature called directly by `engine.ts` (`packages/spf/src/dom/playback-engine/engine.ts`):

| Feature | Module |
|---|---|
| `syncPreloadAttribute`, `resolvePresentation` | `core/features/resolve-presentation` |
| `selectVideoTrack`, `selectAudioTrack`, `selectTextTrack` | `core/features/select-tracks` |
| `resolveTrack` | `core/features/resolve-track` |
| `calculatePresentationDuration` | `core/features/calculate-presentation-duration` |
| `switchQuality` | `core/features/quality-switching` |
| `setupMediaSource` | `dom/features/setup-mediasource` |
| `updateDuration` | `dom/features/update-duration` |
| `setupSourceBuffers` | `dom/features/setup-sourcebuffer` |
| `trackCurrentTime` | `dom/features/track-current-time` |
| `trackPlaybackInitiated` | `dom/features/track-playback-initiated` |
| `loadSegments` | `dom/features/load-segments` |
| `endOfStream` | `dom/features/end-of-stream` |
| `setupTextTracks` | `dom/features/setup-text-tracks` |
| `syncTextTrackModes` | `dom/features/sync-text-track-modes` |
| `syncSelectedTextTrackFromDom` | `dom/features/sync-selected-text-track-from-dom` |
| `loadTextTrackCues` | `dom/features/load-text-track-cues` |
| `destroyVttParser` | `dom/text/parse-vtt-segment` |
| `createState` | `core/state/create-state` |
| `createEventStream` | `core/events/create-event-stream` |

### Not wired into the engine (but implemented and exported)

#### Feature-level omissions — implemented features not in the engine

| Export | Module | Notes |
|---|---|---|
| `trackPlaybackRate` | `dom/features/track-playback-rate` | Full feature with tests; exported from `dom/index.ts`; not wired into `createPlaybackEngine` |
| `SpfMedia` | `dom/playback-engine/adapter` | Wraps the engine with a `src`/`play()` API; intentionally separate from the engine itself |

#### Exported helpers only called by tests

| Export | Module | Notes |
|---|---|---|
| `pickVideoTrack` | `core/features/select-tracks` | Exported; only imported in `select-tracks.test.ts` |
| `pickAudioTrack` | `core/features/select-tracks` | Exported; only imported in `select-tracks.test.ts` |

Note: `pickTextTrack` is different — it **is** called in production code (by `selectTextTrack`
in the same file).

Also note: `selectVideoTrack` and `selectAudioTrack` currently do not call `pickVideoTrack`/
`pickAudioTrack` internally — they use `tracks[0]?.id` directly. The pick functions appear
to have been written in anticipation of smarter initial selection (bandwidth-aware, language-
aware) that is not yet connected.

#### Exported but not called anywhere in production code

| Export | Module | Notes |
|---|---|---|
| `fetchResolvableBytes` | `dom/network/fetch` | Streaming variant; exported in `all.ts` only |
| `fetchResolvableStream` | `dom/network/fetch` | Streaming variant; exported in `all.ts` only |
| `isState` | `core/state/create-state` | Type guard; exported in `all.ts` only |
| `isEventStream` | `core/events/create-event-stream` | Type guard; exported in `all.ts` only |

#### Exported unnecessarily — private helpers exposed from their own module

These are called within their defining file but exported publicly with no external callers:

| Export | Module | Internal caller |
|---|---|---|
| `canSelectTrack`, `shouldSelectTrack`, `DEFAULT_INITIAL_BANDWIDTH` | `core/features/select-tracks` | Used by `selectVideoTrack`, `selectAudioTrack`, `selectTextTrack` in same file |
| `canResolve`, `shouldResolve`, `isUnresolved` | `core/features/resolve-presentation` | Used by `resolvePresentation` in same file |
| `canResolve`, `shouldResolve`, `updateTrackInPresentation` | `core/features/resolve-track` | Used by `resolveTrack` in same file |

---

## 3. How Tree-Shaking Currently Works

### Within SPF's own build

rolldown performs tree-shaking across the dependency graph of each entry point. Because
all imports use named specifiers, rolldown can statically determine which exports are
reachable from each entry and drop the rest.

**Concretely:**

- `pickVideoTrack` and `pickAudioTrack` are never imported by any production source file.
  They are dropped from all three entry point bundles. ✅
- `fetchResolvableBytes` and `fetchResolvableStream` are similarly unreachable from the
  entry points. They are dropped. ✅
- `isState` and `isEventStream` only appear in `all.ts`, which is not an entry point.
  They are dropped. ✅
- `trackPlaybackRate` **is** explicitly re-exported from `dom/index.ts` (an entry point).
  It is included in `dist/dom/index.js`. ❌
- `isCodecSupported` is called internally within `mediasource-setup.ts` (by
  `createSourceBuffer`), so it is live code regardless of whether it is exported. ✅

### For downstream consumers

When a downstream app or library imports from `@videojs/spf/dom`, it receives a
**pre-built chunk** — a single JS file containing all code reachable from that entry
point. The downstream bundler then determines how much of that chunk makes it into the
final bundle.

**Two factors govern this:**

#### Factor 1: `"sideEffects"` field in `package.json`

SPF's `package.json` currently has **no `"sideEffects"` field**.

| Bundler | Behaviour without `"sideEffects": false` |
|---|---|
| Rollup / Vite / esbuild | Tree-shakes based on import graph; `sideEffects` not required |
| webpack | Treats all modules as potentially side-effectful; does **not** drop unused exports from pre-built chunks |

Adding `"sideEffects": false` tells every bundler it is safe to drop any module (or
export within a module) that isn't reachable from the consumer's import graph.

#### Factor 2: Bundled vs. unbundled output

With the current **bundled** output, each entry point produces one JS file. A consumer
importing a single named export still downloads and parses the full chunk. Statement-
level tree-shaking (rollup/vite/esbuild) can then eliminate unused code, but only if
the bundler can prove no side effects exist — which is where `"sideEffects": false`
matters.

With **unbundled** output (`unbundle: true` in tsdown), each source module becomes
its own output file. The entry barrel (`dist/dom/index.js`) contains only re-export
statements:

```js
export { trackPlaybackRate } from './features/track-playback-rate.js';
export { loadSegments } from './features/load-segments.js';
// ...
```

A consumer importing `{ loadSegments }` only downloads `load-segments.js` and its
dependencies — `track-playback-rate.js` is never fetched. This is optimal for
library consumers running Rollup, Vite, esbuild, or webpack (since individual file
resolution bypasses the `sideEffects` ambiguity entirely).

**Note:** rolldown does not yet support `preserveModules` (the standard Rollup option
for this). tsdown exposes this capability via its own `unbundle: true` option.

---

## 4. The Three Levers

### Lever 1: `"sideEffects": false` in `package.json`

**What it does:** Declares that no module in the package has import-time side effects.
Downstream webpack instances will tree-shake the pre-built chunks. Rollup/Vite/esbuild
already do this regardless.

**Cost:** Near-zero. The only risk is if SPF ever adds a module that genuinely has side
effects on import (e.g. polyfill application, global registry mutation). Those modules
would need to be listed explicitly: `"sideEffects": ["./src/polyfill.js"]`.

**Impact:** Fixes tree-shaking for webpack consumers with no structural changes.

### Lever 2: `unbundle: true` in `tsdown.config.ts`

**What it does:** Each source module becomes its own output file. The published dist
mirrors `src/` structure. Barrel re-exports become transparent to downstream bundlers —
they follow imports module-by-module.

**Cost:**
- Dist folder ships the full internal module graph. Any file a consumer could import
  directly (e.g. `@videojs/spf/dist/core/hls/parse-attributes.js`) becomes a real
  addressable path. This may be undesirable for APIs intended to be private.
- Mitigated by the `"exports"` map in `package.json`: unlisted paths are blocked by
  Node.js and bundlers that respect the exports map.
- Build output size grows (more files), but installed/downloaded size per consumer
  stays the same or shrinks.

**Impact:** Maximum tree-shakeability for all bundlers, including webpack, without
requiring `"sideEffects"`. Ideal for a framework where consumers pick and choose features.

### Lever 3: Granular subpath exports in `package.json`

**What it does:** Expose individual feature subpaths alongside the barrel:

```json
"exports": {
  ".": { ... },
  "./dom": { ... },
  "./playback-engine": { ... },
  "./dom/load-segments": { ... },
  "./dom/track-playback-rate": { ... },
  "./core/abr": { ... },
  "./core/hls": { ... }
}
```

Consumers can then import `from '@videojs/spf/core/abr'` and get only ABR code
without pulling in anything DOM-related.

**Cost:** Requires maintaining the exports map as the package evolves. Entry-point
explosion if taken too far. Works best combined with `unbundle: true` so the
subpath targets a real single-module file rather than a bundled chunk.

**Impact:** Enables consumers to express precise dependency surfaces. Particularly
useful for consumers that only need SPF primitives (parsers, ABR, buffer math)
without the DOM layer.

---

## 5. Monorepo Comparison

All non-empty packages in the monorepo were audited. SPF is the only one missing both
`unbundle` and `sideEffects`:

| Package | `"sideEffects"` | `unbundle: true` | Dev/default modes | Subpath exports |
|---|---|---|---|---|
| `utils` | `false` ✅ | ✅ | No (single mode) | 11 named subpaths |
| `core` | ❌ missing | ✅ | Yes | 3 subpaths |
| `store` | `false` ✅ | ✅ | Yes | 3 subpaths |
| `html` | `["./dist/*/define/**/*.js"]` ✅ | ✅ | Yes + CDN build | 10+ glob patterns |
| `react` | `false` ✅ | ✅ | Yes | 7+ glob patterns |
| **`spf`** | ❌ **missing** | ❌ **missing** | No | 3 fixed subpaths |

**Notes:**

- `core` is missing `"sideEffects": false` but is covered by `unbundle: true` — per-module
  output means downstream bundlers never need to make a module-level side-effect judgement.
- `html` uses a partial `sideEffects` array rather than `false` because custom element
  define modules (`./dist/*/define/**/*.js`) genuinely do have side effects on import
  (they call `customElements.define`). SPF has no equivalent concern.
- `utils` is the clearest model for SPF: `"sideEffects": false`, `unbundle: true`, one
  named subpath per logical group, no dual dev/default mode (SPF also has no `__DEV__`
  guards yet).

---

## 6. Recommendations (Not Yet Decided)

These options are listed in ascending order of complexity and benefit. They compose —
each can be adopted independently or stacked.

### Option A — Add `"sideEffects": false` (low effort, high value)

The single highest-leverage change available today. Fixes webpack consumers at zero
structural cost. Should be done regardless of which other options are chosen.

### Option B — Switch to `unbundle: true` (medium effort, maximum downstream flexibility)

Makes every module individually addressable and tree-shakeable. Optimal for a framework
positioning. Requires auditing the `"exports"` map to decide what internal paths should
be blocked.

Combined with Option A, this covers all bundler scenarios.

### Option C — Add granular subpath exports (ongoing maintenance)

A useful complement to Options A + B for consumers that want to express surgical
imports. Worth considering as SPF's stable API surface crystallises, not before.

---

## 7. Open Questions

- **`trackPlaybackRate`**: Should it be wired into `createPlaybackEngine`? The feature
  is implemented and tested but not in the engine. If playback rate belongs in the
  engine's state model, wiring it in is the fix. If it's optional/composable, it stays
  as a standalone feature — but its presence in `dom/index.ts` means it's always in the
  DOM entry bundle today.

- **`pickVideoTrack` / `pickAudioTrack`**: These are exported selection helpers that
  `selectVideoTrack`/`selectAudioTrack` don't actually call — the orchestrators take
  `tracks[0]` directly. Either the orchestrators should be updated to use them (closing
  the gap), or they should be unexported (they're implementation details).

- **`fetchResolvableBytes` / `fetchResolvableStream`**: These streaming fetch variants
  exist for future incremental body reading (mid-download abort, chunked bandwidth
  sampling). They are not yet wired into anything. They should either be removed until
  needed or documented as forward-looking API.

- **Internal helper visibility**: `canSelectTrack`, `shouldSelectTrack`, `canResolve`,
  `shouldResolve`, etc. are currently exported even though they have no external callers.
  For a framework, exporting these can be useful for custom orchestration. If they are
  intentional public API, they should stay and be documented. If they are implementation
  details, they should be unexported.

- **`core/index.ts` is empty**: Core primitives (state, events, reactive composition,
  HLS parsers, ABR, buffer math) are not accessible via the `@videojs/spf` root export.
  If SPF's framework value proposition includes composing those primitives directly, a
  populated `core/index.ts` (or dedicated subpath exports) is needed.
