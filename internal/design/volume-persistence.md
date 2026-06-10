---
status: draft
date: 2026-05-27
---

# Player Preferences (Storage)

A `StorageAdapter` abstraction that persists user preferences — volume and muted state — across page reloads using the browser's Storage API.

## Problem

Every player session starts at `volume: 1, muted: false`. `volumeFeature.attach()` always syncs from the live media element state — there is no read or write to storage. Users who prefer a low volume or muted state must readjust on every page load.

The fix requires: a storage interface the rest of the system can depend on without coupling to `localStorage` directly; a way to pass that storage into the feature that uses it; and a sensible default in the HTML and React packages that works without extra consumer configuration.

## API

### HTML

Storage persistence is on by default in the built-in player elements. No configuration is needed:

```html
<video-player>
  <video src="..."></video>
</video-player>
```

### React

Same behavior — the React preset wires in `localStorageAdapter` by default. Consumers who want a different adapter build a custom feature array:

```tsx
import { createPlayer, createVolumeFeature } from '@videojs/react';
import { videoFeatures } from '@videojs/react/video';

// Default — localStorage on, shared key per origin
<Provider>...</Provider>

// Custom adapter — swap localStorage for sessionStorage, in-memory, remote, etc.
const { Provider } = createPlayer({
  features: [...videoFeatures, createVolumeFeature(myAdapter)],
});
```

## Architecture

### StorageAdapter

A narrow interface in `packages/core/src/dom/storage.ts` — no `window` reference:

```ts
interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}
```

`localStorage` and `sessionStorage` satisfy this interface natively. Custom adapters (in-memory for tests, IndexedDB, remote) implement the same shape.

### How features use it

`volumeFeature` is replaced by `createVolumeFeature(adapter?: StorageAdapter)`. The adapter is captured in the factory's closure — no changes to `PlayerTarget` or the feature `attach()` signature.

```ts
// Default (no storage) — used by core presets
export const volumeFeature = createVolumeFeature();

// With storage — used by html/react built-in player elements
const feature = createVolumeFeature(localStorageAdapter);
```

`createVolumeFeature(adapter).attach()` reads from the adapter before the first sync — restoring volume and muted state directly onto the media element — then writes on every `volumechange` event. When no adapter is provided the behavior is unchanged.

The restore happens before `sync()` so the store's first `set()` call already reflects the user's saved preference. No extra render or flash.

### Key convention

```
vjs-pref-volume   → number string, 0–1
vjs-pref-muted    → 'true' | 'false'
```

`localStorage` is already scoped to browser origin — no domain prefix is needed.

### Default adapter

`localStorageAdapter` in `packages/html/src/storage` and `packages/react/src/storage`:

- A plain constant (no factory function).
- All calls are wrapped in try/catch — silently handles `SecurityError` (private browsing, quota exceeded) by returning `null` from `getItem` and ignoring `setItem` failures.

### Player element wiring

The HTML player element definitions (`video/player.ts`, `audio/player.ts`, `live-video/player.ts`, `live-audio/player.ts`) substitute `createVolumeFeature(localStorageAdapter)` in place of the plain `volumeFeature` singleton from the core preset. No ProviderMixin or runtime changes are needed.

The React presets follow the same pattern.

## Decisions

### Adapter in feature closure, not PlayerTarget

Passing the adapter directly to `createVolumeFeature(adapter)` keeps `PlayerTarget` unchanged and localizes the storage concern to the one feature that uses it. Any feature that needs storage in the future gets its own factory.

### Opt-out, not opt-in by default

Persistence is on by default in the built-in HTML and React player elements. Consumers disable it by composing their own feature array. This matches Media Chrome's approach and avoids boilerplate for the common case.

### Interface over raw localStorage

Features access storage through `StorageAdapter`, not `window.localStorage` directly. This keeps features testable without mocking globals, and lets consumers swap in `sessionStorage`, in-memory adapters, or a remote preferences service without touching the feature layer.

### v1: volume and muted only

The `StorageAdapter` design accommodates any future feature with zero changes — any feature's factory can accept an adapter. Playback rate, captions language, and quality persistence are follow-up issues.

## Prior Art

| Player       | Default   | Opt-out mechanism        | Scoping           |
| ------------ | --------- | ------------------------ | ----------------- |
| Media Chrome | On        | `novolumepref` attribute | Global per origin |
| Vidstack     | Off       | `storage` prop required  | Per-player ID     |
| Mux Player   | Off       | Config option            | Per-player config |
| Video.js v8  | Off (plugin) | N/A                   | N/A               |

Video.js 10 adopts opt-out (like Media Chrome) with no per-player scoping in v1. The adapter interface is more composable than anything the above players expose publicly.

## Edge Cases

**Private browsing / storage quota.** `SecurityError` is silently swallowed by the default adapter. `getItem` returns `null`, which features treat as "no stored value." The player behaves exactly as if no adapter were provided.

**iOS Safari: programmatic volume not supported.** `volumeFeature` already detects this via `canSetVolume()` and returns early from `attach()`. Storage restore and persist are never reached.

**Multiple players on the same page.** They share one preference value — last write wins. This is intentional: all players share the user's volume preference unless the consumer passes each a distinct adapter instance.

**`<video muted>` HTML attribute.** The `muted` attribute on a media element sets an initial muted state. The storage restore overwrites this — stored preference wins over the HTML attribute. Authors who need a hard-coded muted state should use `createVolumeFeature()` (no adapter) or handle it at the application layer.

**SSR.** `StorageAdapter` is defined in `packages/core` with no `window` reference. The default adapter lives in browser-only packages. Features only access the adapter inside `attach()`, which only runs in a browser context.

## File Structure

```
packages/core/src/dom/
└── storage.ts             ← New: StorageAdapter interface + VJS_PREF_VOLUME / VJS_PREF_MUTED constants

packages/core/src/dom/store/features/
└── volume.ts              ← createVolumeFeature(adapter?); volumeFeature = createVolumeFeature()

packages/html/src/
├── storage.ts             ← New: localStorageAdapter constant
└── define/
    ├── video/player.ts         ← createVolumeFeature(localStorageAdapter) in feature array
    ├── audio/player.ts         ← Same
    ├── live-video/player.ts    ← Same
    └── live-audio/player.ts    ← Same

packages/react/src/
└── storage.ts             ← New: localStorageAdapter constant (mirrors html/src/storage.ts)
```
