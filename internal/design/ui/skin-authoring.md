---
status: draft
date: 2026-06-11
---

# Skin Authoring

How Video.js 10 should model, author, build, and distribute player skins without
manually maintaining every framework, preset, skin, and styling combination.

## Problem

The current skin system is a hand-maintained product matrix.

| Axis | Current examples |
|------|------------------|
| Framework | React, HTML |
| Preset | Audio, video, background, live audio, live video |
| Skin | Default, minimal |
| Styling | CSS, Tailwind |

Those axes are coupled in file names and source files:

```text
packages/react/src/presets/live-video/minimal-skin.tailwind.tsx
packages/html/src/define/live-video/minimal-skin.tailwind.ts
packages/skins/src/minimal/tailwind/video.tailwind.ts
```

That shape does not scale. Adding another adapter, another styling system, a
short-form video preset, or a new skin multiplies the number of files authors
must create and keep in sync.

The first attempt to reduce duplication by extracting shared React parts helped
remove repeated JSX, but it exposed the wrong foundation: we were refactoring
inside one generated matrix cell instead of defining what each axis means.

## Goal

Make each axis independently understandable and mostly independently scalable:

1. **Presets** define media/use-case requirements and required behavior.
2. **Skins** define layout and visual design together.
3. **Style targets** adapt a skin to CSS, Tailwind, or another styling system.
4. **Framework targets** adapt a preset + skin to React, HTML custom elements, and
   future adapters.
5. **Distribution targets** package generated output for package exports,
   docs, CLI eject, and registry installs.

The foundation should make it straightforward to add one new thing without
touching every other thing.

## Non-Goals

- Do not publish to shadcn as part of this design.
- Do not add new skins before the authoring model is settled.
- Do not remove or rename existing public imports.
- Do not remove hand-authored source until generated output has proven itself
  behind compatible package exports.
- Do not build upgrade tooling for ejected code. Ejected output is a fork the
  user owns; fixes flow through package exports.

## Vocabulary

The current word "skin" is overloaded because it sometimes means visual
treatment and sometimes means layout. This design makes that explicit: a skin is
the authored player layout and visual design together.

| Term | Meaning | Examples |
|------|---------|----------|
| Preset | Media/use-case requirements | `video`, `audio`, `live-video`, `background-video`, `short-form-video` |
| Skin | Layout and visual design | `default`, `minimal`, future branded skins |
| Component registry | Canonical catalog of components that fill slots | `play`, `time-slider`, `settings` |
| Style target | How skin styles are emitted | `css`, `tailwind` |
| Framework target | Runtime/component syntax | `react`, `html`, future adapters |
| Distribution target | How users receive code | package export, docs snippet, CLI eject, registry item |

This means "Minimal video Tailwind React skin" becomes:

```ts
{
  preset: 'video',
  skin: 'minimal',
  style: 'tailwind',
  framework: 'react'
}
```

The tricky part is that presets also affect layout. For example, live video
requires live affordances, background video removes controls, and short-form
video may prefer vertical controls. A preset should define constraints,
content slots, and required components; a skin should decide how they are
arranged and styled.

```text
preset: what must this player support?
skin: how is that support laid out and styled?
```

## Prior Art

Media Chrome separates media playback from UI controls and lets users compose
players from web components. It also has a theme concept where HTML and CSS are
packaged as portable templates with variables and slots.

Vidstack has a default layout that supports audio, video, and live streams,
adapts based on view and stream type, exposes CSS variables, and provides slots
for replacing layout regions.

Plyr keeps customization closer to CSS: CSS custom properties for tokens,
Sass for deeper builds, and stable class hooks for custom CSS.

shadcn registry is useful as a distribution target because it can distribute
code and arbitrary files into user projects, and it is not limited to React.
It should not define our internal authoring model.

## Recommended Design

Introduce a skin authoring package that owns the skin model and build graph.

```text
packages/skins
  src/
    presets/
      video.ts          # definePreset: features, ui capabilities, slots, required, behavior
      audio.ts
      live-video.ts
    components/
      registry.ts       # collects every component definition into the catalog
      play.ts           # defineComponent: parts, feature deps, framework bindings
      time-slider.ts
    skins/
      default/
        skin.ts         # defineSkin: region layout (per preset) + visual decisions
        css/            # style values per component part, as CSS rules
        tailwind/       # style values per component part, as class strings
      minimal/
        skin.ts
        css/
        tailwind/
    targets/
      react.ts          # emits TSX: resolves bindings, attaches style values to parts
      html.ts           # emits custom-element templates and define modules
      css.ts            # emits stylesheets from skin style values
      tailwind.ts       # emits class maps from skin style values
    manifest.ts         # defineArtifact catalog: which combinations ship, and where
```

