---
status: draft
date: 2026-05-21
---

# Volume & Muted Persistence

Persist the user's volume level and muted state to `localStorage` so preferences carry
across page loads — no action required from the user, opt-out only.

## Summary

When a user adjusts volume or mutes the player, those preferences are silently written to
`localStorage` under the keys `vjs-pref-volume` and `vjs-pref-muted`. On the next page
load, `volumeFeature.attach()` reads those values and applies them to the media element
before the first `sync()` call, so state is already correct when the store hands off to
the UI. Both preferences are on by default; authors opt out individually via HTML
attributes (`no-volume-pref`, `no-muted-pref`) on the player container. All storage
I/O is wrapped in try/catch so private-browsing environments and strict Content Security
Policies degrade silently.

## Prior Art

| Player | Mechanism | Opt-out | LS Keys | Notes |
|---|---|---|---|---|
| Media Chrome | Writes on `volumechange` | `novolumepref` / `nomutedpref` attrs | `media-chrome-pref-volume` / `media-chrome-pref-muted` | Bug #803: sliding to 0 then un-muting lost the pref; fix = always write on volumechange |
| Mux Player | Inherits Media Chrome | `no-volume-pref` / `no-muted-pref` attrs forwarded to MC | Same as MC | Forwards attrs to underlying MC element |
| Vidstack | Pluggable `MediaStorage` interface | Omit storage adapter | Configurable key prefix | Async-ready, most extensible |
| Plyr | `plyr` LS key, single JSON blob | No per-instance opt-out | `plyr` | Shared key is a footgun for multi-player pages |
| VJS v8 | `persistTextTrackSettings` boolean, separate `TextTrackSettings` store | `persistTextTrackSettings: false` | `vjs-text-track-settings` | try/catch on both read and write; text-track only |

## Non-Goals

- **No remote storage** — no server-side or cloud pref syncing in this PR.
- **No cross-tab sync** — `storage` event listeners and `BroadcastChannel` are out of scope.
- **No playback-rate persistence** — `playbackRate` is a separate slice; that PR can follow the same pattern independently.
- **No SSR / Node compatibility layer** — `attach()` is browser-only by design; no polyfill or guard for `window` is added.
- **No versioned key namespacing** — e.g. `vjs-pref-volume@2` — see Open Questions.
- **No quota management** — if `localStorage` is full, `writePref` silently no-ops (the try/catch absorbs the `QuotaExceededError`).

## File Map

| Action | File | Reason |
|---|---|---|
| **Modify** | `packages/core/src/dom/store/features/volume.ts` | Add `readPref`/`writePref` module-level helpers; update `attach()` to read prefs on attach and write on every `volumechange` |
| **Modify** | `packages/core/src/dom/store/features/tests/volume.test.ts` | Add persistence test cases to the existing `describe('volumeFeature')` suite |

No new files required. The helpers are module-private (unexported) so they don't
affect the public API and don't need a barrel export change.

## `readPref` / `writePref` Helpers

Place as unexported module-level functions at the bottom of
`packages/core/src/dom/store/features/volume.ts`, below `canSetVolume()`.

```ts
/** localStorage key for persisted volume (float 0–1 as string). */
const PREF_VOLUME_KEY = 'vjs-pref-volume';

/** localStorage key for persisted muted state ('true' | 'false' as string). */
const PREF_MUTED_KEY = 'vjs-pref-muted';

/**
 * Read a string value from localStorage.
 * Returns `null` on any error (private browsing, strict CSP, key absent).
 */
function readPref(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Write a string value to localStorage.
 * Silent no-op on any error (QuotaExceededError, SecurityError, etc.).
 */
function writePref(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Intentional no-op: private browsing, quota exceeded, strict policies.
  }
}
```

**Why module-level, not inline:** The two keys and two helpers are referenced in three
places inside `attach()` (two reads + one write inside the `sync` closure). Extracting
them reduces duplication and makes unit-testing the helpers directly possible if needed.

**Why not a shared utility in `@videojs/utils`:** Only the volume slice uses these
today. Promoting to a shared util requires a `workspace:*` dep bump in `@videojs/core`
and a public API decision. Prefer co-location until a second consumer appears.

## Volume Slice Changes

### Constants added (top of file, next to `UNMUTE_VOLUME`)

```diff
  /** Volume to restore when unmuting at zero. */
  const UNMUTE_VOLUME = 0.25;
+
+ /** localStorage key for persisted volume (float 0–1 as string). */
+ const PREF_VOLUME_KEY = 'vjs-pref-volume';
+
+ /** localStorage key for persisted muted state ('true' | 'false' as string). */
+ const PREF_MUTED_KEY = 'vjs-pref-muted';
```

