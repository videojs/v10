---
status: draft
date: 2026-04-06
---

# Hotkey

Declarative keyboard shortcuts for media controls.

## Problem

Video players need keyboard shortcuts for common actions — play/pause, seek, volume, fullscreen, mute, captions. Users expect them. Every major player ships them. Video.js 10 currently has none.

Requirements:

- Declarative HTML-first API — configure via markup, not script
- Configurable key bindings with modifier support
- Input safety — shortcuts must not fire while typing in text fields
- Container-scoped by default, with document-scope opt-in
- Tree-shakeable — unused bindings don't ship
- Cross-framework — same core logic powers HTML and React
- Accessible — controls can discover and announce their bound shortcuts

## API

### Component

A single generic `<media-hotkey>` component with `keys` and `action` props.

Each element declares one binding. To bind multiple keys to the same action, use multiple elements. This avoids delimiter ambiguity — `+` is already the modifier separator.

#### HTML

```html
<!-- Playback -->
<media-hotkey keys="Space" action="togglePaused"></media-hotkey>
<media-hotkey keys="k" action="togglePaused"></media-hotkey>

<!-- Seeking (positive = forward, negative = backward) -->
<media-hotkey keys="ArrowRight" action="seekStep" value="5"></media-hotkey>
<media-hotkey keys="ArrowLeft" action="seekStep" value="-5"></media-hotkey>
<media-hotkey keys="l" action="seekStep" value="10"></media-hotkey>
<media-hotkey keys="j" action="seekStep" value="-10"></media-hotkey>

<!-- Percentage seek -->
<media-hotkey keys="0-9" action="seekToPercent"></media-hotkey>
<media-hotkey keys="Home" action="seekToPercent" value="0"></media-hotkey>
<media-hotkey keys="End" action="seekToPercent" value="100"></media-hotkey>

<!-- Volume (positive = up, negative = down) -->
<media-hotkey keys="ArrowUp" action="volumeStep" value="0.05"></media-hotkey>
<media-hotkey keys="ArrowDown" action="volumeStep" value="-0.05"></media-hotkey>
<media-hotkey keys="m" action="toggleMuted"></media-hotkey>

<!-- Display -->
<media-hotkey keys="f" action="toggleFullscreen"></media-hotkey>
<media-hotkey keys="i" action="togglePiP"></media-hotkey>
<media-hotkey keys="c" action="toggleSubtitles"></media-hotkey>

<!-- Speed (steps through available playbackRates) -->
<media-hotkey keys="Shift+>" action="speedUp"></media-hotkey>
<media-hotkey keys="Shift+<" action="speedDown"></media-hotkey>

<!-- Disabled -->
<media-hotkey keys="k" action="togglePaused" disabled></media-hotkey>

<!-- Document-scoped (fires regardless of player focus) -->
<media-hotkey keys="Space" action="togglePaused" target="document"></media-hotkey>
```

#### React

```tsx
<MediaHotkey keys="k" action="togglePaused" />
<MediaHotkey keys="ArrowRight" action="seekStep" value={5} />
<MediaHotkey keys="ArrowLeft" action="seekStep" value={-5} />
<MediaHotkey keys="ArrowUp" action="volumeStep" value={0.05} />
<MediaHotkey keys="Shift+>" action="speedUp" />
```

`keys` (not `key`) avoids collision with React's reserved `key` prop.

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `keys` | `string` | — | Key pattern to match. Required. |
| `action` | `string` | — | Hotkey action to execute. Required. |
| `value` | `number` | — | Numeric argument for the action (e.g., seek offset, volume step). Sign indicates direction. |
| `disabled` | `boolean` | `false` | Disables this binding. |
| `target` | `'player' \| 'document'` | `'player'` | Where to listen for key events. |
| `event` | `'keydown' \| 'keyup'` | `'keydown'` | Which keyboard event to listen on. |

The `value` prop is intentionally generic — typing it precisely per action would require discriminated unions that add complexity for marginal safety. The underlying factory functions provide precise types.

Invalid actions are no-ops with a `__DEV__` warning.

