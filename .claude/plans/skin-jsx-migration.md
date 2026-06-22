# Skin JSX Migration Plan

## Goal

Move skin structure out of the manual React and HTML skin implementations and into canonical constrained JSX source files in `packages/skins/src`, using Core's component and icon JSX surfaces. Then reintroduce React-owned compiler generation that reads those source skins and generates React Tailwind skins first. Vanilla CSS generation follows later after the Tailwind design-system layer is cleaner.

## Non-Goals For The First Pass

- Do not move Video.js-specific lowering into `@videojs/compiler`.
- Do not expose new public `@videojs/skins` source JSX exports until we explicitly decide that API.
- Do not generate HTML skins in this pass.
- Do not attempt vanilla CSS output until React Tailwind generation is stable.
- Do not copy current React skin source directly into `packages/skins/src`; it contains React and DOM-specific details that violate constrained JSX boundaries.

## Existing Baseline

- `packages/skins/__old__` contains legacy CSS and Tailwind token/style references only. It has no JSX/TSX skin structure.
- `packages/skins/src` contains the active Tailwind token modules and `shared/tailwind.css`, but no source JSX skin trees.
- Current structure lives in duplicated manual package code:
  - React: `packages/react/src/presets/**/{skin,minimal-skin}.tsx` and `*.tailwind.tsx`
  - HTML: `packages/html/src/define/**/{skin,minimal-skin}.ts` and `*.tailwind.ts`
- Core already owns constrained JSX:
  - `@videojs/core/components`
  - `@videojs/core/jsx-runtime`
  - component manifests in `packages/core/src/core/ui/**/**/*-component.ts`
  - compound parts are declared with `defineComponentPart<Props>()` in each component manifest
  - component prop contracts and default prop constants live in each component folder's `props.ts`
- Icons already expose constrained component exports:
  - `@videojs/icons/components`
  - `@videojs/icons/components/minimal`
- `@videojs/compiler` already provides generic import rewrites, JSX transforms, and Tailwind style modes, but React has no current compiler build hook.

## Architecture Principles

- `packages/skins/src` becomes the canonical authored skin structure.
- Source skin JSX stays target-neutral and uses only constrained Video.js components plus explicitly modeled props.
- Lowercase HTML intrinsics, generic DOM attributes, ARIA attributes, `data-*`, and React `render` props remain target output details.
- React owns React-specific lowering, build integration, helper wrappers, hooks, and generated output shape.
- `@videojs/compiler` stays generic. New Video.js skin knowledge belongs in React package scripts/config or Core manifests, not in compiler internals.
- `__old__` is a parity/reference source for legacy visual behavior, not the new source of truth.

## Phase 0 - Source Shape And First Slice

Purpose: make the smallest explicit decisions before creating source JSX files.

Decisions:
- First slice: `default/video` only.
- Source file: `packages/skins/src/default/video.skin.tsx`.
- Build behavior: source-only for now; keep current `@videojs/skins` package output unchanged.
- Wrapper policy: use Core parts first and capture gaps before adding abstractions.

Decisions to confirm:
- Source file layout in `packages/skins/src`.
- First vertical slice scope.
- Whether source-only JSX files are checked into `@videojs/skins` but excluded from public build output.
- Whether skin-local abstract layout components are allowed, or whether source JSX must only use Core components and target lowering wrappers.

Recommended defaults:
- Start with `default/video` only.
- Put authored source at `packages/skins/src/default/video.tsx` or `packages/skins/src/default/video.skin.tsx`.
- Use `/** @jsxImportSource @videojs/core */` per source file unless package-level JSX config is safer.
- Keep `packages/skins/tsdown.config.ts` entries limited to current `.tailwind.ts` modules until generation is wired.
- Avoid skin-local layout primitives unless a specific repeated need is proven.

Verification:
- Add typecheck coverage for the source JSX without changing public output.
- Run `pnpm -F @videojs/skins build` and `pnpm typecheck` once the source TSX is included.

Gate question:
- Which file layout and first slice do we want?

## Phase 1 - Port One Tailwind Source Skin To Constrained JSX

Purpose: create one canonical source skin tree that can be compiled later.