The important change is not the folder names. The important change is that the
source of truth becomes:

```text
preset + skin + style target + framework target -> generated artifact
```

Instead of:

```text
one manually authored file per matrix cell
```

Tracing the play button through the files makes the split concrete. Each file
type is elaborated in the sections below.

```ts
// components/play.ts — what `play` IS: its stylable parts, the feature it
// reads, and where its implementations live. One file per component.
export const play = defineComponent({
  name: 'play',
  features: [playbackFeature],
  parts: ['button', 'icon'],
  framework: {
    react: { import: 'PlayButton', from: '@videojs/react' },
    html: { tag: 'media-play-button' },
  },
});
```

```ts
// presets/video.ts — what a video player MUST HAVE. Note `play` is not
// mentioned: the preset requires the playback feature and surfaces; which
// components satisfy them, and where they go, is the skin's decision.
export const videoPreset = definePreset({
  media: 'video',
  features: [playbackFeature, timeFeature /* ... */],
  slots: ['media', 'poster'],
  required: ['buffering', 'error'],
});
```

```ts
// skins/default/skin.ts — where `play` GOES, and the skin's visual identity.
// No styling values here, only layout and visual decisions.
export const defaultSkin = defineSkin((preset) => ({
  icons: defaultIcons,
  regions: [
    ['startControls', ['play', 'seek-backward', 'seek-forward']],
    /* ... */
  ],
}));
```

```ts
// skins/default/tailwind/play.ts — how `play` LOOKS under the Tailwind
// target: values keyed by the parts the component declares. Shared fragments
// (e.g. a base button treatment) compose in here rather than repeat. The
// css/ directory carries the same keys as stable class names instead.
export const play = {
  button: cn('inline-flex items-center justify-center rounded-md' /* ... */),
  icon: 'size-6',
};
```

The same names connect the layers: `play` in a skin region resolves through
`components/play.ts`, and the `button`/`icon` part keys connect the component
to its style values. Targets join everything up — `react.ts` emits
`<PlayButton className={...}>`, `html.ts` emits
`<media-play-button class="...">` — without owning any of those decisions.

### Presets

A preset describes the media type, use case, and required capabilities. It is
not JSX, HTML, CSS, or Tailwind.

For example, the `video` preset might require:

- Media slot.
- Poster slot.
- Buffering indicator.
- Error dialog.
- Standard controls.
- Time-based seeking.
- Optional thumbnail preview.
- Keyboard shortcuts.
- Gestures.

The `live-video` preset might require:

- Media slot.
- Error dialog.
- Live button or live indicator.
- Controls without a normal duration affordance.
- Live-edge behavior.

The preset should define required capabilities, content slots, and required
components — not a complete player layout.

The runtime half of this contract already exists: `@videojs/core/dom` exports
per-preset feature bundles — `videoFeatures`, `audioFeatures`,
`liveVideoFeatures`, `liveAudioFeatures`, `backgroundFeatures` — that wire
store state into `createPlayer()`. Those bundles already answer "what must
this player support" for playback state: `liveVideoFeatures` drops
`playbackRate` and adds `live`; `audioFeatures` drops `fullscreen`, `pip`, and
`textTrack`. Presets should not invent a parallel string vocabulary next to
them. A preset references the real features and keeps UI-only capabilities —
things that are not store features — in a separate list:

```ts
import { playbackFeature, playbackRateFeature, textTrackFeature /* ... */ } from '@videojs/core/dom';

export const videoPreset = definePreset({
  media: 'video',
  features: [playbackFeature, playbackRateFeature, textTrackFeature /* ... */],
  ui: ['menus', 'hotkeys', 'gestures', 'input-feedback'],
  slots: ['media', 'poster'],
  required: ['buffering', 'error'],
});
```

`slots` and `required` are deliberately distinct:

- **`slots`** are user content insertion points — the user supplies what goes
  there. In React that is `children` and the `poster` prop; in HTML it is
  literal `<slot>` elements. Slots are part of the public API of every skin
  that supports the preset.
- **`required`** entries are registry components the skin must place
  somewhere — a video skin cannot silently ship without an error dialog or a
  buffering indicator. Where they go is the skin's decision.

Layout areas like `controls` or `timeline` are not preset concerns at all.
Arrangement belongs to skins via regions; a preset that named layout areas
would be deciding layout through the back door.

Tying presets to real features pays off three ways:

1. The published `*Features` bundles and the preset model share one source of
   truth instead of drifting (see Open Questions for which direction the
   derivation runs).
2. Component-level validation becomes possible, because components can declare
   which features they read (see Component Registry).
3. Modeling a preset forces its contract to be written down —
   `backgroundFeatures` is an empty `TODO` array today, which the model would
   surface immediately.