#### Actions

Actions are hotkey-specific behaviors — not 1:1 mirrors of store methods. The store exposes `play()`, `pause()`, `seek(time)`, `setVolume(level)`, `setPlaybackRate(rate)`, `toggleMuted()`, `requestFullscreen()`, `exitFullscreen()`, `toggleSubtitles()`, `requestPictureInPicture()`, `exitPictureInPicture()`. Hotkey actions wrap these with the input logic users expect from keyboard shortcuts.

**Toggle actions** — no `value`:

| Action | Behavior |
|---|---|
| `togglePaused` | Toggle between play and pause. |
| `toggleMuted` | Toggle mute state. |
| `toggleFullscreen` | Toggle fullscreen mode. |
| `toggleSubtitles` | Toggle captions/subtitles visibility. |
| `togglePiP` | Toggle picture-in-picture mode. |

**Relative actions** — `value` is a signed offset applied to current state:

| Action | Behavior |
|---|---|
| `seekStep` | Seek by `value` seconds from current time. Positive = forward, negative = backward. |
| `volumeStep` | Adjust volume by `value` (0–1 scale). Positive = louder, negative = quieter. |

**Discrete step actions** — step through the `playbackRates` array, no `value`:

| Action | Behavior |
|---|---|
| `speedUp` | Step to the next higher rate in `playbackRates`. Wraps to lowest if at highest. |
| `speedDown` | Step to the next lower rate in `playbackRates`. Wraps to highest if at lowest. |

**Percentage seek:**

| Action | Behavior |
|---|---|
| `seekToPercent` | Jump to a percentage of duration. If `value` is set, uses it directly (0–100). If `value` is omitted, derives from the key — digit keys produce `digit × 10` (e.g., `3` → 30%). No-op if the key isn't a digit and no `value` is set. |

### Key matching

Key patterns use `KeyboardEvent.key` values — layout-dependent, mnemonic ("K for play", "F for fullscreen"). This is consistent with the existing keyboard handling in the slider and button factories.

**Format:** `[Modifier+]...Key`

| Pattern | Matches |
|---|---|
| `k` | K key, no modifiers |
| `Space` | Space bar |
| `ArrowLeft` | Left arrow |
| `0-9` | Any digit key (0 through 9) |
| `Shift+>` | Shift + > (the shifted character, not the unshifted key) |
| `Mod+k` | Cmd+K on macOS, Ctrl+K elsewhere |
| `Ctrl+Shift+f` | Ctrl + Shift + F |

**Ranges:**

`0-9` matches any single digit key. The range expands at registration time into individual bindings — one per key in the range. The matched key is available to the action handler, which is how `seekToPercent` knows which digit was pressed.

Only `0-9` is supported. Arbitrary ranges (e.g., `a-z`) are not — there's no use case for them in media shortcuts.

**Modifiers:**

| Name | Maps to |
|---|---|
| `Shift` | `event.shiftKey` |
| `Ctrl` | `event.ctrlKey` |
| `Alt` | `event.altKey` |
| `Meta` | `event.metaKey` |
| `Mod` | `event.metaKey` on macOS, `event.ctrlKey` elsewhere |

**Rules:**

- Patterns are parsed into `{ modifiers, key }` at registration time — no parsing per event.
- `event.key` is compared case-insensitively.
- **Exact modifier matching** — all specified modifiers must be active, all unspecified must be inactive. `k` does not fire when Ctrl+K is pressed.
- `Mod` resolves at parse time based on platform detection (`navigator.userAgentData?.platform` with `navigator.platform` fallback).
- IME composition input is filtered — events where `event.key === 'Unidentified'` are skipped.

### Conflict resolution

When multiple `<media-hotkey>` elements could match the same key event:

**Specificity** — A binding with more modifiers takes priority. `Shift+ArrowLeft` beats `ArrowLeft` when Shift is held.

**DOM order** — Among equal-specificity bindings, the first registered fires. This matches how the browser resolves duplicate event listeners.

**One fires** — After a match, remaining bindings for that event are skipped.