Status:
- Started with `packages/skins/src/default/video.skin.tsx`.
- Current scaffold covers container, children slot, controls root/groups, play button, seek buttons, time slider without thumbnail preview, cast, AirPlay, PiP, fullscreen button, hotkeys, gestures, and status announcer.
- Current scaffold typechecks and does not change `@videojs/skins` package output.
- Core manifests now use `parts: { Part: defineComponentPart<Props>() }` instead of `parts: [...]` plus `partProps`.
- Core JSX runtime now infers props from every part descriptor, including `Root`.
- Core UI props/defaults have been moved into sibling `props.ts` files while preserving the existing `Core.defaultProps` static API.

Gap inventory for the remaining `default/video` port:

| Area | Current Manual Shape | Likely Owner | Notes |
| --- | --- | --- | --- |
| Tooltip trigger composition | React uses `render={<PlayButton />}` to avoid nested buttons. | React lowering | Source can use `<Tooltip.Trigger><PlayButton /></Tooltip.Trigger>`; React generator must lift the single child into `render`. Same for seek/fullscreen/cast/airplay/pip and popover triggers. |
| Controls marker | Manual React sets `data-controls=""` on `Controls.Root` for Tailwind `has-*` selectors. | Target lowering | Source JSX cannot set `data-*`; React/HTML lowering should add the marker to `Controls.Root`. |
| Cast, AirPlay, PiP buttons | Manual React repeats tooltip + button + icon patterns. | Existing Core parts | Added to source scaffold; still depends on trigger lowering for generated React parity. |
| Poster | Manual React skin prop supports `poster?: string | renderProp`. Core `Poster` has state only; source JSX cannot pass React render props. | Needs design decision | Options: model target-neutral poster source props, use a named `Slot`, or keep poster handling in React generated wrapper. |
| Buffering indicator shell | Manual React uses `BufferingIndicator render` with an outer root and inner surface container. | Core part candidate | Consider changing `BufferingIndicator` to compound parts such as `Root` and `Container`, or define a target lowering wrapper. |
| Error dialog shell | Manual React uses `ErrorDialog.Popup` plus raw dialog/content/actions wrappers. | Core part candidate | Consider adding semantic parts such as `Panel`, `Content`, and `Actions` to `ErrorDialog` rather than source-local wrappers. |
| Overlay | Manual React uses a raw `<div className={overlay} />`. | Needs design decision | Could become a Core `Overlay` component, target-lowered visual element, or a constrained skin-local abstraction if we allow those later. |
| Thumbnail preview shell | Manual React wraps `Slider.Thumbnail`, pointer time, and spinner in a raw thumbnail root. | Core part candidate | Existing `Slider.Thumbnail` is the thumbnail image component, not the visual preview shell. Need a semantic wrapper/part before source can represent this without `div`. |
| Volume popover | Manual React conditionally skips the popover when volume is unsupported. | React lowering or Core component | Existing `MuteButton`, `Popover`, and `VolumeSlider` can express most structure, but the unsupported branch currently depends on React state selection. |
| Settings menu | Manual React builds dynamic quality, speed, and captions submenus from React hooks. | Largest design gap | Core has `QualityRadioGroup`, `PlaybackRateRadioGroup`, and `CaptionsRadioGroup` manifests, but React currently exposes hooks, not component renderers. Decide whether to add React components for these Core radio groups or lower source components into hook-backed generated code. |
| Menu visual labels/hints | Manual React uses raw `div`, `span`, and `sup` wrappers for labels, hint areas, tiers, and badges. | Core part or source abstraction candidate | Some wrappers may become `Menu` parts (`ItemLabel`, `ItemHint`, `ItemBadge`, `ItemTier`) if they are semantic enough. |
| Input feedback shell | Manual React uses raw root/content wrappers around volume/status/seek indicators and icons. | Core part candidate | Existing indicator components cover state, but not all visual shell parts used by the skin. |

Recommended next coding order:
- Define React lowering for child-as-trigger composition and `Controls.Root` marker.
- Resolve one structural Core-part gap at a time, starting with ErrorDialog or BufferingIndicator because they are small and isolated.

Steps:
- Use `packages/react/src/presets/video/skin.tailwind.tsx` as the structural reference for `default/video`.
- Import Core components from `@videojs/core/components`.
- Import default icon components from `@videojs/icons/components`.
- Import Tailwind token objects from existing `packages/skins/src/default/tailwind/video.tailwind.ts`.
- Keep skin source target-neutral:
  - no `div`, `span`, `button`, `sup`
  - no `render`
  - no `aria-*`, `data-*`, `id`, `role`, `tabIndex`, or `style`
- Replace obvious wrappers with semantic Core parts where they already exist.
- Capture every missing semantic wrapper/lowering need in a gap list before inventing new API.