### `attach()` — before

```ts
attach({ target, signal, set }) {
  const { media } = target;

  if (!isMediaVolumeCapable(media)) return;

  set({ volumeAvailability: canSetVolume() });

  const sync = () => set({ volume: media.volume, muted: media.muted });
  sync();

  listen(media, 'volumechange', sync, { signal });
},
```

### `attach()` — after

```ts
attach({ target, signal, set }) {
  const { media, container } = target;

  if (!isMediaVolumeCapable(media)) return;

  set({ volumeAvailability: canSetVolume() });

  const skipVolume = container?.hasAttribute('no-volume-pref') ?? false;
  const skipMuted = container?.hasAttribute('no-muted-pref') ?? false;

  // Restore persisted preferences before the first sync so the store never
  // hands the UI a stale default.
  if (!skipVolume) {
    const saved = readPref(PREF_VOLUME_KEY);
    const parsed = saved !== null ? Number(saved) : Number.NaN;
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1) {
      media.volume = parsed;
    }
  }

  if (!skipMuted) {
    const saved = readPref(PREF_MUTED_KEY);
    if (saved !== null) {
      media.muted = saved === 'true';
    }
  }

  const sync = () => {
    set({ volume: media.volume, muted: media.muted });
    if (!skipVolume) writePref(PREF_VOLUME_KEY, String(media.volume));
    if (!skipMuted) writePref(PREF_MUTED_KEY, String(media.muted));
  };

  sync();

  listen(media, 'volumechange', sync, { signal });
},
```

**Key design decisions in the diff:**

1. `container?.hasAttribute(...)` — reads the opt-out flags off the player container
   element. `container` is `HTMLElement | null`; the optional chain handles `null`
   gracefully.
2. The pref read runs **before** `sync()` so the store's first state emission already
   reflects the user's preference — no intermediate flash of `volume: 1, muted: false`.
3. `skipVolume` / `skipMuted` are read **once** at attach time, not re-checked on every
   `volumechange`. Opt-out is a static attribute contract (mirrors Media Chrome).
4. The `sync` closure writes to `localStorage` **after** calling `set(...)` — store
   state is always authoritative; storage is a side-effect.

## Opt-out Attribute Contract

| Attribute | Suppresses LS key | Default | HTML usage |
|---|---|---|---|
| `no-volume-pref` | `vjs-pref-volume` | Not present (persist ON) | `<media-player no-volume-pref>` |
| `no-muted-pref` | `vjs-pref-muted` | Not present (persist ON) | `<media-player no-muted-pref>` |