**Input safety** — Single-key shortcuts (no modifiers) are suppressed when the event target is editable: `<input>` (text types), `<textarea>`, `<select>`, or `contenteditable`. Modifier combinations (`Ctrl+K`, `Mod+S`) always fire, even in inputs — users expect system-style combos to work everywhere. Editability is checked via `event.composedPath()` to handle inputs inside shadow DOM.

**Interactive element priority** — When `event.target` is an interactive element (`button`, `[role="button"]`, `[role="slider"]`) and the key is an activation key (`Space`, `Enter`), hotkey handling is skipped. The element's own handler takes precedence — a focused play button pressing Space should activate the button, not fire the hotkey.

**Repeat handling** — Toggle actions ignore `event.repeat`. Holding a key should not rapid-fire a toggle. Relative actions (`seekStep`, `volumeStep`) and discrete step actions (`speedUp`, `speedDown`) allow repeat — holding an arrow key should continuously seek.

**AltGr** — On Windows, AltGr sends `Ctrl+Alt` simultaneously and cannot be distinguished from an actual Ctrl+Alt press. Avoid `Ctrl+Alt` bindings in default sets.

### Hotkey coordinator

Underneath both the component and the factory functions sits a `HotkeyCoordinator`, one per player container. It manages the binding registry, event listening, matching, input filtering, and action dispatch.

The coordinator attaches a **single `keydown` listener per target** (container or `document`) and routes events to matching bindings internally — not one listener per binding. On match, it calls `preventDefault()` and executes the action.

**Lifecycle:** Created lazily when the first `<media-hotkey>` connects. Destroyed when the last disconnects. Uses `AbortController` for listener cleanup.

**Store access:** The coordinator reads the player store on-demand when a key fires — it does not subscribe to state changes. This is an event-driven system, not a reactive one. Subscribing would create unnecessary work (re-running selectors on every state change) for a system that only needs state at the moment a key is pressed.

### Target

**Player** (default) — The coordinator listens on the player container element. Hotkeys fire only when the event originates within the player. This is the safe default: multiple players on one page don't conflict, and embedded players don't capture unexpected global events.

**Document** — The coordinator adds a listener to `document`. Hotkeys fire regardless of focus. This enables the YouTube-style experience where pressing Space anywhere on the page toggles playback.

When multiple players exist with document-scoped hotkeys, only the most recently interacted player responds. A lightweight global registry tracks the last player to receive pointer or focus events.

Per-binding `target` overrides allow mixing: most hotkeys player-scoped, specific ones (e.g., Space for play/pause) document-scoped.

### Hotkey functions

For users who need more control than `<media-hotkey>` provides — custom key-to-action mappings, non-standard targets, or tree-shaking — the factory function is importable directly:

```ts
import { createHotkey } from '@videojs/html';

const container = document.querySelector('media-container');
const player = document.querySelector('media-player');

const destroy = createHotkey(container, {
  keys: 'k',
  onActivate: () => {
    player.store.paused ? player.store.play() : player.store.pause();
  },
});
```

```ts
createHotkey(target, options) → cleanup
```

Each factory takes a target element and an options object, returns a cleanup function. Framework-agnostic. No action resolution — the consumer provides `onActivate` directly.

The declarative component remains the recommended API. The factory is the escape hatch — the same function that powers `<media-hotkey>` internally, exposed for full control.

### React hooks

Hotkeys map naturally to hooks — more idiomatic and a better TypeScript story since the callback types are precise.

```tsx
// Specific hook — precise types, tree-shakeable
useHotkey({
  keys: 'k',
  onActivate: () => store.paused ? store.play() : store.pause(),
});

// Combined hook — multiple bindings
useHotkeys([
  { keys: 'k', onActivate: togglePlay },
  { keys: 'ArrowLeft', onActivate: () => time.seek(time.currentTime - 5) },
  { keys: 'ArrowRight', onActivate: () => time.seek(time.currentTime + 5) },
]);
```

Hooks use `createHotkey` internally. They resolve the target element from player context by default but accept a `target` override in options:

```tsx
const ref = useRef<HTMLDivElement>(null);
useHotkey({ keys: 'k', onActivate: togglePlay, target: ref });
```

### `aria-keyshortcuts` registry

The coordinator maintains a registry mapping action strings to their bound key patterns. Control components query this registry to set `aria-keyshortcuts` on themselves — so screen readers can announce available shortcuts.

**Registration:** When `<media-hotkey keys="k" action="togglePaused">` connects, the coordinator registers `{ action: "togglePaused", keys: "k" }`. When multiple hotkeys bind the same action, shortcuts accumulate: `"k"` + `"Space"` → `"k Space"` (space-separated alternatives, per the WAI-ARIA `aria-keyshortcuts` format).

**Query:** The coordinator exposes `getAriaKeys(action)` which returns the `aria-keyshortcuts` formatted string, or `undefined` if no bindings exist for that action.

**Context:** The registry is provided via context alongside the player store. In HTML, a `HotkeyRegistryController` consumes it. In React, a `useHotkeyRegistry()` hook.

**Consumer pattern:** Controls query the registry during their update cycle and apply the attribute:

```ts
// HTML — inside a button element's update
const shortcuts = this.#hotkeyRegistry.value?.getAriaKeys('togglePaused');
// → "k Space"
// Applied as aria-keyshortcuts="k Space" on the button
```

```tsx
// React — inside a button component
const registry = useHotkeyRegistry();
const shortcuts = registry?.getAriaKeys('togglePaused');

<button aria-keyshortcuts={shortcuts}>{/* ... */}</button>
```

**Format:** The registry converts internal key patterns to WAI-ARIA format — modifier names use the formal forms (`Ctrl` → `Control`, `Mod` → `Meta` or `Control`), combos use `+`, alternatives are space-separated.

## Prior art

### Industry survey

Every major video player ships keyboard shortcuts. The bindings are remarkably consistent across the industry:

**Universal** (all major players):

| Action | Key | Players |
|---|---|---|
| Play/Pause | `Space` | YouTube, Vimeo, Netflix, VLC, Plyr, Media Chrome, Video.js 7 |
| Play/Pause | `K` | YouTube, Vimeo, Media Chrome, Vidstack |
| Mute | `M` | YouTube, Vimeo, Netflix, VLC, Video.js 7, Media Chrome |
| Fullscreen | `F` | YouTube, Vimeo, Netflix, VLC, Video.js 7, Media Chrome, Plyr |
| Volume | `Arrow Up/Down` | YouTube, Vimeo, Netflix, Video.js 7, Media Chrome, Plyr |
| Seek ±5s | `Arrow Left/Right` | YouTube, Vimeo, Netflix, Video.js 7, Media Chrome, Plyr |

**Common** (most players):

| Action | Key | Players |
|---|---|---|
| Seek ±10s | `J` / `L` | YouTube, Vimeo, Media Chrome |
| Percentage seek | `0`–`9` | YouTube, Netflix, Video.js 7 |
| Captions | `C` | Vimeo, Media Chrome, Vidstack |
| Speed | `Shift+>` / `Shift+<` | YouTube, VLC, Media Chrome, Vidstack |
| PiP | `I` or `P` | YouTube (`I`), Media Chrome (`P`) |
| Help overlay | `Shift+?` | YouTube, Vimeo, Media Chrome |

**Notable innovations:**

- **VLC** — Progressive seeking with modifier stacking: `Shift+Arrow` (3s), `Alt+Arrow` (10s), `Ctrl+Arrow` (1m). Power-user ergonomics.
- **YouTube** — Chapter navigation (`Ctrl+Arrow`), theater mode (`T`), mini player (`I`). Platform-specific features on top of universal bindings.
- **Vimeo** — Frame-by-frame stepping (`Shift+Arrow`). Useful for editing workflows.
- **Vidstack / Media Chrome** — `aria-keyshortcuts` integration on controls. The accessibility pattern we adopt.
- **Netflix** — Skip intro (`S`). Context-dependent actions.