Expected gap areas:
- Generic visual wrappers currently expressed as `div` or `span`.
- React render wrappers for buttons and slider pieces.
- Dynamic settings menu option lists that currently use React hooks.
- Poster render/source handling.
- Error dialog inner content/action shells.
- Buffering and input-feedback inner shells.
- Thumbnail wrappers and status/icon group wrappers.

Verification:
- Source JSX typechecks under Core constrained JSX.
- No package output or public imports change yet.
- Gap list is explicit enough to drive Phase 2.
- Completed checks for current source/API work:
  - `pnpm exec tsgo --build packages/core`
  - `pnpm exec tsgo --build packages/skins`
  - `pnpm -F @videojs/core exec vitest run --project types`
  - `pnpm -F @videojs/core test`
  - `pnpm -F @videojs/core build`
  - `pnpm -F @videojs/skins build`
  - `pnpm typecheck`
  - `pnpm check:workspace`
  - targeted Biome check for touched Core files

Gate question:
- For each gap, should we model it as a Core semantic part, a skin source abstraction, or target lowering output?

## Phase 2 - React Lowering Prototype

Purpose: compile the Phase 1 source skin into a React Tailwind module that matches the current manual React output closely enough for focused tests/review.

Status:
- Replaced the temporary React-owned compiler module/script with `packages/react/skins.compiler.config.ts`.
- The compiler now has an additive project path: config `input` / `output` / `plugins`, `compileProject(config, options)`, and CLI project mode via `vjs compile --config ...` when no file is passed.
- The compiler exposes a generic `transform(({ ref, match, create, edit }) => [...])` plugin helper. React lowering is expressed with generic import, JSX, and interface/type edits rather than React-specific compiler internals.
- The compiler config is plugins-only; the temporary `config.styles` compatibility slot was removed to avoid competing extension paths.
- Current generated output is checked in at `packages/react/src/presets/video/default-video.generated.tailwind.tsx` as an unexported temporary generated artifact.
- Current lowering covers the represented `default/video` source slice only: component/icon import rewrites, Tailwind token import rewrite, `Tooltip.Trigger` child-as-`render`, `Controls.Root` `data-controls` marker, `className` array to React `cn(...)`, and source `children?: unknown` to React `ReactNode`.
- Existing manual React presets remain untouched and still provide the runtime/exported implementation.

Remaining prototype gaps before replacing a manual preset:
- Generated output does not yet add the manual React `Button`/slider render wrappers; it relies on current React component default elements plus source-authored classes.
- The source skin still omits known structural gaps from Phase 1: poster, buffering indicator, error dialog internals, overlay, volume popover, settings menu, thumbnail shell, and input feedback shells.
- `compile:skins` emits TypeScript-printer formatting; checked-in output is formatted with Biome after generation.

Compiler config direction:
- `packages/react/skins.compiler.config.ts` is now the React lowering entrypoint.
- Shape the compiler config like a small Vite/Rollup-style source generator, not a bundler. The core job is deterministic source generation from constrained JSX to generated TSX/CSS assets.
- The compiler config should point at source/output paths directly, not require a React-owned script to call `compile()` manually.
- Prefer Rollup-like `input`/`output` plus plugins for the project shape:

```ts
input: {
  'default-video': '../skins/src/default/video.skin.tsx',
},
output: {
  dir: 'src/presets/video',
  entryFileNames: '[name].generated.tailwind.tsx',
  banner: '// Generated by @videojs/compiler. Do not edit.\n',
}
```

- Keep exact per-entry outputs as a possible later escape hatch if generated source files need paths that cannot be expressed cleanly with `output.dir` and `entryFileNames`.
- Replace `pipeline([...])` with a `transform(...)` plugin factory. The callback receives transform-context helpers and returns one ordered declarative pipeline.
- `ref.import(...)` creates lazy symbol references used by transforms/builders. It should not emit imports immediately; imports are emitted only when a transform actually uses the reference.
- Keep matching, creation, and mutation separate:
  - `match.*` selects nodes and composes predicates.
  - `create.*` builds expressions, types, JSX values, and declarations.
  - `edit.*` applies visitors/mutations.
- Prefer top-level `match` with domain subnamespaces so composition has one mental model:
  - `match.jsx.tag('Controls.Root')`
  - `match.jsx.attribute('className')`
  - `match.interface.name(/Props$/)`
  - `match.interface.property('children')`
  - `match.import.source('@videojs/core/components')`
