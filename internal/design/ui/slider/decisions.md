# Design Decisions

Rationale behind slider component choices.

## Component Structure

### No Control Element

**Decision:** There is no separate Control element between Root and children. Root handles pointer events and provides context. Thumb carries `role="slider"`, keyboard focus, and ARIA attributes. All other children (Track, Fill, Buffer, Preview) are purely visual.

**Alternatives considered:**

- Separate Control element (Base UI approach) — adds a dedicated interactive area inside Root. Useful for general-purpose sliders where arbitrary content (marks, labels) might sit alongside the track. Control scopes the hit area so decorative elements don't trigger drag.
- Root as container + Control as interactive (our original design) — more flexibility, but adds an extra component and DOM node without a clear use case for media sliders.

**Rationale:** Media sliders have a constrained, known anatomy — track, fill, thumb, preview. There's no "arbitrary content next to the track" scenario that needs hit-area scoping. Preview is always absolutely positioned out of flow. Any decorative additions (ticks, markers) can use `pointer-events: none` to pass clicks through. Matches Radix and Vidstack. One fewer part to learn, one fewer DOM node.

### No Default Children

**Decision:** Domain sliders (`TimeSlider.Root`, `VolumeSlider.Root`) do not render default children. Users compose everything explicitly.

**Alternatives:**

- Bake in a default structure (track + fill + thumb) — easier to start, but breaks when users need different structures
- Provide a `Default` export alongside parts — extra API surface without clear benefit

**Rationale:** Compound components should not assume structure. Users always want different layouts (thumb vs no thumb, preview position, progress bar ordering). Forcing explicit composition avoids the "how do I remove the default thumb" problem.

### Compound Namespace Pattern

**Decision:** Use `Slider.*` and `TimeSlider.*` namespace exports, matching the `Time.*` pattern.

```tsx
import { TimeSlider } from '@videojs/react';

<TimeSlider.Root>
  <TimeSlider.Track>
    <TimeSlider.Buffer />
    <TimeSlider.Fill />
  </TimeSlider.Track>
  <TimeSlider.Thumb />
</TimeSlider.Root>
```

**Alternatives:**

- Flat exports (`SliderRoot`, `SliderThumb`, `TimeSliderRoot`) — verbose imports, no visual grouping
- Single namespace with all parts (`Slider.TimeRoot`) — conflates generic and domain-specific

**Rationale:** Namespaces make composition readable. Generic parts (`Slider.*`) are clearly reusable. Domain parts (`TimeSlider.*`) are clearly scoped. Matches the existing `Time.Value`, `Time.Group` pattern.

## Styling

### Compound Elements, Not Native `<input type="range">`

**Decision:** The slider is composed of separate DOM elements (Root, Track, Fill, Thumb, Preview) styled via CSS custom properties. It does not use a native `<input type="range">` under the hood.

Media Chrome takes the opposite approach — their `<media-time-range>` wraps a native `<input type="range">` and styles it via browser pseudo-elements (`::-webkit-slider-runnable-track`, `::-webkit-slider-thumb`, `::-moz-range-progress`). Their CSS vars are **inputs** (theming tokens like `--media-range-track-height`), not outputs.

**Alternatives:**

- Native `<input type="range">` (Media Chrome approach) — browser handles fill/thumb positioning internally. No output CSS vars needed. But cross-browser styling is notoriously painful, pseudo-element APIs differ across browsers, and composing custom children (preview, progress, chapters) inside a native input is impossible.

**Rationale:** Compound composition gives full control over rendering, accessibility, and styling. Users compose exactly the parts they need. The tradeoff is that we need a mechanism to share continuous values (fill %, pointer %, buffer %) from Root to children — CSS custom properties fill that role. This is the same architecture as Radix and Vidstack.

### CSS Custom Properties as Output

**Decision:** Slider sets `--media-slider-fill`, `--media-slider-pointer`, and `--media-slider-buffer` as CSS custom properties on the Root element. Parts reference them with `var()`.

CSS vars communicate **continuous values** — percentages like `45.123%` — that CSS can't get any other way. Data attributes can carry discrete state (present/absent, enumerated strings), but `attr()` doesn't work for non-string CSS properties in any browser. So:

- **Data attributes** = discrete state (dragging yes/no, orientation horizontal/vertical)
- **CSS custom properties** = continuous values (fill %, pointer %, buffer %)

**Alternatives:**

- Inline styles on parts (e.g., `width: "45%"` on Fill) — opinionated. Assumes Fill uses `width`. Maybe someone wants `transform: scaleX()` instead. CSS vars let users decide.
- Data attributes with percentage values — CSS can't use attribute values for sizing (`attr()` only works for `content`)
- JavaScript-driven positioning via refs — unnecessary DOM coupling
- No output CSS vars (Media Chrome approach) — only works if you use a native `<input type="range">` under the hood. See "Compound Elements, Not Native `<input type="range">`" above.

**Rationale:** CSS custom properties are the established pattern for headless component output values. They cascade naturally, can be overridden, and work with any styling approach (CSS modules, Tailwind, styled-components). Vidstack uses the same pattern (`--slider-fill`, `--slider-pointer`).

### `--media-slider-*` Prefix

**Decision:** Use `--media-slider-fill`, `--media-slider-pointer`, `--media-slider-buffer` as CSS custom property names.

**Alternatives:**

- `--vjs-slider-*` — ties to Video.js brand, awkward if used outside VJS context
- `--slider-*` — too generic, high collision risk with user styles
- `--videojs-slider-*` — verbose

**Rationale:** `--media-` prefix is descriptive without being brand-specific. Matches the `media-*` custom element prefix. Clear that these are media-player slider values.

### CSSVars Constants Parallel to DataAttrs

