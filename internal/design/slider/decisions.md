# Design Decisions

Rationale behind slider component choices.

## Component Structure

### No Control Element

**Decision:** There is no separate Control element between Root and children. Root handles pointer events and provides context. Thumb carries `role="slider"`, keyboard focus, and ARIA attributes. All other children (Track, Fill, Preview) are purely visual.

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

- Flat exports (`SliderRoot`, `SliderControl`, `TimeSliderRoot`) — verbose imports, no visual grouping
- Single namespace with all parts (`Slider.TimeRoot`) — conflates generic and domain-specific

**Rationale:** Namespaces make composition readable. Generic parts (`Slider.*`) are clearly reusable. Domain parts (`TimeSlider.*`) are clearly scoped. Matches the existing `Time.Value`, `Time.Group` pattern.

---

## Styling

### Compound Elements, Not Native `<input type="range">`

**Decision:** The slider is composed of separate DOM elements (Root, Track, Fill, Thumb, Preview) styled via CSS custom properties. It does not use a native `<input type="range">` under the hood.

Media Chrome takes the opposite approach — their `<media-time-range>` wraps a native `<input type="range">` and styles it via browser pseudo-elements (`::-webkit-slider-runnable-track`, `::-webkit-slider-thumb`, `::-moz-range-progress`). Their CSS vars are **inputs** (theming tokens like `--media-range-track-height`), not outputs.

**Alternatives:**

- Native `<input type="range">` (Media Chrome approach) — browser handles fill/thumb positioning internally. No output CSS vars needed. But cross-browser styling is notoriously painful, pseudo-element APIs differ across browsers, and composing custom children (preview, progress, chapters) inside a native input is impossible.

**Rationale:** Compound composition gives full control over rendering, accessibility, and styling. Users compose exactly the parts they need. The tradeoff is that we need a mechanism to share continuous values (fill %, pointer %, progress %) from Root to children — CSS custom properties fill that role. This is the same architecture as Radix and Vidstack.

### CSS Custom Properties as Output

**Decision:** Slider sets `--media-slider-fill`, `--media-slider-pointer`, and `--media-slider-progress` as CSS custom properties on the Root element. Parts reference them with `var()`.

CSS vars communicate **continuous values** — percentages like `45.123%` — that CSS can't get any other way. Data attributes can carry discrete state (present/absent, enumerated strings), but `attr()` doesn't work for non-string CSS properties in any browser. So:

- **Data attributes** = discrete state (dragging yes/no, orientation horizontal/vertical)
- **CSS custom properties** = continuous values (fill %, pointer %, progress %)

**Alternatives:**

- Inline styles on parts (e.g., `width: "45%"` on Fill) — opinionated. Assumes Fill uses `width`. Maybe someone wants `transform: scaleX()` instead. CSS vars let users decide.
- Data attributes with percentage values — CSS can't use attribute values for sizing (`attr()` only works for `content`)
- JavaScript-driven positioning via refs — unnecessary DOM coupling
- No output CSS vars (Media Chrome approach) — only works if you use a native `<input type="range">` under the hood. See "Compound Elements, Not Native `<input type="range">`" above.

**Rationale:** CSS custom properties are the established pattern for headless component output values. They cascade naturally, can be overridden, and work with any styling approach (CSS modules, Tailwind, styled-components). Vidstack uses the same pattern (`--slider-fill`, `--slider-pointer`).

### `--media-slider-*` Prefix

**Decision:** Use `--media-slider-fill`, `--media-slider-pointer`, `--media-slider-progress` as CSS custom property names.

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

---

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

---

## Interaction

### createSlider Works in Percentages

**Decision:** `createSlider()` operates in 0-1 percentages, not raw values. The caller converts using `SliderCore.valueFromPercent()`.

**Alternatives:**

- Pass min/max/step to `createSlider` so it returns raw values — couples DOM interaction to value domain
- Return both percent and raw value — redundant, caller can derive

**Rationale:** Separation of concerns. `createSlider` knows about pointer positions and element geometry — it produces a percentage. `SliderCore` knows about value ranges and steps — it converts percentages to values. Neither needs to know the other's domain.

### Keyboard Commits Immediately

**Decision:** Keyboard input calls both `onValueChange` and `onValueCommit` on each keypress. No "keyboard drag" concept.

**Alternatives:**

- Treat key hold as "dragging" with commit on key up — matches pointer behavior but feels wrong for discrete steps
- Only commit on focus leave — too delayed, user expects immediate feedback

**Rationale:** Keyboard steps are discrete and immediate. User presses arrow, slider moves one step, value is committed. This matches WAI-ARIA slider behavior and every existing slider implementation.

### Pointer Drag Uses Document Listeners

**Decision:** On `pointerdown`, add `pointermove` and `pointerup` listeners on `document` to capture drag even when pointer leaves the slider bounds.