Capability names alone do not define behavior: `hotkeys` does not say which
keys, and `gestures` does not say which regions do what. Today those decisions
live inside each skin file — the hotkey bindings, gesture handlers, and
`SEEK_TIME = 10` are duplicated per preset in `packages/react/src/presets/`.
Presets should own these defaults as data so framework targets can render them:

```ts
export const videoPreset = definePreset({
  media: 'video',
  features: [...],
  ui: [...],
  slots: [...],
  required: [...],
  behavior: {
    hotkeys: {
      seekTime: 10,
      bindings: { ' ': 'toggle-play', k: 'toggle-play', m: 'toggle-mute', f: 'toggle-fullscreen' /* ... */ },
    },
    gestures: {
      tap: 'toggle-controls',
      doubletap: { center: 'toggle-play', left: 'seek-backward', right: 'seek-forward' },
    },
  },
});
```

Without this, either the renderer hardcodes behavior per framework or skins
keep owning it, which contradicts the rule that skins cannot introduce playback
behavior.

### Skins

A skin defines the player layout and visual design for preset slots.

For example, the `default` skin might place:

- Control groups.
- Time slider with optional thumbnail.
- Settings menu.
- Input feedback.

```ts
export const defaultSkin = defineSkin({
  regions: [
    ['startControls', ['play', 'seek-backward', 'seek-forward']],
    ['timeline', ['current-time', 'time-slider', 'duration']],
    ['endControls', ['volume', 'settings', 'cast', 'airplay', 'pip', 'fullscreen']],
  ],
});
```

The `minimal` skin can choose a different layout while still satisfying the same
preset slots:

```ts
export const minimalSkin = defineSkin({
  regions: [
    ['startControls', ['play', 'seek-backward', 'seek-forward']],
    ['timeline', ['time-group', 'time-slider']],
    ['endControls', ['volume', 'settings', 'cast', 'airplay', 'pip', 'fullscreen']],
  ],
});
```

Skins also provide visual decisions for those layout regions.

Examples:

- Icon family.
- Class hooks.
- CSS custom properties.
- Motion values.
- Surface treatment.
- Component-specific style tokens.

Skins should not introduce new playback behavior. They must expose the
preset's slots, place its required components, and may choose optional
components supported by the preset.

### Skins Across Presets

The examples above are preset-agnostic, but a skin cannot be one static
arrangement. Live video needs a live indicator and no duration affordance,
audio does not need fullscreen or PiP, and background video has no controls at
all. Today this is solved with a full skin copy per preset — and that is where
most of the current duplication lives, more than the default/minimal split.

A skin should therefore be defined as a function of the preset contract: it
receives the preset's media type, features, slots, and required components,
and arranges them conditionally. Vidstack's default layout is the prior art here — one adaptive
layout covering audio, video, and live.

```ts
export const defaultSkin = defineSkin((preset) => ({
  regions: [
    ['startControls', ['play', 'seek-backward', 'seek-forward']],
    ['timeline', preset.live
      ? ['live-indicator', 'time-slider']
      : ['current-time', 'time-slider', 'duration']],
    ['endControls', supported(preset, ['volume', 'settings', 'cast', 'airplay', 'pip', 'fullscreen'])],
  ],
}));
```

The alternative — one layout module per (skin, preset) pair with shared
fragments — is more explicit but reintroduces a sub-matrix and gives up the
property that adding a preset does not mean copying every skin.

Skins declare which presets they support. Partial coverage is explicit, not
implied by missing files (`background` has no `minimal` today, and that should
be a declaration the manifest can validate against).

### Component Registry

Region entries like `play`, `time-slider`, and `settings` are names pointing at
a catalog. That catalog is a first-class part of the model: it maps each
abstract component name to its framework bindings, its stylable parts, and
shared wiring.

```ts
defineComponent({
  name: 'time-slider',
  features: [timeFeature],
  parts: ['root', 'track', 'fill', 'buffer', 'thumb', 'preview', 'value'],
  framework: {
    react: { import: 'TimeSlider', from: '@videojs/react' },
    html: { tag: 'media-time-slider' },
  },
});
```

The registry is metadata, not implementation. Component code stays where it
lives today — `packages/react/src/ui` and `packages/html/src/define` — and the
registry references it by identifier: an import specifier for React, a tag
name for HTML. Framework targets resolve those identifiers at build time when
emitting source, and validation checks that the referenced export or element
actually exists. Nothing in this model requires moving components between
packages — and the registry must not import them either, since `react` and
`html` depend on `skins` and a component import would create a cycle. (Feature
references are real imports; `skins` depending on `@videojs/core/dom` follows
the existing hierarchy.) Under Option 5, the binding map can even live inside
each framework package — React mapping registry names to its own components
locally — since both packages already depend on the model.