- Keep edit domains explicit:
  - `edit.import.rewrite(...)`
  - `edit.jsx.element(...)`
  - `edit.jsx.attribute(...)`
  - `edit.interface.property(...)`
- Do not add a one-off compiler API such as `jsx.arrayAttributeToCall(...)`. Express that as generic composition: match a JSX attribute whose value is an array, then replace the value with a call expression built from `create.expr.call(cn, create.jsx.arrayElements(value))`.
- React config sketch:

```ts
import { defineConfig, transform } from '@videojs/compiler';
import { tailwind } from '@videojs/compiler/tailwind';

export default defineConfig({
  input: {
    'default-video': '../skins/src/default/video.skin.tsx',
  },
  output: {
    dir: 'src/presets/video',
    entryFileNames: '[name].generated.tailwind.tsx',
    banner: '// Generated by @videojs/compiler. Do not edit.\n',
  },
  plugins: [
    transform(({ ref, match, create, edit }) => {
      const cn = ref.import('@videojs/utils/style', 'cn');
      const ReactNode = ref.import('react', 'ReactNode', { type: true });

      return [
        edit.import.rewrite({
          '@videojs/core/components': coreComponentImport,
          '@videojs/icons/components': '@/icons',
          './tailwind/video.tailwind': '@videojs/skins/default/tailwind/video.tailwind',
        }),
        tailwind({ mode: 'preserve' }),
        edit.jsx.element({
          match: match.jsx.tag('Tooltip.Trigger'),
          transform: edit.jsx.childAsProp('render'),
        }),
        edit.jsx.element({
          match: match.jsx.tag('Controls.Root'),
          transform: edit.jsx.addAttribute('data-controls', ''),
        }),
        edit.jsx.attribute({
          match: match.all(match.jsx.attribute('className'), match.jsx.value.array()),
          transform: ({ value }) => create.expr.call(cn, create.jsx.arrayElements(value)),
        }),
        edit.interface.property({
          match: match.all(match.interface.name(/Props$/), match.interface.property('children')),
          transform: edit.interface.setType(() => create.type.union(create.type.ref(ReactNode), create.type.undefined())),
        }),
      ];
    }),
  ],
});
```

Compiler plugin/lifecycle direction:
- Internally, the lifecycle can be Vite/Rollup-shaped:

```text
config -> buildStart -> resolve -> load -> transform -> render -> write -> writeBundle
```

- Publicly expose only the hooks that are pulling their weight. Today that means `transform` first, plus project config/output handling.
- Initial public plugin API can stay minimal:

```ts
interface CompilerPlugin {
  name: string;
  enforce?: 'pre' | 'post';
  config?(config: CompilerConfig): CompilerConfig | void | Promise<CompilerConfig | void>;
  buildStart?(ctx: BuildContext): void | Promise<void>;
  transform?(module: ModuleTransform, ctx: TransformContext): TransformResult | null | void | Promise<TransformResult | null | void>;
  render?(module: RenderModule, ctx: RenderContext): RenderResult | null | void | Promise<RenderResult | null | void>;
  writeBundle?(bundle: OutputBundle, ctx: WriteContext): void | Promise<void>;
}
```

- Keep `resolve` and `load` internal at first unless Tailwind/source resolution immediately needs plugin participation.
- Hook responsibilities:
  - `config`: normalize `input`/`output`, expand entries, validate output path collisions, and fail early.
  - `buildStart`: initialize shared plugin state, load design systems once, and validate required files.
  - `resolve`: locate source entries, token modules, virtual modules, and config-relative paths consistently. Do not use this for generated import rewrites.
  - `load`: read source text, with a later path for virtual skins or composed variants.
  - `transform`: parse/edit source, rewrite generated imports, lower JSX, update interfaces/types, process className, and run Tailwind transforms.
  - `render`: final per-file shaping such as generated banners, source pragma removal, comment normalization, or formatter integration.
  - `writeBundle`: whole-output validation, stale output checks, drift reporting, and summaries.
- Import rewriting remains a transform, not `resolve`. Rollup `resolveId` answers "what file should this import load?"; React lowering answers "what import should generated source contain?" and belongs in `edit.import.rewrite(...)`.
- `tailwind({ mode: 'preserve' })` should also be a compiler plugin so Tailwind work participates in the same lifecycle and can emit CSS assets through plugin context when running in extract mode.