**Decision:** CSS custom properties get their own `*-css-vars.ts` constant files, mirroring the `*-data-attrs.ts` pattern. Each property has a semantic key, a `--media-*` value, and a JSDoc description.

```ts
export const SliderCSSVars = {
  /** Current value as percentage of range. */
  fill: '--media-slider-fill',
  /** Pointer position as percentage of track. */
  pointer: '--media-slider-pointer',
  /** Buffered range as percentage. Set by domain roots that have a buffer concept. */
  buffer: '--media-slider-buffer',
} as const;
```

**Alternatives:**

- Inline strings in `getCSSVars()` — no single source of truth, descriptions lost, site builder can't extract them
- Combined `SliderAttrs` object with both data attrs and CSS vars — conflates two distinct concerns with different naming conventions

**Rationale:** Data attributes already have this pattern and the site docs builder already extracts them. CSS custom properties are equally important to document — they're the primary API for styling slider parts. Separate files keep concerns clean (`data-*` vs `--media-*`). The builder can be extended to discover `*-css-vars.ts` files with the same extraction logic.

### No Part Identification Attributes

**Decision:** No `data-part` or similar attributes. In HTML, tag names identify parts (`<media-slider-track>`). In React, users apply their own classes.

**Alternatives:**

- `data-part="track"` on each part — enables `[data-part="track"]` selectors regardless of platform
- Component-scoped attributes like Base UI (`data-slider-control`) — more specific but verbose

**Rationale:** HTML custom elements are self-identifying by tag name — `media-slider-track {}` in CSS is natural. In React, users already compose their own elements and provide `className`. Adding `data-part` creates a parallel identification system that's redundant with both approaches. State attributes (`data-dragging`, `data-interactive`) are the only data attributes needed.

### Thumb Alignment: Center and Edge Modes

**Decision:** Support `thumbAlignment: 'center' | 'edge'` prop on Root. Default `'center'`.

- **Center:** Thumb center aligns with the track edge at min/max. At 0%, the thumb center sits on the left edge (half the thumb visually overflows). At 100%, thumb center on the right edge. `--media-slider-fill` maps 0–100% directly. This is the standard media player visual.
- **Edge:** Thumb stays fully within the track at min/max. At 0%, the thumb's left edge aligns with the track's left edge. At 100%, the thumb's right edge aligns with the track's right edge. Root uses `ResizeObserver` on the Thumb element to measure its size, then computes an adjusted `--media-slider-fill` that maps the value to the inset range.

Base UI's third variant `'edge-client-only'` (deferred to client render with a pre-hydration script) is omitted — media players are inherently client-rendered.

**Alternatives:**

- CSS-only approach — require users to set `--media-slider-thumb-offset` matching their thumb size, then use `calc()` in positioning. Simpler, no DOM measurement, but error-prone when thumb size changes (responsive, different skins) and puts burden on the user.
- Center only, no edge mode — some designs require the thumb pinned within track bounds. Without edge mode, users must manually compute inset positioning.