Components already depend on features implicitly: every UI component reads
store state through a feature selector (`PlaybackRateButton` →
`selectPlaybackRate`, `CaptionsButton` → `selectTextTrack`) and silently
renders nothing when the feature is missing, with a DEV-only warning. The
registry makes that dependency declarative, which turns a runtime
degrade-to-null into a build-time check: every component a skin places must
have its features in the preset's bundle. For example, `liveVideoFeatures`
excludes `playbackRateFeature`, so a skin that places a playback-rate menu
item under the `live-video` preset fails validation instead of shipping a menu
item that never renders.

Feature presence is also the natural input for skin adaptivity: the
`supported(preset, [...])` helper in "Skins Across Presets" can filter on the
preset's declared features instead of ad-hoc flags like `preset.live`.

The registry is where shared machinery lives that is neither preset nor skin:

- Icon-state logic (currently `shared/tailwind/icon-state.ts` in
  `packages/skins`, spread into each skin by hand).
- Status announcements and other a11y wiring.
- The part contract each style target must cover per component.

Skins still choose the icon family; the registry owns how icon state is wired.

Validation checks every region entry against the registry. Where possible,
`defineSkin` should also enforce this at the type level, so a skin that
references an unknown component or never places a preset-required component
fails `pnpm typecheck`, not just the build.

### Linking Styles to Components

Components are already headless compound components with parallel part trees
in both frameworks: React renders `TimeSlider.Root`, `Slider.Track`,
`Slider.Thumb`; HTML renders `media-time-slider`, `media-slider-track`,
`media-slider-thumb`. Every part accepts a class, and state is exposed as
`data-*` attributes (`data-orientation`, `data-pointing`, `data-dragging`)
that both style systems already select on.

The shared key space exists today, just implicitly. The React and HTML
Tailwind skins import the same token map from
`@videojs/skins/default/tailwind` and apply entries like `slider.track` and
`slider.thumb.persistent` part by part, at every usage site, by hand. The CSS
tree mirrors the same keys as BEM class names (`.media-slider__track`,
`.media-slider__thumb`). The registry's `parts` lists turn that implicit key
space into the explicit contract.

Linking works in three layers:

1. **Registry** declares each component's parts and carries its state
   attributes (derived from its features, primitive, and props — see
   "Conditional Rendering") — together, the stylable surface.
2. **Skin** provides values per (component, part, variant). For the CSS target
   that is rules keyed by stable part class names; for the Tailwind target it
   is class strings keyed by part — today's token maps already have exactly
   this shape.
3. **Framework target** attaches values to parts. The renderer (or the
   adaptive component under Option 5) walks regions, components, and parts,
   and applies the active style target's value to each part's
   `className`/`class`.

Layer 3 is the step that exists only as hand-written repetition today — every
skin file re-applies the same token to the same part at every usage line. The
binding layer mechanizes it, which is where most of the per-file duplication
goes away.

Validation follows the same contract: a skin styling a part the registry does
not declare fails, and a style target leaving a declared part uncovered fails
unless the part is explicitly opted out.

### Where Logic Lives

Today's skin files contain real logic beyond composition — for example,
bridging a `placeholder` prop into a CSS custom property on the container:

```tsx
const containerStyle = placeholder
  ? ({ '--media-poster-placeholder': `url(${placeholder})`, ...style } as CSSProperties)
  : style;
```

In this model skins are data, and generated skin source should contain no
logic beyond composition. Logic found in a skin file during migration has one
of three homes:

1. **Interaction and playback behavior** — hotkeys, gestures, seek time —
   moves to preset `behavior` data.
2. **Conditional appearance** — moves to part-keyed style values, expressed
   against the `data-*` state attributes components already expose.
3. **Prop-to-hook bridging** — like the placeholder example — moves into the
   component itself. The component accepts the prop and sets the variable;
   the HTML element mirrors it with an attribute. `Thumbnail` already does
   exactly this with its `containerStyle` in
   `packages/react/src/ui/thumbnail/thumbnail.tsx`, so this is the existing
   component pattern, not a new one — the placeholder logic is component
   logic that happens to be sitting in a skin file.

The registry declares the bridge so both frameworks must honor it, and so the
variable becomes part of the stylable surface skins can reference:

```ts
defineComponent({
  name: 'poster',
  // ...
  props: {
    placeholder: { cssVar: '--media-poster-placeholder' },
  },
});
```

If a piece of skin logic fits none of the three homes, that is a signal it is
player behavior that belongs in a core feature, not in UI code at all.

### Conditional Rendering

React can render `null`; HTML skins are static templates that cannot unmount,
so they hide components with CSS keyed on data attributes. The model has to
pick a contract both targets can satisfy, which means the HTML target is the
lowest common denominator. The model splits conditionality into two kinds:

**Build-time conditionality** is preset-driven and resolves at generation. The
adaptive skin decides per preset what exists — live video gets no
playback-rate menu item — and both targets simply never emit that markup.
This absorbs most of what React's `null` returns do today: the
missing-feature case stops being a runtime concern in generated skins because
validation makes placing a component without its feature a build error.

**Runtime conditionality** is state-driven — fullscreen unsupported on this
device, no caption tracks, no thumbnails — and cannot be resolved at
generation. Here the contract is the one the HTML skins already use, and it
already works cross-framework today:

- Components expose state as data attributes. `data-availability` is set by
  both the React and HTML menu items today; `data-hidden` by thumbnails.
- Visibility is styling keyed on those attributes. The default skin CSS
  already hides on `[data-availability="unsupported"]` for buttons, menu
  items, and even containers (`:has()` hides a popup when the slider inside
  it is unsupported).

The registry declares each component's state attributes alongside its parts,
so visibility states are part of the stylable surface and style targets must
cover them. The standard hiding rules live once in shared styles, not
per skin.

None of the state vocabulary is written by hand. Every attribute a component
renders is driven by logic that already has a home, so the vocabulary is
computed from the rest of the definition:

- **Feature state.** Availability, playback, and live states are mechanical
  projections of store state — the menu components literally render
  `'data-availability': setting.availability` today, and the HTML elements
  already drive all of their state attributes through a declared
  `StateAttrMap` applied by `applyStateDataAttrs` from `@videojs/core/dom`.
  Declaring `features` implies these attributes; the mapping moves from
  per-element code into the registry.
- **Interaction primitives.** `data-pointing` and `data-dragging` come from
  the shared slider machinery, open/expanded state from disclosure, pressed
  state from the button factory. A component declares which primitive it
  composes (`primitive: 'slider'`) and inherits that primitive's state
  vocabulary.
- **Declared props.** `data-orientation` is the `orientation` prop surfaced
  as an attribute — the same bridge as `placeholder` →
  `--media-poster-placeholder` in "Where Logic Lives". Declared props imply
  their attributes.

```ts
defineComponent({
  name: 'time-slider',
  features: [timeFeature], // implies availability + time state attributes
  primitive: 'slider',     // implies data-pointing, data-dragging, ...
  props: { orientation: { attribute: 'data-orientation' } },
  // no `states` field — the vocabulary is the union of the above
});
```

An attribute that cannot be traced to a feature, a primitive, or a prop is
the same smell as unhomed skin logic: state is being invented inside a
component implementation instead of driven by shared logic.

Two rules keep the computed vocabulary honest:

- **Implementations consume the declaration, not the reverse.** `react` and
  `html` already depend on `skins`, so components can import their state
  names from the registry instead of hardcoding attribute strings. Name
  drift between frameworks becomes structurally impossible.
- **Extraction validates; it does not define.** A build-time scan of
  component source for `data-*` writes is a useful drift check — reality must
  match declaration — but it cannot replace the declaration. A contract
  inferred from two implementations is not a contract: when React and HTML
  disagree, inference can only report the difference, not say which one is
  intended, and it documents bugs as faithfully as intent.

Two consequences:

- Hiding must be `display: none`-equivalent so a hidden control leaves the
  tab order and the accessibility tree — the same observable outcome as
  unmounting.
- React does not conditionally render state-driven UI at all. Both targets
  rely on the same attributes, so the CSS and Tailwind values keyed on them
  are shared verbatim and parity cannot drift.

Attribute-driven visibility is not a compromise forced by the HTML target; it
is the stronger position for React too:

- Capability checks are client-only, so conditionally rendering on them
  causes tree-shape hydration mismatches in SSR. A differing attribute is
  benign; a missing subtree is not.
- Hidden-but-mounted controls can animate in and out and keep their state
  (drag position, open menus, focus); unmounted ones cannot.
- A hidden control sits in devtools with `data-availability` explaining
  itself; a `null` return is silently absent.
- It is the established idiom in the headless component ecosystem: Radix
  renders `data-state` and styles against it, and Tailwind ships `data-*`
  variants for exactly this.

The cost — always-mounted components still subscribe and render DOM — is
negligible at player scale (dozens of nodes, not thousands). Heavyweight
subtrees such as menu portals and thumbnail previews declare lazy mount
semantics in the registry explicitly rather than unmounting ad hoc.

That leaves the missing-feature case: a component placed in a hand-rolled
composition whose store lacks its feature. React returns `null` here today,
but that has no HTML equivalent — a custom element written into the user's
markup cannot unmount itself. Today's HTML elements log a DEV warning and go
inert: `update()` bails before any state attributes are applied, so the CSS
hiding rules never match and the user is left with a visible control that can
never work — the worst outcome of all.