### Libraries

- **TanStack Hotkeys** — Template string key patterns (`"Mod+Shift+S"`), `Mod` maps to Cmd/Ctrl, input filtering. We adopt the `Mod` normalization and input safety patterns.
- **Vidstack** — `keyShortcuts` property, string/array/callback key definitions, `keyTarget` for scope control.
- **Media Chrome** — `keysUsed` attribute on individual controls. Decentralized approach — each control handles its own keys. No coordinator, which makes conflict resolution harder.

## Recommended bindings

Not shipped as a preset — documented as the standard set for users to compose:

| Key | Action | Value | Notes |
|---|---|---|---|
| `Space` | `togglePaused` | — | Universal. Dual-bound with `K`. |
| `k` | `togglePaused` | — | YouTube/Vimeo standard. Avoids Space scroll conflict. |
| `m` | `toggleMuted` | — | Universal. |
| `f` | `toggleFullscreen` | — | Universal. |
| `ArrowRight` | `seekStep` | `5` | Universal. |
| `ArrowLeft` | `seekStep` | `-5` | Universal. |
| `ArrowUp` | `volumeStep` | `0.05` | Universal. 5% steps. |
| `ArrowDown` | `volumeStep` | `-0.05` | Universal. 5% steps. |
| `l` | `seekStep` | `10` | YouTube/Vimeo. Ergonomic alternative to arrows. |
| `j` | `seekStep` | `-10` | YouTube/Vimeo. Ergonomic alternative to arrows. |
| `c` | `toggleSubtitles` | — | Vimeo/Media Chrome. |
| `i` | `togglePiP` | — | YouTube convention. |
| `0-9` | `seekToPercent` | — | YouTube/Netflix. Each digit × 10%. |
| `Home` | `seekToPercent` | `0` | Jump to start. |
| `End` | `seekToPercent` | `100` | Jump to end. |
| `Shift+>` | `speedUp` | — | YouTube/VLC. Steps through `playbackRates`. |
| `Shift+<` | `speedDown` | — | YouTube/VLC. Steps through `playbackRates`. |

## Edge cases

**macOS Cmd+key** — When Cmd is held, `keyup` does not fire for non-modifier keys. This is an OS-level behavior affecting all browsers. The `event` prop defaults to `keydown` for this reason. Bindings that need `keyup` should be aware of this limitation.

**Shadow DOM** — Keyboard events are composed — they cross shadow boundaries naturally. The coordinator uses `event.composedPath()` for input filtering, which correctly detects inputs inside shadow roots.

**Keyboard layouts** — `event.key` is layout-dependent. On a French AZERTY keyboard, the physical key where `K` sits produces a different character. This is acceptable — mnemonic shortcuts ("K for play/pause") are the industry standard. Non-US users are accustomed to this from every other player. The factory function escape hatch supports `event.code` for positional bindings if needed.

**iframes** — Keyboard events do not cross iframe boundaries. Players embedded in iframes must register their own hotkey handlers. Not something the coordinator solves.

**Multiple players** — Player target (the default) avoids conflicts entirely. Document target routes to the most recently interacted player via a global registry.

## Descoped

| Feature | Reason |
|---|---|
| Hold-for-speed (`repeat` prop) | YouTube-style hold-Space-for-2x. Two bindings on the same key: `<media-hotkey keys="Space" action="togglePaused">` + `<media-hotkey keys="Space" action="speedBoost" repeat>`. The `repeat` binding fires on `event.repeat` keydowns. When a `repeat` binding exists on the same key, the coordinator defers the non-repeat sibling to `keyup` — fires only if no repeat occurred. Adds coordinator complexity (keyup tracking, deferred dispatch). Factory function escape hatch covers this today. |
| Key sequences (`g` then `i`) | No media player precedent. Complex state machine for minimal value. |
| Visual shortcut overlay | UI component concern, not hotkey system. |
| `onActivate` callback on component | Factory function covers this. |
| `event.code` support on component | `event.key` covers mnemonic shortcuts. Factory escape hatch available for positional bindings. |