**Rationale:** DOM measurement via `ResizeObserver` is more robust than requiring a CSS var — it adapts automatically to any thumb styling, responsive size changes, and orientation changes. The adjustment is internal to Root's CSS var computation; users' CSS (`left: var(--media-slider-fill)`, `width: var(--media-slider-fill)`) works unchanged in both modes. See [architecture.md](architecture.md#thumb-alignment) for the computation details.

### Fill Uses CSS Custom Properties, Not Inline Styles

**Decision:** Fill/Indicator positioning is driven entirely by CSS custom properties (`--media-slider-fill`) set on Root. No inline `width` or `left` styles are applied to Fill or Thumb elements. Users style parts via `var()` references.

Base UI's `SliderIndicator` computes and applies inline styles (`width: "45%"`, `insetInlineStart: "0"`) directly on the element. This is necessary for their approach because they support range sliders where the indicator spans between two thumbs and must calculate both start and width.

**Alternatives:**

- Inline styles on Fill (Base UI approach) — opinionated about which CSS property to use. Assumes `width` for horizontal, `height` for vertical. Harder to override.

**Rationale:** CSS vars are our established output mechanism. They let users choose how to consume the value — `width`, `transform: scaleX()`, clip-path, or any other property. This matters because different slider designs use different visual techniques. Single-thumb media sliders always start at 0%, so `--media-slider-fill` as a width percentage covers the standard case without needing a separate start position.

## State

### State Attributes

**Decision:** Five state data attributes on Root: `data-dragging`, `data-pointing`, `data-interactive`, `data-orientation`, `data-disabled`. Time slider adds `data-seeking`.

**Alternatives:**

- `data-at-min` / `data-at-max` — considered but cut. Edge styling can use `--media-slider-fill: 0%` or `100%` in CSS
- `data-focused` — not needed. Focus is on Thumb, visible via `:focus-visible` on `media-slider-thumb`
- `data-hovering` — `data-pointing` is more precise (pointer is over element, not just CSS hover)

**Rationale:** These attributes cover the CSS use cases: show preview when interactive, enlarge thumb when dragging, dim when disabled, adjust layout for orientation. `data-interactive` is the compound state `(pointing || focused || dragging)` that's most useful for styling.

### Children Inherit All Data Attributes

**Decision:** All child parts (Track, Fill, Thumb, Preview, Value) receive the same state data attributes as Root. Every child gets `data-dragging`, `data-pointing`, `data-interactive`, `data-orientation`, `data-disabled` applied directly. For time sliders, children also get `data-seeking`.

Radix confirms this pattern — their Slider.Track, Slider.Range, and Slider.Thumb all receive `[data-disabled]` and `[data-orientation]`. Vidstack does the same with interaction attributes.

**Alternatives:**

- Root-only attributes — children use ancestor selectors like `[data-dragging] media-slider-fill { }`. Fewer DOM mutations, but forces verbose CSS.
- Selective inheritance (some children get some attrs) — inconsistent, requires memorizing which children get what.

**Rationale:**

- **Tailwind** — without inheritance, you need `group-data-[dragging]:` on every child. With it, you write `data-[dragging]:scale-120` directly. Much cleaner.
- **CSS specificity** — `media-slider-thumb[data-dragging]` is more specific and scoped than `[data-dragging] media-slider-thumb`.
- **Consistency** — all children get all attrs. No exceptions, no rules to remember.
- **Performance** — updating 3-5 elements on state change is negligible.

### `interactive` as Derived State

**Decision:** `interactive = pointing || focused || dragging`. Exposed as both a state property and `data-interactive` attribute.

**Alternatives:**

- Only expose primitives (`pointing`, `focused`, `dragging`) — forces users to combine them in CSS with `[data-pointing], [data-focused], [data-dragging]` selectors
- Use `data-active` — ambiguous, could mean dragging or just focused

**Rationale:** 90% of slider styling needs "is the user engaging with this slider?" as a single check. The preview container shows on interactive, the track enlarges on interactive, etc. Naming it `interactive` is clearer than `active` or `engaged`.

## Interaction

### createSlider Works in Percentages (0-100)

**Decision:** `createSlider()` operates in 0-100 percentages, not raw values. Consistent with `SliderState.fillPercent` and CSS var output. The caller converts using `SliderCore.valueFromPercent()`.

**Alternatives:**

- 0-1 normalized range — one fewer multiplication, but creates a unit boundary between `createSlider` (0-1) and everything else (0-100). Easy source of bugs.
- Pass min/max/step to `createSlider` so it returns raw values — couples DOM interaction to value domain
- Return both percent and raw value — redundant, caller can derive

**Rationale:** Separation of concerns. `createSlider` knows about pointer positions and element geometry — it produces a percentage. `SliderCore` knows about value ranges and steps — it converts percentages to values. Neither needs to know the other's domain. Using 0-100 avoids a conversion boundary — the same unit flows from `createSlider` through `SliderState` to CSS output.

### Keyboard Commits Immediately

**Decision:** Keyboard input calls both `onValueChange` and `onValueCommit` on each keypress. No "keyboard drag" concept.

**Alternatives:**

- Treat key hold as "dragging" with commit on key up — matches pointer behavior but feels wrong for discrete steps
- Only commit on focus leave — too delayed, user expects immediate feedback

**Rationale:** Keyboard steps are discrete and immediate. User presses arrow, slider moves one step, value is committed. This matches WAI-ARIA slider behavior and every existing slider implementation.

### Pointer Drag Uses Document Listeners

**Decision:** On `pointerdown`, add `pointermove` and `pointerup` listeners on `document` to capture drag even when pointer leaves the slider bounds. Also add a document-level `touchmove` listener with `{ passive: false }` that calls `preventDefault()` to block page scrolling during drag.

**Alternatives:**

- `setPointerCapture` — cleaner API, guarantees pointer events fire on the capturing element regardless of pointer position. Base UI uses both (capture + document listeners). But `setPointerCapture` changes the coordinate reference for `pointermove` events in some browsers, complicating position-relative-to-track calculations. Vidstack doesn't use it either.
- Listen on the element only — drag stops when pointer leaves bounds

**Implementation notes:**

- **Lost pointerup detection:** During `pointermove`, check `event.buttons === 0` and treat it as drag end. This handles the edge case where another element consumed the `pointerup` event (e.g., a dialog appearing mid-drag). Base UI implements this. Exception: for `event.pointerType === 'touch'`, `buttons` is unreliable — touch relies on `pointerup`/`pointercancel` instead.
- **`pointercancel` handling:** Listen for `pointercancel` on document alongside `pointerup`. Fires when the browser takes over the gesture (e.g., navigation swipe). Without it, the slider gets stuck in dragging state.
- **Document touchmove:** `touch-action: none` on the slider element prevents the browser from scrolling when the touch starts on the slider. But once the pointer moves outside the slider during drag (tracked via document listeners), the browser may still attempt to scroll. A document-level `touchmove` with `{ passive: false }` + `preventDefault()` blocks this. Vidstack uses this pattern. The listener is added on `pointerdown` and removed on `pointerup`/`pointercancel`/drag end — never left attached.
- **Passive pointermove:** The document-level `pointermove` listener can use `{ passive: true }` since it doesn't need to call `preventDefault()`.

**Rationale:** Document-level listeners are the standard approach for drag interactions. The pointer can move anywhere on screen and the slider still tracks position. Cleanup on `pointerup` prevents memory leaks. Both Vidstack and Base UI use document-level listeners.

### Pointer Events Only, No Separate Touch Path

**Decision:** The slider uses pointer events exclusively (`pointerdown`, `pointermove`, `pointerup`, `pointerenter`, `pointerleave`) for all interaction. No separate `touchstart`/`touchmove`/`touchend` handlers on the slider element.

**Alternatives:**

- Separate touch and pointer code paths (Base UI approach) — Base UI registers `touchstart` via raw `addEventListener` to set `{ passive: true }` (React's synthetic events don't support the passive option), and tracks `touchIdRef` to follow the correct finger across multiple thumbs. Touch events on document are also registered separately.

**Rationale:** `touch-action: none` on Root tells the browser not to interpret touches as scroll/zoom, so pointer events fire reliably for all touch input. Single-thumb sliders don't need multi-finger tracking. Pointer Events API has 98%+ browser support and covers all Video.js 10 targets. Vidstack uses the same approach — pointer events only on the slider, `touch-action: none` via CSS.

The one exception is the document-level `touchmove` `preventDefault()` during drag (see [Pointer Drag Uses Document Listeners](#pointer-drag-uses-document-listeners)) — that's a scroll-blocking measure, not touch interaction handling.

### Intentional Drag Threshold

**Decision:** On `pointerdown`, the value changes immediately (click-to-seek on the track area). But `dragging` state (`data-dragging`, `onDragStart` callback) is not activated until a small number of `pointermove` events have fired (threshold of 2), confirming intentional drag movement.

**Alternatives:**

- Set `dragging` immediately on `pointerdown` (Vidstack approach) — simpler, but causes a momentary `data-dragging` flash on simple click-to-seek interactions. Any CSS tied to `data-dragging` (thumb scale, track enlargement) flickers briefly.
- Wait for movement before any value change — too delayed, click-to-seek should be instant.

**Rationale:** Distinguishes click-to-seek from intentional drag. A simple click (pointerdown → pointerup with minimal movement) should update the value but not trigger drag UI. Base UI uses a threshold of 2 `pointermove` events before setting `dragging = true`, while still calling `onValueChange` immediately. This means: value feedback is instant, drag UI is intentional.

### RTL Keyboard Direction

**Decision:** `ArrowRight` decreases the value in RTL layouts, `ArrowLeft` increases. `ArrowUp`/`ArrowDown` are unaffected by direction. `createSlider` accepts an `isRTL` callback and flips the direction multiplier for horizontal arrow keys.

**Alternatives:**

- Ignore RTL — broken for RTL users. Arrow keys would move the opposite direction of visual expectation.
- Handle at the UI layer — possible, but since `createSlider` owns the keyboard handler it should handle this internally.

**Rationale:** Standard behavior per WAI-ARIA and every slider implementation. Both Base UI and Vidstack flip horizontal arrow direction for RTL. `createSlider` works in percentages, so the flip is a direction multiplier change at the keyboard handler level — `ArrowRight` in LTR adds `stepPercent`, in RTL subtracts it.

### Seek During Drag (Throttled)

**Decision:** Time slider seeks during drag for video preview feedback, throttled via `seekThrottle` prop (default 100ms, trailing-edge). `0` disables throttling. The throttle lives in `createSlider` (DOM layer), not in `TimeSliderCore`.

During drag: `onValueChange` fires on every pointermove (updates local visual state — fill bar, preview). `onValueCommit` fires through the throttle (triggers `time.seek()`). On drag end, a final unthrottled `onValueCommit` fires with the final value.

Volume slider does not use seek throttling — volume changes are instant and cheap.

**Alternatives:**

- Seek only on drag end — no visual video feedback during scrub. Poor UX for time slider.
- Seek unthrottled on every pointermove — floods the media element with seek requests during fast drags. Poor performance.
- Throttle in `TimeSliderCore` — Core would need timer state, breaking the stateless pattern. DOM layer already manages interaction timers (drag threshold).

**Rationale:** Vidstack uses a similar `seekingRequestThrottle` (100ms default). The DOM layer is the natural home since it already manages pointermove timing and drag state. Core stays pure computation.

### Focus Thumb on Track Click

**Decision:** `pointerdown` on Root programmatically focuses the Thumb element. This ensures `interactive` state is correct (includes `focused`), `:focus-visible` styling works on the Thumb, and screen readers track the active element during pointer interaction.

**Alternatives:**

- Don't focus on click — user must tab to Thumb separately for keyboard control after a click. `:focus-visible` won't show on the Thumb after clicking the track. Poor UX and a11y.

**Rationale:** The Thumb is the semantic slider element (`role="slider"`). When the user interacts with the slider via pointer, the Thumb should receive focus so keyboard follow-up works immediately. This matches Radix and Base UI behavior.

### CSS Var Formatting in DOM Layer

**Decision:** `SliderCore` returns raw percentages in `SliderState` (`fillPercent`, `pointerPercent`). `TimeSliderState` adds `bufferPercent`. CSS custom property formatting (`--media-slider-fill: "45.123%"`) is done by `getSliderCSSVars()` in `@videojs/core/dom`.

The `SliderCSSVars` constant (property names + JSDoc) stays in `@videojs/core` for documentation extraction.

**Alternatives:**

- Format in `SliderCore` (`getCSSVars()` returning CSS strings) — convenient, but leaks a DOM concern into the runtime-agnostic layer. React Native has no CSS custom properties.
- Format in each UI layer (React, HTML) — duplicates the same `toFixed(3)` logic.

**Rationale:** The math is framework-agnostic (Core computes percentages). The formatting is DOM-specific (CSS var strings). `core/dom` is the bridge layer — it already contains `createSlider()` which handles DOM interaction. Adding CSS var formatting here keeps Core pure and avoids duplicating logic across React and HTML UI layers.

### Muted Volume aria-valuetext

**Decision:** When muted, `VolumeSliderCore` sets `aria-valuetext` to `"{volume} percent, muted"` (e.g., `"75 percent, muted"`). `aria-valuenow` reflects the actual underlying volume (not 0). Fill visually shows 0%.

**Alternatives:**

- `"muted"` only — loses underlying volume information. User doesn't know what volume they'll hear when unmuting.
- `"0 percent, muted"` — misleading. The volume isn't 0, it's muted.
- `"0 percent"` (match visual) — no indication of muted state. Confusing if the user adjusts volume while muted.

**Rationale:** Communicates both the muted state and the underlying volume. Screen reader users need to know what volume level is set so they can adjust before unmuting. Matches the visual design where fill is 0% (communicating silence) while the actual value is preserved.

### Interaction State via `createState`

**Decision:** `createSlider()` manages interaction state (`SliderInteraction`) internally using `createState()` from `@videojs/store`. Pointer and keyboard handlers patch this state directly. The returned `interaction` is a read-only `State<SliderInteraction>` that UI layers subscribe to.

```ts
const slider = createSlider(options);
slider.interaction.current;        // { dragging, pointing, focused, pointerPercent, dragPercent }
slider.interaction.subscribe(cb);  // notified on change
```

**Alternatives:**

- UI layer manages interaction state (React `useState`, Lit reactive properties) — requires each framework to independently maintain the same state shape from `createSlider` callbacks. Duplicates state management logic. The UI adapter becomes thicker.
- `createSlider` returns a plain object (not reactive) — frameworks must manually track changes via callbacks. No subscribable primitive.
- Signals/observables — heavier abstraction not present in the codebase.

**Rationale:** `createState` is already the reactive primitive used by the store system. It's lightweight (no slice/target ceremony), auto-batches multiple patches per microtask (good for high-frequency pointermove), and both React and Lit already know how to subscribe: React via `useSyncExternalStore` (the `.subscribe` + `.current` signature matches exactly), Lit via `.subscribe(() => this.requestUpdate())`. This eliminates state management boilerplate from both UI adapters — they just subscribe and read `.current`.

### Core Accepts Split (Interaction, Media) Inputs

**Decision:** `SliderCore.getState()` accepts `SliderInteraction` and a value separately. Domain cores (`TimeSliderCore`, `VolumeSliderCore`) accept `(media, interaction)` where media is the canonical type from `@videojs/core` (`MediaTimeState & MediaBufferState`, `MediaVolumeState`). Core owns the merge logic — e.g., the value swap (`dragging ? valueFromPercent(dragPercent) : currentTime`). Media is the first parameter since it's the primary input; interaction is secondary context.

**Alternatives:**

- Single flat params bag (`SliderStateParams` with both interaction and media fields) — conflates two sources, puts domain merge logic (value swap) in the UI layer, forces both frameworks to implement the same logic.
- Core only accepts the merged result — still puts merge logic in the UI layer.

**Rationale:** The two inputs have different provenance: interaction comes from `createSlider` (DOM events), media comes from the store. Keeping them separate makes the data flow clear and puts domain logic (value swap during drag, buffer percentage computation) in Core where both frameworks get it for free. UI adapters become thin pass-throughs: subscribe to interaction, subscribe to store, pass both to Core.

### Custom DOM Events (HTML)

**Decision:** HTML custom elements dispatch custom DOM events using **kebab-case** names. All events **bubble**. Events carrying data use `CustomEvent` with a typed `detail`.

| Event | Detail | Components |
| --- | --- | --- |
| `value-change` | `{ value: number }` | Generic `Slider.Root` only |
| `value-commit` | `{ value: number }` | Generic `Slider.Root` only |
| `drag-start` | — | All slider roots |
| `drag-end` | — | All slider roots |

**Event naming:** Kebab-case (`drag-start`, not `dragstart`). This avoids conflicts with native events (e.g., `dragstart` from HTML DnD) and is consistent with the kebab-case custom element naming convention.

**Bubbling:** All events bubble, consistent with native `input`/`change` events. Ancestor containers can listen without direct element references.

**Typed event maps:** HTML package exports `SliderEventMap` and `DomainSliderEventMap` interfaces. Elements get typed `addEventListener` overloads for TypeScript consumers.

**Alternatives:**

- No events, store-only — existing convention (buttons dispatch no events). But sliders need user-facing interaction callbacks that the store doesn't cover (drag lifecycle, value changes for generic slider).
- Property callbacks (`element.onValueChange = fn`) — non-standard for custom elements, only one listener per event.
- `media-*` prefixed events — unnecessary with kebab-case since there's no conflict.
- Non-bubbling events — surprising on the web platform. Would require direct element references.

**Rationale:** This is a new convention for `@videojs/html` — the first components with custom events. The slider is the first component that needs user-facing interaction callbacks beyond what the store provides. Custom DOM events are idiomatic web platform, work with `addEventListener`, and compose naturally with event delegation. Typed event maps give TypeScript consumers full type safety.

## Accessibility

### ARIA on Thumb

**Decision:** `role="slider"`, `tabindex="0"`, `aria-valuenow`, `aria-valuetext`, and all other ARIA attributes are on the **Thumb** element. Thumb is the focusable element that represents the slider to assistive technology. Root handles pointer events only.

This follows the [WAI-ARIA Slider Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) and the [Media Seek Slider Example](https://www.w3.org/WAI/ARIA/apg/patterns/slider/examples/slider-seek/), where the thumb (the movable element) carries the slider role and keyboard focus.

**Alternatives:**

- ARIA on Root (our previous design, Media Chrome approach) — Root as the focusable `role="slider"` element. Simpler since Root already handles pointer events, but conflicts with the APG pattern where the thumb is the slider. Also creates an awkward focus target — the entire container receives focus rather than the specific handle element.
- Separate Control element with `role="slider"` (Base UI) — adds an extra element. See "No Control Element" above.
- Use a hidden `<input type="range">` — semantically correct but adds hidden elements and synchronization complexity.

**Rationale:** The APG spec and its seek slider example are clear: the thumb is the slider. The thumb is the element users interact with conceptually — it's the "handle" they grab. Placing `role="slider"` on Root conflates the hit area (the full track, which should be clickable) with the semantic control (the thumb). Splitting responsibility — Root owns the hit area and context, Thumb owns focus and ARIA — is cleaner and spec-compliant.

### Thumb Always Present

**Decision:** `Slider.Thumb` / `<media-slider-thumb>` is **always present** in the DOM. Users who want a "thumbless" visual slider hide it with CSS. The element remains focusable and announced by screen readers.

**Alternatives:**

- Thumb is optional, ARIA goes on Root when no Thumb — requires conditional ARIA placement, increases complexity, and the "no thumb" case still needs a focus target
- Thumb is optional, add a visually hidden focus element when no Thumb — even more complex, two different code paths for the same semantic purpose

**Rationale:** The thumb carries `role="slider"` and keyboard focus. Without it, there's no element to receive focus or announce the slider to assistive technology. Making it always present eliminates edge cases. The visual "thumbless" look is purely CSS — the semantic and interactive elements remain intact. This matches the APG pattern where the thumb is the slider.

### No Hidden `<input type="range">`

**Decision:** No visually hidden `<input type="range">` is rendered inside the slider. Radix and Base UI render hidden inputs per thumb for form integration — so the slider value can be submitted as form data and native form events (submit, reset) work correctly.

**Alternatives:**

- Hidden `<input>` per thumb (Radix, Base UI) — enables form submission and native validation. Required when sliders live inside `<form>` elements.

**Rationale:** Media player sliders are never form fields. Time seek and volume control don't participate in form submission — there's no scenario where "the user was at 2:30" is submitted to a server. Adding a hidden input creates sync complexity for zero functional benefit. `role="slider"` with proper ARIA attributes is the correct semantic and is well-supported by assistive technology. If a generic `Slider.Root` form use case emerges later, hidden input support can be added there without touching domain sliders.

### Domain Sliders Set aria-label and aria-valuetext

**Decision:** Generic `SliderCore.getAttrs()` sets `role`, `tabindex`, `autocomplete`, `aria-valuemin/max/now`, `aria-orientation`, `aria-disabled` on the Thumb element. Domain cores (`TimeSliderCore`, `VolumeSliderCore`) extend via `override getAttrs()` with `aria-label` and `aria-valuetext`. Domain Roots accept a `label` prop (default `"Seek"` / `"Volume"`) that feeds into `aria-label`, and provide the complete ARIA attrs to Thumb via context.

**Alternatives:**

- Generic core sets all ARIA — requires generic core to know about time formatting
- User provides `aria-label` manually — error-prone, easy to forget
- No `label` prop, hardcode domain labels — prevents customization and localization

**Rationale:** Labels and value descriptions are inherently domain-specific. "2 minutes, 30 seconds of 10 minutes" is time-specific. "75 percent" is volume-specific. Generic slider has no concept of these. The `label` prop provides an escape hatch for customization and localization without requiring users to reach into ARIA attributes directly.

### `step` and `largeStep` (Aligned with Base UI)

**Decision:** Two step props on Root: `step` (Arrow keys) and `largeStep` (Shift+Arrow, Page Up/Down). Shift+Arrow is an ergonomic shortcut for Page — same step size, more convenient key combo. Additionally, numeric keys 0-9 jump to 0%–90% of the range (matching YouTube).

Domain defaults:

| | `step` | `largeStep` |
|---|--------|------------|
| Generic Slider | `1` | `10` |
| TimeSlider | `5` (seconds) | `10` (seconds) |
| VolumeSlider | `5` (%) | `10` (%) |

For generic `Slider.Root`, `step` controls both value snap granularity and keyboard step (matching Base UI). Domain sliders reinterpret `step` as keyboard step only — drag snap precision is handled internally (e.g., TimeSlider uses sub-second precision during drag).

**Alternatives:**

- Match WAI-ARIA example defaults (1 unit per step) — too fine-grained for media. One second per arrow key is tedious for a 2-hour movie.
- Three separate props (`step`, `shiftKeyStep`, `largeStep`) — Shift+Arrow doesn't need its own tier. It's an ergonomic alternative to Page Up/Down.
- `shiftKeyMultiplier` (Vidstack approach) — indirection. A concrete `largeStep` value is easier to reason about.
- `keyStep` / `keyLargeStep` — adding a `key` prefix when `step` already implies keyboard interaction is redundant. Base UI uses `step` and `largeStep` directly.

**Rationale:** YouTube's 5-second default is the de facto standard. Two props cover all use cases cleanly — Arrow for fine control, Shift+Arrow/Page for coarse jumps. Aligns with Base UI's API. Numeric keys (0-9 for percentage jumps) are a natural extension that matches YouTube.

### Time Slider aria-valuetext Format

**Decision:** `aria-valuetext` uses human-readable phrases from `formatTimeAsPhrase()`. Format varies by context to reduce screen reader verbosity (per [APG seek slider guidance](https://www.w3.org/WAI/ARIA/apg/patterns/slider/examples/slider-seek/#accessibilityfeatures)):

- On initialization and when thumb receives focus: `"{currentTime} of {duration}"` — e.g., `"2 minutes, 30 seconds of 10 minutes"`
- During value changes (keyboard/drag): `"{currentTime}"` only — e.g., `"2 minutes, 30 seconds"`

**Alternatives:**

- Digital format (`"2:30 of 10:00"`) — screen readers would say "two colon thirty of ten colon zero zero"
- Always include duration on every change — verbose during scrubbing, screen reader repeats "of 10 minutes" on every step
- Percentage (`"25 percent"`) — not meaningful for time

**Rationale:** Following the APG seek slider example and Media Chrome's approach. Including duration on init/focus gives context ("how far am I?"). Omitting it during changes reduces verbosity — the user already knows the duration after the initial announcement.

### `aria-live="off"` on Value

**Decision:** `Slider.Value` / `<media-slider-value>` renders an `<output>` element with `aria-live="off"` by default. Users can override to `"polite"` if needed.

**Alternatives:**

- `aria-live="polite"` — the semantically "correct" default for `<output>`, but causes constant screen reader announcements during drag. Every value change triggers an announcement, creating a noisy experience during scrubbing.
- No `aria-live` attribute — browsers default `<output>` to `aria-live="polite"`, which has the same problem.

**Rationale:** During drag, the slider value changes continuously — potentially dozens of times per second. `aria-live="polite"` would queue all of these for announcement, overwhelming the screen reader. The Thumb already provides `aria-valuenow` and `aria-valuetext` on the focusable element, which screen readers announce on focus and value change. The `<output>` element is for visual display, not live announcements. Base UI uses this same default.

## HTML

### Registration Strategy

**Decision:** Registration from `@videojs/html/ui/*`. Importing a domain slider (`@videojs/html/ui/time-slider`) auto-registers basic structural parts (track, fill, buffer, thumb, value). Preview is registered separately via `@videojs/html/ui/slider-preview`.

**Alternatives:**

- Register everything together — simpler but forces preview into the bundle even when not used
- Register nothing automatically — requires users to import 6+ registration files. Too much ceremony.

**Rationale:** Preview involves positioning logic and is heavier than structural parts. Most minimal slider usage (track + fill + thumb) doesn't need preview. Separating it keeps the default bundle lean while letting users opt in. Basic structural parts are always needed so auto-registering them avoids boilerplate.

### Shared Generic Elements

**Decision:** Generic slider parts (`<media-slider-track>`, `<media-slider-fill>`, etc.) are shared elements used inside any domain root.

**Alternatives:**

- Scoped per domain (`<media-time-slider-track>`, `<media-volume-slider-track>`) — more explicit but duplicates elements that are structurally identical

**Rationale:** Track, Fill, Thumb, Preview are structurally identical across slider types. They need no domain-specific behavior — they're styled via CSS custom properties set by the domain root. Creating separate elements per domain is unnecessary duplication.

### Root Context Aligns Children

**Decision:** Domain roots provide context that aligns generic children. This context includes:

1. **Data attribute propagation** — Root pushes state data attributes (`data-dragging`, `data-interactive`, etc.) to all children.
2. **Value formatting** — Root provides a formatter function that `Slider.Value` consumes. `TimeSlider.Root` provides time formatting (`1:30`), `VolumeSlider.Root` provides percentage formatting (`75%`).
3. **ARIA attributes for Thumb** — Root provides domain-specific ARIA attrs (`aria-label`, `aria-valuetext`) that Thumb applies to itself.
4. **Keyboard step values** — Root provides `step` and `largeStep` that Thumb uses for keyboard navigation.
5. **CSS custom properties** — cascade naturally via CSS inheritance, no context mechanism needed.

In React, this is React Context (already exists as `slider-context.tsx`). In HTML, the root pushes data attributes and ARIA attrs via DOM, and children read from context.

**Alternatives:**

- No context, children are completely inert — works for structural parts (Track, Fill) but `Slider.Value` needs formatted text, and `Slider.Thumb` needs ARIA attrs and step values from the domain root.
- Domain-specific child elements (`<media-time-slider-value>`, `<media-time-slider-thumb>`) — duplicates elements that are structurally identical. See "Domain Sliders Only Customize Root" below.

**Rationale:** Most children (Track, Fill, Buffer) are purely visual and only need CSS custom properties (which cascade naturally). But Value needs formatted text, Thumb needs ARIA attrs and step values, and all children need data attributes (which don't cascade). Context provides all of this without requiring domain-specific child elements.

### Domain Sliders Only Customize Root

**Decision:** `TimeSlider` and `VolumeSlider` only have a domain-specific Root. All other parts (Track, Fill, Buffer, Thumb, Preview, Value) are generic `Slider.*` parts re-exported under the domain namespace. The Root connects to the store, provides context (formatting, data attrs, CSS vars), and sets domain-specific ARIA.

**Alternatives:**

- Domain-specific child elements (`TimeSlider.Progress`, `TimeSlider.Value`, `<media-time-slider-value>`) — duplicates elements that are structurally identical to generic parts. The only difference was data source and formatting, which the root can provide via context.

**Rationale:** Moves all domain intelligence into a single place (Root). Generic children are truly generic — they render based on CSS vars and context from whatever Root wraps them. This means fewer files, fewer elements to register, and any new slider type only needs to implement a Root.

### Domain Roots Are Independent (No Shared Base Class)

**Decision:** `<media-time-slider>` and `<media-volume-slider>` are independent elements. They don't extend a common `SliderElement` base class.

**Alternatives:**

- Common `SliderElement` base class — inheritance hierarchy adds complexity
- Mixin-based (`SliderMixin`) — possible future optimization, but straightforward class composition is simpler to start

**Rationale:** Each domain root has different store selectors and different behavior on value change. Sharing via base class would require complex template method patterns. Better to keep them independent and share logic through `SliderCore` composition.

## Naming

### `Fill` Not `Indicator`, `Range`, or `TrackFill`

**Decision:** `Slider.Fill` / `<media-slider-fill>`.

**Alternatives:**

- `Indicator` (Base UI) — too abstract. Indicates what?
- `Range` (Radix) — overloaded in media context. Time ranges, buffered ranges, seekable ranges — "range" is already a loaded term.
- `TrackFill` (Vidstack) — redundant. Fill is always nested inside Track, so the parent context already provides the relationship. `<Track><TrackFill /></Track>` is like `<List><ListItem /></List>`.
- `Progress` — ambiguous with playback progress. See [Buffer decision](#buffer-at-base-slider-level) below.

ARIA and WAI-ARIA Slider Pattern don't define visual sub-parts — the spec only cares about `role="slider"` and value attributes. The closest browser standard is Firefox's `::-moz-range-progress` pseudo-element, but "progress" conflicts with our buffered range.

**Rationale:** "Fill" is self-documenting, short, and unambiguous — the filled portion of the track. No standard name exists, so clarity wins.

### `Buffer` at Base Slider Level

**Decision:** `Slider.Buffer` / `<media-slider-buffer>` is a generic slider part (not domain-specific). It lives alongside Track, Fill, Thumb, etc. Uses `--media-slider-buffer` CSS var. The domain root (e.g., `TimeSlider.Root`) sets this var; generic sliders that don't have a buffer concept simply don't set it, and the element renders at 0%.

Previously this was `TimeSlider.Progress` — a domain-specific part. Moving it to base Slider has two benefits: fewer domain-specific parts (domain sliders only customize Root), and any future slider type with a buffer concept (e.g., a download slider) gets it for free.

**Naming — `Buffer` not `Progress`:**

- `Progress` is ambiguous — "playback progress" or "loading progress"? A developer seeing `Fill` and `Progress` must guess which is which.
- `Buffer` can only mean one thing — the buffered/loaded range. Unambiguous, self-documenting.
- CSS var is `--media-slider-buffer` to match.

**Alternatives:**

- `Progress` (previous choice, Vidstack) — ambiguous with playback progress
- `Buffered` — adjective, not a noun
- Keep as domain-specific `TimeSlider.Buffer` — adds unnecessary domain parts when the element is structurally identical to a generic slider part

### `Preview` as Positioning Container (Thumbnail Is Separate)

**Decision:** `Slider.Preview` is a positioning container inside the slider that tracks the pointer. It is NOT the thumbnail renderer. Thumbnail rendering is a standalone component (future work) that can be used inside Preview or independently elsewhere.

Both Vidstack and Media Chrome separate these concerns:

- Vidstack: `TimeSlider.Preview` (positioning) + `Thumbnail` (standalone display component under `/components/display/thumbnail`)
- Media Chrome: `preview` slot (positioning) + `<media-preview-thumbnail>` (standalone component with VTT coords)

**Alternatives:**

- `Tooltip` — implies a specific UI pattern with specific accessibility requirements (`role="tooltip"`, `aria-describedby`)
- Baking thumbnail rendering into Preview — couples preview positioning to thumbnail loading, prevents reuse of thumbnails outside sliders (e.g., poster area, video gallery, YouTube-style hover previews)

**Rationale:** Preview is a general positioning container. It accepts any children — time values, thumbnails, chapter titles, or arbitrary content. Thumbnail is a data-driven component that loads sprites from VTT files and renders them. These are orthogonal concerns. Keeping them separate lets users compose freely and use thumbnails outside slider context entirely.

## Scope

### Future Parts (Not in This Phase)

- `Thumbnail` — standalone component for rendering preview images from VTT sprite sheets. Not a slider part — usable inside `Slider.Preview` or independently (poster area, galleries, etc.). See [Preview decision](decisions.md#preview-as-positioning-container-thumbnail-is-separate).
- `ChapterTitle` — chapter name display. Likely a standalone display component that can be composed inside `Slider.Preview`.
- `Slider.Markers` — tick marks on the track (chapter markers, ad breaks).

These will be added as separate design work when the underlying features exist.

## Observations from Other Players

Notes from reviewing Media Chrome and Vidstack that may inform future work.

### Media Chrome Architecture

MC wraps a native `<input type="range">` — browser handles fill/thumb positioning internally. CSS vars are **theming inputs** (`--media-range-track-height`, `--media-range-thumb-background`), not position outputs. This is fundamentally different from our compound approach where CSS vars are **position outputs** (`--media-slider-fill`, `--media-slider-pointer`). See "Compound Elements, Not Native `<input type="range">`" above.

MC propagates full media state as attributes on every component (`mediapaused`, `medialoading`, `mediacurrenttime`). This is their version of data attribute inheritance — every component gets the full media state for CSS targeting.

MC has a `current` slot that slides along the timeline at the current time position (distinct from preview). We handle this via Fill/Thumb, but a "current box" holding a time display that moves with playback is a possible future addition.

### Vidstack Patterns

**Adopted:**

- **Shift+Arrow / numeric keys** — Vidstack supports both. We adopted Shift+Arrow via `largeStep` and numeric keys 0-9 for percentage jumps. See [`step` and `largeStep` decision](#step-and-largestep-aligned-with-base-ui).
- **IntersectionObserver + visibility optimization** — Vidstack skips all reactive updates when the slider isn't visible/intersecting. Important for battery life. See [architecture.md — Performance](architecture.md#performance).
- **CSS containment** — Vidstack uses `contain: layout style` extensively. Adopted for all slider elements.
- **Controls auto-hide pause during drag** — Vidstack calls `pauseControls()`/`resumeControls()` on drag start/end. We expose `onDragStart`/`onDragEnd` for the controls feature to consume. See [architecture.md — Controls Integration](architecture.md#controls-integration).
- **`autocomplete="off"` on focusable element** — Prevents browser autocomplete interference.
- **Seek request throttling** — Vidstack's `seekingRequestThrottle` (100ms default). Adopted as `seekThrottle` prop on `TimeSlider.Root`. See [Seek During Drag decision](#seek-during-drag-throttled).

**Worth considering (future):**

- **`pauseWhileDragging`** — Vidstack has this as a boolean prop on `TimeSlider.Root`. Pauses playback on drag start, resumes on drag end. Not a slider concern — belongs at the store level as a `playback.hold()` / release primitive that any feature can use. Users compose via `onDragStart`/`onDragEnd` callbacks.
- **Chapters** — Vidstack has `TimeSlider.Chapters` with a render callback that breaks the track into segments. MC uses CSS `gap` between segments. Chapters are deferred but both players treat them as a slider concern, not a standalone component.
- **Swipe gesture on video provider** — On touch devices (`pointer: coarse`), Vidstack listens on the video provider element for horizontal swipes to control the time slider. The whole video surface becomes a scrub target. Player-level concern, not slider, but our slider should emit events that make this possible.

## Open Questions

### Vertical Volume Slider Default Orientation

Should `VolumeSlider.Root` default to `orientation="horizontal"` or `"vertical"`?

Current decision: `"horizontal"` (matching the base slider default). Users can override. Many modern players use horizontal volume sliders, though vertical is traditional.