So the missing-feature case follows the same rule rather than being a special
case. The component sets its own availability attribute — an absent feature
can never become available, so `data-availability="unsupported"` is accurate —
and the shared hiding rules remove it from view, tab order, and the
accessibility tree. React renders the hidden host instead of returning
`null`; HTML applies the same attribute to itself; both keep the DEV warning.
Generated skins never hit this branch — validation forbids placing a
component without its feature — so the mechanism exists purely as graceful
degradation for hand-rolled compositions, where a hidden element carrying its
own explanation in devtools beats a silent absence anyway.

### Style Targets

A style target turns skin styling into a concrete implementation.

| Style target | Output |
|--------------|--------|
| CSS | CSS files, custom properties, stable class names |
| Tailwind | Tailwind class maps or generated class strings |
| Future style target | CSS modules, Panda, UnoCSS, etc |

The style target should be swappable only when it can express the skin. If a
skin needs capabilities a style target cannot represent, validation should fail
at build time.

The table above describes outputs. The open question is the input: what is skin
styling authored in? Today CSS and Tailwind are two hand-authored parallel
trees in `packages/skins` (~42 near-identical file pairs), not two renderings
of one source. Two options:

1. **One canonical source, derive the other.** Author styling once — for
   example Tailwind-flavored token maps compiled to static CSS (plausible with
   Tailwind v4), or vanilla CSS with stable hooks where the Tailwind target
   becomes tokens plus class-hook documentation. Deriving real selectors,
   container queries, and keyframes across systems is a mini-compiler; this is
   the hardest single piece of the design and should be costed as such.
2. **Dual-authoring with parity validation.** Keep two style trees per skin but
   validate token and hook parity at build time. Less elegant, much cheaper,
   and consistent with the validation list below.

Start with option 2 for the dry run. Revisit option 1 only if parity validation
proves insufficient in practice.

### Framework Targets

A framework target renders a preset + skin into framework-specific source.

| Framework target | Output |
|------------------|--------|
| React | TSX component exports |
| HTML | Custom-element templates and define modules |
| Future adapter | Native adapter exports when demand is clear |

Framework targets own syntax and runtime integration. They should not own
preset or skin decisions.

React and HTML are the only framework targets we need to model now. Future
frameworks should be added as explicit adapters, like React, when they improve
ergonomics enough to justify maintaining them. They should not change the
preset or skin model.

Framework targets may not have perfect feature parity on day one, but
differences must be explicit:

```ts
defineTargetSupport({
  framework: 'html',
  unsupportedSlots: ['render-prop-poster'],
});
```

### Manifest

The manifest describes supported combinations and distribution metadata.

```ts
defineArtifact({
  name: 'video-player',
  preset: 'video',
  skin: 'default',
  style: 'tailwind',
  framework: 'react',
  distributions: ['package', 'docs', 'cli', 'registry'],
});
```

The manifest is a catalog, not the authoring source. It answers "what do we
ship?" The preset/skin/target files answer "how is it made?"

### Build Pipeline

The build pipeline should validate first, generate second.

```text
manifest
  -> validate preset/skin/style/framework support
  -> render framework source
  -> render style output
  -> emit package compatibility files
  -> emit ejected docs JSON
  -> emit CLI templates
  -> emit registry items
```

Validation should catch:

- Duplicate exported names.
- Preset slots not exposed by a skin's public API.
- Preset-required components never placed by a skin.
- Skin not declaring support for the preset (partial matrices are explicit).
- Region entries that do not exist in the component registry.
- Skin placing a component whose required features are missing from the
  preset's feature bundle.
- Preset feature list drifting from the published `*Features` bundle (while
  both exist separately).
- Skin tokens unused by all targets.
- Skin styling a part the registry does not declare.
- Style target missing required skin token.
- Framework binding pointing at an export or element that does not exist.
- Token or class-hook parity drift between style targets (while dual-authored).
- Framework target missing required preset support.
- Preset-required a11y wiring (announcer, ARIA roles) missing from registry
  components.
- Distribution item pointing to an unsupported combination.

Generated output gets verified, not just emitted:

- Generated TSX must pass typecheck.
- Emitted Tailwind class strings must survive a Tailwind build.
- Generated skins must pass the existing e2e visual snapshots against the
  hand-authored equivalents they replace.

## Public Compatibility

Existing imports stay valid:

```ts
import '@videojs/react/video/skin.css';
import { VideoSkin } from '@videojs/react/video';
import '@videojs/html/video/skin';
```

At first, generated files should sit behind the existing paths. If generation
changes file structure, it must still emit compatible exports and types.

## Distribution