Both attributes are **boolean** (presence = opt-out, absence = opt-in). They are
checked once at `attach()` time, on `target.container` (the player's root `HTMLElement`).

**Partial opt-out** — persist volume, suppress muted:

```html
<media-player no-muted-pref>
  <video src="..."></video>
</media-player>
```

**Full opt-out:**

```html
<media-player no-volume-pref no-muted-pref>
  <video src="..."></video>
</media-player>
```

## Edge Cases

### `localStorage` unavailable (private browsing, strict policies)

`readPref` wraps `localStorage.getItem` in try/catch; any `SecurityError` or access
error returns `null`, and the `if (saved !== null)` guard skips the assignment. The
media element keeps its default values (`volume: 1`, `muted: false`).

`writePref` wraps `localStorage.setItem` in try/catch; `QuotaExceededError`,
`SecurityError`, or any other error is swallowed silently. No state is lost — the
in-memory store is still updated by `set(...)`.

### Volume slid to 0 then user un-mutes (the Media Chrome bug)

This scenario is already handled by the existing `toggleMuted()` logic:

1. User slides to 0 → `volumechange` fires → `sync()` writes `vjs-pref-volume = "0"`,
   `vjs-pref-muted = "false"`.
2. User mutes via toggle → `volumechange` fires → `sync()` writes
   `vjs-pref-muted = "true"`, `vjs-pref-volume = "0"`.
3. User un-mutes via `toggleMuted()`:
   - `effectivelyMuted = media.muted || media.volume === 0` → `true`
   - `media.muted = false`, `media.volume = UNMUTE_VOLUME (0.25)`
   - `volumechange` fires → `sync()` writes `vjs-pref-volume = "0.25"`,
     `vjs-pref-muted = "false"`.

After step 3 the stored preference is `0.25` / `false` — the correct non-zero value. The
Media Chrome bug was caused by NOT writing on `volumechange`; we always write, so the
stored value always reflects the final state.

### `no-volume-pref` set but `no-muted-pref` not (partial opt-out)

`skipVolume = true`, `skipMuted = false`. On attach:

- Volume pref is **not read** from storage; media element keeps its current `volume`.
- Muted pref **is read** from storage and applied.

On every `volumechange`:

- Volume is **not written** to storage.
- Muted state **is written** to storage.

Both paths are independent. The two `if (!skip*)` guards ensure no cross-contamination.

### Stored value is corrupt / out-of-range (NaN, >1, <0)

For volume:

```ts
const parsed = saved !== null ? Number(saved) : Number.NaN;
if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1) {
  media.volume = parsed;
}
```

- `Number("abc") → NaN` → guard fails → skip.
- `Number("1.5") → 1.5` → `> 1` → guard fails → skip.
- `Number("-0.1") → -0.1` → `< 0` → guard fails → skip.

The media element keeps its default `volume: 1`.

For muted: `saved === 'true'` is a strict string equality check. Any other string
(`"yes"`, `"1"`, `"True"`) evaluates to `false` (not muted). Only a value written by
`writePref` itself (`"true"` or `"false"`) is meaningful.

### Multiple player instances on one page

Both instances share the same `localStorage` keys. The last `volumechange` across all
instances wins. This matches the tradeoff Media Chrome and VJS v8 make — a site-wide
volume preference, not a per-player one. If per-instance isolation is needed in the
future, a `storageKeyPrefix` option on the feature can be added without changing the
default.

### SSR / no `window` environment

`attach()` is only called in browser contexts: it receives a live `HTMLMediaElement` and
reads `target.container` (an `HTMLElement`). No SSR framework calls `attach()` during
server-side rendering. The `readPref`/`writePref` helpers reference `localStorage` as a
bare identifier; in environments where it doesn't exist (Node.js), the try/catch catches
the `ReferenceError` and returns `null` / no-ops. No explicit `typeof window` guard is
needed.

## Test Plan

All tests are added to the existing
`packages/core/src/dom/store/features/tests/volume.test.ts` file under a new
`describe('attach — persistence')` block. The test environment is **jsdom** (configured
in `packages/core/vitest.config.ts`), which provides a real `localStorage`
implementation — no extra mocking needed for the happy path. For "throws" scenarios,
`vi.spyOn(Storage.prototype, ...)` is used.

```ts
import { createStore } from '@videojs/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerTarget } from '../../../media/types';
import { createMockVideo } from '../../../tests/test-helpers';
import { volumeFeature } from '../volume';

function createContainer(attrs: string[] = []): HTMLElement {
  const el = document.createElement('div');
  for (const attr of attrs) el.setAttribute(attr, '');
  return el;
}

describe('volumeFeature', () => {
  // existing describe('attach') and describe('actions') blocks ...

  describe('attach — persistence', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('restores volume from localStorage on attach', () => {
      localStorage.setItem('vjs-pref-volume', '0.6');

      const video = createMockVideo({});
      const store = createStore<PlayerTarget>()(volumeFeature);
      store.attach({ media: video, container: createContainer() });

      expect(video.volume).toBe(0.6);
      expect(store.state.volume).toBe(0.6);
    });

    it('restores muted from localStorage on attach', () => {
      localStorage.setItem('vjs-pref-muted', 'true');

      const video = createMockVideo({ muted: false });
      const store = createStore<PlayerTarget>()(volumeFeature);
      store.attach({ media: video, container: createContainer() });

      expect(video.muted).toBe(true);
      expect(store.state.muted).toBe(true);
    });

    it('writes volume to localStorage on volumechange', () => {
      const video = createMockVideo({ volume: 1, muted: false });
      const store = createStore<PlayerTarget>()(volumeFeature);
      store.attach({ media: video, container: createContainer() });

      video.volume = 0.4;
      video.dispatchEvent(new Event('volumechange'));

      expect(localStorage.getItem('vjs-pref-volume')).toBe('0.4');
    });

    it('writes muted to localStorage on volumechange', () => {
      const video = createMockVideo({ volume: 0.8, muted: false });
      const store = createStore<PlayerTarget>()(volumeFeature);
      store.attach({ media: video, container: createContainer() });

      video.muted = true;
      video.dispatchEvent(new Event('volumechange'));

      expect(localStorage.getItem('vjs-pref-muted')).toBe('true');
    });

    it('does NOT write volume when no-volume-pref attribute is present', () => {
      const video = createMockVideo({ volume: 1, muted: false });
      const store = createStore<PlayerTarget>()(volumeFeature);
      store.attach({ media: video, container: createContainer(['no-volume-pref']) });

      video.volume = 0.4;
      video.dispatchEvent(new Event('volumechange'));

      expect(localStorage.getItem('vjs-pref-volume')).toBeNull();
    });

    it('does NOT write muted when no-muted-pref attribute is present', () => {
      const video = createMockVideo({ volume: 0.8, muted: false });
      const store = createStore<PlayerTarget>()(volumeFeature);
      store.attach({ media: video, container: createContainer(['no-muted-pref']) });

      video.muted = true;
      video.dispatchEvent(new Event('volumechange'));

      expect(localStorage.getItem('vjs-pref-muted')).toBeNull();
    });

    it('is a silent no-op when localStorage throws on read', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });

      const video = createMockVideo({ volume: 1, muted: false });
      const store = createStore<PlayerTarget>()(volumeFeature);

      expect(() => {
        store.attach({ media: video, container: createContainer() });
      }).not.toThrow();

      expect(video.volume).toBe(1);
      expect(video.muted).toBe(false);

      vi.restoreAllMocks();
    });

    it('is a silent no-op when localStorage throws on write', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const video = createMockVideo({ volume: 1, muted: false });
      const store = createStore<PlayerTarget>()(volumeFeature);
      store.attach({ media: video, container: createContainer() });

      expect(() => {
        video.volume = 0.3;
        video.dispatchEvent(new Event('volumechange'));
      }).not.toThrow();

      expect(store.state.volume).toBe(0.3);

      vi.restoreAllMocks();
    });

    it('ignores corrupt stored volume and keeps media element default', () => {
      localStorage.setItem('vjs-pref-volume', 'not-a-number');

      const video = createMockVideo({ volume: 0.8 });
      const store = createStore<PlayerTarget>()(volumeFeature);
      store.attach({ media: video, container: createContainer() });

      expect(video.volume).toBe(0.8);
    });

    it('ignores out-of-range stored volume (> 1)', () => {
      localStorage.setItem('vjs-pref-volume', '1.5');

      const video = createMockVideo({ volume: 0.5 });
      const store = createStore<PlayerTarget>()(volumeFeature);
      store.attach({ media: video, container: createContainer() });

      expect(video.volume).toBe(0.5);
    });

    it('ignores out-of-range stored volume (< 0)', () => {
      localStorage.setItem('vjs-pref-volume', '-0.1');

      const video = createMockVideo({ volume: 0.5 });
      const store = createStore<PlayerTarget>()(volumeFeature);
      store.attach({ media: video, container: createContainer() });

      expect(video.volume).toBe(0.5);
    });

    it('un-mute after volume-to-zero restores UNMUTE_VOLUME (0.25) in storage', async () => {
      const video = createMockVideo({ volume: 0, muted: true });
      const store = createStore<PlayerTarget>()(volumeFeature);
      store.attach({ media: video, container: createContainer() });

      await store.toggleMuted();

      expect(localStorage.getItem('vjs-pref-volume')).toBe('0.25');
      expect(localStorage.getItem('vjs-pref-muted')).toBe('false');
    });
  });
});
```

## Open Questions

1. **React provider layer** — Should the same preferences be read/applied in the React
   `<Player>` provider (before the store is handed to React)? Currently `attach()` is the
   only application point; a React consumer that constructs the store before attaching a
   media element would see the defaults until `attach()` runs. Is that acceptable, or
   should React expose a `volumePrefs` prop for SSR-safe pre-seeding?

2. **LS key versioning** — Should the keys carry a version suffix (e.g.
   `vjs-pref-volume@1`) to allow future format changes without silently misinterpreting
   old data? VJS v8 did not version its keys and it caused no known issues, but the
   project is new and this is the first persisted key.

3. **`container` being `null`** — The current `PlayerTarget` allows `container: null`.
   When `container` is `null`, `skipVolume` and `skipMuted` both default to `false`
   (persistence is on). Is this the right default, or should a `null` container mean
   "no DOM, skip persistence"? For now opt-out attributes cannot be set without a
   container, so the behavior is consistent.

4. **Multiple instances / shared key** — If a page intentionally runs two players with
   different volume preferences (e.g., background music at 0.2 and foreground video at
   0.8), the shared key means the last-touched instance wins. An opt-in `storageKeyPrefix`
   prop on the feature (or on the HTML element) would solve this without changing the
   default. Worth discussing before shipping.

5. **`no-volume-pref` on `<video>` vs. container** — The attribute is checked on
   `target.container`. Authors using the headless store without a full player element
   hierarchy might have no container. Should the fallback be to check `target.media`
   itself? Needs clarification from the HTML package team.