**Alternatives:**

- `setPointerCapture` — cleaner API but doesn't work well in all browsers for calculating position relative to the original element
- Listen on the element only — drag stops when pointer leaves bounds

**Rationale:** Document-level listeners are the standard approach for drag interactions. The pointer can move anywhere on screen and the slider still tracks position. Cleanup on `pointerup` prevents memory leaks.

---

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

**Decision:** Generic `SliderCore.getThumbAttrs()` sets `role`, `tabIndex`, `aria-valuemin/max/now`, `aria-orientation`, `aria-disabled` on the Thumb element. Domain cores (`TimeSliderCore`, `VolumeSliderCore`) extend with `aria-label` and `aria-valuetext`. Domain Roots provide the complete ARIA attrs to Thumb via context.

**Alternatives:**

- Generic core sets all ARIA — requires generic core to know about time formatting
- User provides `aria-label` manually — error-prone, easy to forget

**Rationale:** Labels and value descriptions are inherently domain-specific. "2 minutes, 30 seconds of 10 minutes" is time-specific. "75 percent" is volume-specific. Generic slider has no concept of these.

### Keyboard Defaults Match YouTube

**Decision:** Arrow keys step by 5 seconds (time slider) or 5% (volume slider). Page Up/Down uses a large step (10x the key step). Home/End jump to min/max. All values are customizable via `keyStep` and `keyLargeStep` props on Root.

**Alternatives:**

- Match WAI-ARIA example defaults (1 unit per step) — too fine-grained for media. One second per arrow key is tedious for a 2-hour movie.
- Fixed non-customizable steps — limits flexibility for different media lengths or use cases.

**Rationale:** YouTube's 5-second default is the de facto standard users expect. Making it customizable via props lets applications tune for their content (e.g., shorter steps for short clips, longer for movies). Props live on Root because Root provides context to Thumb — Thumb reads step values from context when handling keyboard events.

### Time Slider aria-valuetext Format

**Decision:** `"{currentTime} of {duration}"` using human-readable phrases from `formatTimeAsPhrase()`.

Example: `"2 minutes, 30 seconds of 10 minutes"`

**Alternatives:**

- Digital format (`"2:30 of 10:00"`) — screen readers would say "two colon thirty of ten colon zero zero"
- Just current time (`"2 minutes, 30 seconds"`) — missing context of total duration
- Percentage (`"25 percent"`) — not meaningful for time

**Rationale:** Following Media Chrome's approach. Screen readers announce a natural sentence. Including duration gives context ("how far am I?").

---

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
4. **Keyboard step values** — Root provides `keyStep` and `keyLargeStep` that Thumb uses for keyboard navigation.
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

---

## Naming

### `Fill` Not `Indicator`, `Range`, or `TrackFill`

**Decision:** `Slider.Fill` / `<media-slider-fill>`.

**Alternatives:**

- `Indicator` (Base UI) — too abstract. Indicates what?
- `Range` (Radix) — overloaded in media context. Time ranges, buffered ranges, seekable ranges — "range" is already a loaded term.
- `TrackFill` (Vidstack) — redundant. Fill is always nested inside Track, so the parent context already provides the relationship. `<Track><TrackFill /></Track>` is like `<List><ListItem /></List>`.
- `Progress` — reserved for time slider's buffered range

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

---

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

### Vidstack Patterns Worth Considering

- **`pauseWhileDragging`** — Vidstack has this as a boolean prop on `TimeSlider.Root`. Pauses playback on drag start, resumes on drag end. Our open question leaned toward "user handles it," but Vidstack making it a first-class prop suggests demand is high enough.
- **`seekingRequestThrottle`** — Vidstack throttles seek requests during drag at 100ms default. Worth considering for performance — prevents flooding the player with seek calls during fast drags.
- **Chapters** — Vidstack has `TimeSlider.Chapters` with a render callback that breaks the track into segments. MC uses CSS `gap` between segments. Chapters are deferred but both players treat them as a slider concern, not a standalone component.
- **`shiftKeyMultiplier`** — Shift + Arrow key multiplies the step for finer/coarser control. A nice accessibility feature.

## Open Questions

### Pause on Scrub

Should time slider pause playback when dragging starts and resume on drag end? Many players do this. Options:

1. Always pause on scrub (opinionated)
2. `pauseWhileDragging` prop (user decides) — Vidstack does this, defaults to `false`
3. Never pause (user handles via `onDragStart`/`onDragEnd` callbacks)

Leaning toward option 2 given Vidstack precedent — a prop gives users control without requiring manual event wiring. Default `false` to stay non-opinionated.

### Vertical Volume Slider Default Orientation

Should `VolumeSlider.Root` default to `orientation="horizontal"` or `"vertical"`?

Current decision: `"horizontal"` (matching the base slider default). Users can override. Many modern players use horizontal volume sliders, though vertical is traditional.