Distribution should be downstream of the same manifest.

### Package Exports

Package exports remain the stable default for users who want maintained skins.

### Docs Ejection

Docs ejection should show the same code the CLI would write, not a separate
hand-authored snippet.

### Video.js CLI

The CLI should be a friendly local wrapper:

```bash
pnpm dlx @videojs/cli add skin --framework react --preset video --skin default --style tailwind
```

The CLI should resolve the same manifest item as docs and registry output.

Because registry components declare their feature dependencies, ejection can
also generate the `createPlayer({ features: [...] })` call with exactly the
features the placed components need. A user who deletes the settings menu from
an ejected skin can drop `playbackRateFeature` and `textTrackFeature` with it —
custom feature arrays are already a documented pattern in the feature docs.

### Registry

Registry output can be shadcn-compatible, but the registry is a distribution
target only. We should not shape the internal model around shadcn.

## Possible Solutions

### Option 1: Manifest Only

Add a manifest that lists all current files and generates docs/CLI/registry
metadata from those files.

**Pros**

- Smallest first step.
- Low risk to package exports.
- Immediately removes hardcoded docs/ejection lists.

**Cons**

- Does not solve source maintenance.
- Still leaves one source file per matrix cell.
- Easy to mistake for the final architecture.

**Use for**

Phase 1 only.

### Option 2: Preset, Skin, Target Model

Create explicit preset/skin/style/framework targets and generate artifacts from
that model.

**Pros**

- Correctly separates the axes.
- Scales to future framework adapters, new style systems, and new presets.
- Provides a validation surface before files are generated.
- Keeps shadcn and CLI as outputs, not foundations.

**Cons**

- Requires careful vocabulary and constraints.
- Needs a real renderer layer.
- More upfront design than a manifest-only pass.

**Use for**

The recommended foundation.

### Option 3: Shared React/HTML Parts

Refactor repeated JSX/templates into shared helpers inside each framework.

**Pros**

- Reduces duplication quickly.
- Easy to typecheck locally.
- Does not require a generator.

**Cons**

- Optimizes inside the current matrix.
- Does not scale styling or framework axes.
- Can create awkward prop bags if used as the foundation.

**Use for**

Tactical cleanup after the model is defined, not the architecture.

### Option 4: External Theme Template Runtime

Adopt a Media Chrome-like runtime theme model where skins are mostly HTML/CSS
templates.

**Pros**

- Portable across frameworks.
- Natural fit for custom elements.
- Strong ejection story.

**Cons**

- React source may feel like a wrapper around HTML templates.
- Harder to preserve React component ergonomics.
- Bigger architectural shift.

**Use for**

Worth considering if HTML/custom-elements become the primary framework-neutral
skin target.

### Option 5: Adaptive Source + Ejection-Only Generation

Author one adaptive skin component per framework that consumes the preset/skin
model directly, collapsing the preset axis at the source level. Reserve code
generation for ejection, where `site/scripts/build-ejected-skins.ts` already
does this kind of specialization today (token inlining, import rewriting,
`cn()` flattening).

**Pros**

- Collapses the per-preset React files to roughly one per skin without
  building a JSX-emitting renderer.
- "Readable generated output" only has to hold for ejection, not for package
  source.
- Extends proven generation machinery instead of starting from scratch.

**Cons**

- Runtime conditionals carry a bundle cost on every preset import.
- Ejected output produced by partial evaluation can be harder to keep readable
  than purpose-rendered source.
- The adaptive component risks becoming a prop bag if the preset model is
  weak — the same failure mode as Option 3.

**Use for**

The main alternative to Option 2's renderer for package source. Both depend on
the same preset/skin/registry model, so the model work is shared either way;
the choice is how package source gets produced, and it can be made at the end
of Phase 2 with real output in hand.

## Recommendation

Choose Option 2's model and build all phases as a local dry run. The
preset/skin/registry model is the foundation regardless of how package source
is produced; whether package source is rendered per cell (Option 2) or authored
as adaptive components and specialized only at ejection (Option 5) is a Phase 2
decision, made after seeing real generated output.

The phases are checkpoints, not approval gates that stop the work. Each phase
should leave the repository in a useful state, but the goal is to feel the whole
system from authored model to generated package output before deciding whether
the foundation is right.

Success means:

- Preset, skin, style target, and framework target each have a clear job.
- The generated output is readable enough to eject into user projects.
- Adding `minimal` does not require copying the whole `video` preset.
- A single skin definition covers every preset it supports without per-preset
  copies.
- A skin cannot place a component whose features the preset does not provide.
- React and HTML can share the same preset/skin model without hiding target
  differences.
- The CLI and registry outputs are thin distribution layers over the same
  artifacts.

## Decisions From Discussion

