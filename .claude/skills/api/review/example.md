# Example: API Review

Review of a proposed media player store API.

---

## Target

```typescript
// Proposed API
function createPlayer(
  source: string,
  autoplay: boolean,
  muted: boolean,
  controls: ControlsConfig,
  plugins?: Plugin[]
): Player;

interface Player {
  play(): void;
  pause(): void;
  getState(): PlayerState;
  registerPlugin(plugin: Plugin): void;
  on(event: string, handler: Function): void;
}
```

---

# API Review: createPlayer

## Overall Score: 4/10

| Dimension              | Score | Critical | Major | Minor |
| ---------------------- | ----- | -------- | ----- | ----- |
| Types                  | 4/10  | 0        | 2     | 0     |
| API Surface            | 3/10  | 1        | 1     | 1     |
| Extensibility          | 3/10  | 1        | 1     | 0     |
| Progressive Disclosure | 6/10  | 0        | 1     | 1     |

---

## Critical Issues

### [CRITICAL] Function uses 5 positional parameters

**What:** `createPlayer(source, autoplay, muted, controls, plugins)` requires remembering argument order
**Where:** `createPlayer()` function signature
**Why:** Impossible to remember order; adding options requires breaking changes; boolean params particularly confusing (`true, false` means what?)
**Principle:** Config objects for 3+ params (principles.md)
**Fix:** Single config object

```typescript
// Before
createPlayer('video.mp4', true, false, defaultControls, [analytics]);

// After
createPlayer({
  src: 'video.mp4',
  autoplay: true,
  controls: defaultControls,
  slices: [analyticsSlice],
});
```

---

### [CRITICAL] Runtime plugin registration loses type safety

**What:** `player.registerPlugin(plugin)` allows adding plugins after creation
**Where:** `Player.registerPlugin()` method
**Why:** TypeScript can't track what capabilities exist; ordering is implicit; can't tree-shake unused plugins
**Principle:** Emergent extensibility through composition (principles.md)
**Fix:** Composition at creation time

```typescript
// Before
const player = createPlayer(config);
player.registerPlugin(analytics); // Types don't know analytics exists
player.registerPlugin(keyboard); // Order matters but isn't visible

// After
const player = createPlayer({
  ...config,
  slices: [analyticsSlice, keyboardSlice], // Types know exactly what's included
});
```

---

## Major Issues

### [MAJOR] getState() returns full state on every call

**What:** `getState()` likely returns a new object each time
**Where:** `Player.getState(): PlayerState`
**Why:** React components re-render on every state change, not just relevant changes
**Principle:** Selectors for fine-grained subscriptions (state.md)
**Fix:** Support selector pattern

```typescript
// Before
const state = player.getState(); // New object every time
const paused = state.paused; // Component re-renders on ANY change

// After
const paused = usePlayer((s) => s.paused); // Re-render only when paused changes
```

---

### [MAJOR] Event handler uses untyped string events

**What:** `on(event: string, handler: Function)` has no type safety
**Where:** `Player.on()` method
**Why:** No autocomplete for event names; handler arguments untyped; typos fail silently
**Principle:** Types as contracts (typescript.md)
**Fix:** Typed event map

```typescript
// Before
player.on('play', (e) => {})     // 'play' could be typo, e is any
player.on('plaay', (e) => {})    // Silent failure

// After
interface PlayerEvents {
  play: { time: number }
  pause: { time: number }
  ended: {}
}

player.on('play', (e) => {       // Autocomplete, e is typed
  console.log(e.time)
})
player.on('plaay', ...)          // TS Error: 'plaay' not in PlayerEvents
```

---

### [MAJOR] No escape hatch to underlying element

**What:** API doesn't expose access to raw video/audio element
**Where:** `Player` interface (missing)
**Why:** Power users can't handle edge cases (custom codecs, WebRTC, canvas capture)
**Principle:** Escape hatches that compose (principles.md)
**Fix:** Explicit escape hatch

```typescript
// After
interface Player {
  // ... primary API ...

  // Escape hatch (named to signal "you're on your own")
  get __unsafe__(): {
    mediaElement: HTMLMediaElement;
    audioContext?: AudioContext;
  };
}
```

---

## Minor Issues

| Location             | Issue                    | Principle     | Fix                         |
| -------------------- | ------------------------ | ------------- | --------------------------- |
| `autoplay: boolean`  | Boolean params confusing | principles.md | Named in config object      |
| `controls: Config`   | Generic name             | principles.md | Consider `ui` or `skin`     |
| `plugins?: Plugin[]` | Plugin vs Slice naming   | state.md      | Use "slice" if that's model |

---

## Good Patterns Found

- **Clear method names:** `play()`, `pause()`, `getState()` are intuitive
- **Separation of concerns:** Player vs state distinction is present
- **Optional plugins:** Not required for basic usage

---

## Summary

This API has structural problems that will cause long-term pain. The two critical issues—positional parameters and runtime plugin registration—should be addressed before any public release.

**Positional parameters** make the API hard to use and impossible to extend without breaking changes. Converting to a config object is straightforward and enables future options.

**Runtime plugin registration** loses the type safety and tree-shaking benefits that modern libraries expect. Moving to creation-time composition (like Zustand slices) enables TypeScript to track capabilities and bundlers to eliminate unused code.

The event system's lack of typing is a significant DX issue but not blocking. Consider typed event maps or a subscription pattern like `subscribe(selector, callback)`.

**Priority order:**

1. Convert to config object (blocks everything else)
2. Move plugins to creation-time composition
3. Add typed events
4. Add selector-based subscriptions
5. Add escape hatches

---

<details>
<summary>Full Types Review</summary>

## Types Review

### Score: 4/10

### Issues

#### [MAJOR] Untyped events

(See main report)

#### [MAJOR] Plugin type doesn't carry capabilities

`Plugin` interface doesn't encode what state/methods the plugin adds, so TypeScript can't know what's available after registration.

### Good Patterns

- Player interface is defined
- State type exists (PlayerState)

### Summary

The foundation is there but the dynamic parts (events, plugins) bypass the type system entirely. Consider making these static/creation-time.

</details>

<details>
<summary>Full API Surface Review</summary>

## API Surface Review

### Score: 3/10

### Issues

#### [CRITICAL] Positional parameters

(See main report)

#### [MAJOR] getState() performance

(See main report)

#### [MINOR] Boolean parameters

Two adjacent booleans (`autoplay, muted`) are confusing at call sites.

### Good Patterns

- Method names are clear and conventional
- Return type is defined (Player interface)

### Summary

The function signature is the main problem. Converting to a config object would immediately improve usability and enable type inference for options.

</details>

<details>
<summary>Full Extensibility Review</summary>

## Extensibility Review

### Score: 3/10

### Issues

#### [CRITICAL] Runtime registration

(See main report)

#### [MAJOR] No composition model

Plugins are black boxes. No slice pattern, no middleware composition, no builder chain.

### Good Patterns

- Plugin concept exists (just needs different delivery)

### Summary

The extensibility model needs a rethink. Look at Zustand slices or tRPC procedures for inspiration—extension through composition at creation time.

</details>

<details>
<summary>Full Progressive Disclosure Review</summary>

## Progressive Disclosure Review

### Score: 6/10

### Issues

#### [MAJOR] No escape hatch

(See main report)

#### [MINOR] All-or-nothing controls

`controls: ControlsConfig` is required but users might want headless or partial UI.

### Good Patterns

- Basic usage is simple (source, play/pause)
- Plugins are optional

### Summary

The layering is reasonable but escape hatches are missing. Power users have no path to lower levels without abandoning the library.

</details>
