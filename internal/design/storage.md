---
status: draft
date: 2026-05-27
---

# Player Preferences (Storage)

A `StorageAdapter` abstraction that persists user preferences — volume and muted state — across page reloads using the browser's Storage API.

## Problem

Every player session starts at `volume: 1, muted: false`. `volumeFeature.attach()` always syncs from the live media element state — there is no read or write to storage. Users who prefer a low volume or muted state must readjust on every page load.

The fix requires: a storage interface the rest of the system can depend on without coupling to `localStorage` directly; a way for the player's feature layer to access that storage at attach time; and a sensible default that works without configuration while remaining overridable.

## API

### HTML

Storage persistence is on by default. No configuration is needed for the common case:

```html
<video-player>
  <video src="..."></video>
</video-player>
```

To isolate preferences between multiple players on the same page, supply a key:

```html
<video-player storage-key="intro-player">...</video-player>
<video-player storage-key="sidebar-clip">...</video-player>
```

To opt out entirely:

```html
<video-player no-storage-pref>...</video-player>
```

### React

Same semantics, expressed as props:

```tsx
// Default — localStorage on, shared key per origin
<Provider>...</Provider>

// Per-player key
<Provider storageKey="intro-player">...</Provider>

// Opt-out
<Provider noStoragePref>...</Provider>

// Custom adapter — swap localStorage for sessionStorage, in-memory, remote, etc.
import { sessionStorageAdapter } from '@videojs/react/storage';
<Provider storage={sessionStorageAdapter}>...</Provider>
```

## Architecture

### StorageAdapter

A narrow interface in `packages/core/src/dom` — no `window` reference:

```ts
interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}
```

`localStorage` and `sessionStorage` satisfy this interface natively. Custom adapters (in-memory for tests, IndexedDB, remote) implement the same shape.

### PlayerTarget

`StorageAdapter` is added as an optional field on `PlayerTarget`, alongside `media` and `container`. Features access it the same way they access the media element — through `target` in `attach()`. No feature API changes.

```ts
interface PlayerTarget {
  media: Media;
  container: MediaContainer | null;
  storage?: StorageAdapter; // new
}
```

### How features use it

`volumeFeature.attach()` reads from storage before the first sync — restoring volume and muted state directly onto the media element — then writes on every `volumechange` event. When `target.storage` is absent (opt-out), behavior is unchanged.

The restore happens before `sync()` so the store's first `set()` call already reflects the user's saved preference. No extra render or flash.

### Key convention

```
vjs-pref-volume   → number string, 0–1
vjs-pref-muted    → 'true' | 'false'
```

When a `storageKey` is provided, it replaces the `vjs-pref` prefix:

```
${storageKey}-volume
${storageKey}-muted
```

`localStorage` is already scoped to browser origin — no domain prefix is needed.

### Default adapter

`localStorageAdapter` in `packages/html/src/storage` and `packages/react/src/storage`:

- All calls are wrapped in try/catch — silently handles `SecurityError` (private browsing, quota exceeded) by returning `null` from `getItem` and ignoring `setItem` failures.
- `createLocalStorageAdapter(storageKey?)` builds a namespaced adapter when a custom key is provided.

### ProviderMixin hook

The HTML `ProviderMixin` builds `PlayerTarget` in `#tryAttach()`. A protected `buildStorage()` method is added so concrete player elements can override the adapter without touching the mixin's private internals. The mixin's default returns `localStorageAdapter` (opt-out behavior). The mixin tracks whether storage has changed alongside media and container, and re-attaches the store when it does.

## Decisions

### StorageAdapter in PlayerTarget, not per-feature factories

`PlayerTarget` already represents "the external environment the player attaches to" — it carries the media element and the container. Storage is part of that same environment.

Alternatives considered:

- **Per-feature factory** (`createVolumeFeature({ storage })`) — explicit, but breaks the singleton pattern for features. Every preset becomes a factory. Consumers wiring custom feature lists must opt in manually per feature.
- **StorageController outside the store** — zero changes to features or `PlayerTarget`, but restoring values is deferred until after first render. This causes a brief volume flash: the player renders at volume 1, then jumps to the stored value. The `PlayerTarget` approach restores before the first sync, so no flash occurs.

### Opt-out, not opt-in