1. A skin is layout and visual design together.
2. A preset is the media/use-case contract that defines required behavior and
   slots.
3. Presets can influence layout by requiring slots, but skins own the final
   arrangement and styling.
4. Short-form video should be modeled as a preset/use case, not just a skin.
5. Future frameworks are not a current concern. When needed, they should be
   explicit adapters like React.
6. Ejected code should be generated, but optimized for readability and tested as
   a first-class output.
7. Package source generation should happen after docs, CLI, and registry output
   prove the model locally.
8. Skins can choose optional preset slots and arrange them, but cannot introduce
   new playback behavior.

## Migration Plan

Run through all four phases locally before deciding whether to commit to this
architecture. The dry run should produce real artifacts, but public publishing
and upstream shadcn work stay out of scope.

### Phase 1: Model and manifest

- Define preset/skin/style/framework/distribution terminology.
- Add a typed manifest for supported combinations.
- Add validation for duplicates, missing files, and unsupported combinations.
- Move ejected-skin docs generation onto the manifest.
- Keep current package source files in place.

The phase is done when docs/ejection metadata comes from the manifest and
current output is unchanged or intentionally equivalent.

### Phase 2: Dry-run renderer

- Add internal preset, skin, component registry, and target types.
- Render one React Tailwind default video player from the preset/skin model.
- Render the same default video skin to HTML, even as a throwaway, to verify
  the model is not secretly JSX-shaped. React render props and conditional JSX
  versus static templates with `data-*` state is the known mismatch; finding it
  in Phase 4 would invalidate the foundation after it was "proven".
- Render one second preset (live-video) from the same skin definition, to test
  that skins vary across presets without copies.
- Use the existing e2e visual snapshots as the equivalence gate. Typecheck
  generated TSX and run Tailwind against emitted class strings.
- Do not replace package exports yet.
- Add `minimal` only far enough to test whether the skin can vary without
  copying the whole preset.
- Decide Option 2 vs Option 5 for package source with the real output in hand.

The phase is done when generated React output is readable, visually equivalent,
and clearly easier to maintain than the current matrix file — and the HTML
render has confirmed the model holds for both framework targets.

### Phase 3: CLI and registry outputs

- Generate local CLI templates and local registry JSON from the manifest.
- Keep registry private/local.
- Add `videojs add skin --dry-run` output that lists files, dependencies, and
  next-step usage.
- Keep shadcn compatibility as an output format, not a public publishing step.

The phase is done when the same generated artifact can feed docs ejection, CLI
dry-run output, and local registry JSON.

### Phase 4: Package source consolidation

- Replace one existing package export with generated output behind the same
  public path.
- Start with React video default Tailwind.
- Add React video minimal Tailwind if the preset/skin boundary still feels
  clear.
- Then evaluate HTML video against the same preset and skins.
- Keep existing imports and types stable.

The phase is done when at least one existing package export is generated from
the new model without changing its public import path, and the generated source
still feels suitable for ejection.

## Open Questions

1. **Style authoring source** — dual-authored CSS + Tailwind with parity
   validation, or one canonical source with derivation? Starting with
   dual-authoring; see "Style Targets".
2. **Package source production** — rendered per cell (Option 2) or adaptive
   components with ejection-only generation (Option 5)? Decide at the end of
   Phase 2.
3. **Type-level vs build-time validation** — how much of the slot/registry
   contract can `definePreset`/`defineSkin` enforce through TypeScript before
   the build pipeline has to catch it?
4. **Behavior data shape** — how rich does preset behavior config (hotkeys,
   gestures) need to be before it becomes a DSL? Keep it data, not functions,
   until a target proves it needs more.
5. **Feature bundle source of truth** — should `videoFeatures` et al be
   derived from `definePreset` (moving the source of truth into the skin
   model) or stay hand-authored in `@videojs/core/dom` with the preset
   referencing them and validated against them? Derivation is cleaner but
   inverts the dependency direction: core cannot import the preset model, so
   derived bundles would either move out of core or the preset model would
   need to live there. Start with reference-plus-validation; it requires no
   package moves and the drift check catches the same bugs.

## References

- Existing React presets: `packages/react/src/presets/`
- Existing HTML definitions: `packages/html/src/define/`
- Existing shared skin styles: `packages/skins/src/`
- Existing ejected-skin generator: `site/scripts/build-ejected-skins.ts`
- Media Chrome get started: https://www.media-chrome.org/docs/en/get-started
- Media Chrome themes: https://www.media-chrome.org/docs/en/themes
- Vidstack default layout: https://www.vidstack.io/docs/player/components/layouts/default-layout
- Plyr CSS customization: https://github.com/sampotts/plyr#customizing-the-css
- shadcn registry: https://ui.shadcn.com/docs/registry