Implemented compiler surface:
- Project compilation for config input/output via `compileProject(config, options)` and CLI project mode.
- Generic AST primitives in `@videojs/compiler`: `match`, `create`, `edit`, and transform-context `ref` helpers.
- Lazy value/type import materialization through `ref.import(...)` and `create.*` builders.
- Generic interface/type transforms for `children?: unknown` to `ReactNode` without React importing `typescript`.
- Generic JSX element/attribute transforms for child-as-prop, adding attributes, and replacing attribute values.
- The source-file pragma was removed from `packages/skins/src/default/video.skin.tsx`; skins rely on `packages/skins/tsconfig.json` `jsxImportSource`.

Steps:
- Replace the React-owned generation script with a compiler config and project compilation entrypoint.
- Call the compiler CLI/project API against that config rather than calling `compile()` directly from React code.
- Configure import rewrites:
  - `@videojs/core/components` to React UI modules or package-local barrel targets.
  - `@videojs/icons/components` to React icon modules.
  - `@videojs/skins/*/tailwind/*` preserved or re-routed as needed.
- Use Tailwind mode `preserve` first.
- Add React-owned transforms for required output details:
  - trigger child to `render` prop where necessary
  - add render wrappers for default buttons and slider shell elements
  - inject React helper components only in generated output
  - map Core `Container` to React `Container` from player context
- Write output to a temporary generated path first, then decide whether to replace current preset files.

Verification:
- Generated `default/video` React Tailwind skin typechecks.
- Compare generated output against `packages/react/src/presets/video/skin.tailwind.tsx` for structural parity.
- Run focused React package typecheck/build once hooked into the package.
- Completed checks for the config path:
  - `pnpm -F @videojs/react compile:skins`
  - `pnpm -F @videojs/react test src/presets/tests/skins-compiler-config.test.ts`
  - `pnpm -F @videojs/react build`

Gate question:
- Should generated files be committed into `packages/react/src/presets/**`, generated into `__generated__` and re-exported, or generated only at build time?

## Phase 3 - Expand React Tailwind Coverage

Purpose: move from one slice to all supported React Tailwind skins.

Steps:
- Port and generate:
  - `default/audio`
  - `minimal/video`
  - `minimal/audio`
- Decide how live variants compose from base video/audio source skins.
- Decide whether background skin belongs in this pipeline or remains separate.
- Replace manual React Tailwind skins only after generated output is stable.

Verification:
- `pnpm -F @videojs/react build`
- focused React preset tests if present
- sandbox visual smoke for generated skins

Gate question:
- Should live and background skins be modeled as variants in source JSX now, or deferred until base skins are stable?

## Phase 4 - Tailwind Design-System Cleanup

Purpose: make the style layer more idiomatic before extracting vanilla CSS.

Steps:
- Classify every relevant `--media-*` variable as:
  - public theming API
  - runtime state variable
  - skin-private default
- Keep public/runtime `--media-*` names stable.
- Move repeated static values into `packages/skins/src/shared/tailwind.css` via:
  - `@theme`
  - `@utility`
  - `@custom-variant`
- Replace repeated arbitrary utilities in token modules with theme-backed utilities.
- Keep `__old__` CSS as a parity checklist.

Verification:
- Tailwind skins still render in sandbox.
- No accidental removal of public `--media-*` theming hooks.
- Compiler Tailwind token evaluation still succeeds.

Gate question:
- Which `--media-*` variables are public API versus skin-private implementation details?

## Phase 5 - Vanilla CSS Generation

Purpose: generate CSS skins from the canonical JSX and Tailwind token source after React Tailwind generation works.

Steps:
- Switch compiler Tailwind mode to `extract` for CSS generation.
- Use a Tailwind v4 input that imports `tailwindcss` plus `@videojs/skins/shared/tailwind.css`.
- Configure naming overrides for known collision risks.
- Decide class naming compatibility:
  - preserve existing `media-*` class names where they are public/ejection-facing, or
  - accept generated semantic class names if public compatibility is not required.
- Wire generated CSS into existing React preset CSS paths.
- Later, adapt HTML generation/lowering separately.

Verification:
- CSS output visual parity against current/old skins.
- `site/scripts/build-ejected-skins.ts` still emits useful CSS snippets.
- `pnpm build:packages` and `pnpm check:workspace` pass.

Gate question:
- Must vanilla CSS preserve old `media-*` class names exactly?

## Immediate Next Step

Prototype React lowering for the existing `default/video` source scaffold, starting with child-as-trigger composition and the `Controls.Root` marker. Resolve the first structural Core-part gap only after that lowering path is proven.