Persistence is on by default. Consumers disable with `no-storage-pref`.

Opt-in would mean most consumers write `storage={localStorageAdapter}` everywhere — a boilerplate line that adds noise without benefit. The behavior is universally desirable and directly observable by users. This matches Media Chrome's approach.

### Global per-origin key with per-player override

The default prefix `'vjs-pref'` gives a single shared preference per origin, which is correct for the most common case: one player per site, user preference applies everywhere. `storageKey` allows isolation on pages with multiple embeds that should have independent preferences.

### Interface over raw localStorage

Features access storage through `StorageAdapter`, not `window.localStorage` directly. This keeps features testable without mocking globals, and lets consumers swap in `sessionStorage`, in-memory adapters, or a remote preferences service without touching the feature layer.

### v1: volume and muted only

The `StorageAdapter` design accommodates any future feature with zero changes — any feature's `attach()` can read from `target.storage`. Playback rate, captions language, and quality persistence are follow-up issues that slot in without architectural revisiting.

## Prior Art

| Player       | Default   | Opt-out mechanism        | Scoping           |
| ------------ | --------- | ------------------------ | ----------------- |
| Media Chrome | On        | `novolumepref` attribute | Global per origin |
| Vidstack     | Off       | `storage` prop required  | Per-player ID     |
| Mux Player   | Off       | Config option            | Per-player config |
| Video.js v8  | Off (plugin) | N/A                   | N/A               |

Video.js 10 adopts opt-out (like Media Chrome) with per-player key override (like Vidstack) and an adapter interface that none of them expose publicly.

## Edge Cases

**Private browsing / storage quota.** `SecurityError` is silently swallowed by the default adapter. `getItem` returns `null`, which features treat as "no stored value." The player behaves exactly as if no storage were provided.

**iOS Safari: programmatic volume not supported.** `volumeFeature` already detects this via `canSetVolume()` and returns early from `attach()`. Storage restore and persist are never reached.

**Multiple players with the same key.** They share one preference value — last write wins. This is intentional: all players on a page share the user's volume preference unless explicitly isolated with different `storageKey` values.

**`storage-key` or `no-storage-pref` change after mount.** The player element re-evaluates `buildStorage()` when these properties change and re-attaches the store with the updated `PlayerTarget`. The new adapter takes effect immediately.

**`<video muted>` HTML attribute.** The `muted` attribute on a media element sets an initial muted state. The storage restore overwrites this — stored preference wins over the HTML attribute. Authors who need a hard-coded muted state should use `no-storage-pref` or handle it at the application layer.

**SSR.** `StorageAdapter` is defined in `packages/core` with no `window` reference. The default adapter lives in browser-only packages. Features only access `target.storage` inside `attach()`, which only runs in a browser context.

## Descoped

- **Playback rate persistence** — same pattern, separate issue.
- **Captions language preference** — depends on language negotiation design.
- **Time / position persistence** — playback resume is per-media, not per-user-preference, and requires a `mediaId` scoping strategy.
- **Cross-tab sync** — listening to `storage` events to propagate changes across tabs is not needed for v1.
- **Preference-clearing API** — `store.clearPreferences()` or an attribute to force-reset stored values. Not in scope.
- **Async adapters** — IndexedDB requires an async `getItem`. Making `attach()` async has broad implications across the feature layer; deferred.

## File Structure

```
packages/core/src/dom/
├── media/
│   └── types.ts           ← Add storage?: StorageAdapter to PlayerTarget
└── storage.ts             ← New: StorageAdapter interface + key constants

packages/html/src/
├── storage.ts             ← New: localStorageAdapter, createLocalStorageAdapter
├── store/
│   └── provider-mixin.ts  ← Add buildStorage() hook; include in target; track changes
└── define/
    ├── video/player.ts         ← Add no-storage-pref, storage-key; override buildStorage()
    ├── audio/player.ts         ← Same
    ├── live-video/player.ts    ← Same
    └── live-audio/player.ts    ← Same

packages/react/src/
├── storage.ts             ← New: mirrors html/src/storage.ts
└── provider.tsx           ← Add noStoragePref, storageKey, storage props

packages/core/src/dom/store/features/
└── volume.ts              ← Read from storage in attach(); write in sync()
```
